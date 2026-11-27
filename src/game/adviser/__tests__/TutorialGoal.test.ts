import { describe, it, expect } from "vitest";
import { formatGoalLine } from "../../scoring/GoalText.ts";
import { TUTORIAL_STEPS, ROUTE_PICK_PROMPT } from "../TutorialDefinitions.ts";
import { GAME_LENGTH_PRESETS } from "../../../data/constants.ts";

describe("goal copy", () => {
  it("formats the Quick preset's goal with the selected turn and company count", () => {
    const quick = GAME_LENGTH_PRESETS.quick;
    const line = formatGoalLine({
      maxTurns: quick.maxTurns,
      companyCount: quick.aiCompanyCount + 1,
    });

    expect(line).toBe(
      `Goal: finish #1 in net worth among ${quick.aiCompanyCount + 1} companies after ${quick.maxTurns} quarters`,
    );
  });

  it("tracks other preset selections", () => {
    expect(
      formatGoalLine({
        maxTurns: GAME_LENGTH_PRESETS.epic.maxTurns,
        companyCount: GAME_LENGTH_PRESETS.epic.aiCompanyCount + 1,
      }),
    ).toBe(
      `Goal: finish #1 in net worth among ${GAME_LENGTH_PRESETS.epic.aiCompanyCount + 1} companies after ${GAME_LENGTH_PRESETS.epic.maxTurns} quarters`,
    );
  });

  it("states the goal and leaves the first route to the player", () => {
    expect(TUTORIAL_STEPS[0]?.id).toBe("tut_new_game");
    expect(TUTORIAL_STEPS[0]?.text).toContain("finish #1 in net worth");
    expect(TUTORIAL_STEPS[1]?.trigger).toBe("firstRoute");
    expect(ROUTE_PICK_PROMPT).toContain("press Create Route");
    expect(ROUTE_PICK_PROMPT).toContain("Pick a row yourself");
  });
});
