import { describe, it, expect } from "vitest";
import { buildCharacterDialogConfig } from "../CharacterDialogModal.ts";
import type { CharacterPortrait } from "../../data/types.ts";

const portrait: CharacterPortrait = { portraitId: "p1", category: "human" };

describe("buildCharacterDialogConfig", () => {
  it("returns ambassador-tier styling tokens (muted, smaller portrait, no fade)", () => {
    const cfg = buildCharacterDialogConfig({
      speaker: { name: "Krell", subtitle: "Vex Hegemony", portrait },
      speakerTier: "ambassador",
      flavor: "Greetings.",
      options: [{ id: "ok", label: "OK", outcomeDescription: "", effects: [] }],
    });
    expect(cfg.frameStyle).toBe("muted");
    expect(cfg.portraitSize).toBeLessThan(200);
    expect(cfg.fadeMs).toBe(0);
    expect(cfg.headerColor).toBeDefined();
  });

  it("returns ruler-tier styling tokens (gold, larger portrait, fade)", () => {
    const cfg = buildCharacterDialogConfig({
      speaker: { name: "Vex IX", subtitle: "Emperor", portrait },
      speakerTier: "ruler",
      flavor: "Audience granted.",
      options: [{ id: "ok", label: "OK", outcomeDescription: "", effects: [] }],
    });
    expect(cfg.frameStyle).toBe("gold");
    expect(cfg.portraitSize).toBeGreaterThan(200);
    expect(cfg.fadeMs).toBeGreaterThan(0);
  });
});
