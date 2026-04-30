import { describe, it, expect } from "vitest";
import { queueDiplomacyAction } from "../DiplomacyScene.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../data/types.ts";
import type { GameState, QueuedDiplomacyAction } from "../../data/types.ts";

function baseState(): GameState {
  return {
    seed: 1,
    turn: 5,
    cash: 100_000,
    reputation: 50,
    diplomacy: { ...EMPTY_DIPLOMACY_STATE },
  } as unknown as GameState;
}

describe("queueDiplomacyAction", () => {
  it("appends to queuedActions", () => {
    const a: QueuedDiplomacyAction = {
      id: "a1",
      kind: "giftEmpire",
      targetId: "vex",
      cashCost: 10_000,
    };
    const next = queueDiplomacyAction(baseState(), a);
    expect(next.diplomacy!.queuedActions).toHaveLength(1);
    expect(next.diplomacy!.queuedActions[0]?.id).toBe("a1");
  });

  it("rejects when cooldown active for the (kind, target) key", () => {
    const s = baseState();
    s.diplomacy = {
      ...s.diplomacy!,
      cooldowns: { "giftEmpire:vex": 10 },
    };
    const a: QueuedDiplomacyAction = {
      id: "a1",
      kind: "giftEmpire",
      targetId: "vex",
      cashCost: 10_000,
    };
    expect(() => queueDiplomacyAction(s, a)).toThrow(/cooldown/i);
  });

  it("rejects when per-turn cap reached", () => {
    const s = baseState();
    s.diplomacy = {
      ...s.diplomacy!,
      queuedActions: [
        { id: "x1", kind: "giftEmpire", targetId: "vex", cashCost: 0 },
        { id: "x2", kind: "giftEmpire", targetId: "sol", cashCost: 0 },
      ],
    };
    expect(() =>
      queueDiplomacyAction(s, {
        id: "x3",
        kind: "surveil",
        targetId: "chen",
        surveilLens: "cash",
        cashCost: 0,
      }),
    ).toThrow(/cap/i);
  });

  it("uses a higher cap when reputation tier >= renowned (>= 75)", () => {
    const s = { ...baseState(), reputation: 80 };
    s.diplomacy = {
      ...s.diplomacy!,
      queuedActions: [
        { id: "x1", kind: "giftEmpire", targetId: "vex", cashCost: 0 },
        { id: "x2", kind: "giftEmpire", targetId: "sol", cashCost: 0 },
      ],
    };
    // At rep 80 the cap is 3, so a third action should succeed.
    const next = queueDiplomacyAction(s, {
      id: "x3",
      kind: "surveil",
      targetId: "chen",
      surveilLens: "cash",
      cashCost: 0,
    });
    expect(next.diplomacy!.queuedActions).toHaveLength(3);
  });
});
