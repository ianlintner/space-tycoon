import { describe, it, expect } from "vitest";
import { resolveGiftEmpire, resolveGiftRival } from "../DiplomacyResolver.ts";
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
      rivalStanding: { chen: 50 },
      empireTags: { vex: [] },
      rivalTags: { chen: [] },
    },
  } as unknown as GameState;
}

describe("resolveGiftEmpire", () => {
  it("on success: raises standing, RecentlyGifted tag, deducts cash, sets cooldown", () => {
    const rng = new SeededRNG(1);
    const action: QueuedDiplomacyAction = {
      id: "a1",
      kind: "giftEmpire",
      targetId: "vex",
      cashCost: 10_000,
    };
    const out = resolveGiftEmpire(baseState(), action, rng);
    if (out.success) {
      expect(out.nextState.empireReputation!.vex).toBeGreaterThan(50);
      expect(out.nextState.cash).toBe(90_000);
      expect(
        out.nextState.diplomacy!.empireTags.vex!.some(
          (t) => t.kind === "RecentlyGifted",
        ),
      ).toBe(true);
      expect(out.nextState.diplomacy!.cooldowns["giftEmpire:vex"]).toBe(8);
      expect(out.nextState.diplomacy!.actionsResolvedThisTurn).toBe(1);
    } else {
      // refund path: 50% of cashCost
      expect(out.nextState.cash).toBe(95_000);
      expect(out.nextState.empireReputation!.vex).toBe(50);
      expect(out.modalEntries.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("applies cross-target dampener when any other empire has RecentlyGifted", () => {
    const s = baseState();
    s.empireReputation = { ...s.empireReputation, sol: 50, vex: 50 };
    s.diplomacy = {
      ...s.diplomacy!,
      empireTags: {
        ...s.diplomacy!.empireTags,
        sol: [{ kind: "RecentlyGifted", expiresOnTurn: 10 }],
      },
    };
    // Try multiple seeds to find a successful roll, then check the delta is halved.
    for (let seed = 1; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveGiftEmpire(
        s,
        {
          id: "a",
          kind: "giftEmpire",
          targetId: "vex",
          cashCost: 10_000,
        },
        rng,
      );
      if (out.success) {
        // Standing change should be +4 (halved from +8) instead of +8.
        expect(out.nextState.empireReputation!.vex).toBe(54);
        return;
      }
    }
    throw new Error("no successful gift roll found across seeds");
  });

  it("applies diminishing returns above standing 70", () => {
    const s = baseState();
    s.empireReputation = { ...s.empireReputation, vex: 76 };
    for (let seed = 1; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveGiftEmpire(
        s,
        {
          id: "a",
          kind: "giftEmpire",
          targetId: "vex",
          cashCost: 10_000,
        },
        rng,
      );
      if (out.success) {
        // raw +8 * (100-76)/30 = 6.4 -> floor to 6 -> 76 + 6 = 82.
        expect(out.nextState.empireReputation!.vex).toBeGreaterThan(76);
        expect(out.nextState.empireReputation!.vex).toBeLessThan(84);
        return;
      }
    }
    throw new Error("no successful gift roll found across seeds");
  });

  it("on failure: refunds 50% cash, surfaces modal, no standing change", () => {
    for (let seed = 1; seed < 500; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveGiftEmpire(
        baseState(),
        {
          id: "a",
          kind: "giftEmpire",
          targetId: "vex",
          cashCost: 10_000,
        },
        rng,
      );
      if (out.success === false) {
        expect(out.nextState.cash).toBe(95_000);
        expect(out.nextState.empireReputation!.vex).toBe(50);
        expect(out.modalEntries.length).toBeGreaterThanOrEqual(1);
        expect(out.modalEntries[0]!.speakerKind).toBe("empireAmbassador");
        return;
      }
    }
    throw new Error("no failing gift roll found across seeds");
  });

  it("sets cooldown via cooldownKey('giftEmpire', targetId) with state.turn + 3", () => {
    const rng = new SeededRNG(1);
    const out = resolveGiftEmpire(
      baseState(),
      { id: "a", kind: "giftEmpire", targetId: "vex", cashCost: 10_000 },
      rng,
    );
    expect(out.nextState.diplomacy!.cooldowns["giftEmpire:vex"]).toBe(8);
  });

  it("sometimes adds OweFavor on success (probabilistic across seeds)", () => {
    let foundOweFavor = false;
    for (let seed = 1; seed < 500 && !foundOweFavor; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveGiftEmpire(
        baseState(),
        { id: "a", kind: "giftEmpire", targetId: "vex", cashCost: 10_000 },
        rng,
      );
      if (
        out.success &&
        out.nextState.diplomacy!.empireTags.vex!.some(
          (t) => t.kind === "OweFavor",
        )
      ) {
        foundOweFavor = true;
      }
    }
    expect(foundOweFavor).toBe(true);
  });

  it("surfaces tier-transition modal when standing crosses a tier boundary", () => {
    const s = baseState();
    s.empireReputation = { vex: 59 }; // Neutral max -> Warm with +8
    for (let seed = 1; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveGiftEmpire(
        s,
        { id: "a", kind: "giftEmpire", targetId: "vex", cashCost: 10_000 },
        rng,
      );
      if (out.success) {
        expect(out.nextState.empireReputation!.vex).toBeGreaterThanOrEqual(60);
        expect(out.modalEntries.some((m) => m.headline === "Tier shift")).toBe(
          true,
        );
        return;
      }
    }
    throw new Error("no successful gift roll found across seeds");
  });
});

describe("resolveGiftRival", () => {
  it("on success: raises standing, RecentlyGifted tag, deducts cash", () => {
    for (let seed = 1; seed < 500; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveGiftRival(
        baseState(),
        {
          id: "a",
          kind: "giftRival",
          targetId: "chen",
          cashCost: 5_000,
        },
        rng,
      );
      if (out.success) {
        expect(out.nextState.diplomacy!.rivalStanding.chen).toBeGreaterThan(50);
        expect(out.nextState.cash).toBe(95_000);
        expect(
          out.nextState.diplomacy!.rivalTags.chen!.some(
            (t) => t.kind === "RecentlyGifted",
          ),
        ).toBe(true);
        expect(out.nextState.diplomacy!.cooldowns["giftRival:chen"]).toBe(8);
        return;
      }
    }
    throw new Error("no successful rival gift roll found across seeds");
  });

  it("on failure: refunds 50% cash, surfaces modal, no standing change", () => {
    for (let seed = 1; seed < 1000; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveGiftRival(
        baseState(),
        {
          id: "a",
          kind: "giftRival",
          targetId: "chen",
          cashCost: 5_000,
        },
        rng,
      );
      if (out.success === false) {
        expect(out.nextState.cash).toBe(97_500);
        expect(out.nextState.diplomacy!.rivalStanding.chen).toBe(50);
        expect(out.modalEntries[0]!.speakerKind).toBe("rivalLiaison");
        return;
      }
    }
    throw new Error("no failing rival gift roll found across seeds");
  });

  it("applies cross-target dampener when any other rival has RecentlyGifted", () => {
    const s = baseState();
    s.diplomacy = {
      ...s.diplomacy!,
      rivalStanding: { ...s.diplomacy!.rivalStanding, kade: 50 },
      rivalTags: {
        ...s.diplomacy!.rivalTags,
        kade: [{ kind: "RecentlyGifted", expiresOnTurn: 10 }],
      },
    };
    for (let seed = 1; seed < 500; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveGiftRival(
        s,
        { id: "a", kind: "giftRival", targetId: "chen", cashCost: 5_000 },
        rng,
      );
      if (out.success) {
        // base +6 * 0.5 = 3.
        expect(out.nextState.diplomacy!.rivalStanding.chen).toBe(53);
        return;
      }
    }
    throw new Error("no successful rival gift roll found across seeds");
  });
});
