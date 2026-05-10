# Map Layer Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three bottom-row layer toggles (Empires/Names/Ships) in `GalaxyMapScene` with a Paradox-style right-edge icon toolbar exposing 11 named map layers in 5 grouped drawers, persisted to localStorage.

**Architecture:** A `MapLayerController` singleton owns all layer visibility state and emits `"change"` events; a `MapLayerToolbar` Phaser widget consumes the controller for its UI; existing renderers (`GalaxyView2D`, `Ships2D`) subscribe to controller events in `GalaxyMapScene.create()`. The old bottom-row toggles are removed; the company filter button stays.

**Tech Stack:** Phaser 4, TypeScript (strict, erasableSyntaxOnly), Vitest 4, Sharp (icon packing), `~/Projects/ai-pixel-art-image-generation/scripts/generate_sprite.py` (icon generation).

---

## File Structure

**New files:**

- `src/game/map/MapLayerRegistry.ts` — `LayerGroup`, `LayerId`, `MapLayer` types + static `MAP_LAYERS` array + group metadata
- `src/game/map/MapLayerController.ts` — singleton class, `Record<LayerId, boolean>`, EventEmitter, localStorage persistence
- `src/game/map/__tests__/MapLayerController.test.ts` — unit tests
- `src/ui/MapLayerToolbar.ts` — Phaser widget (group buttons + drawer)
- `scripts/map-icon-prompts.json` — 16 icon prompt definitions
- `scripts/generate-map-icons.mjs` — calls `generate_sprite.py` per icon
- `scripts/pack-icons.mjs` — packs individual PNGs into `public/ui-icons-24.png`
- `assets-source/ui-icons/*.png` — 16 generated source PNGs (committed)
- `public/ui-icons-24.png` — 96×96 px packed spritesheet (committed)

**Modified files:**

- `src/scenes/BootScene.ts` — add spritesheet preload
- `src/scenes/GalaxyMapScene.ts` — mount toolbar, add controller subscription, remove old toggle row
- `src/scenes/galaxy2d/GalaxyView2D.ts` — add `setHyperlanesVisible()`, `setTerritoryBordersVisible()`, `setSystemsVisible()`

---

## Task 1: MapLayerRegistry + MapLayerController + Tests

**Files:**

- Create: `src/game/map/MapLayerRegistry.ts`
- Create: `src/game/map/MapLayerController.ts`
- Create: `src/game/map/__tests__/MapLayerController.test.ts`

- [ ] **Step 1: Create `src/game/map/MapLayerRegistry.ts`**

```ts
export type LayerGroup =
  | "politics"
  | "geography"
  | "movement"
  | "economy"
  | "events";

export type LayerId =
  | "empire-names"
  | "empire-borders"
  | "company-names"
  | "systems"
  | "system-names"
  | "hyperlanes"
  | "ships"
  | "navies"
  | "import-goods"
  | "export-goods"
  | "space-events";

export interface MapLayer {
  id: LayerId;
  group: LayerGroup;
  label: string;
  iconIndex: number;
  defaultOn: boolean;
  implemented: boolean;
}

export const LAYER_GROUPS: LayerGroup[] = [
  "politics",
  "geography",
  "movement",
  "economy",
  "events",
];

export const GROUP_LABELS: Record<LayerGroup, string> = {
  politics: "Politics",
  geography: "Geography",
  movement: "Movement",
  economy: "Economy",
  events: "Events",
};

export const GROUP_ICON_INDICES: Record<LayerGroup, number> = {
  politics: 0,
  geography: 1,
  movement: 2,
  economy: 3,
  events: 4,
};

// Spritesheet indices 0-4 = group icons, 5-15 = layer icons (4×4 grid).
export const MAP_LAYERS: MapLayer[] = [
  // Politics (indices 5-7)
  {
    id: "empire-names",
    group: "politics",
    label: "Empire Names",
    iconIndex: 5,
    defaultOn: true,
    implemented: true,
  },
  {
    id: "empire-borders",
    group: "politics",
    label: "Empire Borders",
    iconIndex: 6,
    defaultOn: true,
    implemented: true,
  },
  {
    id: "company-names",
    group: "politics",
    label: "Companies",
    iconIndex: 7,
    defaultOn: false,
    implemented: false,
  },
  // Geography (indices 8-10)
  {
    id: "systems",
    group: "geography",
    label: "Systems",
    iconIndex: 8,
    defaultOn: true,
    implemented: true,
  },
  {
    id: "system-names",
    group: "geography",
    label: "System Names",
    iconIndex: 9,
    defaultOn: true,
    implemented: true,
  },
  {
    id: "hyperlanes",
    group: "geography",
    label: "Hyperlanes",
    iconIndex: 10,
    defaultOn: true,
    implemented: true,
  },
  // Movement (indices 11-12)
  {
    id: "ships",
    group: "movement",
    label: "Ships",
    iconIndex: 11,
    defaultOn: true,
    implemented: true,
  },
  {
    id: "navies",
    group: "movement",
    label: "Navies",
    iconIndex: 12,
    defaultOn: false,
    implemented: false,
  },
  // Economy (indices 13-14)
  {
    id: "import-goods",
    group: "economy",
    label: "Import Goods",
    iconIndex: 13,
    defaultOn: false,
    implemented: false,
  },
  {
    id: "export-goods",
    group: "economy",
    label: "Export Goods",
    iconIndex: 14,
    defaultOn: false,
    implemented: false,
  },
  // Events (index 15)
  {
    id: "space-events",
    group: "events",
    label: "Space Events",
    iconIndex: 15,
    defaultOn: false,
    implemented: false,
  },
];
```

- [ ] **Step 2: Create `src/game/map/MapLayerController.ts`**

