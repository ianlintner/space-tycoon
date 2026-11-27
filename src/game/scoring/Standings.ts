import type { GameState } from "../../data/types.ts";
import { rankCompanies } from "./ScoreCalculator.ts";

/** Rivals tab (and therefore the standings view) unlocks on this turn. */
export const STANDINGS_UNLOCK_TURN = 5;

export interface StandingsSnapshot {
  rank: number;
  of: number;
  /** Score the player needs to gain to tie #1 (0 when leading or tied). */
  gapToLeader: number;
  /** Score lead over the best rival (0 when not leading). */
  leadOverSecond: number;
  leaderName: string;
  leaderNetWorth: number;
  leaderIsPlayer: boolean;
}

/** Derived from the shared rankCompanies() — no second scoring path. */
export function getStandings(state: GameState): StandingsSnapshot {
  const rankings = rankCompanies(state);
  const player = rankings.find((r) => r.isPlayer) ?? rankings[0];
  const leader = rankings[0];
  const runnerUp = rankings.find((r) => !r.isPlayer);
  return {
    rank: player.rank,
    of: rankings.length,
    gapToLeader: Math.max(0, leader.score - player.score),
    leadOverSecond:
      player.rank === 1 && runnerUp
        ? Math.max(0, player.score - runnerUp.score)
        : 0,
    leaderName: leader.name,
    leaderNetWorth: leader.netWorth,
    leaderIsPlayer: leader.isPlayer,
  };
}

function money(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n >= 1_000_000) return `§${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `§${Math.round(n / 1000)}K`;
  return `§${n.toLocaleString("en-US")}`;
}

/** "Rank #3/5 · −§12K to #1", "Rank #1/5 · +§4,200 lead"; compact: "#3/5". */
export function formatStandingsChip(
  s: Pick<StandingsSnapshot, "rank" | "of" | "gapToLeader" | "leadOverSecond">,
  compact = false,
): string {
  if (compact) return `#${s.rank}/${s.of}`;
  const head = `Rank #${s.rank}/${s.of}`;
  if (s.rank === 1) {
    return s.leadOverSecond > 0
      ? `${head} · +${money(s.leadOverSecond)} lead`
      : `${head} · leading`;
  }
  return `${head} · −${money(s.gapToLeader)} to #1`;
}

/** "▲2" (moved up), "▼1" (moved down), "＝" unchanged, "" when no prior rank. */
export function formatRankDelta(
  previous: number | undefined,
  current: number,
): string {
  if (previous === undefined) return "";
  if (current < previous) return `▲${previous - current}`;
  if (current > previous) return `▼${current - previous}`;
  return "=";
}
