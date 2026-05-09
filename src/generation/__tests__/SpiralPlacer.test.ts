import { describe, expect, it } from "vitest";
import { SeededRNG } from "../../utils/SeededRNG.ts";
import { placeSpiralGalaxy } from "../SpiralPlacer.ts";

describe("placeSpiralGalaxy", () => {
  it("returns the requested system count", () => {
    const r = placeSpiralGalaxy({
      rng: new SeededRNG(1),
      systemCount: 300,
      empireCount: 11,
    });
    expect(r.systemPositions.length).toBe(300);
  });

  it("assigns every system to a valid empire index", () => {
    const r = placeSpiralGalaxy({
      rng: new SeededRNG(1),
      systemCount: 300,
      empireCount: 11,
    });
    expect(r.empireAssignments.length).toBe(300);
    expect(r.empireCentroids.length).toBe(11);
    for (const a of r.empireAssignments) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(11);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = placeSpiralGalaxy({
      rng: new SeededRNG(42),
      systemCount: 100,
      empireCount: 6,
    });
    const b = placeSpiralGalaxy({
      rng: new SeededRNG(42),
      systemCount: 100,
      empireCount: 6,
    });
    expect(a.systemPositions).toEqual(b.systemPositions);
    expect(a.empireAssignments).toEqual(b.empireAssignments);
  });

  it("every empire gets at least one system", () => {
    const r = placeSpiralGalaxy({
      rng: new SeededRNG(7),
      systemCount: 100,
      empireCount: 6,
    });
    const counts = new Array(6).fill(0);
    r.empireAssignments.forEach((e) => counts[e]++);
    for (const c of counts) expect(c).toBeGreaterThan(0);
  });

  it("produces a polygon per empire territory", () => {
    const r = placeSpiralGalaxy({
      rng: new SeededRNG(1),
      systemCount: 200,
      empireCount: 8,
    });
    expect(r.empireTerritories.length).toBe(8);
    for (const poly of r.empireTerritories) {
      expect(poly.vertices.length).toBeGreaterThanOrEqual(3);
    }
  });
});