```ts
import { GameEventEmitter } from "../../utils/EventEmitter.ts";
import type { LayerGroup, LayerId, MapLayer } from "./MapLayerRegistry.ts";
import { MAP_LAYERS } from "./MapLayerRegistry.ts";

const STORAGE_KEY = "spacebiz.mapLayers.v1";
const DEBOUNCE_MS = 200;

export class MapLayerController extends GameEventEmitter {
  private readonly visibility: Record<LayerId, boolean>;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this.visibility = this.loadFromStorage();
  }

  isVisible(id: LayerId): boolean {
    return this.visibility[id];
  }

  toggle(id: LayerId): void {
    this.setVisible(id, !this.visibility[id]);
  }

  setVisible(id: LayerId, on: boolean): void {
    if (this.visibility[id] === on) return;
    this.visibility[id] = on;
    this.emit("change", id);
    this.scheduleSave();
  }

  getLayer(id: LayerId): MapLayer {
    return MAP_LAYERS.find((l) => l.id === id)!;
  }

  getLayersByGroup(group: LayerGroup): MapLayer[] {
    return MAP_LAYERS.filter((l) => l.group === group);
  }

  private loadFromStorage(): Record<LayerId, boolean> {
    const defaults = Object.fromEntries(
      MAP_LAYERS.map((l) => [l.id, l.defaultOn]),
    ) as Record<LayerId, boolean>;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      const saved = JSON.parse(raw) as Partial<Record<LayerId, boolean>>;
      for (const [k, v] of Object.entries(saved)) {
        if (k in defaults && typeof v === "boolean") {
          defaults[k as LayerId] = v;
        }
      }
    } catch {
      // ignore parse errors or missing localStorage
    }
    return defaults;
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.visibility));
      } catch {
        // ignore quota errors
      }
    }, DEBOUNCE_MS);
  }
}

export const mapLayerController = new MapLayerController();
```

- [ ] **Step 3: Write failing tests in `src/game/map/__tests__/MapLayerController.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MapLayerController } from "../MapLayerController.ts";

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
    vi.advanceTimersByTime(250);
    const saved = JSON.parse(
      lsMock._store["spacebiz.mapLayers.v1"] ?? "{}",
    ) as Record<string, boolean>;
    expect(saved["ships"]).toBe(false);
  });

  it("loads persisted state on construction", () => {
    lsMock._store["spacebiz.mapLayers.v1"] = JSON.stringify({
      ships: false,
      "empire-names": false,
    });
    const ctrl = new MapLayerController();
    expect(ctrl.isVisible("ships")).toBe(false);
    expect(ctrl.isVisible("empire-names")).toBe(false);
    expect(ctrl.isVisible("hyperlanes")).toBe(true); // not in saved → default
  });

  it("ignores unknown keys in localStorage without error", () => {
    lsMock._store["spacebiz.mapLayers.v1"] = JSON.stringify({
      "unknown-layer": true,
      "empire-names": false,
    });
    const ctrl = new MapLayerController();
    expect(ctrl.isVisible("empire-names")).toBe(false);
    expect(ctrl.isVisible("ships")).toBe(true); // default
  });

  it("ignores malformed localStorage data and falls back to defaults", () => {
    lsMock._store["spacebiz.mapLayers.v1"] = "not-json{{{";
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
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
npm run test -- --reporter=verbose src/game/map/__tests__/MapLayerController.test.ts
```

Expected: FAIL — `MapLayerController` does not exist yet.

- [ ] **Step 5: Verify tests pass now (both files are already written in steps 1-2)**

```bash
npm run test -- --reporter=verbose src/game/map/__tests__/MapLayerController.test.ts
```

Expected: 8 tests PASS.

- [ ] **Step 6: Run full typecheck and test suite**

```bash
npm run check
```

Expected: all gates pass.

- [ ] **Step 7: Commit**

```bash
git add src/game/map/MapLayerRegistry.ts src/game/map/MapLayerController.ts src/game/map/__tests__/MapLayerController.test.ts
git commit -m "feat(map-layers): add MapLayerController + registry with localStorage persistence"
```

---

## Task 2: Icon Scripts + Spritesheet + BootScene Preload

**Files:**

- Create: `scripts/map-icon-prompts.json`
- Create: `scripts/generate-map-icons.mjs`
- Create: `scripts/pack-icons.mjs`
- Generate: `assets-source/ui-icons/*.png` (16 files)
- Generate: `public/ui-icons-24.png`
- Modify: `src/scenes/BootScene.ts`

**Context:** The generator lives at `~/Projects/ai-pixel-art-image-generation`. Icons are generated at 32 px with a transparent background, then Sharp packs them into a 96×96 4×4 grid (24 px per cell). Each pixel is converted to white so Phaser can `setTint()` for theme colors.

- [ ] **Step 1: Create `scripts/map-icon-prompts.json`**

The order MUST match the spritesheet indices: indices 0-4 = group icons, 5-15 = layer icons.

```json
[
  {
    "id": "group-politics",
    "prompt": "crown icon, white silhouette, game map UI button, pixel art, minimal"
  },
  {
    "id": "group-geography",
    "prompt": "galaxy star cluster icon, white silhouette, game map UI button, pixel art, minimal"
  },
  {
    "id": "group-movement",
    "prompt": "rocket ship icon, white silhouette, game map UI button, pixel art, minimal"
  },
  {
    "id": "group-economy",
    "prompt": "cargo crate icon, white silhouette, game map UI button, pixel art, minimal"
  },
  {
    "id": "group-events",
    "prompt": "lightning bolt icon, white silhouette, game map UI button, pixel art, minimal"
  },
  {
    "id": "empire-names",
    "prompt": "crown with text label, white silhouette, game map UI icon, pixel art, minimal"
  },
  {
    "id": "empire-borders",
    "prompt": "hexagonal territory border outline, white silhouette, game map UI icon, pixel art, minimal"
  },
  {
    "id": "company-names",
    "prompt": "corporation building silhouette, white icon, game map UI, pixel art, minimal"
  },
  {
    "id": "systems",
    "prompt": "star dot node icon, white silhouette, game map UI icon, pixel art, minimal"
  },
  {
    "id": "system-names",
    "prompt": "star with text tag label, white silhouette, game map UI icon, pixel art, minimal"
  },
  {
    "id": "hyperlanes",
    "prompt": "two dots connected by a line, white silhouette, game map UI icon, pixel art, minimal"
  },
  {
    "id": "ships",
    "prompt": "top-down spaceship icon, white silhouette, game map UI icon, pixel art, minimal"
  },
  {
    "id": "navies",
    "prompt": "three ships in formation, white silhouette, game map UI icon, pixel art, minimal"
  },
  {
    "id": "import-goods",
    "prompt": "arrow pointing into a box, white silhouette, game map UI icon, pixel art, minimal"
  },
  {
    "id": "export-goods",
    "prompt": "arrow pointing out of a box, white silhouette, game map UI icon, pixel art, minimal"
  },
  {
    "id": "space-events",
    "prompt": "cosmic explosion burst icon, white silhouette, game map UI icon, pixel art, minimal"
  }
]
```

