import { describe, expect, it } from "vitest";
import type { ActiveRoute, GameState } from "../../../data/types.ts";
import { CargoType, ContractStatus, GalaxyShape } from "../../../data/types.ts";
import { createNewGame } from "../../NewGameSetup.ts";
import { simulateTurn } from "../TurnSimulator.ts";
import {
  addCargoLock,
  calculateDistance,
  createRoute,
  getFreeSlotsForScope,
  getRouteScope,
  scanAllRouteOpportunities,
} from "../../routes/RouteManager.ts";
import { getCapacityCostForScope } from "../../fleet/CapacityManager.ts";
import {
  getTotalFreightCapacity,
  getTotalPassengerCapacity,
} from "../../tech/TechEffects.ts";
import { acceptContract } from "../../contracts/ContractManager.ts";
import { instantUnlockOrQueue } from "../../tech/TechTree.ts";
import {
  getGameOutcome,
  rankCompanies,
} from "../../scoring/ScoreCalculator.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";

/**
 * Seeded headless balance pin for PLAYABLE rubric lines 3 and 5:
 * a passive player must finish in the bottom half, while a simple greedy
 * active policy must be able to reach #1. Policies are expressed with the
 * same action APIs the UI uses (route finder, contract acceptance, research
 * queue), against an unmodified Quick game.
 */

const SEEDS = [42, 100, 256, 777, 2026] as const;
const MAX_ACTIVE_ROUTES = 8;

type Policy = "passive" | "active";

interface CapacityUse {
  freight: number;
  passenger: number;
}

/** Techs a greedy player would prioritise: capacity, slots, then revenue. */
const TECH_PRIORITY = [
  "fuel_efficiency_1",
  "logistics_ai_1",
  "logistics_hub",
  "logistics_2a",
  "logistics_ai_2",
  "engineering_hub",
  "freight_hull_mk2",
  "logistics_2b",
  "logistics_ai_3",
  "logistics_trips_r",
  "logistics_3",
  "logistics_ai_4",
  "engineering_2a",
  "fuel_savings_r",
  "freight_hull_mk3",
  "logistics_4",
];

function usedCapacity(state: GameState): CapacityUse {
  let freight = 0;
  let passenger = 0;
  for (const route of state.activeRoutes) {
    if (route.paused) continue;
    const cost = getCapacityCostForScope(getRouteScope(route, state));
    if (route.cargoType === CargoType.Passengers) passenger += cost;
    else freight += cost;
  }
  return { freight, passenger };
}

/**
 * Open the highest-estimated-profit route the player can actually afford,
 * slot-wise and capacity-wise. Mirrors RoutesScene.commitRouteCreation.
 * Returns the same state when nothing is openable.
 */
function openBestRoute(state: GameState): GameState {
  const opportunities = scanAllRouteOpportunities(
    state.galaxy.planets,
    state.galaxy.systems,
    state.market,
    state.activeRoutes,
    state.cash,
    state,
  );
  const used = usedCapacity(state);
  const totalFreight = getTotalFreightCapacity(state.tech);
  const totalPassenger = getTotalPassengerCapacity(state.tech);

  for (const opp of opportunities) {
    if (opp.alreadyActive || opp.licenseFee > state.cash) continue;
    if (getFreeSlotsForScope(state, opp.scope) <= 0) continue;
    const cost = getCapacityCostForScope(opp.scope);
    const isPassenger = opp.bestCargoType === CargoType.Passengers;
    if (
      isPassenger
        ? used.passenger + cost > totalPassenger
        : used.freight + cost > totalFreight
    ) {
      continue;
    }

    const origin = state.galaxy.planets.find(
      (p) => p.id === opp.originPlanetId,
    );
    const dest = state.galaxy.planets.find(
      (p) => p.id === opp.destinationPlanetId,
    );
    if (!origin || !dest) continue;

    const distance = calculateDistance(
      origin,
      dest,
      state.galaxy.systems,
      state.hyperlanes,
      state.borderPorts,
    );
    const route: ActiveRoute = createRoute(
      origin.id,
      dest.id,
      distance,
      opp.bestCargoType,
    );
    used[isPassenger ? "passenger" : "freight"] += cost;
    return {
      ...state,
      activeRoutes: [...state.activeRoutes, route],
      interEmpireCargoLocks: addCargoLock(
        origin.id,
        dest.id,
        opp.bestCargoType,
        route.id,
        state.galaxy.systems,
        state.galaxy.planets,
        state.interEmpireCargoLocks,
      ),
      cash: state.cash - opp.licenseFee,
    };
  }
  return state;
}

