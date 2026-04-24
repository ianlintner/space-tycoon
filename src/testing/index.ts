import type Phaser from "phaser";
import { setWidgetHook } from "../../packages/spacebiz-ui/src/WidgetHooks.ts";
import { widgetRegistry } from "./WidgetRegistry.ts";
import { createTestAPI } from "./TestAPI.ts";
import type { SftTestAPI } from "./TestAPI.ts";
import { startInvariantListener } from "./Invariants.ts";
import { logs } from "./log.ts";

declare global {
  interface Window {
    __sft?: SftTestAPI;
  }
}

let installed = false;

export function installTestAPI(game: Phaser.Game): SftTestAPI {
  if (!installed) {
    setWidgetHook(widgetRegistry.hook);
    startInvariantListener();
    installed = true;
  }
  const api = createTestAPI(game);
  if (typeof window !== "undefined") {
    window.__sft = api;
  }
  logs.sft.info(`QA console API installed (v${api.version})`, {
    scenes: game.scene.scenes.map((s) => s.scene.key),
  });
  return api;
}

export { widgetRegistry } from "./WidgetRegistry.ts";
export { logs, logController, channel } from "./log.ts";
export { invariants } from "./Invariants.ts";
export type { SftTestAPI } from "./TestAPI.ts";