- [ ] **Step 2: Create `scripts/generate-map-icons.mjs`**

```js
#!/usr/bin/env node
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GENERATOR = `${process.env.HOME}/Projects/ai-pixel-art-image-generation/scripts/generate_sprite.py`;
const OUT_DIR = join(ROOT, "assets-source/ui-icons");
const PROMPTS_FILE = join(__dirname, "map-icon-prompts.json");

mkdirSync(OUT_DIR, { recursive: true });

const prompts = JSON.parse(readFileSync(PROMPTS_FILE, "utf8"));

for (const { id, prompt } of prompts) {
  const outPath = join(OUT_DIR, `${id}.png`);
  console.log(`Generating ${id}…`);
  execSync(
    `python3 "${GENERATOR}" --prompt "${prompt}" --size 32 --transparent-bg --palette db16 --output "${outPath}"`,
    { stdio: "inherit" },
  );
}

console.log(
  `Done — ${prompts.length} icons written to assets-source/ui-icons/`,
);
```

- [ ] **Step 3: Create `scripts/pack-icons.mjs`**

```js
#!/usr/bin/env node
import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROMPTS_FILE = join(__dirname, "map-icon-prompts.json");
const SRC_DIR = join(ROOT, "assets-source/ui-icons");
const OUT_FILE = join(ROOT, "public/ui-icons-24.png");

const CELL = 24;
const COLS = 4;

const prompts = JSON.parse(readFileSync(PROMPTS_FILE, "utf8"));
const ids = prompts.map((p) => p.id);
const ROWS = Math.ceil(ids.length / COLS);

const composites = [];

for (let i = 0; i < ids.length; i++) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const srcPath = join(SRC_DIR, `${ids[i]}.png`);

  // Resize to 24×24, then normalize to white-on-transparent for Phaser setTint().
  const { data, info } = await sharp(srcPath)
    .resize(CELL, CELL, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Convert every non-transparent pixel to white.
  for (let px = 0; px < info.width * info.height; px++) {
    const off = px * 4;
    if (data[off + 3] > 0) {
      data[off] = 255;
      data[off + 1] = 255;
      data[off + 2] = 255;
    }
  }

  const pngBuf = await sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  composites.push({ input: pngBuf, top: row * CELL, left: col * CELL });
}

await sharp({
  create: {
    width: COLS * CELL,
    height: ROWS * CELL,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .png()
  .toFile(OUT_FILE);

console.log(
  `Packed ${ids.length} icons → ${OUT_FILE} (${COLS * CELL}×${ROWS * CELL} px)`,
);
```

- [ ] **Step 4: Generate the 16 source icons (one-time author step)**

Requires `AZURE_OPENAI_ENDPOINT` + `AZURE_OPENAI_API_KEY` env vars, or `OPENAI_API_KEY`.

```bash
node scripts/generate-map-icons.mjs
```

Expected: `assets-source/ui-icons/` contains 16 PNGs (group-politics.png … space-events.png).

If the API is unavailable, create 16 placeholder white PNG files of 32×32 px each:

```bash
node -e "
const { execSync } = require('child_process');
const { mkdirSync } = require('fs');
const sharp = require('sharp');
const ids = [
  'group-politics','group-geography','group-movement','group-economy','group-events',
  'empire-names','empire-borders','company-names','systems','system-names',
  'hyperlanes','ships','navies','import-goods','export-goods','space-events'
];
mkdirSync('assets-source/ui-icons', { recursive: true });
Promise.all(ids.map(id =>
  sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 200 } } })
    .png().toFile(\`assets-source/ui-icons/\${id}.png\`)
)).then(() => console.log('Placeholders written'));
"
```

- [ ] **Step 5: Pack source icons into the spritesheet**

```bash
node scripts/pack-icons.mjs
```

Expected output:

```
Packed 16 icons → public/ui-icons-24.png (96×96 px)
```

Verify the file exists:

```bash
ls -lh public/ui-icons-24.png
```

Expected: file exists, ~5–30 KB.

- [ ] **Step 6: Add spritesheet preload to `src/scenes/BootScene.ts`**

Find the last `this.load.*` call in `BootScene.preload()` (currently around line 130 before the `generateAdviserSpritesheet` call) and add after the ship sprite loads:

```ts
// Map layer toolbar icon spritesheet — 4×4 grid of 24×24 px icons.
this.load.spritesheet("ui-icons", "ui-icons-24.png", {
  frameWidth: 24,
  frameHeight: 24,
});
```

- [ ] **Step 7: Run typecheck and build to verify no regressions**

```bash
npm run check
```

Expected: all gates pass.

- [ ] **Step 8: Commit**

```bash
git add scripts/map-icon-prompts.json scripts/generate-map-icons.mjs scripts/pack-icons.mjs assets-source/ui-icons/ public/ui-icons-24.png src/scenes/BootScene.ts
git commit -m "feat(map-layers): add icon generation scripts + 96×96 spritesheet + BootScene preload"
```

---

## Task 3: MapLayerToolbar Widget + Mount in GalaxyMapScene

**Files:**

- Create: `src/ui/MapLayerToolbar.ts`
- Modify: `src/scenes/GalaxyMapScene.ts`

**Context:** `MapLayerToolbar` is a plain TS class (not a Phaser.Scene). It creates Phaser game objects directly on the scene passed to its constructor, mirroring the pattern used by `GalaxyView2D`, `Ships2D`, etc. The toolbar sits on the right edge below the top HUD strip. Clicking a group button opens a drawer expanding to the left. Only one drawer is open at a time. Clicking outside or pressing Esc closes the drawer.