/** Queue the next priority tech when the research queue has drained. */
function queueNextTech(state: GameState): GameState {
  if (state.tech.queue.length > 0) return state;
  for (const id of TECH_PRIORITY) {
    const tech = instantUnlockOrQueue(id, state.tech);
    if (tech) return { ...state, tech };
  }
  return state;
}

/** Accept at most one profitable, completable contract per turn. */
function acceptProfitableContract(state: GameState): GameState {
  if (state.contracts.some((c) => c.status === ContractStatus.Active)) {
    return state;
  }
  const remainingTurns = state.maxTurns - state.turn + 1;
  const candidates = state.contracts
    .filter(
      (c) =>
        c.status === ContractStatus.Available &&
        c.rewardCash > c.depositPaid &&
        c.turnsRemaining <= remainingTurns &&
        c.depositPaid <= state.cash,
    )
    .sort((a, b) => b.rewardCash - a.rewardCash);
  if (candidates.length === 0) return state;
  const patch = acceptContract(candidates[0].id, state);
  return patch ? { ...state, ...patch } : state;
}

interface BalanceResult {
  seed: number;
  policy: Policy;
  rank: number;
  of: number;
  isWin: boolean;
  bankrupt: boolean;
  playerNetWorth: number;
  bestRivalNetWorth: number;
  bestRivalName: string;
  routes: number;
}

function runBalanceGame(seed: number, policy: Policy): BalanceResult {
  let state: GameState = createNewGame(
    seed,
    policy === "passive" ? "Passive Corp" : "Active Corp",
    "quick",
    GalaxyShape.Spiral,
  ).state;
  const rng = new SeededRNG(seed + 100);

  // Passive: one profitable route on turn 1, then nothing but End Turn.
  if (policy === "passive") {
    state = openBestRoute(state);
  }

  while (!state.gameOver) {
    if (policy === "active") {
      state = acceptProfitableContract(state);
      state = queueNextTech(state);
      while (state.activeRoutes.length < MAX_ACTIVE_ROUTES) {
        const before = state;
        state = openBestRoute(state);
        if (state === before) break;
      }
    }
    state = simulateTurn(state, rng);
  }

  const outcome = getGameOutcome(state);
  const rankings = rankCompanies(state);
  const player = rankings.find((r) => r.isPlayer)!;
  const bestRival = rankings
    .filter((r) => !r.isPlayer)
    .reduce((a, b) => (b.score > a.score ? b : a));

  return {
    seed,
    policy,
    rank: outcome.rank,
    of: outcome.of,
    isWin: outcome.isWin,
    bankrupt: outcome.kind === "bankruptcy",
    playerNetWorth: player.netWorth,
    bestRivalNetWorth: bestRival.netWorth,
    bestRivalName: bestRival.name,
    routes: state.activeRoutes.length,
  };
}

describe("player outcome balance (Quick, seeded headless)", () => {
  it("keeps passive in the bottom half and lets active reach #1", () => {
    const results = SEEDS.flatMap((seed) => [
      runBalanceGame(seed, "passive"),
      runBalanceGame(seed, "active"),
    ]);
    console.table(results);

    for (const result of results.filter((r) => r.policy === "passive")) {
      expect(
        result.rank * 2 > result.of,
        `seed ${result.seed}: passive rank ${result.rank}/${result.of} is not in the bottom half`,
      ).toBe(true);
    }

    const active = results.filter((r) => r.policy === "active");
    const wins = active.filter((r) => r.isWin).length;
    expect(
      wins,
      `active wins: ${active.map((r) => `${r.seed}:#${r.rank}`).join(", ")}`,
    ).toBeGreaterThanOrEqual(3);
    for (const result of active) {
      expect(
        result.bankrupt,
        `seed ${result.seed}: active policy went bankrupt`,
      ).toBe(false);
    }
  }, 300_000);
});
