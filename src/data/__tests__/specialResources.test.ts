import { describe, expect, it } from "vitest";
import { CargoType, PlanetType, SpecialId } from "../types.ts";
import {
  SPECIALS,
  getSpecial,
  SPECIAL_PRICE_MULTIPLIER,
} from "../specialResources.ts";

describe("specialResources", () => {
  it("defines exactly 7 specials, one per cargo type", () => {
    expect(Object.keys(SPECIALS).length).toBe(7);
    const cargoTypes = new Set(
      Object.values(SPECIALS).map((s) => s.parentCargo),
    );
    expect(cargoTypes.size).toBe(7);
  });

  it("each special has a parent PlanetType matching parent cargo", () => {
    expect(getSpecial(SpecialId.FoodGenesis).parentPlanetType).toBe(
      PlanetType.Agricultural,
    );
    expect(getSpecial(SpecialId.TechJokaero).parentPlanetType).toBe(
      PlanetType.TechWorld,
    );
    expect(getSpecial(SpecialId.LuxPleasureGarden).parentPlanetType).toBe(
      PlanetType.LuxuryWorld,
    );
  });

  it("special price multiplier is 2.5", () => {
    expect(SPECIAL_PRICE_MULTIPLIER).toBeCloseTo(2.5);
  });

  it("each special declares an active-route bonus shape", () => {
    for (const s of Object.values(SPECIALS)) {
      expect(typeof s.activeRouteBonus.kind).toBe("string");
      expect(typeof s.activeRouteBonus.amount).toBe("number");
    }
  });
});