Spritesheet key `"ui-icons"` must be loaded (done in Task 2). Depth scheme: buttons at 9000, drawer at 9100, tooltips (future) at 9500.

- [ ] **Step 1: Create `src/ui/MapLayerToolbar.ts`**

```ts
import * as Phaser from "phaser";
import { getLayout, getTheme, colorToString } from "@spacebiz/ui";
import type { LayoutMetrics } from "@spacebiz/ui";
import { mapLayerController } from "../game/map/MapLayerController.ts";
import {
  LAYER_GROUPS,
  GROUP_LABELS,
  GROUP_ICON_INDICES,
} from "../game/map/MapLayerRegistry.ts";
import type { LayerGroup, LayerId } from "../game/map/MapLayerRegistry.ts";

const BTN_SIZE = 40;
const BTN_GAP = 4;
const TOOLBAR_TOP_OFFSET = 70;
const DRAWER_WIDTH = 200;
const DRAWER_ROW_HEIGHT = 36;
const DRAWER_PADDING = 8;
const ICON_SIZE = 24;
const BTN_DEPTH = 9000;
const DRAWER_DEPTH = 9100;

interface GroupBtn {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  hit: Phaser.GameObjects.Zone;
  group: LayerGroup;
}

export class MapLayerToolbar {
  private readonly scene: Phaser.Scene;
  private buttons: GroupBtn[] = [];
  private drawer: Phaser.GameObjects.Container | null = null;
  private openGroup: LayerGroup | null = null;
  private escKey: Phaser.Input.Keyboard.Key | null = null;
  private readonly onChangeListener: () => void;
  private readonly onPointerdown: (ptr: Phaser.Input.Pointer) => void;

  private rightEdge = 0;
  private topY = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.onChangeListener = () => this.refreshButtons();
    this.onPointerdown = (ptr) => this.handleScenePointerdown(ptr);
    mapLayerController.on("change", this.onChangeListener);
    this.scene.input.on("pointerdown", this.onPointerdown);
    this.build();
  }

  reposition(L: LayoutMetrics): void {
    this.rightEdge = L.mainContentLeft + L.mainContentWidth - 4;
    this.topY = L.contentTop + TOOLBAR_TOP_OFFSET;
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const btnX = this.rightEdge - BTN_SIZE;
      const btnY = this.topY + i * (BTN_SIZE + BTN_GAP);
      btn.bg.setPosition(btnX, btnY);
      btn.icon.setPosition(btnX + BTN_SIZE / 2, btnY + BTN_SIZE / 2);
      btn.hit.setPosition(btnX, btnY);
    }
    if (this.openGroup !== null) this.closeDrawer();
  }

  destroy(): void {
    mapLayerController.off("change", this.onChangeListener);
    this.scene.input.off("pointerdown", this.onPointerdown);
    for (const btn of this.buttons) {
      btn.bg.destroy();
      btn.icon.destroy();
      btn.hit.destroy();
    }
    this.buttons = [];
    this.drawer?.destroy();
    this.drawer = null;
    this.escKey?.destroy();
    this.escKey = null;
  }

  private build(): void {
    const L = getLayout();
    this.rightEdge = L.mainContentLeft + L.mainContentWidth - 4;
    this.topY = L.contentTop + TOOLBAR_TOP_OFFSET;

    for (let i = 0; i < LAYER_GROUPS.length; i++) {
      this.buildGroupButton(i, LAYER_GROUPS[i]);
    }

    if (this.scene.input.keyboard) {
      this.escKey = this.scene.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.ESC,
      );
      this.escKey.on("down", () => this.closeDrawer());
    }
  }

  private buildGroupButton(idx: number, group: LayerGroup): void {
    const theme = getTheme();
    const btnX = this.rightEdge - BTN_SIZE;
    const btnY = this.topY + idx * (BTN_SIZE + BTN_GAP);

    const bg = this.scene.add
      .rectangle(btnX, btnY, BTN_SIZE, BTN_SIZE, theme.colors.panelBg, 0.9)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.7)
      .setOrigin(0, 0)
      .setDepth(BTN_DEPTH);

    const icon = this.scene.add
      .image(btnX + BTN_SIZE / 2, btnY + BTN_SIZE / 2, "ui-icons")
      .setFrame(GROUP_ICON_INDICES[group])
      .setDisplaySize(ICON_SIZE, ICON_SIZE)
      .setTint(theme.colors.accent)
      .setDepth(BTN_DEPTH + 1);

    const hit = this.scene.add
      .zone(btnX, btnY, BTN_SIZE, BTN_SIZE)
      .setOrigin(0, 0)
      .setDepth(BTN_DEPTH + 2)
      .setInteractive({ cursor: "pointer", useHandCursor: true })
      .setName(`btn-layer-group-${group}`);

    hit.on("pointerover", () => bg.setStrokeStyle(1, theme.colors.accent, 0.9));
    hit.on("pointerout", () =>
      bg.setStrokeStyle(1, theme.colors.panelBorder, 0.7),
    );
    hit.on("pointerup", () => {
      if (this.openGroup === group) {
        this.closeDrawer();
      } else {
        this.openDrawer(group);
      }
    });

    this.buttons.push({ bg, icon, hit, group });
  }

  private openDrawer(group: LayerGroup): void {
    if (this.drawer) this.closeDrawer();
    this.openGroup = group;

    const theme = getTheme();
    const layers = mapLayerController.getLayersByGroup(group);
    const drawerH = DRAWER_PADDING * 2 + layers.length * DRAWER_ROW_HEIGHT;

    const groupIdx = LAYER_GROUPS.indexOf(group);
    const btnY = this.topY + groupIdx * (BTN_SIZE + BTN_GAP);
    const drawerX = this.rightEdge - BTN_SIZE - DRAWER_WIDTH;
    const drawerY = btnY;

    const container = this.scene.add.container(drawerX, drawerY);
    container.setDepth(DRAWER_DEPTH);
    this.drawer = container;

    const panelBg = this.scene.add
      .rectangle(0, 0, DRAWER_WIDTH, drawerH, theme.colors.panelBg, 0.93)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.85)
      .setOrigin(0, 0);
    container.add(panelBg);

    // Group title
    const titleText = this.scene.add
      .text(
        DRAWER_PADDING,
        DRAWER_PADDING / 2,
        GROUP_LABELS[group].toUpperCase(),
        {
          fontSize: "10px",
          fontFamily: "monospace",
          color: colorToString(theme.colors.textDim),
        },
      )
      .setOrigin(0, 0);
    container.add(titleText);

    for (let i = 0; i < layers.length; i++) {
      this.buildDrawerRow(container, layers[i].id, i);
    }

    container.setAlpha(0);
    container.x = drawerX + 12;
    this.scene.tweens.add({
      targets: container,
      x: drawerX,
      alpha: 1,
      duration: 100,
      ease: "Power2Out",
    });

    this.refreshButtons();
  }

  private buildDrawerRow(
    container: Phaser.GameObjects.Container,
    layerId: LayerId,
    rowIdx: number,
  ): void {
    const theme = getTheme();
    const layer = mapLayerController.getLayer(layerId);
    const on = mapLayerController.isVisible(layerId);
    const rowY = DRAWER_PADDING + rowIdx * DRAWER_ROW_HEIGHT;

    const rowIcon = this.scene.add
      .image(
        DRAWER_PADDING + ICON_SIZE / 2,
        rowY + DRAWER_ROW_HEIGHT / 2,
        "ui-icons",
      )
      .setFrame(layer.iconIndex)
      .setDisplaySize(ICON_SIZE, ICON_SIZE)
      .setTint(on ? theme.colors.accent : theme.colors.textDim);

    const rowLabel = this.scene.add
      .text(
        DRAWER_PADDING + ICON_SIZE + 8,
        rowY + DRAWER_ROW_HEIGHT / 2,
        layer.label.toUpperCase(),
        {
          fontSize: "11px",
          fontFamily: "monospace",
          color: colorToString(on ? theme.colors.text : theme.colors.textDim),
        },
      )
      .setOrigin(0, 0.5);

    const checkmark = this.scene.add
      .text(DRAWER_WIDTH - DRAWER_PADDING, rowY + DRAWER_ROW_HEIGHT / 2, "✓", {
        fontSize: "14px",
        fontFamily: "monospace",
        color: colorToString(theme.colors.accent),
      })
      .setOrigin(1, 0.5)
      .setAlpha(on ? 1 : 0);

    const rowHit = this.scene.add
      .zone(0, rowY, DRAWER_WIDTH, DRAWER_ROW_HEIGHT)
      .setOrigin(0, 0)
      .setInteractive({ cursor: "pointer", useHandCursor: true });

    rowHit.on(
      "pointerup",
      (
        _ptr: Phaser.Input.Pointer,
        _lx: number,
        _ly: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        mapLayerController.toggle(layerId);
        const nowOn = mapLayerController.isVisible(layerId);
        rowIcon.setTint(nowOn ? theme.colors.accent : theme.colors.textDim);
        rowLabel.setColor(
          colorToString(nowOn ? theme.colors.text : theme.colors.textDim),
        );
        checkmark.setAlpha(nowOn ? 1 : 0);
        this.refreshButtons();
      },
    );

    container.add([rowIcon, rowLabel, checkmark, rowHit]);
  }

  private closeDrawer(): void {
    if (!this.drawer) return;
    const drawer = this.drawer;
    this.scene.tweens.add({
      targets: drawer,
      alpha: 0,
      x: drawer.x + 12,
      duration: 100,
      ease: "Power2Out",
      onComplete: () => drawer.destroy(),
    });
    this.drawer = null;
    this.openGroup = null;
    this.refreshButtons();
  }

  private refreshButtons(): void {
    const theme = getTheme();
    for (const btn of this.buttons) {
      const layers = mapLayerController.getLayersByGroup(btn.group);
      const anyOn = layers.some((l) => mapLayerController.isVisible(l.id));
      const isOpen = this.openGroup === btn.group;
      btn.icon.setTint(
        isOpen
          ? theme.colors.warning
          : anyOn
            ? theme.colors.accent
            : theme.colors.textDim,
      );
    }
  }

  private handleScenePointerdown(ptr: Phaser.Input.Pointer): void {
    if (this.openGroup === null || !this.drawer) return;

    const groupIdx = LAYER_GROUPS.indexOf(this.openGroup);
    const btnX = this.rightEdge - BTN_SIZE;
    const btnY = this.topY + groupIdx * (BTN_SIZE + BTN_GAP);
    const drawerX = this.rightEdge - BTN_SIZE - DRAWER_WIDTH;
    const layers = mapLayerController.getLayersByGroup(this.openGroup);
    const drawerH = DRAWER_PADDING * 2 + layers.length * DRAWER_ROW_HEIGHT;

    const inDrawer =
      ptr.x >= drawerX &&
      ptr.x <= drawerX + DRAWER_WIDTH &&
      ptr.y >= btnY &&
      ptr.y <= btnY + drawerH;

    const inToolbar =
      ptr.x >= btnX &&
      ptr.x <= btnX + BTN_SIZE &&
      ptr.y >= this.topY &&
      ptr.y <= this.topY + LAYER_GROUPS.length * (BTN_SIZE + BTN_GAP);

    if (!inDrawer && !inToolbar) {
      this.closeDrawer();
    }
  }
}
```

