import * as Phaser from "phaser";
import type { GameState, QueuedDiplomacyAction } from "../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../data/types.ts";
import { cooldownKey, isOnCooldown } from "../game/diplomacy/Cooldowns.ts";

const REPUTATION_THROTTLE_THRESHOLD = 75;
const THROTTLE_BASE = 2;
const THROTTLE_HIGH = 3;

function getPerTurnCap(state: GameState): number {
  return (state.reputation ?? 0) >= REPUTATION_THROTTLE_THRESHOLD
    ? THROTTLE_HIGH
    : THROTTLE_BASE;
}

/**
 * Pure helper: queue a diplomacy action onto the game state. Throws if the
 * (action, target) pair is on cooldown or the per-turn cap is reached. The
 * simulator drains the queue during the next simulation phase.
 */
export function queueDiplomacyAction(
  state: GameState,
  action: QueuedDiplomacyAction,
): GameState {
  const d = state.diplomacy ?? EMPTY_DIPLOMACY_STATE;
  const key = cooldownKey(action.kind, action.targetId, action.subjectId);
  if (isOnCooldown(d.cooldowns, key, state.turn)) {
    throw new Error(`Action on cooldown: ${key}`);
  }
  if (d.queuedActions.length >= getPerTurnCap(state)) {
    throw new Error("Per-turn diplomacy cap reached");
  }
  return {
    ...state,
    diplomacy: {
      ...d,
      queuedActions: [...d.queuedActions, action],
    },
  };
}

/**
 * Foreign Relations hub. Wave-1 ships a placeholder shell; the full hub UI
 * (left rail of empires/rivals + right pane with portrait + action buttons +
 * cooldown display) is wave-2 polish. In wave 1, players queue actions via
 * the upcoming wave-2 UI; the underlying queueDiplomacyAction helper is the
 * stable API for both the wave-1 placeholder and the wave-2 polish.
 */
export class DiplomacyScene extends Phaser.Scene {
  constructor() {
    super({ key: "DiplomacyScene" });
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.add
      .text(cx, cy - 16, "Foreign Relations", {
        fontFamily: "sans-serif",
        fontSize: "28px",
        color: "#e8d8a8",
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 24, "(Hub UI ships in wave 2 polish)", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#a8a890",
      })
      .setOrigin(0.5);
  }
}
