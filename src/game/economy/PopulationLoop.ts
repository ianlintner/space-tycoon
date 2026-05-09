import {
  FOOD_DEFICIT_TURNS_TO_SHRINK,
  FOOD_SURPLUS_TURNS_TO_GROW,
  POP_GROW_RATE_PER_TURN,
  POP_SHRINK_RATE_PER_TURN,
} from "../../data/constants.ts";

export interface PopulationTickState {
  foodDeficitStreak: number;
  foodSurplusStreak: number;
}

export interface PopulationTickInput {
  currentPopulation: number;
  foodBalance: number;
  medicalSatisfied: boolean;
  state: PopulationTickState;
}

export interface PopulationTickResult {
  newPopulation: number;
  newState: PopulationTickState;
}

export function tickPopulation(
  input: PopulationTickInput,
): PopulationTickResult {
  const { currentPopulation, foodBalance, medicalSatisfied, state } = input;
  let { foodDeficitStreak, foodSurplusStreak } = state;

  if (foodBalance >= 0) {
    foodSurplusStreak += 1;
    foodDeficitStreak = 0;
  } else {
    foodDeficitStreak += 1;
    foodSurplusStreak = 0;
  }

  let newPopulation = currentPopulation;

  if (foodDeficitStreak >= FOOD_DEFICIT_TURNS_TO_SHRINK) {
    newPopulation = Math.round(
      currentPopulation * (1 - POP_SHRINK_RATE_PER_TURN),
    );
  } else if (
    foodSurplusStreak >= FOOD_SURPLUS_TURNS_TO_GROW &&
    medicalSatisfied
  ) {
    newPopulation = Math.round(
      currentPopulation * (1 + POP_GROW_RATE_PER_TURN),
    );
  }

  return {
    newPopulation,
    newState: { foodDeficitStreak, foodSurplusStreak },
  };
}
