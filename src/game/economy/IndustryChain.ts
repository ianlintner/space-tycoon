import type {
  Planet,
  ActiveRoute,
  PlanetType,
  CargoType,
} from "../../data/types.ts";
import {
  PLANET_INDUSTRY_INPUT,
  PLANET_CARGO_PROFILES,
} from "../../data/constants.ts";

/**
 * Legacy lookup by planet type. Prefer `getInputCargosForPlanet` which reads
 * `planet.consumptionTags` directly. Retained for callers (PlanetDetailScene,
 * tests) that only have a PlanetType handy.
 */
export function getInputCargo(planetType: PlanetType): CargoType | null {
  return PLANET_INDUSTRY_INPUT[planetType] ?? null;
}

// NOTE: returns only the primary output (produces[0]). Secondary outputs (e.g. Mining's Hazmat)
// are not boosted. Safe today because no multi-output planet has an industry input requirement.
export function getOutputCargo(planetType: PlanetType): CargoType | null {
  return PLANET_CARGO_PROFILES[planetType]?.produces[0] ?? null;
}

/**
 * Tag-based input lookup. A planet's `consumptionTags` represent the cargo
 * types it consumes as industry inputs. Falls back to the legacy
 * PLANET_INDUSTRY_INPUT table when a planet has no consumption tags (test
 * fixtures that pre-date the tag system).
 */
function getInputCargosForPlanet(planet: Planet): CargoType[] {
  if (planet.consumptionTags && planet.consumptionTags.length > 0) {
    return planet.consumptionTags as CargoType[];
  }
  const legacy = PLANET_INDUSTRY_INPUT[planet.type];
  return legacy ? [legacy] : [];
}

/**
 * Returns the set of producer planet IDs whose industry input is active this
 * turn. A producer's input is active when any non-paused route delivers any
 * required input cargo to any planet in the same system as the producer.
 */
export function getActiveProducers(
  planets: Planet[],
  allRoutes: ActiveRoute[],
): Set<string> {
  const planetById = new Map(planets.map((p) => [p.id, p]));
  const activeRoutes = allRoutes.filter((r) => !r.paused);

  const activeProducers = new Set<string>();

  for (const planet of planets) {
    const inputCargos = getInputCargosForPlanet(planet);
    if (inputCargos.length === 0) continue;

    const inputSet = new Set(inputCargos);

    const hasInputRoute = activeRoutes.some(
      (r) =>
        r.cargoType !== null &&
        inputSet.has(r.cargoType) &&
        planetById.get(r.destinationPlanetId)?.systemId === planet.systemId,
    );

    if (hasInputRoute) {
      activeProducers.add(planet.id);
    }
  }

  return activeProducers;
}
