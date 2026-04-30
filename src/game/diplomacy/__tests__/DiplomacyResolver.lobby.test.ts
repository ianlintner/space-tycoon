import { describe, it, expect } from "vitest";
import { resolveLobby } from "../DiplomacyResolver.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type { GameState, QueuedDiplomacyAction } from "../../../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../../data/types.ts";

function baseState(): GameState {
  return {
    seed: 1,
    turn: 5,
    cash: 100_000,
    empireReputation: { vex: 50 },
    diplomacy: {
      ...EMPTY_DIPLOMACY_STATE,
      rivalStanding: { chen: 50, kade: 50 },
      empireTags: { vex: [] },
      rivalTags: { chen: [], kade: [] },
      crossEmpireRivalStanding: { vex: { chen: 50 } },
    },
  } as unknown as GameState;
}

describe("resolveLobby", () => {
  it("throws when subjectId is missing", () => {
    const rng = new SeededRNG(1);
    const action: QueuedDiplomacyAction = {
      id: "a1",
      kind: "lobbyFor",
      targetId: "vex",
      cashCost: 5_000,
    };
    expect(() => resolveLobby(baseState(), action, rng)).toThrow();
  });

  it("lobbyFor on success raises crossEmpireRivalStanding by +10", () => {
    for (let seed = 1; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const action: QueuedDiplomacyAction = {
        id: "a1",
        kind: "lobbyFor",
        targetId: "vex",
        subjectId: "chen",
        cashCost: 5_000,
      };
      const out = resolveLobby(baseState(), action, rng);
      if (out.success) {
        expect(
          out.nextState.diplomacy!.crossEmpireRivalStanding!.vex!.chen,
        ).toBe(60);
        expect(out.nextState.cash).toBe(95_000);
        return;
      }
    }
    throw new Error("no successful lobby roll found across seeds");
  });

  it("lobbyAgainst on success lowers crossEmpireRivalStanding by 10", () => {
    for (let seed = 1; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const action: QueuedDiplomacyAction = {
        id: "a1",
        kind: "lobbyAgainst",
        targetId: "vex",
        subjectId: "chen",
        cashCost: 5_000,
      };
      const out = resolveLobby(baseState(), action, rng);
      if (out.success) {
        expect(
          out.nextState.diplomacy!.crossEmpireRivalStanding!.vex!.chen,
        ).toBe(40);
        return;
      }
    }
    throw new Error("no successful lobby roll found across seeds");
  });

  it("on failure: 50% refund and digest entry, no standing change", () => {
    for (let seed = 1; seed < 500; seed++) {
      const rng = new SeededRNG(seed);
      const action: QueuedDiplomacyAction = {
        id: "a1",
        kind: "lobbyFor",
        targetId: "vex",
        subjectId: "chen",
        cashCost: 5_000,
      };
      const out = resolveLobby(baseState(), action, rng);
      if (!out.success) {
        expect(
          out.nextState.diplomacy!.crossEmpireRivalStanding!.vex!.chen,
        ).toBe(50);
        expect(out.nextState.cash).toBe(97_500);
        expect(out.digestEntries.length).toBeGreaterThanOrEqual(1);
        return;
      }
    }
    throw new Error("no failing lobby roll found across seeds");
  });

  it("OweFavor tag on target empire boosts success rate", () => {
    function successRate(
      empireTags: GameState["diplomacy"] extends infer _D
        ? readonly { kind: string; expiresOnTurn: number }[]
        : never,
    ): number {
      let successes = 0;
      const trials = 400;
      for (let seed = 1; seed <= trials; seed++) {
        const s = baseState();
        s.diplomacy = {
          ...s.diplomacy!,
          empireTags: { vex: empireTags as never },
        };
        const rng = new SeededRNG(seed);
        const out = resolveLobby(
          s,
          {
            id: "a",
            kind: "lobbyFor",
            targetId: "vex",
            subjectId: "chen",
            cashCost: 5_000,
          },
          rng,
        );
        if (out.success) successes++;
      }
      return successes / trials;
    }

    const without = successRate([]);
    const withOwe = successRate([
      { kind: "OweFavor", expiresOnTurn: 100 },
    ] as never);
    expect(withOwe).toBeGreaterThan(without);
  });

  it("writes compound cooldown key 'lobbyFor:vex:chen' = state.turn + 4", () => {
    const rng = new SeededRNG(1);
    const out = resolveLobby(
      baseState(),
      {
        id: "a1",
        kind: "lobbyFor",
        targetId: "vex",
        subjectId: "chen",
        cashCost: 5_000,
      },
      rng,
    );
    expect(out.nextState.diplomacy!.cooldowns["lobbyFor:vex:chen"]).toBe(9);
  });

  it("lazy init: works when crossEmpireRivalStanding is missing the empire entry", () => {
    const s = baseState();
    s.diplomacy = {
      ...s.diplomacy!,
      crossEmpireRivalStanding: {},
    };
    for (let seed = 1; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveLobby(
        s,
        {
          id: "a1",
          kind: "lobbyFor",
          targetId: "vex",
          subjectId: "chen",
          cashCost: 5_000,
        },
        rng,
      );
      if (out.success) {
        expect(
          out.nextState.diplomacy!.crossEmpireRivalStanding!.vex!.chen,
        ).toBe(60);
        return;
      }
    }
    throw new Error("no successful lobby roll found across seeds");
  });

  it("increments actionsResolvedThisTurn", () => {
    const rng = new SeededRNG(1);
    const out = resolveLobby(
      baseState(),
      {
        id: "a1",
        kind: "lobbyFor",
        targetId: "vex",
        subjectId: "chen",
        cashCost: 5_000,
      },
      rng,
    );
    expect(out.nextState.diplomacy!.actionsResolvedThisTurn).toBe(1);
  });
});
