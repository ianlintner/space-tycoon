import { describe, expect, it } from "vitest";
import {
  derivePlanetVariation,
  isRinged,
  multiplyBrightness,
} from "../PlanetVariation.ts";
import type { Planet } from "../../../data/types.ts";
import { PlanetBiome, PlanetType } from "../../../data/types.ts";

function makePlanet(id: string, biome: PlanetBiome): Planet {
  return {
    id,
    name: "Test",
    systemId: "sys1",
    type: PlanetType.Mining,
    x: 0,
    y: 0,
    population: 1000,
    biome,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 5000,
  };
}

describe("derivePlanetVariation", () => {
  it("is deterministic — same id yields same variation", () => {
    const p = makePlanet("planet-abc", PlanetBiome.Colony);
    expect(derivePlanetVariation(p)).toEqual(derivePlanetVariation(p));
  });

  it("different ids produce different rotationPhase", () => {
    const v1 = derivePlanetVariation(
      makePlanet("planet-aaa", PlanetBiome.Colony),
    );
    const v2 = derivePlanetVariation(
      makePlanet("planet-bbb", PlanetBiome.Colony),
    );
    expect(v1.rotationPhase).not.toBeCloseTo(v2.rotationPhase, 2);
  });

  it("rotationPhase is in [0, 2π]", () => {
    for (const id of ["a", "planet-1", "x9q3z", "long-planet-id-with-dashes"]) {
      const v = derivePlanetVariation(makePlanet(id, PlanetBiome.Colony));
      expect(v.rotationPhase).toBeGreaterThanOrEqual(0);
      expect(v.rotationPhase).toBeLessThanOrEqual(Math.PI * 2);
    }
  });

  it("ringTiltDeg is in [-25, 25] for GasGiantSkim", () => {
    for (const id of ["gas-a", "gas-b", "gas-c", "gas-d", "gas-e"]) {
      const v = derivePlanetVariation(makePlanet(id, PlanetBiome.GasGiantSkim));
      expect(v.ringTiltDeg).toBeGreaterThanOrEqual(-25);
      expect(v.ringTiltDeg).toBeLessThanOrEqual(25);
    }
  });

  it("baseTint channels are in [235, 255]", () => {
    const v = derivePlanetVariation(
      makePlanet("test-planet", PlanetBiome.Colony),
    );
    const r = (v.baseTint >> 16) & 0xff;
    const g = (v.baseTint >> 8) & 0xff;
    const b = v.baseTint & 0xff;
    expect(r).toBeGreaterThanOrEqual(235);
    expect(r).toBeLessThanOrEqual(255);
    expect(g).toBeGreaterThanOrEqual(235);
    expect(g).toBeLessThanOrEqual(255);
    expect(b).toBeGreaterThanOrEqual(235);
    expect(b).toBeLessThanOrEqual(255);
  });
});

describe("isRinged", () => {
  it("returns true only for GasGiantSkim", () => {
    expect(isRinged(PlanetBiome.GasGiantSkim)).toBe(true);
    expect(isRinged(PlanetBiome.Colony)).toBe(false);
    expect(isRinged(PlanetBiome.Capital)).toBe(false);
    expect(isRinged(PlanetBiome.Resort)).toBe(false);
    expect(isRinged(PlanetBiome.Breadbasket)).toBe(false);
  });
});

describe("multiplyBrightness", () => {
  it("factor 1.0 leaves tint unchanged", () => {
    expect(multiplyBrightness(0x80c040, 1.0)).toBe(0x80c040);
  });

  it("factor 2.0 clamps all channels at 255", () => {
    expect(multiplyBrightness(0xffffff, 2.0)).toBe(0xffffff);
    // 0x80 = 128; 128 * 2 = 256 → clamps to 255 = 0xff
    expect(multiplyBrightness(0x808080, 2.0)).toBe(0xffffff);
  });

  it("factor 0.0 produces black", () => {
    expect(multiplyBrightness(0xffffff, 0.0)).toBe(0x000000);
  });

  it("scales each channel independently", () => {
    // 0xff = 255; 255 * 0.5 = 127.5 → rounds to 128 = 0x80
    expect(multiplyBrightness(0xff0000, 0.5)).toBe(0x800000);
  });
});
