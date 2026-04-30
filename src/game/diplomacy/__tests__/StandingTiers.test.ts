import { describe, it, expect } from "vitest";
import {
  getStandingTier,
  isTierTransition,
  STANDING_TIERS,
} from "../StandingTiers.ts";

describe("StandingTiers", () => {
  it("classifies values into tiers at boundaries", () => {
    expect(getStandingTier(0)).toBe("Hostile");
    expect(getStandingTier(19)).toBe("Hostile");
    expect(getStandingTier(20)).toBe("Cold");
    expect(getStandingTier(39)).toBe("Cold");
    expect(getStandingTier(40)).toBe("Neutral");
    expect(getStandingTier(59)).toBe("Neutral");
    expect(getStandingTier(60)).toBe("Warm");
    expect(getStandingTier(79)).toBe("Warm");
    expect(getStandingTier(80)).toBe("Allied");
    expect(getStandingTier(100)).toBe("Allied");
  });

  it("clamps out-of-range values", () => {
    expect(getStandingTier(-5)).toBe("Hostile");
    expect(getStandingTier(150)).toBe("Allied");
  });

  it("detects tier transitions in either direction", () => {
    expect(isTierTransition(19, 20)).toBe(true);
    expect(isTierTransition(20, 19)).toBe(true);
    expect(isTierTransition(40, 50)).toBe(false);
    expect(isTierTransition(40, 40)).toBe(false);
  });

  it("exposes tier metadata", () => {
    expect(STANDING_TIERS.length).toBe(5);
    expect(STANDING_TIERS[0]).toMatchObject({ name: "Hostile", min: 0 });
  });
});