- [ ] **Step 2: Mount the toolbar in `src/scenes/GalaxyMapScene.ts`**

**2a.** Add the import at the top of GalaxyMapScene.ts (with the other ui imports):

```ts
import { MapLayerToolbar } from "../ui/MapLayerToolbar.ts";
```

**2b.** Add a private field in the class body alongside the other private fields (e.g., after `private companyFilterButton: LayerToggleButton | null = null;`):

```ts
private toolbar: MapLayerToolbar | null = null;
```

**2c.** In `create()`, replace the existing call to `this.buildLayerToggleRow(state, theme, L);` with:

```ts
this.buildLayerToggleRow(state, theme, L);
this.toolbar = new MapLayerToolbar(this);
```

**2d.** In the `cleanup` closure inside `create()`, add toolbar teardown just before `setActiveGalaxyView(null)`:

```ts
this.toolbar?.destroy();
this.toolbar = null;
```

**2e.** In `relayout()`, add after `this.view3D?.setSize(L.gameWidth, L.gameHeight);`:

```ts
this.toolbar?.reposition(L);
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Start dev server and visually verify the toolbar appears**

```bash
npm run dev
```

Open the game, start a new game, navigate to the Galaxy Map. You should see 5 square icon buttons stacked on the right edge of the galaxy view. Clicking them should open/close drawers showing layer rows. Layer toggles should flip `mapLayerController` state (visible in browser devtools via `localStorage.getItem("spacebiz.mapLayers.v1")`). Renderers don't respond yet (Task 4 wires that).

- [ ] **Step 5: Commit**

```bash
git add src/ui/MapLayerToolbar.ts src/scenes/GalaxyMapScene.ts
git commit -m "feat(map-layers): add MapLayerToolbar widget and mount in GalaxyMapScene"
```

---

## Task 4: GalaxyView2D Visibility Methods + Renderer Wiring + Toggle Row Removal

**Files:**

- Modify: `src/scenes/galaxy2d/GalaxyView2D.ts`
- Modify: `src/scenes/GalaxyMapScene.ts`

**Context:** Add three new visibility methods to `GalaxyView2D`, subscribe existing renderers to `mapLayerController` in `GalaxyMapScene.create()`, then remove the three old layer toggle buttons (Empires/Names/Ships) from `buildLayerToggleRow` (company filter stays). Clean up the now-dead private fields and constants.

### Part A: Add visibility methods to GalaxyView2D

- [ ] **Step 1: Add three private flags to `GalaxyView2D`**

In `src/scenes/galaxy2d/GalaxyView2D.ts`, find the group of private fields near line 178 (after `private readonly starSprites`). Add three flags:

```ts
private hyperlanesVisible = true;
private territoryVisible = true;
private systemsVisible = true;
```

Place them near `private empireLabelsVisible = true;` (around line 191).

- [ ] **Step 2: Add three public methods to `GalaxyView2D`**

After the existing `setEmpireLabelsVisible` method (around line 1052), add:

```ts
setHyperlanesVisible(on: boolean): void {
  if (this.destroyed) return;
  this.hyperlanesVisible = on;
  if (!on && this.hyperlanesGfx) this.hyperlanesGfx.clear();
}

