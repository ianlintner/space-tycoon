# Chamfered UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mixed rounded-rect / circular UI with a unified sci-fi
visual language: **chamfered (cut-45°) containers, hard-square controls,
chamfered portrait frames**.

**Architecture:** Introduce `theme.shape.{container,control,portrait}`
tokens and a shared `foundation/shapes.ts` module with chamfered-path
primitives for both `Phaser.GameObjects.Graphics` and `Canvas2D`. Sweep
the ~8 files that currently call `fillRoundedRect` / `fillCircle` for
UI chrome. Most components (Tooltip, Dropdown, TabGroup, StatusBadge,
ProgressBar, ScrollFrame, ScrollableList, IconButton, Modal, InfoCard,
Panel) already use plain `Rectangle` GameObjects or the `panel-bg`
NineSlice texture and need no per-component change — they pick up the
new look automatically when BootScene regenerates `btn-*` textures and
the `panel-bg`/`panel-glow` continue to render through the shared
chamfered path.

**Tech Stack:** Phaser 4, TypeScript (strict, `erasableSyntaxOnly`,
`verbatimModuleSyntax`), Vitest 4 with `phaserMock`. Specs:
[2026-05-11-chamfered-ui-redesign-design.md](../specs/2026-05-11-chamfered-ui-redesign-design.md).

---

## File Map

**Created:**

- `packages/spacebiz-ui/src/foundation/shapes.ts` — chamfered-path
  primitives for Graphics + Canvas2D + polygon mask shapes.
- `packages/spacebiz-ui/src/__tests__/foundation/shapes.test.ts` —
  unit tests for the primitives.
- `styleguide/src/pages/ShapeAudit.ts` — visual reference page (sibling
  of existing styleguide pages — confirm exact location at Task 11).

**Modified:**

- `packages/spacebiz-ui/src/Theme.ts` — add `shape` tokens to all three
  theme variants + `ThemeConfig` interface.
- `packages/spacebiz-ui/src/Button.ts:244-303` — drop `r = 3`; use
  `fillRect` + `strokeRect`.
- `packages/spacebiz-ui/src/__tests__/_harness/phaserMock.ts` — add
  `strokeRect`, `beginPath`, `moveTo`, `lineTo`, `closePath`,
  `fillPath`, `strokePath` stubs on the graphics mock.
- `src/scenes/BootScene.ts:281-438` — share `traceChamferedPath`,
  drive panel-bg / panel-glow chamfer through new token, regenerate
  `btn-*` as hard-square.
- `src/ui/TechQueueRow.ts:74-79` — tile bg uses `fillRect`/`strokeRect`.
- `src/scenes/GalaxyMapScene.ts:1156-1161` — system info card uses
  shared `fillChamferedRect`/`strokeChamferedRect`.
- `packages/rogue-universe-shared/src/characters/AdviserPanel.ts:446-494` —
  drawer tab uses chamfered left-side cuts; dismiss button becomes
  square.
- `src/scenes/GalaxySetupScene.ts:454-458` — portrait mask becomes a
  chamfered polygon shape.
- `src/scenes/GameHUDScene.ts:308-318` — CEO portrait mask + border
  ring become chamfered polygons.
- `src/scenes/FinanceScene.ts:162-210` — CEO portrait mask + border
  ring become chamfered polygons.

**Tests:**

- New: `packages/spacebiz-ui/src/__tests__/foundation/shapes.test.ts`
- Modified: `packages/spacebiz-ui/src/__tests__/primitives/Button.test.ts`
  (regression assertion: `fillRect` is called, `fillRoundedRect` is
  not).
- Existing tests that pass without change: `Panel.test.ts`,
  `Dropdown.test.ts`, `ProgressBar.test.ts`, `IconButton.test.ts`,
  `TechQueueRow.test.ts`.

---

## Task 1: Add `theme.shape` tokens (TDD)

**Why this first:** Every later task references these tokens. No callers
yet, so this is a pure additive change with no visual effect.

**Files:**

- Modify: `packages/spacebiz-ui/src/Theme.ts`
- Test: `packages/spacebiz-ui/src/__tests__/foundation/Theme.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `packages/spacebiz-ui/src/__tests__/foundation/Theme.test.ts`:

```ts
import { darkTheme, lightTheme, highContrastTheme } from "../../Theme.ts";

