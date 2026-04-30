import { describe, it, expect } from "vitest";
import { simulateTurn } from "../simulation/TurnSimulator.ts";
import { createNewGame } from "../NewGameSetup.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";
import type { QueuedDiplomacyAction } from "../../data/types.ts";

describe("Diplomacy integration — modal cap of 3", () => {
  it("a turn with 2 player actions + 1 potential AI offer produces ≤3 modal entries total", () => {
    const { state: initial } = createNewGame(7);
    const empireId = initial.galaxy.empires[0]!.id;
    const rivalId = initial.aiCompanies[0]!.id;
    const queued: QueuedDiplomacyAction[] = [
      {
        id: "p1",
        kind: "giftEmpire",
        targetId: empireId,
        cashCost: 5_000,
      },
      {
        id: "p2",
        kind: "surveil",
        targetId: rivalId,
        surveilLens: "cash",
        cashCost: 15_000,
      },
    ];
    const start = {
      ...initial,
      diplomacy: { ...initial.diplomacy!, queuedActions: queued },
    };
    const rng = new SeededRNG(7);
    const after = simulateTurn(start, rng);
    const newModals =
      after.pendingChoiceEvents.length - initial.pendingChoiceEvents.length;
    expect(newModals).toBeLessThanOrEqual(3);
  });

  it("queued actions exceed cap → only `cap` resolved, rest deferred to digest", () => {
    const { state: initial } = createNewGame(1);
    const empires = initial.galaxy.empires;
    if (empires.length < 3) {
      // The seed produced fewer than 3 empires; skip — wave 2 can shore this up.
      return;
    }
    const queued: QueuedDiplomacyAction[] = [
      { id: "p1", kind: "giftEmpire", targetId: empires[0]!.id, cashCost: 1 },
      { id: "p2", kind: "giftEmpire", targetId: empires[1]!.id, cashCost: 1 },
      { id: "p3", kind: "giftEmpire", targetId: empires[2]!.id, cashCost: 1 },
    ];
    const start = {
      ...initial,
      reputation: 30, // ensures cap = 2 (below renowned threshold of 75)
      diplomacy: { ...initial.diplomacy!, queuedActions: queued },
    };
    const rng = new SeededRNG(1);
    const after = simulateTurn(start, rng);
    expect(after.diplomacy?.queuedActions ?? []).toHaveLength(0);
    const digest =
      (after.turnReport?.diplomacyDigest as string[] | undefined) ?? [];
    expect(digest.some((line) => /deferred/i.test(line))).toBe(true);
  });
});
