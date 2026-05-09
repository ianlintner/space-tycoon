import { describe, expect, it } from "vitest";
import { tickPopulation } from "../PopulationLoop.ts";
import {
  FOOD_DEFICIT_TURNS_TO_SHRINK,
  FOOD_SURPLUS_TURNS_TO_GROW,
  POP_SHRINK_RATE_PER_TURN,
  POP_GROW_RATE_PER_TURN,
} from "../../../data/constants.ts";

describe("tickPopulation", () => {
  it("grows population after enough consecutive surplus turns", () => {
    let state = { foodDeficitStreak: 0, foodSurplusStreak: 0 };
    let pop = 100;
    for (let i = 0; i < FOOD_SURPLUS_TURNS_TO_GROW; i++) {
      const r = tickPopulation({
        currentPopulation: pop,
        foodBalance: 5,
        medicalSatisfied: true,
        state,
      });
      pop = r.newPopulation;
      state = r.newState;
    }
    expect(pop).toBeGreaterThan(100);
  });

  it("shrinks population after enough consecutive deficit turns", () => {
    let state = { foodDeficitStreak: 0, foodSurplusStreak: 0 };
    let pop = 100;
    for (let i = 0; i < FOOD_DEFICIT_TURNS_TO_SHRINK; i++) {
      const r = tickPopulation({
        currentPopulation: pop,
        foodBalance: -5,
        medicalSatisfied: true,
        state,
      });
      pop = r.newPopulation;
      state = r.newState;
    }
    expect(pop).toBeLessThan(100);
  });

  it("does not shrink on surplus", () => {
    const r = tickPopulation({
      currentPopulation: 100,
      foodBalance: 10,
      medicalSatisfied: true,
      state: { foodDeficitStreak: 0, foodSurplusStreak: 0 },
    });
    expect(r.newPopulation).toBeGreaterThanOrEqual(100);
  });

  it("resets surplus streak on deficit", () => {
    const r = tickPopulation({
      currentPopulation: 100,
      foodBalance: -1,
      medicalSatisfied: true,
      state: { foodDeficitStreak: 0, foodSurplusStreak: 4 },
    });
    expect(r.newState.foodSurplusStreak).toBe(0);
    expect(r.newState.foodDeficitStreak).toBe(1);
  });

  it("requires medical to be satisfied for growth", () => {
    let state = { foodDeficitStreak: 0, foodSurplusStreak: 0 };
    let pop = 100;
    for (let i = 0; i < FOOD_SURPLUS_TURNS_TO_GROW; i++) {
      const r = tickPopulation({
        currentPopulation: pop,
        foodBalance: 5,
        medicalSatisfied: false,
        state,
      });
      pop = r.newPopulation;
      state = r.newState;
    }
    expect(pop).toBe(100);
  });
});
