import { describe, it, expect, beforeEach } from "vitest";
import {
  pickContinueSource,
  getContinueSource,
  loadContinueSourceIntoStore,
  saveGame,
  autoSave,
  writeDraft,
  loadDraft,
  getAutoSaveMeta,
  deleteAutoSave,
} from "../SaveManager.ts";
import type { SaveMeta } from "../SaveManager.ts";
import { gameStore } from "../../data/GameStore.ts";
import { __resetForTests as resetSaveStorage } from "../storage/saveStorage.ts";
import type { GameState } from "../../data/types.ts";

function meta(overrides: Partial<SaveMeta> = {}): SaveMeta {
  return {
    timestamp: 1_000,
    turn: 3,
    gameOver: false,
    companyName: "Test Corp",
    ...overrides,
  };
}

describe("pickContinueSource (pure selection)", () => {
  it("returns null when there are no saves", () => {
    expect(pickContinueSource({ manual: null, auto: null, draft: null })).toBe(
      null,
    );
  });

  it("picks the manual save when it is the only one", () => {
    const m = meta();
    expect(pickContinueSource({ manual: m, auto: null, draft: null })).toEqual({
      kind: "manual",
      meta: m,
    });
  });

  it("picks the autosave when it is the only one", () => {
    const a = meta({ turn: 4 });
    expect(pickContinueSource({ manual: null, auto: a, draft: null })).toEqual({
      kind: "auto",
      meta: a,
    });
  });

  it("picks the newer of manual and auto", () => {
    const manual = meta({ timestamp: 1_000, turn: 2 });
    const auto = meta({ timestamp: 2_000, turn: 5 });
    expect(pickContinueSource({ manual, auto, draft: null })?.kind).toBe(
      "auto",
    );
    const manualNewer = meta({ timestamp: 3_000, turn: 6 });
    expect(
      pickContinueSource({ manual: manualNewer, auto, draft: null })?.kind,
    ).toBe("manual");
  });

  it("prefers the draft only when it is the newest", () => {
    const auto = meta({ timestamp: 2_000 });
    const draftNewer = meta({ timestamp: 3_000 });
    const draftOlder = meta({ timestamp: 1_500 });
    expect(
      pickContinueSource({ manual: null, auto, draft: draftNewer })?.kind,
    ).toBe("draft");
    expect(
      pickContinueSource({ manual: null, auto, draft: draftOlder })?.kind,
    ).toBe("auto");
  });

  it("ignores finished games", () => {
    const finished = meta({ timestamp: 9_000, gameOver: true });
    expect(
      pickContinueSource({ manual: null, auto: finished, draft: null }),
    ).toBe(null);
  });

  it("falls back to an older live save when the newest one is finished", () => {
    const manual = meta({ timestamp: 1_000, turn: 2 });
    const finished = meta({ timestamp: 9_000, gameOver: true });
    expect(
      pickContinueSource({ manual, auto: finished, draft: null })?.kind,
    ).toBe("manual");
  });
});

describe("getContinueSource / loadContinueSourceIntoStore (real slots)", () => {
  function state(overrides: Partial<GameState> = {}): GameState {
    return {
      ...gameStore.getState(),
      turn: 3,
      companyName: "Resume Corp",
      cash: 123_456,
      gameOver: false,
      gameOverReason: null,
      playerEmpireId: "empire-1",
      ...overrides,
    };
  }

  beforeEach(async () => {
    resetSaveStorage();
  });

  it("returns null with no saves", () => {
    expect(getContinueSource()).toBe(null);
  });

  it("offers an autosave and loads it into the store", () => {
    autoSave(state({ turn: 5, cash: 777 }));
    const source = getContinueSource();
    expect(source?.kind).toBe("auto");
    expect(source?.meta.companyName).toBe("Resume Corp");
    expect(source?.meta.turn).toBe(5);

    gameStore.setState(state({ turn: 1, cash: 1 }));
    expect(loadContinueSourceIntoStore(source!)).toBe(true);
    expect(gameStore.getState().turn).toBe(5);
    expect(gameStore.getState().cash).toBe(777);
  });

  it("does not offer a finished autosave or manual save", () => {
    autoSave(state({ gameOver: true, gameOverReason: "completed" }));
    saveGame(state({ gameOver: true, gameOverReason: "completed" }));
    expect(getContinueSource()).toBe(null);
  });

  it("deleting the autosave removes the Continue offer", () => {
    autoSave(state());
    expect(getAutoSaveMeta()).not.toBe(null);
    deleteAutoSave();
    expect(getContinueSource()).toBe(null);
  });

  it("consumes the draft when Continue loads it", () => {
    writeDraft(state({ turn: 7 }));
    const source = getContinueSource();
    expect(source?.kind).toBe("draft");
    expect(loadContinueSourceIntoStore(source!)).toBe(true);
    expect(gameStore.getState().turn).toBe(7);
    expect(loadDraft()).toBe(null);
  });
});