describe("shape tokens", () => {
  const variants = [
    ["dark", darkTheme],
    ["light", lightTheme],
    ["high-contrast", highContrastTheme],
  ] as const;

  for (const [name, theme] of variants) {
    describe(name, () => {
      it("exposes container shape token", () => {
        expect(theme.shape.container.chamfer).toBe(8);
        expect(theme.shape.container.borderWidth).toBe(2);
      });
      it("exposes control shape token", () => {
        expect(theme.shape.control.chamfer).toBe(0);
        expect(theme.shape.control.borderWidth).toBe(1);
      });
      it("exposes portrait shape token", () => {
        expect(theme.shape.portrait.chamfer).toBe(6);
      });
    });
  }
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm run test -- packages/spacebiz-ui/src/__tests__/foundation/Theme.test.ts`
Expected: 9 failing assertions (`Cannot read properties of undefined (reading 'container')`).

- [ ] **Step 3: Extend the ThemeConfig interface**

In `packages/spacebiz-ui/src/Theme.ts`, inside the `ThemeConfig`
interface (after the existing `chamfer: { size: number }` block, around
line 150), add:

```ts
/**
 * Shape language tokens. Containers (panels, modals, cards, tooltips)
 * use chamfered (cut-45°) corners; controls (buttons, inputs, badges)
 * use hard square corners. Portrait frames use a smaller chamfer.
 */
shape: {
  container: {
    chamfer: number;
    borderWidth: number;
  }
  control: {
    chamfer: number;
    borderWidth: number;
  }
  portrait: {
    chamfer: number;
  }
}
```

- [ ] **Step 4: Add the token values to `SHARED_TYPOGRAPHY`**

In `packages/spacebiz-ui/src/Theme.ts`, inside the `SHARED_TYPOGRAPHY`
`as const` literal (around line 209, alongside `chamfer: { size: 8 }`),
add:

```ts
  shape: {
    container: { chamfer: 8, borderWidth: 2 },
    control: { chamfer: 0, borderWidth: 1 },
    portrait: { chamfer: 6 },
  },
```

Because `SHARED_TYPOGRAPHY` is spread into `darkTheme`, `lightTheme`,
and `highContrastTheme`, all three variants inherit identical shape
tokens — the shape language doesn't vary by color theme.

- [ ] **Step 5: Run tests and verify they pass**

Run: `npm run test -- packages/spacebiz-ui/src/__tests__/foundation/Theme.test.ts`
Expected: PASS for all three variants.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/spacebiz-ui/src/Theme.ts packages/spacebiz-ui/src/__tests__/foundation/Theme.test.ts
git commit -m "feat(theme): add shape tokens for chamfered UI redesign"
```

---

## Task 2: Add chamfered path primitives (TDD)

**Why now:** All Graphics-based callers in later tasks need this.

**Files:**

- Create: `packages/spacebiz-ui/src/foundation/shapes.ts`
- Create: `packages/spacebiz-ui/src/__tests__/foundation/shapes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/spacebiz-ui/src/__tests__/foundation/shapes.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("../_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

import {
  fillChamferedRect,
  strokeChamferedRect,
  traceChamferedPath,
  chamferedRectPoints,
} from "../../foundation/shapes.ts";

describe("chamferedRectPoints", () => {
  it("returns 8 vertices for a non-zero chamfer", () => {
    const pts = chamferedRectPoints(0, 0, 100, 50, 8);
    expect(pts).toEqual([
      8,
      0, // top-left after cut
      92,
      0, // top-right before cut
      100,
      8, // top-right after cut
      100,
      42, // bottom-right before cut
      92,
      50, // bottom-right after cut
      8,
      50, // bottom-left before cut
      0,
      42, // bottom-left after cut
      0,
      8, // top-left before cut
    ]);
  });

  it("clamps chamfer to half of the shorter side", () => {
    // 20×40 box with chamfer=15 → clamped to 10.
    const pts = chamferedRectPoints(0, 0, 20, 40, 15);
    expect(pts[0]).toBe(10);
    expect(pts[1]).toBe(0);
  });

  it("returns 4 corner-equivalent points when chamfer is 0", () => {
    // chamfer=0 collapses to a plain rectangle (8 entries — 4 corners
    // each repeated as both 'before' and 'after' the cut).
    const pts = chamferedRectPoints(0, 0, 100, 50, 0);
    expect(pts).toEqual([
      0, 0, 100, 0, 100, 0, 100, 50, 100, 50, 0, 50, 0, 50, 0, 0,
    ]);
  });
});

describe("fillChamferedRect", () => {
  function makeRecorder() {
    const calls: Array<[string, unknown[]]> = [];
    return {
      calls,
      g: {
        beginPath: (...a: unknown[]) => (
          calls.push(["beginPath", a]),
          undefined
        ),
        moveTo: (...a: unknown[]) => (calls.push(["moveTo", a]), undefined),
        lineTo: (...a: unknown[]) => (calls.push(["lineTo", a]), undefined),
        closePath: (...a: unknown[]) => (
          calls.push(["closePath", a]),
          undefined
        ),
        fillPath: (...a: unknown[]) => (calls.push(["fillPath", a]), undefined),
        strokePath: (...a: unknown[]) => (
          calls.push(["strokePath", a]),
          undefined
        ),
      },
    };
  }

  it("traces the 8 chamfered vertices and fills", () => {
    const r = makeRecorder();
    fillChamferedRect(r.g as never, 0, 0, 100, 50, 8);
    const kinds = r.calls.map((c) => c[0]);
    expect(kinds).toEqual([
      "beginPath",
      "moveTo", // first vertex
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo", // 7 lineTo's after the moveTo = 8 vertices
      "closePath",
      "fillPath",
    ]);
    expect(r.calls[1][1]).toEqual([8, 0]); // first vertex
    expect(r.calls[2][1]).toEqual([92, 0]); // second
    expect(r.calls[8][1]).toEqual([0, 8]); // eighth
  });

  it("falls back to plain rect path when chamfer is 0", () => {
    const r = makeRecorder();
    fillChamferedRect(r.g as never, 0, 0, 100, 50, 0);
    // Still traces a path with 4 distinct corners (no curves).
    expect(r.calls[1][1]).toEqual([0, 0]);
    expect(r.calls.some((c) => c[0] === "fillPath")).toBe(true);
  });
});

describe("strokeChamferedRect", () => {
  it("ends with strokePath instead of fillPath", () => {
    const calls: Array<[string, unknown[]]> = [];
    const g = {
      beginPath: (...a: unknown[]) => calls.push(["beginPath", a]),
      moveTo: (...a: unknown[]) => calls.push(["moveTo", a]),
      lineTo: (...a: unknown[]) => calls.push(["lineTo", a]),
      closePath: (...a: unknown[]) => calls.push(["closePath", a]),
      strokePath: (...a: unknown[]) => calls.push(["strokePath", a]),
    };
    strokeChamferedRect(g as never, 0, 0, 100, 50, 8);
    expect(calls[calls.length - 1][0]).toBe("strokePath");
  });
});

describe("traceChamferedPath (Canvas2D)", () => {
  it("calls moveTo + 7 lineTo + closePath on a Canvas2D context", () => {
    const calls: Array<[string, unknown[]]> = [];
    const ctx = {
      beginPath: (...a: unknown[]) => calls.push(["beginPath", a]),
      moveTo: (...a: unknown[]) => calls.push(["moveTo", a]),
      lineTo: (...a: unknown[]) => calls.push(["lineTo", a]),
      closePath: (...a: unknown[]) => calls.push(["closePath", a]),
    };
    traceChamferedPath(ctx as never, 0, 0, 100, 50, 8);
    const kinds = calls.map((c) => c[0]);
    expect(kinds).toEqual([
      "beginPath",
      "moveTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "lineTo",
      "closePath",
    ]);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm run test -- packages/spacebiz-ui/src/__tests__/foundation/shapes.test.ts`
Expected: FAIL with "Cannot find module '../../foundation/shapes.ts'".

- [ ] **Step 3: Implement the primitives**

Create `packages/spacebiz-ui/src/foundation/shapes.ts`:

```ts
import * as Phaser from "phaser";

/**
 * Compute the 8 vertices of a chamfered (cut-45°) rectangle.
 *
 * Returned as a flat `[x0, y0, x1, y1, …, x7, y7]` array so it can be
 * passed straight to `scene.add.polygon` or fed sequentially to
 * Graphics path methods.
 *
 * When `c` is 0, the result is still 16 entries (8 pairs) but each
 * corner is duplicated — callers can rely on a single code path.
 *
 * The chamfer is clamped to half the shorter side so degenerate
 * inputs (chamfer larger than the box) don't fold the polygon
 * inside-out.
 */
export function chamferedRectPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
): number[] {
  const cc = Math.max(0, Math.min(c, Math.min(w, h) / 2));
  return [
    x + cc,
    y,
    x + w - cc,
    y,
    x + w,
    y + cc,
    x + w,
    y + h - cc,
    x + w - cc,
    y + h,
    x + cc,
    y + h,
    x,
    y + h - cc,
    x,
    y + cc,
  ];
}

/** Minimal Graphics surface needed to draw chamfered paths. */
interface ChamferableGraphics {
  beginPath(): unknown;
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  closePath(): unknown;
  fillPath?(): unknown;
  strokePath?(): unknown;
}

function tracePath(
  g: ChamferableGraphics,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
): void {
  const pts = chamferedRectPoints(x, y, w, h, c);
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) {
    g.lineTo(pts[i], pts[i + 1]);
  }
  g.closePath();
}

/** Fill a chamfered rectangle on a Phaser Graphics object. */
export function fillChamferedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
): void {
  tracePath(g as unknown as ChamferableGraphics, x, y, w, h, c);
  (g as unknown as ChamferableGraphics).fillPath?.();
}

/** Stroke a chamfered rectangle on a Phaser Graphics object. */
export function strokeChamferedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
): void {
  tracePath(g as unknown as ChamferableGraphics, x, y, w, h, c);
  (g as unknown as ChamferableGraphics).strokePath?.();
}

/** Trace a chamfered path on a Canvas2D context (does NOT fill/stroke). */
export function traceChamferedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
): void {
  const pts = chamferedRectPoints(x, y, w, h, c);
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) {
    ctx.lineTo(pts[i], pts[i + 1]);
  }
  ctx.closePath();
}

/**
 * Create a Phaser Polygon GameObject suitable for use as a filter mask
 * (via `applyClippingMask` or `target.filters?.internal.addMask`).
 *
 * The polygon is positioned at the given `(x, y)` with its origin at
 * the top-left of the chamfered box. Pass `0xffffff` for opaque masks
 * (Phaser only reads the alpha channel of the shape).
 */
export function makeChamferedMaskShape(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
  color = 0xffffff,
): Phaser.GameObjects.Polygon {
  const points = chamferedRectPoints(0, 0, w, h, c);
  return scene.add.polygon(x, y, points, color).setOrigin(0, 0);
}
```

- [ ] **Step 4: Extend phaserMock to support the new graphics methods**

The chamfered primitives call `beginPath`, `moveTo`, `lineTo`, `closePath`,
`fillPath`, `strokePath` — none of which the current
`packages/spacebiz-ui/src/__tests__/_harness/phaserMock.ts` `graphics()`
factory provides. Edit `phaserMock.ts` `graphics()` (around line 322)
to add the stubs:

```ts
  graphics(): GameObjectStub {
    const g = new GameObjectStub(this.scene);
    (g as any).clear = () => g;
    (g as any).fillStyle = (_color: number, _alpha?: number) => g;
    (g as any).fillRoundedRect = (
      _x: number,
      _y: number,
      _w: number,
      _h: number,
      _r: number,
    ) => g;
    (g as any).fillRect = (_x: number, _y: number, _w: number, _h: number) => g;
    (g as any).strokeRect = (
      _x: number,
      _y: number,
      _w: number,
      _h: number,
    ) => g;
    (g as any).lineStyle = (_lw: number, _color: number, _alpha?: number) => g;
    (g as any).strokeRoundedRect = (
      _x: number,
      _y: number,
      _w: number,
      _h: number,
      _r: number,
    ) => g;
    (g as any).beginPath = () => g;
    (g as any).moveTo = (_x: number, _y: number) => g;
    (g as any).lineTo = (_x: number, _y: number) => g;
    (g as any).closePath = () => g;
    (g as any).fillPath = () => g;
    (g as any).strokePath = () => g;
    return g;
  }
```

The shapes.test.ts file doesn't use these stubs (it passes its own
recorders), but Task 6 (Button.ts) and others will when they run their
existing test suites.

Also add `scene.add.polygon` to the `AddFactoryStub` (around line 270,
near the existing `circle` factory) for the future portrait-mask call
sites:

```ts
  polygon(
    x: number,
    y: number,
    points: number[],
    _color?: number,
    _alpha?: number,
  ): GameObjectStub {
    const g = new GameObjectStub(this.scene);
    g.x = x;
    g.y = y;
    // Crude bbox: width = max x in points, height = max y in points.
    let maxX = 0;
    let maxY = 0;
    for (let i = 0; i < points.length; i += 2) {
      maxX = Math.max(maxX, points[i]);
      maxY = Math.max(maxY, points[i + 1]);
    }
    g.width = maxX;
    g.height = maxY;
    return g;
  }
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `npm run test -- packages/spacebiz-ui/src/__tests__/foundation/shapes.test.ts`
Expected: PASS for all describe blocks.

- [ ] **Step 6: Run the full UI library test suite (regression)**

Run: `npm run test -- packages/spacebiz-ui`
Expected: PASS. The new `strokeRect` / `polygon` / path stubs in
phaserMock are additive — no existing test should break.

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/spacebiz-ui/src/foundation/shapes.ts \
  packages/spacebiz-ui/src/__tests__/foundation/shapes.test.ts \
  packages/spacebiz-ui/src/__tests__/_harness/phaserMock.ts
git commit -m "feat(ui): add chamfered-path shape primitives + mock stubs"
```

---

## Task 3: Refactor BootScene panel-bg / panel-glow through new tokens

**Why now:** Pure refactor — same visual output but routed through the
new tokens and shared helper. Lands before any visible change so a
regression here is easy to spot.

**Files:**

- Modify: `src/scenes/BootScene.ts:280-356`

- [ ] **Step 1: Replace private `traceChamferedRect` with the shared helper**

In `src/scenes/BootScene.ts`, delete the private `traceChamferedRect`
method (lines 280-299) and add this import at the top of the file
(near the other imports from `@spacebiz/ui` / Theme):

```ts
import { traceChamferedPath } from "@spacebiz/ui";
```

Verify `@spacebiz/ui` re-exports the new helper. If not, add to
`packages/spacebiz-ui/src/index.ts`:

```ts
export {
  fillChamferedRect,
  strokeChamferedRect,
  traceChamferedPath,
  makeChamferedMaskShape,
  chamferedRectPoints,
} from "./foundation/shapes.ts";
```

- [ ] **Step 2: Update `generatePanelBg` to use the shared helper + new token**

In `src/scenes/BootScene.ts:306-325`, replace the body of
`generatePanelBg`:

```ts
private generatePanelBg(theme: ThemeConfig): void {
  const size = 64;
  const { glass, shape, panel, colors } = theme;
  const c = shape.container.chamfer;
  const { tex, ctx } = this.makeCanvas("panel-bg", size, size);

  // Vertical gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, this.rgba(glass.topTint, glass.bgAlpha));
  grad.addColorStop(1, this.rgba(glass.bottomTint, glass.bgAlpha));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Chamfered outer border
  ctx.lineWidth = panel.borderWidth;
  ctx.strokeStyle = this.rgba(colors.panelBorder, 0.8);
  traceChamferedPath(ctx, 1, 1, size - 2, size - 2, c);
  ctx.stroke();

  tex.refresh();
}
```

- [ ] **Step 3: Update `generatePanelGlow` to use the shared helper + new token**

In `src/scenes/BootScene.ts:332-356`, replace:

```ts
private generatePanelGlow(theme: ThemeConfig): void {
  const size = 72;
  const { glow, shape, colors } = theme;
  const c = shape.container.chamfer;
  const { tex, ctx } = this.makeCanvas("panel-glow", size, size);

  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const alpha = glow.alpha * (1 - i / layers);
    const offset = i + 2;
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.rgba(colors.accent, alpha);
    traceChamferedPath(
      ctx,
      offset,
      offset,
      size - offset * 2,
      size - offset * 2,
      c + (layers - i),
    );
    ctx.stroke();
  }

  tex.refresh();
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Run the full check**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 6: Smoke-test in the dev server**

Run: `npm run dev`. In a browser, confirm the main menu and HUD panels
still render with the same glass + chamfered look as before. No visual
change is expected — this task is a refactor. If the panels look
different, regressions are most likely in the `traceChamferedPath`
implementation (Task 2) — diff against the deleted `traceChamferedRect`
from BootScene.ts. Stop the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/BootScene.ts packages/spacebiz-ui/src/index.ts
git commit -m "refactor(boot): route panel textures through shared chamfered helper"
```

---

## Task 4: Regenerate button textures as hard square

**Why now:** The `btn-normal`/`btn-hover`/`btn-pressed`/`btn-disabled`
textures are used by Modal's OK/Cancel buttons via NineSlice. Modal
inherits the look without code changes once the textures regenerate.

**Files:**

- Modify: `src/scenes/BootScene.ts:358-438`

- [ ] **Step 1: Replace `generateButtonTextures` body**

In `src/scenes/BootScene.ts:364-438`, replace the entire function body:

```ts
private generateButtonTextures(theme: ThemeConfig): void {
  const size = 64;
  const { colors } = theme;

  const buttons: ReadonlyArray<[string, number]> = [
    ["btn-normal", colors.buttonBg],
    ["btn-hover", colors.buttonHover],
    ["btn-pressed", colors.buttonPressed],
    ["btn-disabled", colors.buttonDisabled],
  ];

  for (const [key, baseColor] of buttons) {
    const { tex, ctx } = this.makeCanvas(key, size, size);
    const isDisabled = key === "btn-disabled";
    const isPressed = key === "btn-pressed";

    // Fill (hard-square)
    const fillAlpha = isDisabled ? 0.75 : 0.95;
    ctx.fillStyle = this.rgba(baseColor, fillAlpha);
    ctx.fillRect(0, 0, size, size);

    // Top-edge highlight (subtle depth on non-pressed)
    if (!isPressed && !isDisabled) {
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(2, 1, size - 4, 1);
    }

    // Border: panelBorder color, lightened toward accent on hover.
    const borderBase = colors.panelBorder;
    const borderColor =
      key === "btn-hover"
        ? lerpColor(borderBase, colors.accent, 0.4)
        : borderBase;
    const borderAlpha = isDisabled ? 0.3 : isPressed ? 0.5 : 0.75;
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.rgba(borderColor, borderAlpha);
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

    // Bottom accent line (skip disabled)
    if (!isDisabled) {
      ctx.strokeStyle = this.rgba(colors.accent, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(4, size - 1);
      ctx.lineTo(size - 4, size - 1);
      ctx.stroke();
    }

    tex.refresh();
  }
}
```

The local `traceRounded` helper is deleted along with the `const r = 3`
constant — no longer needed.

Update the JSDoc comment above the function:

```ts
/**
 * btn-normal, btn-hover, btn-pressed, btn-disabled (64x64 each):
 * Hard-square buttons with a 1px border and subtle top-edge highlight.
 * These textures are used by Modal.ts via NineSlice; the Button
 * component draws its own Graphics bg at runtime (see Button.ts).
 */
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 4: Smoke-test in the dev server**

Run: `npm run dev`. In the browser, open the main menu and trigger a
modal (e.g. from settings or via the `__sft.openModal` console helper
if available). The OK/Cancel buttons should now have square edges
instead of the previous 3px rounded look. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/BootScene.ts
git commit -m "feat(boot): regenerate button textures with hard-square corners"
```

---

## Task 5: Hard-square Button.ts

**Why now:** Most-touched control. Largest visible impact of the
redesign.

**Files:**

- Modify: `packages/spacebiz-ui/src/Button.ts:244-303`
- Test: `packages/spacebiz-ui/src/__tests__/primitives/Button.test.ts`

- [ ] **Step 1: Add a regression test**

Append to `packages/spacebiz-ui/src/__tests__/primitives/Button.test.ts`:

```ts
describe("Button shape (chamfered redesign)", () => {
  it("draws a hard-square bg, never a rounded rect", () => {
    // Spy on the graphics factory to capture method calls on the bg.
    const calls: Array<string> = [];
    const mockScene = makeMockScene(); // existing helper in this test file
    const origGraphics = mockScene.add.graphics.bind(mockScene.add);
    mockScene.add.graphics = (() => {
      const g = origGraphics();
      const wrap = <K extends keyof typeof g>(name: K) => {
        const orig = (g as any)[name];
        (g as any)[name] = (...args: unknown[]) => {
          calls.push(String(name));
          return orig?.(...args);
        };
      };
      wrap("fillRect");
      wrap("strokeRect");
      wrap("fillRoundedRect");
      wrap("strokeRoundedRect");
      return g;
    }) as never;

    new Button(mockScene as never, {
      x: 0,
      y: 0,
      label: "Test",
      onClick: () => {},
    });

    expect(calls).toContain("fillRect");
    expect(calls).toContain("strokeRect");
    expect(calls).not.toContain("fillRoundedRect");
    expect(calls).not.toContain("strokeRoundedRect");
  });
});
```

If the existing Button test file uses a different mock-scene helper
name, adapt accordingly — read the top of the file first.

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test -- packages/spacebiz-ui/src/__tests__/primitives/Button.test.ts`
Expected: FAIL — the new test asserts `fillRect` but Button currently
calls `fillRoundedRect`.

- [ ] **Step 3: Update Button.drawBg**

In `packages/spacebiz-ui/src/Button.ts:244-303`, replace the
`drawBg` method:

```ts
private drawBg(state: BtnState): void {
  this._btnState = state;
  const theme = getTheme();
  const w = this.widthPx;
  const h = this.heightPx;

  this.bg.clear();
  // Track dimensions on the Graphics object so tests and layout code can
  // read bg.width / bg.height the same way they did with the NineSlice bg.
  (this.bg as unknown as { width: number }).width = w;
  (this.bg as unknown as { height: number }).height = h;

  let fillColor: number;
  let fillAlpha: number;
  let borderColor: number;
  let borderAlpha: number;

  switch (state) {
    case "hover":
      fillColor = theme.colors.buttonHover;
      fillAlpha = 0.98;
      borderColor = lerpColor(
        theme.colors.panelBorder,
        theme.colors.accent,
        0.4,
      );
      borderAlpha = 0.9;
      break;
    case "pressed":
      fillColor = theme.colors.buttonPressed;
      fillAlpha = 1.0;
      borderColor = theme.colors.panelBorder;
      borderAlpha = 0.5;
      break;
    case "disabled":
      fillColor = theme.colors.buttonDisabled;
      fillAlpha = 0.75;
      borderColor = theme.colors.panelBorder;
      borderAlpha = 0.3;
      break;
    default:
      fillColor = theme.colors.buttonBg;
      fillAlpha = 0.95;
      borderColor = theme.colors.panelBorder;
      borderAlpha = 0.75;
  }

  this.bg.fillStyle(fillColor, fillAlpha);
  this.bg.fillRect(0, 0, w, h);

  // Subtle 1px top-edge highlight adds gentle depth
  if (state !== "pressed" && state !== "disabled") {
    this.bg.fillStyle(0xffffff, 0.05);
    this.bg.fillRect(2, 1, w - 4, 1);
  }

  this.bg.lineStyle(theme.shape.control.borderWidth, borderColor, borderAlpha);
  this.bg.strokeRect(0.5, 0.5, w - 1, h - 1);
}
```

Note: `const r = 3` is removed entirely.

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm run test -- packages/spacebiz-ui/src/__tests__/primitives/Button.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full UI library tests**

Run: `npm run test -- packages/spacebiz-ui`
Expected: PASS.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Smoke-test in the dev server**

Run: `npm run dev`. Open main menu. The "New Game" / "Continue" /
"Settings" buttons should now have hard 90° corners, with the bottom
accent-line and idle shimmer still visible. Hover and press states
should still toggle (no functional regression). Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add packages/spacebiz-ui/src/Button.ts \
  packages/spacebiz-ui/src/__tests__/primitives/Button.test.ts
git commit -m "feat(button): hard-square corners + control borderWidth token"
```

---

## Task 6: Square TechQueueRow tiles

**Files:**

- Modify: `src/ui/TechQueueRow.ts:74-79`

- [ ] **Step 1: Update tile rendering**

In `src/ui/TechQueueRow.ts:74-79`, replace:

```ts
// Tile background (hard-square per shape.control rule)
const bg = this.scene.add.graphics();
bg.fillStyle(isActive ? 0x334466 : 0x222233, 0.9);
bg.fillRect(tileX, 0, TILE_SIZE, TILE_SIZE);
bg.lineStyle(1, isActive ? 0x6688cc : 0x445566, 1);
bg.strokeRect(tileX, 0, TILE_SIZE, TILE_SIZE);
```

(The original passes `6` as the radius; the replacement drops that and
the call name suffix.)

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS. The existing `src/ui/__tests__/TechQueueRow.test.ts`
tests row layout, not pixel shape — should be unaffected.

- [ ] **Step 4: Smoke-test in the dev server**

Run: `npm run dev`. Open the Tech tree screen, queue at least one
research item, and confirm the queue tiles below show hard-square
corners. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/ui/TechQueueRow.ts
git commit -m "feat(tech): square tech queue tiles"
```

---

## Task 7: Chamfered GalaxyMapScene system info card

**Files:**

- Modify: `src/scenes/GalaxyMapScene.ts:1156-1161`

- [ ] **Step 1: Import the new helpers**

Near the existing imports in `src/scenes/GalaxyMapScene.ts` (top of
file), add:

```ts
import { fillChamferedRect, strokeChamferedRect } from "@spacebiz/ui";
```

- [ ] **Step 2: Replace the card rendering**

In `src/scenes/GalaxyMapScene.ts:1156-1161`, replace:

```ts
const bg = this.add.graphics();
bg.fillStyle(theme.colors.panelBg, 0.92);
fillChamferedRect(bg, 0, 0, cardW, cardH, theme.shape.container.chamfer);
bg.lineStyle(1, theme.colors.panelBorder, 0.6);
strokeChamferedRect(bg, 0, 0, cardW, cardH, theme.shape.container.chamfer);
container.add(bg);
```

The card is a container (per the tiered rule), so it gets
`shape.container.chamfer` (8 px).

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Run tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Smoke-test in the dev server**

Run: `npm run dev`, then `__sft.goToScene("GalaxyMapScene")` in the dev
console. Hover over a system; the info card popup should now have
chamfered corners instead of the previous rounded look. Stop the dev
server.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GalaxyMapScene.ts
git commit -m "feat(map): chamfer the system info card"
```

---

## Task 8: AdviserPanel drawer tab + dismiss button

The drawer tab is directional (sticks out from the screen edge) so it
keeps asymmetric corner treatment — but the rounded corners become
chamfered cuts. The dismiss button changes from circle to square per
the "control" rule.

**Files:**

- Modify: `packages/rogue-universe-shared/src/characters/AdviserPanel.ts:446-494`

- [ ] **Step 1: Import the new helper**

Near the existing imports in `AdviserPanel.ts`, add:

```ts
import { fillChamferedRect, strokeChamferedRect } from "@spacebiz/ui";
```

(Confirm the package re-exports them — done in Task 3.)

- [ ] **Step 2: Replace `drawTabBg` to draw a left-chamfered tab**

In `packages/rogue-universe-shared/src/characters/AdviserPanel.ts:446-459`,
replace:

```ts
private drawTabBg(
  gfx: Phaser.GameObjects.Graphics,
  h: number,
  fillColor: number,
  fillAlpha: number,
  strokeColor: number,
  strokeAlpha: number,
): void {
  // Tab is a directional container that sticks out from the right edge:
  // chamfer the LEFT corners only, leave the right edge flush with
  // the screen.
  const theme = getTheme();
  const c = theme.shape.container.chamfer;
  gfx.clear();
  gfx.fillStyle(fillColor, fillAlpha);
  gfx.beginPath();
  gfx.moveTo(c, 0);             // top-left after cut
  gfx.lineTo(TAB_WIDTH, 0);     // top-right (square)
  gfx.lineTo(TAB_WIDTH, h);     // bottom-right (square)
  gfx.lineTo(c, h);             // bottom-left before cut
  gfx.lineTo(0, h - c);         // bottom-left after cut
  gfx.lineTo(0, c);             // top-left before cut
  gfx.closePath();
  gfx.fillPath();
  gfx.lineStyle(1, strokeColor, strokeAlpha);
  gfx.beginPath();
  gfx.moveTo(c, 0);
  gfx.lineTo(TAB_WIDTH, 0);
  gfx.lineTo(TAB_WIDTH, h);
  gfx.lineTo(c, h);
  gfx.lineTo(0, h - c);
  gfx.lineTo(0, c);
  gfx.closePath();
  gfx.strokePath();
}
```

(This is the same asymmetric treatment as before, but with 45° cuts
instead of rounded curves. `getTheme()` must already be imported — it
is in the original file.)

- [ ] **Step 3: Change the dismiss button from circle to square**

In `packages/rogue-universe-shared/src/characters/AdviserPanel.ts:472-474`,
replace:

```ts
const bg = this.scene.add
  .rectangle(0, 0, DISMISS_SIZE, DISMISS_SIZE, theme.colors.buttonBg, 0.6)
  .setOrigin(0.5)
  .setInteractive({ useHandCursor: true });
```

The original positioned the circle at `(0, 0)` with the container
already shifted by `DISMISS_SIZE/2`. The rectangle replacement uses
`setOrigin(0.5)` so the same container math still centers it.

If the existing close-glyph cross (drawn at lines 477-484) needs the
hit area to remain at `(0, 0)`-centered, the `setOrigin(0.5)` handles
that — verify by inspection.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Run tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 6: Smoke-test in the dev server**

Run: `npm run dev`. Use `__sft` console to trigger the adviser panel
(check `src/game/adviser/TutorialRunner.ts` for the helper, or use
the natural tutorial flow). Confirm:

- The drawer tab on the side has chamfered (cut) left corners,
  right edge flush.
- The dismiss "×" button at the top-right is a square, not a
  circle.
- Hover/press states still work on both.

Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add packages/rogue-universe-shared/src/characters/AdviserPanel.ts
git commit -m "feat(adviser): chamfered drawer tab + square dismiss button"
```

---

## Task 9: Chamfered portrait masks — GalaxySetupScene

**Files:**

- Modify: `src/scenes/GalaxySetupScene.ts:454-458`

- [ ] **Step 1: Update the portrait mask shape**

In `src/scenes/GalaxySetupScene.ts:454-458`, replace:

```ts
if (this.portraitMask) {
  this.portraitMask.clear();
  this.portraitMask.fillStyle(0xffffff);
  const c = getTheme().shape.portrait.chamfer;
  const r = portraitSize / 2;
  // Center the chamfered box at the origin (the mask is positioned
  // via setPosition below).
  const pts = chamferedRectPoints(-r, -r, portraitSize, portraitSize, c);
  this.portraitMask.beginPath();
  this.portraitMask.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) {
    this.portraitMask.lineTo(pts[i], pts[i + 1]);
  }
  this.portraitMask.closePath();
  this.portraitMask.fillPath();
  this.portraitMask.setPosition(portraitCenterX, portraitCenterY);
}
```

Add imports at the top of `src/scenes/GalaxySetupScene.ts` (alongside
existing ones):

```ts
import { chamferedRectPoints } from "@spacebiz/ui";
```

`getTheme` must already be imported in the file (it is — verify).

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 4: Smoke-test in the dev server**

Run: `npm run dev`. From the main menu, click "New Game" to reach
GalaxySetupScene. The CEO portrait should now have a chamfered (cut)
frame instead of a circle. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GalaxySetupScene.ts
git commit -m "feat(setup): chamfered portrait mask in galaxy setup"
```

