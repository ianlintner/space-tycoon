import { CargoType } from "../../data/types.ts";
import type { GameState, CargoType as CargoTypeT } from "../../data/types.ts";
import { calculateShipValue } from "../fleet/FleetManager.ts";

// ---------------------------------------------------------------------------
// High score types
// ---------------------------------------------------------------------------

export interface HighScore {
  name: string;
  score: number;
  seed: number;
  date: string;
}

const HIGH_SCORES_KEY = "sft_high_scores";
const MAX_HIGH_SCORES = 10;

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the final score for a game state.
 *
 * Formula:
 *   netWorth (cash + ship values - loan balances)
 *   + reputation * 100
 *   + totalCargoDelivered * 0.5
 *   + routeCount * 500
 */
export function calculateScore(state: GameState): number {
  // Net worth: cash + fleet value - loan balances
  const fleetValue = state.fleet.reduce(
    (sum, ship) => sum + calculateShipValue(ship),
    0,
  );
  const loanBalance = state.loans.reduce(
    (sum, loan) => sum + loan.remainingBalance,
    0,
  );
  const netWorth = state.cash + fleetValue - loanBalance;

  // Reputation bonus
  const reputationBonus = state.reputation * 100;

  // Total cargo delivered across all turns
  const allCargoTypes: CargoTypeT[] = Object.values(CargoType);
  let totalCargoDelivered = 0;
  for (const turnResult of state.history) {
    for (const ct of allCargoTypes) {
      totalCargoDelivered += turnResult.cargoDelivered[ct] ?? 0;
    }
  }
  const cargoBonus = totalCargoDelivered * 0.5;

  // Route count bonus
  const routeBonus = state.activeRoutes.length * 500;

  const score = netWorth + reputationBonus + cargoBonus + routeBonus;
  return Math.round(score);
}

// ---------------------------------------------------------------------------
// High score persistence (localStorage)
// ---------------------------------------------------------------------------

/**
 * Retrieve the current high scores from localStorage.
 */
export function getHighScores(): HighScore[] {
  try {
    const raw = localStorage.getItem(HIGH_SCORES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HighScore[];
  } catch {
    return [];
  }
}

/**
 * Save a new high score to localStorage. Keeps only the top 10 scores.
 */
export function saveHighScore(name: string, score: number, seed: number): void {
  const existing = getHighScores();

  const entry: HighScore = {
    name,
    score,
    seed,
    date: new Date().toISOString(),
  };

  const updated = [...existing, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HIGH_SCORES);

  localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(updated));
}
