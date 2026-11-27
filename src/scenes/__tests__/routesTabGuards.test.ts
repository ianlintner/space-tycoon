import { describe, it, expect } from "vitest";
import { canSwitchToActiveRoutesTab } from "../routesTabGuards.ts";

describe("canSwitchToActiveRoutesTab", () => {
  it("blocks before the scene system exists", () => {
    expect(canSwitchToActiveRoutesTab(undefined, true)).toBe(false);
  });

  it("blocks when RoutesScene is not active", () => {
    expect(canSwitchToActiveRoutesTab({ isActive: () => false }, true)).toBe(
      false,
    );
  });

  it("blocks when the scene is active but not built yet", () => {
    expect(canSwitchToActiveRoutesTab({ isActive: () => true }, false)).toBe(
      false,
    );
  });

  it("allows the tab switch on a built, active scene", () => {
    expect(canSwitchToActiveRoutesTab({ isActive: () => true }, true)).toBe(
      true,
    );
  });
});
