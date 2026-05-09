import { describe, expect, it } from "vitest";
import { CargoType } from "../types.ts";
import {
  getGoodCategory,
  GoodCategory,
  IMPORT_MULTIPLIER,
} from "../goodCategories.ts";

describe("goodCategories", () => {
  it("classifies food and rawMaterials as Bulk", () => {
    expect(getGoodCategory(CargoType.Food)).toBe(GoodCategory.Bulk);
    expect(getGoodCategory(CargoType.RawMaterials)).toBe(GoodCategory.Bulk);
  });

  it("classifies tech, hazmat, medical as Strategic", () => {
    expect(getGoodCategory(CargoType.Technology)).toBe(GoodCategory.Strategic);
    expect(getGoodCategory(CargoType.Hazmat)).toBe(GoodCategory.Strategic);
    expect(getGoodCategory(CargoType.Medical)).toBe(GoodCategory.Strategic);
  });

  it("classifies luxury and passengers as Premium", () => {
    expect(getGoodCategory(CargoType.Luxury)).toBe(GoodCategory.Premium);
    expect(getGoodCategory(CargoType.Passengers)).toBe(GoodCategory.Premium);
  });

  it("exposes IMPORT_MULTIPLIER for premium goods", () => {
    expect(IMPORT_MULTIPLIER).toBeCloseTo(1.25);
  });
});
