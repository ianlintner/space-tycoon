import { CargoType, RouteScope } from "../../../data/types.ts";
import type {
  AICompany,
  GameState,
  MarketState,
  CargoType as CargoTypeT,
} from "../../../data/types.ts";
import {
  DISTANCE_PREMIUM_RATE,
  DISTANCE_PREMIUM_CAP,
  CAPACITY_COST_BY_SCOPE,
} from "../../../data/constants.ts";
import {
  calculateTripsPerTurn,
  getRouteScope,
  getScopeDemandMultiplier,
} from "../../routes/RouteManager.ts";
import { calculatePrice } from "../../economy/PriceCalculator.ts";
import { calculateTariff } from "../../routes/TariffCalculator.ts";
import type { SeededRNG } from "../../../utils/SeededRNG.ts";
import { isRouteGrounded } from "../../events/EventEngine.ts";
import { applyAIHubBonuses } from "./aiHubStep.ts";

// ---------------------------------------------------------------------------
// Route simulation for one AI company (capacity-pool model)
// ---------------------------------------------------------------------------

export interface AIRouteResult {
  revenue: number;
  fuelCost: number;
  tariffCost: number;
  totalCargo: number;
  deliveries: Map<string, Map<CargoTypeT, number>>;
}

/**
 * Simulate all active routes for one AI company for one turn.
 *
 * Uses the same capacity-pool model as TurnSimulator (no per-ship simulation).
 * Revenue is based on standardized base capacities (80 freight / 60 passenger)
 * and scope demand multipliers, keeping AI and player on a single economy.
 */
export function simulateAIRoutes(
  company: AICompany,
  state: GameState,
  market: MarketState,
  rng: SeededRNG,
): AIRouteResult {
  // rng is accepted for API compatibility (future breakdown checks, etc.)
  void rng;

  let totalRevenue = 0;
  let totalFuelCost = 0;
  let totalTariffCost = 0;
  let totalCargo = 0;

  const deliveries = new Map<string, Map<CargoTypeT, number>>();

  for (const route of company.activeRoutes) {
    if (!route.cargoType) continue;
    if (route.paused) continue;

    // Skip grounded routes (embargoes, blockades, border closures)
    const grounded = isRouteGrounded(
      route,
      state.activeEvents,
      state.galaxy.systems,
      state.galaxy.planets,
    );
    if (grounded) continue;

    const scope = getRouteScope(route, state);
    const isPassengers = route.cargoType === CargoType.Passengers;

    // Standardized base capacity (matches TurnSimulator's capacity-pool model)
    const baseCapacity = isPassengers ? 60 : 80;
    const baseSpeed = isPassengers ? 5 : 4;
    const trips = calculateTripsPerTurn(route.distance, baseSpeed);

    const destMarket = market.planetMarkets[route.destinationPlanetId];
    if (!destMarket) continue;

    const destEntry = destMarket[route.cargoType];
    const price = calculatePrice(destEntry, route.cargoType);

    const moved = baseCapacity * trips;

    // Apply the same scope-based revenue curve the player uses
    const scopeMult = getScopeDemandMultiplier(route.cargoType, scope);
    const distancePremium =
      scope === RouteScope.System
        ? 0
        : Math.min(
            DISTANCE_PREMIUM_CAP,
            route.distance * DISTANCE_PREMIUM_RATE,
          );
    const revenueMultiplier = scopeMult * (1 + distancePremium);

    let revenue = price * moved * revenueMultiplier;

    // Fuel cost: scope-cost-based (matches TurnSimulator)
    const scopeCost = CAPACITY_COST_BY_SCOPE[scope] ?? 1;
    let fuelCost = scopeCost * 2 * market.fuelPrice * trips;

    // Apply AI hub bonuses to route economics
    const hubBonuses = applyAIHubBonuses(revenue, fuelCost, 0, company.aiHub);
    revenue = hubBonuses.revenue;
    fuelCost = hubBonuses.fuel;

    // Tariff
    const tariff = calculateTariff(
      route,
      revenue,
      company.empireId,
      state.galaxy.systems,
      state.galaxy.empires,
    );

    totalRevenue += revenue;
    totalFuelCost += fuelCost;
    totalTariffCost += tariff;
    totalCargo += moved;

    // Track deliveries for saturation
    if (moved > 0) {
      if (!deliveries.has(route.destinationPlanetId)) {
        deliveries.set(route.destinationPlanetId, new Map());
      }
      const planetMap = deliveries.get(route.destinationPlanetId)!;
      const prev = planetMap.get(route.cargoType) ?? 0;
      planetMap.set(route.cargoType, prev + moved);
    }
  }

  return {
    revenue: totalRevenue,
    fuelCost: totalFuelCost,
    tariffCost: totalTariffCost,
    totalCargo,
    deliveries,
  };
}

// ---------------------------------------------------------------------------
// Apply AI saturation to market
// ---------------------------------------------------------------------------

export function applyAISaturation(
  market: MarketState,
  deliveries: Map<string, Map<CargoTypeT, number>>,
): MarketState {
  const updatedMarkets = { ...market.planetMarkets };

  for (const [planetId, cargoMap] of deliveries) {
    if (!updatedMarkets[planetId]) continue;
    const planetMarket = { ...updatedMarkets[planetId] };

    for (const [cargoType, amount] of cargoMap) {
      const entry = planetMarket[cargoType];
      if (!entry) continue;

      const saturationIncrease = amount / (entry.baseDemand * 5);
      planetMarket[cargoType] = {
        ...entry,
        saturation: Math.min(
          1,
          Math.max(0, entry.saturation + saturationIncrease),
        ),
      };
    }

    updatedMarkets[planetId] = planetMarket;
  }

  return { ...market, planetMarkets: updatedMarkets };
}