---

## Task 10: Chamfered portrait masks — GameHUDScene

The HUD portrait uses `scene.add.circle()` as both the mask shape and
the border ring. We replace the mask with a polygon mask shape via
`makeChamferedMaskShape`, and the border ring with a stroke-only
polygon.

**Files:**

- Modify: `src/scenes/GameHUDScene.ts:308-318`

- [ ] **Step 1: Replace the mask + border ring**

In `src/scenes/GameHUDScene.ts:308-318`, replace:

```ts
// Chamfered mask
const c = getTheme().shape.portrait.chamfer;
const hudMask = makeChamferedMaskShape(
  this,
  hudPortraitX - portraitSize / 2,
  hudPortraitY - portraitSize / 2,
  portraitSize,
  portraitSize,
  c,
  0xffffff,
);
portraitImg.filters?.internal.addMask(hudMask);
this.ceoPortraitMask = hudMask;

// Border ring (chamfered, stroke-only)
const borderPts = chamferedRectPoints(
  0,
  0,
  portraitSize + 2,
  portraitSize + 2,
  c + 1,
);
this.add
  .polygon(
    hudPortraitX - (portraitSize + 2) / 2,
    hudPortraitY - (portraitSize + 2) / 2,
    borderPts,
    0x000000,
    0,
  )
  .setOrigin(0, 0)
  .setStrokeStyle(1, getTheme().color.accent.primary, 0.8);
```

