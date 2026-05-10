import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  MapLayerController,
  STORAGE_KEY,
  DEBOUNCE_MS,
} from "../MapLayerController.ts";

const makeLocalStorageMock = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    _store: store,
  };
};

describe("MapLayerController", () => {
  let lsMock: ReturnType<typeof makeLocalStorageMock>;

  beforeEach(() => {
    vi.useFakeTimers();
    lsMock = makeLocalStorageMock();
    vi.stubGlobal("localStorage", lsMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("starts with implemented layers on and stubs off", () => {
    const ctrl = new MapLayerController();
    expect(ctrl.isVisible("empire-names")).toBe(true);
    expect(ctrl.isVisible("hyperlanes")).toBe(true);
    expect(ctrl.isVisible("ships")).toBe(true);
    expect(ctrl.isVisible("navies")).toBe(false);
    expect(ctrl.isVisible("company-names")).toBe(false);
    expect(ctrl.isVisible("import-goods")).toBe(false);
  });

  it("toggle flips visibility and emits change", () => {
    const ctrl = new MapLayerController();
    const changes: string[] = [];
    ctrl.on("change", (id) => changes.push(id as string));
    ctrl.toggle("empire-names");
    expect(ctrl.isVisible("empire-names")).toBe(false);
    expect(changes).toEqual(["empire-names"]);
  });

  it("setVisible does not emit when state unchanged", () => {
    const ctrl = new MapLayerController();
    const changes: string[] = [];
    ctrl.on("change", (id) => changes.push(id as string));
    ctrl.setVisible("empire-names", true); // already true → no emit
    expect(changes).toHaveLength(0);
  });

  it("getLayersByGroup returns correct layers in order", () => {
    const ctrl = new MapLayerController();
    const geo = ctrl.getLayersByGroup("geography");
    expect(geo.map((l) => l.id)).toEqual([
      "systems",
      "system-names",
      "hyperlanes",
    ]);
  });

  it("persists state to localStorage after debounce", () => {
    const ctrl = new MapLayerController();
    ctrl.toggle("ships");
    vi.advanceTimersByTime(DEBOUNCE_MS + 50);
    const saved = JSON.parse(lsMock._store[STORAGE_KEY] ?? "{}") as Record<
      string,
      boolean
    >;
    expect(saved["ships"]).toBe(false);
  });

  it("loads persisted state on construction", () => {
    lsMock._store[STORAGE_KEY] = JSON.stringify({
      ships: false,
      "empire-names": false,
    });
    const ctrl = new MapLayerController();
    expect(ctrl.isVisible("ships")).toBe(false);
    expect(ctrl.isVisible("empire-names")).toBe(false);
    expect(ctrl.isVisible("hyperlanes")).toBe(true); // not in saved → default
  });

  it("ignores unknown keys in localStorage without error", () => {
    lsMock._store[STORAGE_KEY] = JSON.stringify({
      "unknown-layer": true,
      "empire-names": false,
    });
    const ctrl = new MapLayerController();
    expect(ctrl.isVisible("empire-names")).toBe(false);
    expect(ctrl.isVisible("ships")).toBe(true); // default
  });

  it("ignores malformed localStorage data and falls back to defaults", () => {
    lsMock._store[STORAGE_KEY] = "not-json{{{";
    const ctrl = new MapLayerController();
    expect(ctrl.isVisible("empire-names")).toBe(true);
  });

  it("getLayer returns correct metadata", () => {
    const ctrl = new MapLayerController();
    const layer = ctrl.getLayer("empire-names");
    expect(layer.group).toBe("politics");
    expect(layer.iconIndex).toBe(5);
    expect(layer.implemented).toBe(true);
  });
});
