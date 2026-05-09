import { describe, expect, it } from "vitest";
import { computeCompanyBonuses } from "../CompanyBonusCalculator.ts";
import { SpecialId } from "../../../data/types.ts";

describe("computeCompanyBonuses", () => {
  it("returns baseline zeros when no active routes", () => {
    const b = computeCompanyBonuses({ activeSpecialRoutes: [] });
    expect(b.fuelCostMultiplier).toBe(1.0);
    expect(b.hullCostMultiplier).toBe(1.0);
    expect(b.cargoCapacityBonus).toBe(0);
    expect(b.reputationGainMultiplier).toBe(1.0);
    expect(b.popGrowthMultiplier).toBe(1.0);
    expect(b.damageRecoveryMultiplier).toBe(1.0);
    expect(b.passengerPayoutMultiplier).toBe(1.0);
  });

  it("applies fuel cost reduction from HzmAntimatterTap", () => {
    const b = computeCompanyBonuses({
      activeSpecialRoutes: [SpecialId.HzmAntimatterTap],
    });
    // HzmAntimatterTap: fuelCost -10 → multiplier 0.9
    expect(b.fuelCostMultiplier).toBeCloseTo(0.9);
  });

  it("applies cargo capacity bonus from TechJokaero", () => {
    const b = computeCompanyBonuses({
      activeSpecialRoutes: [SpecialId.TechJokaero],
    });
    // TechJokaero: cargoCapacity +1 (flat)
    expect(b.cargoCapacityBonus).toBe(1);
  });

  it("stacks bonuses from multiple routes", () => {
    const b = computeCompanyBonuses({
      activeSpecialRoutes: [
        SpecialId.HzmAntimatterTap,
        SpecialId.RawAdamantine,
      ],
    });
    // HzmAntimatterTap: fuelCost -10
    // RawAdamantine: hullCost -10
    expect(b.fuelCostMultiplier).toBeCloseTo(0.9);
    expect(b.hullCostMultiplier).toBeCloseTo(0.9);
  });
});