Add the imports near the top of the file:

```ts
import { chamferedRectPoints, makeChamferedMaskShape } from "@spacebiz/ui";
```

Verify `getTheme` is already imported (it should be).

**Type note:** The `ceoPortraitMask` field is currently typed as
`Phaser.GameObjects.Arc` (line 162). Change it to:

```ts
private ceoPortraitMask!: Phaser.GameObjects.Polygon;
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS. If the `ceoPortraitMask` type wasn't updated in step 1,
typecheck will fail here with the type mismatch.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 4: Smoke-test in the dev server**

Run: `npm run dev`. Click into a game to reach the HUD. The CEO
portrait at the top-left should now have a chamfered frame with a
matching 1px accent border ring. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameHUDScene.ts
git commit -m "feat(hud): chamfered CEO portrait mask + border ring"
```

---

## Task 11: Chamfered portrait masks — FinanceScene

Same pattern as Task 10, applied to the FinanceScene CEO overlay.

**Files:**

- Modify: `src/scenes/FinanceScene.ts:162-210`

- [ ] **Step 1: Replace mask + border ring**

In `src/scenes/FinanceScene.ts`, around the `relayout`-driven CEO
overlay rebuild (line 162 starts the relevant comment block;
`ceoMaskCircle` and `ceoBorderCircle` are constructed around lines
193-205), replace the `scene.add.circle(...)` calls:

