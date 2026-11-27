import { describe, it, expect } from "vitest";
import { getGameOutcome, rankCompanies } from "../ScoreCalculator.ts";
import type { GameState, AICompany, TechState } from "../../../data/types.ts";
import { AIPersonality } from "../../../data/types.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";

function makeTech(purchaseCount: Record<string, number> = {}): TechState {
  return {
    researchPoints: 0,
    completedTechIds: Object.keys(purchaseCount),
    currentResearchId: null,
    researchProgress: 0,
    purchaseCount,
    queue: [],
    committedBranches: [],
  };
}

function makeAI(id: string, name: string, cash: number): AICompany {
  return {
    id,
    name,
    empireId: `empire-${id}`,
    cash,
    activeRoutes: [],
    reputation: 0,
    totalCargoDelivered: 0,
    personality: AIPersonality.SteadyHauler,
    bankrupt: false,
    ceoName: "Rival",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
  };
}

function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 42,
    turn: 20,
    maxTurns: 20,
    phase: "planning",
    cash: 200_000,
    loans: [],
    reputation: 0,
    companyName: "Player Corp",
    ceoName: "Commander",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
    gameSize: "quick",
    galaxyShape: "spiral",
    playerEmpireId: "empire-1",
    galaxy: { sectors: [], empires: [], systems: [], planets: [] },
    activeRoutes: [],
    market: { fuelPrice: 12, fuelTrend: "stable", planetMarkets: {} },
    aiCompanies: [
      makeAI("1", "Alpha Ltd", 500_000),
      makeAI("2", "Beta Ltd", 100_000),
    ],
    activeEvents: [],
    history: [],
    storyteller: {
      playerHealthScore: 50,
      headwindBias: 0,
      turnsInDebt: 0,
      consecutiveProfitTurns: 0,
      turnsSinceLastDecision: 0,
    },
    score: 0,
    gameOver: true,
    gameOverReason: "completed",
    adviser: initAdviserState(),
    routeSlots: 4,
    unlockedEmpireIds: ["empire-1"],
    contracts: [],
    tech: makeTech(),
    empireTradePolicies: {},
    interEmpireCargoLocks: [],
    stationHub: null,
    saveVersion: 6,
    actionPoints: { current: 2, max: 2 },
    turnBrief: [],
    pendingChoiceEvents: [],
    activeEventChains: [],
    captains: [],
    routeMarket: [],
    researchEvents: [],
    unlockedNavTabs: ["map", "routes", "fleet", "finance"],
    reputationTier: "unknown",
    localRouteSlots: 2,
    ...overrides,
  };
}

describe("getGameOutcome", () => {
  it("declares victory only for first place", () => {
    const state = createTestState({ cash: 2_000_000 });
    expect(getGameOutcome(state)).toEqual({
      rank: 1,
      of: 3,
      isWin: true,
      kind: "victory",
      label: "VICTORY!",
    });
  });

  it("reports a middle placement without calling it a loss", () => {
    const outcome = getGameOutcome(createTestState());
    expect(outcome).toEqual({
      rank: 2,
      of: 3,
      isWin: false,
      kind: "placed",
      label: "FINISHED #2 OF 3",
    });
  });

  it("reports last place", () => {
    const state = createTestState({ cash: 50_000 });
    expect(getGameOutcome(state)).toEqual({
      rank: 3,
      of: 3,
      isWin: false,
      kind: "placed",
      label: "FINISHED #3 OF 3",
    });
  });

  it("shares first place on a tie", () => {
    const state = createTestState({
      aiCompanies: [makeAI("1", "Alpha Ltd", 200_000)],
      unlockedEmpireIds: [],
    });
    expect(getGameOutcome(state).kind).toBe("victory");
    expect(rankCompanies(state).map((r) => r.rank)).toEqual([1, 1]);
  });

  it("keeps bankruptcy a loss even when the score is highest", () => {
    const state = createTestState({
      cash: 2_000_000,
      gameOverReason: "bankruptcy",
    });
    expect(getGameOutcome(state)).toEqual({
      rank: 1,
      of: 3,
      isWin: false,
      kind: "bankruptcy",
      label: "BANKRUPTCY!",
    });
  });
});

describe("rankCompanies", () => {
  it("reports fleet capacity rather than route count", () => {
    const state = createTestState({
      tech: makeTech({ logistics_ai_1: 1 }),
    });
    const rankings = rankCompanies(state);
    expect(rankings.find((r) => r.isPlayer)?.fleetSize).toBe(14);
    expect(rankings.find((r) => r.isPlayer)?.routeCount).toBe(0);
    expect(rankings.filter((r) => !r.isPlayer).map((r) => r.fleetSize)).toEqual(
      [8, 8],
    );
  });
});
