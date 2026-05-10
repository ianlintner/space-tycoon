import type { Planet, ActiveRoute, CargoType } from "../../data/types.ts";

/**
 * Returns the primary input cargo this planet consumes (first consumption tag),
 * or null if the planet has no consumption requirements. UI uses this to show
 * "Industry input: X" on planets that need a feeder.
 */
export function getInputCargo(planet: Planet): CargoType | null {
  return (planet.consumptionTags[0] as CargoType | undefined) ?? null;
}

/**
 * Returns the primary output cargo this planet produces (first production tag),
 * or null if the planet has no production. Secondary outputs (e.g. Hazmat from
 * a mining world) are intentionally not surfaced here — the chain UI only
 * highlights the primary product.
 */
export function getOutputCargo(planet: Planet): CargoType | null {
  return (planet.productionTags[0] as CargoType | undefined) ?? null;
}

/**
 * Tag-based input lookup. A planet's `consumptionTags` represent the cargo
 * types it consumes as industry inputs.
 */
function getInputCargosForPlanet(planet: Planet): CargoType[] {
  return (planet.consumptionTags ?? []) as CargoType[];
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