```ts
    // Chamfered mask (was a circle).
    const c = getTheme().shape.portrait.chamfer;
    const portraitSize = /* whatever the existing size variable is, e.g. ceoSize */ ;
    this.ceoMaskCircle = makeChamferedMaskShape(
      this,
      ceoCx - portraitSize / 2,
      ceoCy - portraitSize / 2,
      portraitSize,
      portraitSize,
      c,
      0xffffff,
    ) as never; // field type updated in step 2

    this.ceoImg.filters?.internal.addMask(this.ceoMaskCircle as never);

    // Border ring (was a stroked circle).
    const borderPts = chamferedRectPoints(
      0,
      0,
      portraitSize + 2,
      portraitSize + 2,
      c + 1,
    );
    this.ceoBorderCircle = this.add
      .polygon(
        ceoCx - (portraitSize + 2) / 2,
        ceoCy - (portraitSize + 2) / 2,
        borderPts,
        0x000000,
        0,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(1, getTheme().color.accent.primary, 0.8) as never;
```

Confirm the actual variable names by reading FinanceScene.ts around
the build site (the comment "Build (or rebuild) the CEO portrait
image + mask + border circles." at line 162 anchors it). Substitute
the real `ceoCx`, `ceoCy`, `portraitSize` (or `ceoSize`) variable
names in place of the placeholders above before saving.

Add imports near the top of the file:

```ts
import { chamferedRectPoints, makeChamferedMaskShape } from "@spacebiz/ui";
```

- [ ] **Step 2: Update field types**

In `src/scenes/FinanceScene.ts:61-62`, change:

```ts
private ceoMaskCircle!: Phaser.GameObjects.Polygon;
private ceoBorderCircle!: Phaser.GameObjects.Polygon;
```

Rename is optional — `ceoMaskCircle` / `ceoBorderCircle` as identifiers
are still readable, just slightly inaccurate after this change. Leave
the names as-is to keep the diff minimal.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Run tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Smoke-test in the dev server**

Run: `npm run dev`. Enter a game, navigate to the Finance scene. The
CEO overlay portrait should have a chamfered frame matching the HUD
treatment. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/FinanceScene.ts
git commit -m "feat(finance): chamfered CEO portrait mask + border ring"
```

---

## Task 12: Styleguide Shape Audit page

**Why now:** Reviewer-facing single-screen reference for the new shape
language. Useful both for this PR and for future contributors.

**Files:**

- Create: `styleguide/src/pages/ShapeAudit.ts` (confirm exact location
  by listing `styleguide/src/` first).
- Modify: whichever index/router file registers styleguide pages.

- [ ] **Step 1: Locate the styleguide entry point**

Run: `ls styleguide/src && head -40 styleguide/src/main.ts 2>/dev/null || head -40 styleguide/index.html`

This is exploratory — adapt the path if `main.ts` lives elsewhere.

- [ ] **Step 2: Create the Shape Audit page**

Create `styleguide/src/pages/ShapeAudit.ts` (place wherever
`Button.styleguide.ts` lives — that's a sibling file pattern). The
page should mount a Phaser scene containing:

- A row of containers: `Panel` (chamfered), `Modal`-style frame
  (chamfered), `InfoCard` (chamfered), `Tooltip`-like bg
  (chamfered).
- A row of controls: `Button` (square), `IconButton` (square),
  `Dropdown` trigger (square), `TabGroup` tab (square),
  `ProgressBar` (square), `StatusBadge` (square).
- A row of portrait masks: three placeholder portrait images each
  with a chamfered frame at `shape.portrait.chamfer` (6 px).
- A caption strip explaining the rule: "Containers chamfered (8px),
  controls square, portraits chamfered (6px)."

Reference `packages/spacebiz-ui/src/Button.styleguide.ts` for the
existing widget-rendering pattern.

- [ ] **Step 3: Register the page in the styleguide nav**

Adapt to the existing router — likely importing the new module from
`styleguide/src/main.ts` and adding it to a `pages` map keyed by
slug. Run the styleguide dev server to verify the page appears.

- [ ] **Step 4: Run the styleguide dev server**

Run: `npm run styleguide` (or whichever script the project uses —
check `package.json` `scripts` if uncertain).

Open the Shape Audit page in the browser. Confirm all three rows
render correctly with no console errors. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add styleguide/
git commit -m "feat(styleguide): add Shape Audit reference page"
```

---

## Task 13: Remove the legacy `panel.cornerRadius` token

`theme.panel.cornerRadius` is unused everywhere (verified by grep
before plan generation). `theme.chamfer.size` IS still used in the
`SHARED_TYPOGRAPHY` literal but no longer read at runtime (Task 3
replaced both call sites with `theme.shape.container.chamfer`). Both
can be removed in this PR — there's no second PR's worth of grace
period needed since no callers remain.

**Files:**

- Modify: `packages/spacebiz-ui/src/Theme.ts`

- [ ] **Step 1: Confirm no callers remain**

Run: `grep -rn "panel\.cornerRadius\|chamfer\.size" packages src styleguide --include="*.ts"`
Expected: zero matches outside `Theme.ts` (the definition site itself).

If matches appear, stop and migrate them to
`theme.shape.container.chamfer` before proceeding.

- [ ] **Step 2: Remove the legacy tokens from Theme.ts**

In `packages/spacebiz-ui/src/Theme.ts:124-127`, remove the
`cornerRadius` field from `panel`:

```ts
panel: {
  borderWidth: number;
  titleHeight: number;
}
```

Remove `cornerRadius` from the `SHARED_TYPOGRAPHY` literal (around
line 193):

```ts
  panel: { borderWidth: 2, titleHeight: 36 },
```

Remove the `chamfer` block entirely from the `ThemeConfig` interface
(around line 148-150) and from `SHARED_TYPOGRAPHY` (around line 209).

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS. If anything fails, a caller was missed in Step 1 —
revert this task's changes and migrate the missing caller first.

- [ ] **Step 4: Run tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Run the full check**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/spacebiz-ui/src/Theme.ts
git commit -m "chore(theme): remove unused cornerRadius / chamfer.size aliases"
```

---

## Task 14: Capture PR screenshots & final verification

Per [CLAUDE.md](../../../CLAUDE.md#pull-requests), UI-observable PRs
need screenshots.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Capture each major scene**

In the browser, use the `__sft` QA console (available in dev) to jump
between scenes. Capture one screenshot per scene into
`docs/pr-screenshots/pr-<N>/` (replace `<N>` with the actual PR number
once the PR is opened — use a placeholder folder name like `pr-draft/`
in the meantime).

Scenes to capture:

- `__sft.goToScene("MainMenuScene")` → `main-menu.png`
- `__sft.goToScene("GalaxySetupScene")` → `galaxy-setup.png`
  (chamfered CEO portrait)
- `__sft.goToScene("GameHUDScene")` → `hud.png` (chamfered CEO
  portrait + HUD panels)
- `__sft.goToScene("GalaxyMapScene")` → `galaxy-map.png`, then hover
  a system → `galaxy-map-info-card.png` (chamfered popup)
- Open the Tech tree → `tech-queue.png` (square queue tiles)
- Open the Finance scene → `finance.png` (chamfered CEO overlay)
- Trigger a modal (settings or "Quit to menu" prompt) →
  `modal.png` (square OK/Cancel buttons in a chamfered frame)
- Trigger the adviser drawer → `adviser-drawer.png` (chamfered tab
  - square dismiss button)
- Styleguide Shape Audit page → `styleguide-shape-audit.png`

- [ ] **Step 3: Stop the dev server**

- [ ] **Step 4: Run the full check**

Run: `npm run check`
Expected: PASS (typecheck + Vitest + production build).

- [ ] **Step 5: Commit screenshots**

```bash
git add docs/pr-screenshots/
git commit -m "docs(pr): chamfered UI redesign screenshots"
```

- [ ] **Step 6: Open the PR**

Use `gh pr create` per CLAUDE.md instructions. Include the
`## Screenshots` section in the PR body with each image referenced
by relative path.

---

## Plan Self-Review (filled in after writing the plan)

**Spec coverage:**

- §3 Shape tokens → Task 1.
- §4 Shared primitives → Task 2.
- §5 Button → Task 5.
- §5 IconButton → no change needed (already Rectangle GameObject — verified).
- §5 Modal → Task 4 (texture regen — Modal uses btn-\* nineslice).
- §5 InfoCard → no change needed (uses panel-bg nineslice — flows through Task 3).
- §5 TechQueueRow → Task 6.
- §5 AdviserPanel → Task 8.
- §5 Dropdown / TabGroup → no change needed (already Rectangle).
- §5 ProgressBar / StatusBadge / Tooltip → no change needed (already Rectangle).
- §5 ScrollFrame / ScrollableList → no change needed (already Rectangle).
- §5 PortraitLoader masks → Tasks 9, 10, 11 (the actual masks live at the call sites — `GalaxySetupScene`, `GameHUDScene`, `FinanceScene` — not in PortraitLoader.ts).
- §5 panel-bg / panel-glow → Task 3.
- §6 Styleguide audit → Task 12.
- §6 Screenshots → Task 14.
- §7 Rollout order → Tasks 1-13 are ordered to mirror it.
- §8 Risks → addressed via order (tokens before consumers, refactor before behavior change) + smoke tests at each task.
- §10 Success criteria — "no fillRoundedRect remains in packages/spacebiz-ui/src or src/ui (except TechGraphCanvas)" → verified by Task 13 Step 1's grep.

**Placeholder scan:** Two places use language like "verify by inspection" or "substitute the real variable names" in Tasks 8 and 11. These are accurate because the FinanceScene CEO overlay variables (`ceoCx`/`ceoCy`/`portraitSize` or similar) weren't fully captured during exploration — the executor needs to read the file to confirm. This is honest under-specification, not a placeholder hiding a missing decision.

**Type consistency:**

- `chamferedRectPoints` signature is `(x, y, w, h, c) => number[]` in Tasks 2, 8, 9, 10, 11 — consistent.
- `makeChamferedMaskShape` signature is `(scene, x, y, w, h, c, color?) => Phaser.GameObjects.Polygon` in Tasks 2, 10, 11 — consistent.
- `theme.shape.container.chamfer` referenced in Tasks 3, 7, 8 — consistent.
- `theme.shape.control.borderWidth` referenced in Task 5 — consistent with token defined in Task 1.
- `theme.shape.portrait.chamfer` referenced in Tasks 9, 10, 11 — consistent.

**Coverage gaps:** none found.