setTerritoryBordersVisible(on: boolean): void {
  if (this.destroyed) return;
  this.territoryVisible = on;
  if (!on) {
    this.fillTerritoryGfx?.clear();
    this.territoryGfx?.clear();
  }
}

setSystemsVisible(on: boolean): void {
  if (this.destroyed) return;
  this.systemsVisible = on;
  if (!on) {
    for (const sprite of this.starSprites.values()) {
      sprite.setVisible(false);
    }
  }
}
```

- [ ] **Step 3: Guard hyperlane rendering in `update()` with the new flag**

In the `update()` method, find the hyperlane draw block (around line 730):

```ts
// Hyperlanes — redrawn per frame.
if (this.hyperlanesGfx) {
  this.hyperlanesGfx.clear();
  for (const seg of this.hyperlaneSegments) {
```

Change it to skip drawing when off:

```ts
if (this.hyperlanesGfx) {
  this.hyperlanesGfx.clear();
  if (this.hyperlanesVisible) {
    for (const seg of this.hyperlaneSegments) {
```

And close the new `if` block after the draw loop's closing brace (after `this.hyperlanesGfx.lineBetween(...)`).

The full updated block:

```ts
if (this.hyperlanesGfx) {
  this.hyperlanesGfx.clear();
  if (this.hyperlanesVisible) {
    for (const seg of this.hyperlaneSegments) {
      this.scratchNdcA.x = seg.ax;
      this.scratchNdcA.y = seg.ay;
      this.scratchNdcA.z = seg.az;
      const a = projectToScreenDesignInto(
        this.scratchNdcB,
        this.scratchNdcA,
        viewProj,
        this.viewport,
      );
      if (!a.visible) continue;
      const ax = a.x;
      const ay = a.y;

      this.scratchNdcA.x = seg.bx;
      this.scratchNdcA.y = seg.by;
      this.scratchNdcA.z = seg.bz;
      const b = projectToScreenDesignInto(
        this.scratchNdcB,
        this.scratchNdcA,
        viewProj,
        this.viewport,
      );
      if (!b.visible) continue;

      this.hyperlanesGfx.lineStyle(
        HYPERLANE_LINE_WIDTH,
        seg.color,
        HYPERLANE_LINE_ALPHA,
      );
      this.hyperlanesGfx.lineBetween(ax, ay, b.x, b.y);
    }
  }
}
```

- [ ] **Step 4: Guard territory fill rendering in `update()` with the new flag**

Find the fill pass block starting around line 651:

```ts
if (this.fillTerritoryGfx) {
  this.fillTerritoryGfx.clear();
  for (const poly of this.territoryPolygons) {
```

Change to:

```ts
if (this.fillTerritoryGfx) {
  this.fillTerritoryGfx.clear();
  if (this.territoryVisible) {
    for (const poly of this.territoryPolygons) {
      // ... (existing body unchanged)
    }
  }
}
```

- [ ] **Step 5: Guard territory stroke rendering in `update()` with the new flag**

Find the stroke pass block starting around line 698:

```ts
if (this.territoryGfx) {
  this.territoryGfx.clear();
  for (const poly of this.territoryPolygons) {
```

Change to:

```ts
if (this.territoryGfx) {
  this.territoryGfx.clear();
  if (this.territoryVisible) {
    for (const poly of this.territoryPolygons) {
      // ... (existing body unchanged)
    }
  }
}
```

- [ ] **Step 6: Guard star visibility in `update()` with the new flag**

Find line 515 inside the star loop:

```ts
sprite.setVisible(true);
```

Change to:

```ts
sprite.setVisible(this.systemsVisible);
```

### Part B: Wire renderer subscriptions in GalaxyMapScene

- [ ] **Step 7: Add imports to `src/scenes/GalaxyMapScene.ts`**

Add these imports near the top with other imports:

```ts
import { mapLayerController } from "../game/map/MapLayerController.ts";
import type { LayerId } from "../game/map/MapLayerRegistry.ts";
```

- [ ] **Step 8: Add `installLayerController()` method to `GalaxyMapScene`**

Add this new private method after the existing `setEmpiresVisible` method (around line 880):

```ts
private installLayerController(): void {
  if (!this.view3D) return;

  // Apply initial controller state to all renderers.
  this.view3D.setEmpireLabelsVisible(
    mapLayerController.isVisible("empire-names"),
  );
  this.view3D.setEmpireHalosVisible(
    mapLayerController.isVisible("empire-borders"),
  );
  this.view3D.setTerritoryBordersVisible(
    mapLayerController.isVisible("empire-borders"),
  );
  this.view3D.setSystemsVisible(mapLayerController.isVisible("systems"));
  this.showSystemNames = mapLayerController.isVisible("system-names");
  this.view3D.setHyperlanesVisible(mapLayerController.isVisible("hyperlanes"));
  this.view3D.setShipsVisible(mapLayerController.isVisible("ships"));

  const onLayerChange = (id: unknown): void => {
    if (!this.view3D) return;
    const layerId = id as LayerId;
    const on = mapLayerController.isVisible(layerId);
    switch (layerId) {
      case "empire-names":
        this.view3D.setEmpireLabelsVisible(on);
        break;
      case "empire-borders":
        this.view3D.setEmpireHalosVisible(on);
        this.view3D.setTerritoryBordersVisible(on);
        break;
      case "system-names":
        this.showSystemNames = on;
        break;
      case "systems":
        this.view3D.setSystemsVisible(on);
        break;
      case "hyperlanes":
        this.view3D.setHyperlanesVisible(on);
        break;
      case "ships":
        this.view3D.setShipsVisible(on);
        break;
      default:
        break; // stub layers — no-op in v1
    }
  };

  mapLayerController.on("change", onLayerChange);
  // Unsubscribe on scene lifecycle end (the closure in create() also handles this,
  // but an explicit off is cleaner for the shared singleton).
  this.events.once("shutdown", () =>
    mapLayerController.off("change", onLayerChange),
  );
  this.events.once("destroy", () =>
    mapLayerController.off("change", onLayerChange),
  );
}
```

- [ ] **Step 9: Call `installLayerController()` from `create()`**

In `create()`, add a call right after `this.toolbar = new MapLayerToolbar(this);`:

```ts
this.installLayerController();
```

### Part C: Remove the old layer toggle buttons from `buildLayerToggleRow`

- [ ] **Step 10: Simplify `buildLayerToggleRow` — remove the 3 layer toggles, keep the company filter**

Replace the current `buildLayerToggleRow` method body. The new version keeps `companyFilterCycle`, `labelForFilter`, and the filter button. Remove `makeToggle` and the three toggle button calls. Remove `TOGGLE_ROW_GAP` constant from the file top.

New method (rename parameter `state` still, just drop `makeToggle`):

```ts
private buildLayerToggleRow(
  state: GameState,
  theme: ReturnType<typeof getTheme>,
  L: ReturnType<typeof getLayout>,
): void {
  this.companyFilterCycle = [
    null,
    "player",
    ...state.aiCompanies.map((c) => c.id),
  ];
  const labelForFilter = (id: string | null): string => {
    if (id === null) return "Filter: All Companies";
    if (id === "player") return `Filter: ${state.companyName}`;
    const co = state.aiCompanies.find((c) => c.id === id);
    return `Filter: ${co?.name ?? id}`;
  };

  const rowY = L.contentTop + L.contentHeight - 56;
  const x = L.mainContentLeft + 8;
  const filterWidth = TOGGLE_FILTER_WIDTH;

  const filterBg = this.add
    .rectangle(x, rowY, filterWidth, 36, theme.colors.panelBg, 0.85)
    .setStrokeStyle(1, theme.colors.panelBorder, 0.6)
    .setOrigin(0, 0)
    .setDepth(902);
  const filterText = this.add
    .text(x + filterWidth / 2, rowY + 18, labelForFilter(this.companyFilter), {
      fontSize: `${theme.fonts.caption.size}px`,
      fontFamily: theme.fonts.caption.family,
      color: colorToString(theme.colors.text),
    })
    .setOrigin(0.5, 0.5)
    .setDepth(903);
  const filterHit = this.add
    .zone(x, rowY, filterWidth, 36)
    .setOrigin(0, 0)
    .setInteractive({ cursor: "pointer", useHandCursor: true });
  const refreshFilter = (): void => {
    const on = this.companyFilter !== null;
    filterBg.setFillStyle(
      on ? theme.colors.accent : theme.colors.panelBg,
      on ? 0.5 : 0.85,
    );
    filterBg.setStrokeStyle(
      1,
      on ? theme.colors.accent : theme.colors.panelBorder,
      on ? 0.9 : 0.6,
    );
    filterText.setText(labelForFilter(this.companyFilter));
    filterText.setColor(
      colorToString(on ? theme.colors.text : theme.colors.textDim),
    );
  };
  filterHit.on("pointerup", () => {
    getAudioDirector().sfx("ui_tab_switch");
    this.cycleCompanyFilter();
    refreshFilter();
  });
  refreshFilter();
  this.companyFilterButton = {
    bg: filterBg,
    label: filterText,
    hit: filterHit,
    width: filterWidth,
    isOn: () => this.companyFilter !== null,
    setOn: () => refreshFilter(),
  };
}
```

- [ ] **Step 11: Remove dead private fields from `GalaxyMapScene`**

Remove these private fields that are no longer needed:

```ts
// REMOVE these lines (around line 65-74):
private showEmpires = true;
private showShips = true;
private layerToggles: LayerToggleButton[] = [];
```

Keep `private showSystemNames = true;` — it's still used in `update()` for LOD calculations.

- [ ] **Step 12: Remove dead constants from `GalaxyMapScene`**

Remove `TOGGLE_ROW_GAP` constant (no longer used since `makeToggle` is gone). Keep `TOGGLE_FILTER_WIDTH`.

- [ ] **Step 13: Remove dead private methods from `GalaxyMapScene`**

Remove the `setEmpiresVisible` and `setShipsVisible` private methods — their logic now lives in `installLayerController()`.

- [ ] **Step 14: Clean up the `cleanup` closure in `create()`**

In the `cleanup` function (around line 254), remove the toggle button teardown:

```ts
// REMOVE this block:
for (const t of this.layerToggles) {
  t.bg.destroy();
  t.label.destroy();
  t.hit.destroy();
}
this.layerToggles = [];
```

The `companyFilterButton` teardown block stays:

```ts
if (this.companyFilterButton) {
  this.companyFilterButton.bg.destroy();
  this.companyFilterButton.label.destroy();
  this.companyFilterButton.hit.destroy();
  this.companyFilterButton = null;
}
```

Also remove `LayerToggleButton` interface from the top of `GalaxyMapScene.ts` only if `companyFilterButton: LayerToggleButton | null` is the only remaining usage — the interface is still needed for `companyFilterButton`. Keep it.

- [ ] **Step 15: Fix `relayout()` — remove the toggle button loop, keep filter button**

In `relayout()`, remove:

```ts
// REMOVE:
const rowY = L.contentTop + L.contentHeight - 56;
let x = L.mainContentLeft + 8;
for (const btn of this.layerToggles) {
  btn.bg.setPosition(x, rowY);
  btn.label.setPosition(x + btn.width / 2, rowY + 18);
  btn.hit.setPosition(x, rowY);
  x += btn.width + TOGGLE_ROW_GAP;
}
if (this.companyFilterButton) {
  ...
}
```

Replace with:

```ts
// Layer toggle row — only the company filter remains.
const rowY = L.contentTop + L.contentHeight - 56;
const x = L.mainContentLeft + 8;
if (this.companyFilterButton) {
  const cf = this.companyFilterButton;
  cf.bg.setPosition(x, rowY);
  cf.label.setPosition(x + cf.width / 2, rowY + 18);
  cf.hit.setPosition(x, rowY);
}
```

- [ ] **Step 16: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors. Fix any unused variable errors (e.g. if `TOGGLE_ROW_GAP` removal left something referencing it).

- [ ] **Step 17: Run full test suite**

```bash
npm run test
```

Expected: all tests pass. The `GalaxyMapScene` existing tests should not break since the galaxy rendering logic itself is unchanged.

- [ ] **Step 18: Manual verification in the browser**

Start the dev server and navigate to the Galaxy Map:

1. Five icon buttons appear on the right edge.
2. Clicking **Geography** drawer → toggling **Hyperlanes** off makes hyperlane lines disappear from the galaxy.
3. Clicking **Geography** → toggling **System Names** off hides star labels.
4. Clicking **Politics** → toggling **Empire Borders** off hides the territory fills and outlines + empire halos.
5. Clicking **Politics** → toggling **Empire Names** off hides the large faint empire name labels.
6. Clicking **Movement** → toggling **Ships** off removes ship sprites.
7. Clicking **Movement** → toggling **Systems** off hides all star dots.
8. Stub layers (Navies, Companies, Import/Export Goods, Space Events) toggle state but render no change — correct behavior.
9. Refreshing the page restores the last toggled state via localStorage.
10. The company filter button at the bottom left still cycles through filter modes.
11. Pressing Esc closes any open drawer.
12. Clicking outside the toolbar closes any open drawer.

- [ ] **Step 19: Commit**

```bash
git add src/scenes/galaxy2d/GalaxyView2D.ts src/scenes/GalaxyMapScene.ts
git commit -m "feat(map-layers): wire renderer subscriptions and remove old toggle row"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement                                        | Covered by                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------- |
| 11 layers in 5 groups                                   | Task 1 (MapLayerRegistry)                                      |
| Stub layers — flag only, no renderer                    | Task 1 (implemented: false) + Task 4 (default: case in switch) |
| localStorage persistence (debounced 200ms, v1 key)      | Task 1 (MapLayerController)                                    |
| 5 × 40×40 px square group buttons, right edge           | Task 3 (MapLayerToolbar)                                       |
| Expand drawer to left on click                          | Task 3 (openDrawer)                                            |
| One drawer at a time                                    | Task 3 (closeDrawer before openDrawer)                         |
| Close on outside click / Esc                            | Task 3 (handleScenePointerdown + escKey)                       |
| 100ms slide + alpha tween                               | Task 3 (tweens in openDrawer/closeDrawer)                      |
| Icon tint: accent=any-on, textDim=all-off, warning=open | Task 3 (refreshButtons)                                        |
| Checkmark ✓ when layer on                               | Task 3 (buildDrawerRow)                                        |
| Depth 9000 / 9100                                       | Task 3 (BTN_DEPTH / DRAWER_DEPTH)                              |
| Test ids: btn-layer-group-{group}                       | Task 3 (hit.setName)                                           |
| 16-icon spritesheet, 24×24 cells                        | Task 2 (pack-icons.mjs)                                        |
| BootScene preload                                       | Task 2                                                         |
| setHyperlanesVisible                                    | Task 4                                                         |
| setTerritoryBordersVisible                              | Task 4                                                         |
| setSystemsVisible                                       | Task 4                                                         |
| empire-names → labels only                              | Task 4 (switch case)                                           |
| empire-borders → halos + territory                      | Task 4 (switch case)                                           |
| Remove bottom-row toggles                               | Task 4 (Part C)                                                |
| Company filter stays                                    | Task 4 (kept in buildLayerToggleRow)                           |
| Unit tests for controller                               | Task 1 (8 tests)                                               |

**Type consistency check:**

- `LayerId` defined once in `MapLayerRegistry.ts`, imported everywhere
- `mapLayerController.getLayersByGroup(group)` used in Task 3 and Task 4 — both receive `LayerGroup`
- `mapLayerController.toggle(layerId)` used in Task 3 `buildDrawerRow` — `layerId: LayerId` ✓
- `setTerritoryBordersVisible` defined in Task 4 Step 2, called in Task 4 Step 8 — name matches ✓
- `installLayerController()` defined in Task 4 Step 8, called in Task 4 Step 9 — ✓

**Placeholder scan:** No TBDs, no "handle later", no vague steps.
