import { describe, expect, it } from "vitest";
import { generateGalaxy } from "../GalaxyGenerator.ts";

const SEEDS = [1, 42, 999, 12345, 77777];

describe("generation pipeline fuzz tests", () => {
  it("never throws for any seed with quick preset", () => {
    for (const seed of SEEDS) {
      expect(() => generateGalaxy(seed, "quick")).not.toThrow();
    }
  });

  it("all planets have required fields", () => {
    for (const seed of SEEDS) {
      const g = generateGalaxy(seed, "quick");
      for (const planet of g.planets) {
        expect(typeof planet.biome).toBe("string");
        expect(Array.isArray(planet.productionTags)).toBe(true);
        expect(Array.isArray(planet.consumptionTags)).toBe(true);
        expect(typeof planet.productionScale).toBe("number");
        expect(typeof planet.populationCap).toBe("number");
      }
    }
  });

  it("all empires have required fields", () => {
    for (const seed of SEEDS) {
      const g = generateGalaxy(seed, "quick");
      for (const empire of g.empires) {
        expect(typeof empire.archetype).toBe("string");
        expect(Array.isArray(empire.ownedSpecials)).toBe(true);
      }
    }
  });

  it("each empire has at least 1 system", () => {
    for (const seed of SEEDS) {
      const g = generateGalaxy(seed, "quick");
      const empireIds = new Set(g.empires.map((e) => e.id));
      const empireSystemCounts = new Map<string, number>();
      for (const s of g.systems) {
        empireSystemCounts.set(
          s.empireId,
          (empireSystemCounts.get(s.empireId) ?? 0) + 1,
        );
      }
      for (const id of empireIds) {
        expect(empireSystemCounts.get(id) ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("places at least one and at most seven special resources", () => {
    for (const seed of SEEDS) {
      const g = generateGalaxy(seed, "quick");
      const specials = g.planets.filter((p) => p.specialResource !== undefined);
      expect(specials.length).toBeLessThanOrEqual(7);
      expect(specials.length).toBeGreaterThan(0);
    }
  });
});
