import type {
  CargoMarketEntry,
  CargoType,
  SpecialId,
} from "../../data/types.ts";
import {
  BASE_CARGO_PRICES,
  SATURATION_PRICE_IMPACT,
} from "../../data/constants.ts";
import {
  getGoodCategory,
  IMPORT_MULTIPLIER,
  GoodCategory,
} from "../../data/goodCategories.ts";
import { SPECIAL_PRICE_MULTIPLIER } from "../../data/specialResources.ts";

export interface PriceContext {
  cargoType: CargoType;
  isCrossEmpireImport?: boolean;
  specialId?: SpecialId;
}

/**
 * Calculate the current price for a cargo type at a given market entry.
 *
 * Formula (normal):
 *   price = basePrice * demandMultiplier * (1 - saturation * SATURATION_PRICE_IMPACT) * trendModifier * eventModifier
 *
 * Special cargo formula (skips saturation/supply adjustment):
 *   price = basePrice * SPECIAL_PRICE_MULTIPLIER (2.5)
 *
 * Additional modifiers:
 *   - Cross-empire import of Premium goods (Luxury/Passengers): × IMPORT_MULTIPLIER (1.25)
 *
 * Where (normal path):
 *   - basePrice comes from BASE_CARGO_PRICES
 *   - demandMultiplier = baseDemand / baseSupply, clamped to [0.5, 3.0]
 *   - saturation is 0-1 (0-100%)
 *   - trendModifier: rising=1.15, stable=1.0, falling=0.85
 *   - eventModifier from CargoMarketEntry.eventModifier (default 1.0)
 */
export function calculatePrice(
  entry: CargoMarketEntry,
  cargoTypeOrContext: CargoType | PriceContext,
): number {
  // Support both legacy signature (cargoType) and new PriceContext signature
  const ctx: PriceContext =
    typeof cargoTypeOrContext === "string"
      ? { cargoType: cargoTypeOrContext }
      : cargoTypeOrContext;

  const { cargoType, isCrossEmpireImport, specialId } = ctx;
  const basePrice = BASE_CARGO_PRICES[cargoType];

  let price: number;

  if (specialId !== undefined) {
    // Special cargo: flat multiplier on base price, ignores saturation/supply
    price = basePrice * SPECIAL_PRICE_MULTIPLIER;
  } else {
    // Normal price calculation
    // Demand/supply ratio, clamped to [0.5, 3.0]
    const rawRatio = entry.baseDemand / entry.baseSupply;
    const demandMultiplier = Math.min(3.0, Math.max(0.5, rawRatio));

    // Saturation reduces price: 0 saturation = no reduction, 1.0 saturation = 80% reduction
    const saturationFactor = 1 - entry.saturation * SATURATION_PRICE_IMPACT;

    // Trend modifier
    const trendModifier = getTrendModifier(entry.trend);

    // Event modifier (default 1.0)
    const eventModifier = entry.eventModifier;

    price =
      basePrice *
      demandMultiplier *
      saturationFactor *
      trendModifier *
      eventModifier;
  }

  // Cross-empire import multiplier: only applies to Premium goods (Luxury, Passengers)
  if (
    isCrossEmpireImport &&
    getGoodCategory(cargoType) === GoodCategory.Premium
  ) {
    price *= IMPORT_MULTIPLIER;
  }

  // Round to 2 decimal places
  return Math.round(price * 100) / 100;
}

function getTrendModifier(trend: CargoMarketEntry["trend"]): number {
  switch (trend) {
    case "rising":
      return 1.15;
    case "stable":
      return 1.0;
    case "falling":
      return 0.85;
  }
}
