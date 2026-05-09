import { describe, it, expect } from "vitest";
import { calculatePrice } from "../PriceCalculator.ts";
import { CargoType, SpecialId } from "../../../data/types.ts";
import type { CargoMarketEntry } from "../../../data/types.ts";
import { BASE_CARGO_PRICES } from "../../../data/constants.ts";
import { IMPORT_MULTIPLIER } from "../../../data/goodCategories.ts";
import { SPECIAL_PRICE_MULTIPLIER } from "../../../data/specialResources.ts";

function makeEntry(
  overrides: Partial<CargoMarketEntry> = {},
): CargoMarketEntry {
  return {
    baseSupply: 50,
    baseDemand: 50,
    currentPrice: 20,
    saturation: 0,
    trend: "stable",
    trendMomentum: 0,
    eventModifier: 1.0,
    ...overrides,
  };
}

describe("PriceCalculator", () => {
  describe("calculatePrice", () => {
    it("returns base price with all neutral modifiers", () => {
      // demandMultiplier = 50/50 = 1.0 (clamped to [0.5, 3.0])
      // saturation = 0 -> (1 - 0 * 0.6) = 1.0
      // trend = stable -> 1.0
      // eventModifier = 1.0
      // price = basePrice * 1.0 * 1.0 * 1.0 * 1.0
      const entry = makeEntry();
      const price = calculatePrice(entry, CargoType.Food);
      expect(price).toBeCloseTo(BASE_CARGO_PRICES[CargoType.Food], 1);
    });

    it("high saturation (0.8) significantly reduces price", () => {
      const entry = makeEntry({ saturation: 0.8 });
      const neutralEntry = makeEntry({ saturation: 0 });

      const highSatPrice = calculatePrice(entry, CargoType.Food);
      const neutralPrice = calculatePrice(neutralEntry, CargoType.Food);

      // With saturation 0.8: factor = (1 - 0.8 * 0.8) = 0.36
      // Price should be about 36% of neutral price
      expect(highSatPrice).toBeLessThan(neutralPrice * 0.4);
      expect(highSatPrice).toBeCloseTo(neutralPrice * 0.36, 1);
    });

    it("rising trend increases price by ~15%", () => {
      const risingEntry = makeEntry({ trend: "rising" });
      const stableEntry = makeEntry({ trend: "stable" });

      const risingPrice = calculatePrice(risingEntry, CargoType.Technology);
      const stablePrice = calculatePrice(stableEntry, CargoType.Technology);

      expect(risingPrice).toBeCloseTo(stablePrice * 1.15, 1);
    });

    it("falling trend decreases price by ~15%", () => {
      const fallingEntry = makeEntry({ trend: "falling" });
      const stableEntry = makeEntry({ trend: "stable" });

      const fallingPrice = calculatePrice(fallingEntry, CargoType.Technology);
      const stablePrice = calculatePrice(stableEntry, CargoType.Technology);

      expect(fallingPrice).toBeCloseTo(stablePrice * 0.85, 1);
    });

    it("event modifier of 1.5 increases price by 50%", () => {
      const eventEntry = makeEntry({ eventModifier: 1.5 });
      const normalEntry = makeEntry({ eventModifier: 1.0 });

      const eventPrice = calculatePrice(eventEntry, CargoType.Luxury);
      const normalPrice = calculatePrice(normalEntry, CargoType.Luxury);

      expect(eventPrice).toBeCloseTo(normalPrice * 1.5, 1);
    });

    it("all modifiers combine multiplicatively", () => {
      const entry = makeEntry({
        baseDemand: 100,
        baseSupply: 50,
        saturation: 0.5,
        trend: "rising",
        eventModifier: 1.2,
      });

      const price = calculatePrice(entry, CargoType.Food);
      const basePrice = BASE_CARGO_PRICES[CargoType.Food];

      // demandMultiplier = 100/50 = 2.0
      // saturationFactor = (1 - 0.5 * 0.8) = 0.6
      // trendModifier = 1.15
      // eventModifier = 1.2
      const expected = basePrice * 2.0 * 0.6 * 1.15 * 1.2;
      expect(price).toBeCloseTo(expected, 1);
    });

    it("clamps demand multiplier to minimum 0.5", () => {
      // Very low demand relative to supply
      const entry = makeEntry({ baseDemand: 1, baseSupply: 100 });
      const price = calculatePrice(entry, CargoType.Food);
      const basePrice = BASE_CARGO_PRICES[CargoType.Food];

      // Without clamping, ratio would be 0.01. Clamped to 0.5.
      expect(price).toBeCloseTo(basePrice * 0.5, 1);
    });

    it("clamps demand multiplier to maximum 3.0", () => {
      // Very high demand relative to supply
      const entry = makeEntry({ baseDemand: 100, baseSupply: 1 });
      const price = calculatePrice(entry, CargoType.Food);
      const basePrice = BASE_CARGO_PRICES[CargoType.Food];

      // Without clamping, ratio would be 100. Clamped to 3.0.
      expect(price).toBeCloseTo(basePrice * 3.0, 1);
    });

    it("works for all cargo types", () => {
      const entry = makeEntry();
      for (const cargoType of Object.values(CargoType)) {
        const price = calculatePrice(entry, cargoType);
        expect(price).toBeGreaterThan(0);
        expect(price).toBeCloseTo(BASE_CARGO_PRICES[cargoType], 1);
      }
    });
  });

  describe("PriceContext: cross-empire import multiplier", () => {
    it("applies 1.25x multiplier to Premium (Luxury) goods on cross-empire import", () => {
      const entry = makeEntry();
      const normalPrice = calculatePrice(entry, {
        cargoType: CargoType.Luxury,
      });
      const importPrice = calculatePrice(entry, {
        cargoType: CargoType.Luxury,
        isCrossEmpireImport: true,
      });
      expect(importPrice).toBeCloseTo(normalPrice * IMPORT_MULTIPLIER, 2);
    });

    it("applies 1.25x multiplier to Premium (Passengers) goods on cross-empire import", () => {
      const entry = makeEntry();
      const normalPrice = calculatePrice(entry, {
        cargoType: CargoType.Passengers,
      });
      const importPrice = calculatePrice(entry, {
        cargoType: CargoType.Passengers,
        isCrossEmpireImport: true,
      });
      expect(importPrice).toBeCloseTo(normalPrice * IMPORT_MULTIPLIER, 2);
    });

    it("does NOT apply import multiplier to non-Premium goods (Food)", () => {
      const entry = makeEntry();
      const normalPrice = calculatePrice(entry, { cargoType: CargoType.Food });
      const importPrice = calculatePrice(entry, {
        cargoType: CargoType.Food,
        isCrossEmpireImport: true,
      });
      expect(importPrice).toBeCloseTo(normalPrice, 2);
    });

    it("does NOT apply import multiplier to non-Premium goods (Technology)", () => {
      const entry = makeEntry();
      const normalPrice = calculatePrice(entry, {
        cargoType: CargoType.Technology,
      });
      const importPrice = calculatePrice(entry, {
        cargoType: CargoType.Technology,
        isCrossEmpireImport: true,
      });
      expect(importPrice).toBeCloseTo(normalPrice, 2);
    });

    it("import multiplier is not applied when isCrossEmpireImport is false/undefined", () => {
      const entry = makeEntry();
      const price1 = calculatePrice(entry, { cargoType: CargoType.Luxury });
      const price2 = calculatePrice(entry, {
        cargoType: CargoType.Luxury,
        isCrossEmpireImport: false,
      });
      expect(price1).toBeCloseTo(price2, 2);
    });
  });

  describe("PriceContext: special cargo premium", () => {
    it("special cargo uses 2.5x base price and ignores saturation", () => {
      const highSatEntry = makeEntry({ saturation: 1.0 });
      const price = calculatePrice(highSatEntry, {
        cargoType: CargoType.Luxury,
        specialId: SpecialId.LuxPleasureGarden,
      });
      const expected =
        BASE_CARGO_PRICES[CargoType.Luxury] * SPECIAL_PRICE_MULTIPLIER;
      expect(price).toBeCloseTo(expected, 2);
    });

    it("special cargo ignores demand/supply ratio", () => {
      // Normally high supply vs demand would depress price; special should not care
      const lowDemandEntry = makeEntry({ baseDemand: 1, baseSupply: 100 });
      const price = calculatePrice(lowDemandEntry, {
        cargoType: CargoType.Food,
        specialId: SpecialId.FoodGenesis,
      });
      const expected =
        BASE_CARGO_PRICES[CargoType.Food] * SPECIAL_PRICE_MULTIPLIER;
      expect(price).toBeCloseTo(expected, 2);
    });

    it("special cargo ignores trend modifiers", () => {
      const fallingEntry = makeEntry({ trend: "falling" });
      const price = calculatePrice(fallingEntry, {
        cargoType: CargoType.Technology,
        specialId: SpecialId.TechJokaero,
      });
      const expected =
        BASE_CARGO_PRICES[CargoType.Technology] * SPECIAL_PRICE_MULTIPLIER;
      expect(price).toBeCloseTo(expected, 2);
    });

    it("special cargo + cross-empire Premium stacks import multiplier on top", () => {
      const entry = makeEntry();
      const price = calculatePrice(entry, {
        cargoType: CargoType.Luxury,
        specialId: SpecialId.LuxPleasureGarden,
        isCrossEmpireImport: true,
      });
      const expected =
        BASE_CARGO_PRICES[CargoType.Luxury] *
        SPECIAL_PRICE_MULTIPLIER *
        IMPORT_MULTIPLIER;
      expect(price).toBeCloseTo(expected, 2);
    });

    it("special cargo with non-Premium type does NOT get import multiplier", () => {
      const entry = makeEntry();
      const price = calculatePrice(entry, {
        cargoType: CargoType.Food,
        specialId: SpecialId.FoodGenesis,
        isCrossEmpireImport: true,
      });
      const expected =
        BASE_CARGO_PRICES[CargoType.Food] * SPECIAL_PRICE_MULTIPLIER;
      expect(price).toBeCloseTo(expected, 2);
    });
  });
});
