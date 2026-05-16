# Glass UI Migration — Content Scenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the modernized glass-aesthetic from the HUD to eight content scenes via two new shared primitives (`GlassPanel`, `StatusChip`).

**Architecture:** `GlassPanel` is a sibling of `Panel` (not a subclass) — it omits the glow layer and replaces the chunky title rectangle with a compact Label + 1px accent underline at reduced alpha. `StatusChip` is a small key/value pill using a semi-transparent `Rectangle` background with a 1px border, matching the pattern used in GameHUDScene's status chips. Both primitives get tests via the existing Phaser mock harness before any scene is touched.

**Tech Stack:** Phaser 4, TypeScript (strict), Vitest 4, existing `packages/spacebiz-ui` test harness (`phaserMock.ts` / `createMockScene`).

---

## File Map

**Create:**

- `packages/spacebiz-ui/src/GlassPanel.ts` — new glass-aesthetic panel primitive
- `packages/spacebiz-ui/src/StatusChip.ts` — inline key/value chip primitive
- `packages/spacebiz-ui/src/__tests__/primitives/GlassPanel.test.ts`
- `packages/spacebiz-ui/src/__tests__/primitives/StatusChip.test.ts`

**Modify:**

- `packages/spacebiz-ui/src/index.ts` — add exports for both new primitives
- `src/scenes/FleetScene.ts` — `contentPanel`: Panel → GlassPanel; add Ships/Idle StatusChips
- `src/scenes/MarketScene.ts` — `contentPanel`: Panel → GlassPanel; `fuelLabel` → StatusChip
- `src/scenes/FinanceScene.ts` — `mainPanel`: Panel → GlassPanel
- `src/scenes/RoutesScene.ts` — `contentPanel`: Panel → GlassPanel (line 189 only; lines 1883/2001 stay as Panel)
- `src/scenes/EmpireScene.ts` — `contentPanel`: Panel → GlassPanel; `filterSummaryLabel` → StatusChip
- `src/scenes/CompetitionScene.ts` — `contentPanel`: Panel → GlassPanel
- `src/scenes/TechTreeScene.ts` — `mainPanel`: Panel → GlassPanel
- `src/scenes/DiplomacyScene.ts` — `targetTablePanel` + `actionPanel`: Panel → GlassPanel

---

## Task 1: GlassPanel component

**Files:**

- Create: `packages/spacebiz-ui/src/GlassPanel.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/spacebiz-ui/src/__tests__/primitives/GlassPanel.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("../_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

import { GlassPanel } from "../../GlassPanel.ts";
import { getTheme } from "../../Theme.ts";
import { createMockScene, type MockScene } from "../_harness/phaserMock.ts";

let scene: MockScene;

beforeEach(() => {
  scene = createMockScene("GlassPanelScene");
});

describe("GlassPanel construction", () => {
  it("places the container at the configured position", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 10,
      y: 20,
      width: 400,
      height: 300,
    });
    expect(p.x).toBe(10);
    expect(p.y).toBe(20);
  });

  it("has no glow layer (list length stays minimal)", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    // Only the bg nineslice is added for untitled panels — no glow entry.
    expect(p.list.length).toBe(1);
  });

  it("adds title label + underline when title is provided", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      title: "Fleet Management",
    });
    // bg + titleLabel + titleUnderline = 3 children
    expect(p.list.length).toBe(3);
  });
});

describe("GlassPanel.getContentY", () => {
  it("returns small padding for untitled panel", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    const theme = getTheme();
    expect(p.getContentY()).toBe(theme.spacing.sm);
  });

  it("returns title-area height for titled panel", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      title: "Finance",
    });
    // Must be larger than untitled contentY
    const theme = getTheme();
    expect(p.getContentY()).toBeGreaterThan(theme.spacing.sm);
  });
});

describe("GlassPanel.getContentArea", () => {
  it("returns positive inset dimensions for untitled panel", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    });
    const area = p.getContentArea();
    expect(area.x).toBeGreaterThan(0);
    expect(area.y).toBeGreaterThan(0);
    expect(area.width).toBeGreaterThan(0);
    expect(area.width).toBeLessThan(400);
    expect(area.height).toBeGreaterThan(0);
    expect(area.height).toBeLessThan(300);
  });

  it("titled panel has smaller content height than untitled", () => {
    const base = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    }).getContentArea();
    const titled = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      title: "Cargo",
    }).getContentArea();
    expect(titled.height).toBeLessThan(base.height);
  });
});

describe("GlassPanel.setSize", () => {
  it("returns the panel for chaining", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    expect(p.setSize(300, 150)).toBe(p);
  });

  it("updates getContentArea dimensions and syncs width/height", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    p.setSize(400, 300);
    const area = p.getContentArea();
    expect(area.width).toBeGreaterThan(0);
    expect(area.width).toBeLessThan(400);
    expect(p.width).toBe(400);
    expect(p.height).toBe(300);
  });

  it("does not add new children to the container on resize", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    const before = p.list.length;
    p.setSize(300, 150);
    expect(p.list.length).toBe(before);
  });
});

describe("GlassPanel.setTitle", () => {
  it("updates the title label text", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      title: "Old Title",
    });
    p.setTitle("New Title");
    const internal = p as unknown as { titleLabel: { text: string } | null };
    expect(internal.titleLabel?.text).toBe("New Title");
  });

  it("is a no-op when no title was configured", () => {
    const p = new GlassPanel(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    expect(() => p.setTitle("Anything")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm run test -- GlassPanel
```

Expected: `GlassPanel` is not defined / import error.

- [ ] **Step 3: Implement GlassPanel**

Create `packages/spacebiz-ui/src/GlassPanel.ts`:

```ts
import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";

const GLASS_TITLE_HEIGHT = 30;

export interface GlassPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  titleFontSize?: number;
  /** Background alpha. Default 0.62. */
  backgroundAlpha?: number;
  /** "elevated" gets 0.08 more alpha for nested card usage. Default "flat". */
  variant?: "elevated" | "flat";
}

export class GlassPanel extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.NineSlice;
  private titleLabel: Phaser.GameObjects.Text | null = null;
  private titleUnderline: Phaser.GameObjects.Rectangle | null = null;
  protected contentY: number;
  protected panelWidth: number;
  protected panelHeight: number;

  constructor(scene: Phaser.Scene, config: GlassPanelConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    this.panelWidth = config.width;
    this.panelHeight = config.height;

    const baseAlpha = config.backgroundAlpha ?? 0.62;
    const bgAlpha =
      config.variant === "elevated" ? Math.min(1, baseAlpha + 0.08) : baseAlpha;

    this.bg = scene.add
      .nineslice(
        0,
        0,
        "panel-bg",
        undefined,
        config.width,
        config.height,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0)
      .setAlpha(bgAlpha);
    this.add(this.bg);

    this.contentY = theme.spacing.sm;

    if (config.title) {
      this.titleLabel = scene.add.text(
        theme.spacing.md,
        theme.spacing.sm,
        config.title,
        {
          fontSize: `${config.titleFontSize ?? theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.heading.family,
          color: colorToString(theme.colors.accent),
        },
      );
      this.titleUnderline = scene.add
        .rectangle(
          0,
          GLASS_TITLE_HEIGHT - 1,
          config.width,
          1,
          theme.colors.accent,
        )
        .setOrigin(0, 0)
        .setAlpha(0.7);
      this.add([this.titleLabel, this.titleUnderline]);
      this.contentY = GLASS_TITLE_HEIGHT + theme.spacing.xs;
    }

    scene.add.existing(this);
  }

  getContentY(): number {
    return this.contentY;
  }

  getContentArea(): { x: number; y: number; width: number; height: number } {
    const theme = getTheme();
    return {
      x: theme.spacing.sm,
      y: this.contentY,
      width: this.panelWidth - theme.spacing.sm * 2,
      height: this.panelHeight - this.contentY - theme.spacing.sm,
    };
  }

  setSize(width: number, height: number): this {
    super.setSize(width, height);
    this.panelWidth = width;
    this.panelHeight = height;
    this.bg.setSize(width, height);
    if (this.titleUnderline) {
      this.titleUnderline.setSize(width, 1);
    }
    return this;
  }

  setTitle(title: string): this {
    this.titleLabel?.setText(title);
    return this;
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm run test -- GlassPanel
```

Expected: all GlassPanel tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/spacebiz-ui/src/GlassPanel.ts packages/spacebiz-ui/src/__tests__/primitives/GlassPanel.test.ts
git commit -m "feat(ui): add GlassPanel primitive for glass-aesthetic content panels"
```

---

## Task 2: StatusChip component

**Files:**

- Create: `packages/spacebiz-ui/src/StatusChip.ts`
- Create: `packages/spacebiz-ui/src/__tests__/primitives/StatusChip.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/spacebiz-ui/src/__tests__/primitives/StatusChip.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("../_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

import { StatusChip } from "../../StatusChip.ts";
import { createMockScene, type MockScene } from "../_harness/phaserMock.ts";

let scene: MockScene;

beforeEach(() => {
  scene = createMockScene("ChipScene");
});

describe("StatusChip construction", () => {
  it("places the container at the configured position", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 50,
      y: 80,
      value: "12",
    });
    expect(chip.x).toBe(50);
    expect(chip.y).toBe(80);
  });

  it("adds bg + value child when no label is given (2 children)", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      value: "§1,200",
    });
    expect(chip.list.length).toBe(2);
  });

  it("adds bg + labelText + valueText when label is given (3 children)", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      label: "Ships",
      value: "8",
    });
    expect(chip.list.length).toBe(3);
  });
});

describe("StatusChip.setValue", () => {
  it("updates the value text and returns the chip for chaining", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      value: "old",
    });
    const result = chip.setValue("new");
    expect(result).toBe(chip);
    const internal = chip as unknown as {
      valueText: { text: string };
    };
    expect(internal.valueText.text).toBe("new");
  });
});

describe("StatusChip.setLabel", () => {
  it("updates the label text when a label was configured", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      label: "Ships",
      value: "8",
    });
    chip.setLabel("Fleet");
    const internal = chip as unknown as {
      labelText: { text: string } | null;
    };
    expect(internal.labelText?.text).toBe("Fleet");
  });

  it("is a no-op when no label was configured", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      value: "8",
    });
    expect(() => chip.setLabel("anything")).not.toThrow();
  });
});

describe("StatusChip.setVariant", () => {
  it("returns the chip for chaining", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      value: "8",
    });
    expect(chip.setVariant("danger")).toBe(chip);
  });

  it("applies each variant without throwing", () => {
    const variants = [
      "default",
      "warn",
      "danger",
      "success",
      "accent",
    ] as const;
    for (const v of variants) {
      const chip = new StatusChip(scene as unknown as Phaser.Scene, {
        x: 0,
        y: 0,
        value: "x",
        variant: v,
      });
      expect(() => chip.setVariant(v)).not.toThrow();
    }
  });
});

describe("StatusChip.setSize", () => {
  it("returns the chip for chaining and updates stored dimensions", () => {
    const chip = new StatusChip(scene as unknown as Phaser.Scene, {
      x: 0,
      y: 0,
      value: "x",
    });
    expect(chip.setSize(200, 32)).toBe(chip);
    const internal = chip as unknown as {
      chipWidth: number;
      chipHeight: number;
    };
    expect(internal.chipWidth).toBe(200);
    expect(internal.chipHeight).toBe(32);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm run test -- StatusChip
```

Expected: import error / `StatusChip` not defined.

- [ ] **Step 3: Implement StatusChip**

Create `packages/spacebiz-ui/src/StatusChip.ts`:

```ts
import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import type { ThemeConfig } from "./Theme.ts";

export type ChipVariant = "default" | "warn" | "danger" | "success" | "accent";

export interface StatusChipConfig {
  x: number;
  y: number;
  /** Fixed chip width. Default 140. */
  width?: number;
  /** Chip height. Default 28. */
  height?: number;
  /** Optional dim label on the left (e.g. "Ships"). */
  label?: string;
  /** Main value text (e.g. "8"). */
  value: string;
  variant?: ChipVariant;
}

const CHIP_PADDING_X = 10;
const CHIP_GAP = 6;

function variantValueColor(variant: ChipVariant, theme: ThemeConfig): number {
  switch (variant) {
    case "warn":
      return theme.colors.warning;
    case "danger":
      return theme.colors.loss;
    case "success":
      return theme.colors.profit;
    case "accent":
      return theme.colors.accent;
    default:
      return theme.colors.textDim;
  }
}

function variantBorderColor(variant: ChipVariant, theme: ThemeConfig): number {
  switch (variant) {
    case "warn":
      return theme.colors.warning;
    case "danger":
      return theme.colors.loss;
    case "success":
      return theme.colors.profit;
    case "accent":
      return theme.colors.accent;
    default:
      return theme.colors.panelBorder;
  }
}

export class StatusChip extends Phaser.GameObjects.Container {
  private chipBg: Phaser.GameObjects.Rectangle;
  private labelText: Phaser.GameObjects.Text | null = null;
  private valueText: Phaser.GameObjects.Text;
  private chipWidth: number;
  private chipHeight: number;
  private currentVariant: ChipVariant;

  constructor(scene: Phaser.Scene, config: StatusChipConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    this.chipWidth = config.width ?? 140;
    this.chipHeight = config.height ?? 28;
    this.currentVariant = config.variant ?? "default";

    const valueColor = variantValueColor(this.currentVariant, theme);
    const borderColor = variantBorderColor(this.currentVariant, theme);

    this.chipBg = scene.add
      .rectangle(
        0,
        0,
        this.chipWidth,
        this.chipHeight,
        theme.colors.background,
        0.36,
      )
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, borderColor, 0.26);
    this.add(this.chipBg);

    let valueX = CHIP_PADDING_X;

    if (config.label) {
      this.labelText = scene.add
        .text(CHIP_PADDING_X, 0, config.label, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        })
        .setOrigin(0, 0.5);
      this.add(this.labelText);
      valueX = CHIP_PADDING_X + this.labelText.width + CHIP_GAP;
    }

    this.valueText = scene.add
      .text(valueX, 0, config.value, {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(valueColor),
      })
      .setOrigin(0, 0.5);
    this.add(this.valueText);

    scene.add.existing(this);
  }

  setValue(text: string): this {
    this.valueText.setText(text);
    return this;
  }

  setLabel(text: string): this {
    this.labelText?.setText(text);
    return this;
  }

  setVariant(variant: ChipVariant): this {
    const theme = getTheme();
    this.currentVariant = variant;
    this.valueText.setColor(colorToString(variantValueColor(variant, theme)));
    this.chipBg.setStrokeStyle(1, variantBorderColor(variant, theme), 0.26);
    return this;
  }

  setSize(width: number, height: number): this {
    this.chipWidth = width;
    this.chipHeight = height;
    this.chipBg.setSize(width, height);
    return this;
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm run test -- StatusChip
```

Expected: all StatusChip tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/spacebiz-ui/src/StatusChip.ts packages/spacebiz-ui/src/__tests__/primitives/StatusChip.test.ts
git commit -m "feat(ui): add StatusChip primitive for inline key/value status display"
```

---

## Task 3: Export both primitives from the UI library

**Files:**

- Modify: `packages/spacebiz-ui/src/index.ts`

- [ ] **Step 1: Add exports**

In `packages/spacebiz-ui/src/index.ts`, after the `export { Panel }` line, add:

```ts
export { GlassPanel } from "./GlassPanel.ts";
export type { GlassPanelConfig } from "./GlassPanel.ts";

export { StatusChip } from "./StatusChip.ts";
export type { StatusChipConfig, ChipVariant } from "./StatusChip.ts";
```

- [ ] **Step 2: Run full check**

```bash
npm run check
```

Expected: typecheck PASS, all tests PASS, build PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/spacebiz-ui/src/index.ts
git commit -m "feat(ui): export GlassPanel and StatusChip from @spacebiz/ui"
```

---

## Task 4: Migrate FleetScene

**Files:**

- Modify: `src/scenes/FleetScene.ts`

`FleetScene` has one `Panel` (the `contentPanel`) and no existing bespoke header labels. Adding two `StatusChip` instances — "Ships" total count and "Idle" count — in the header row above the fleet table.

- [ ] **Step 1: Update imports**

In `src/scenes/FleetScene.ts`, find the `@spacebiz/ui` import block (lines ~6–24). Replace `Panel` with `GlassPanel` and add `StatusChip`:

```ts
import {
  getTheme,
  colorToString,
  Button,
  DataTable,
  ScrollFrame,
  Modal,
  ScrollableList,
  GlassPanel,
  StatusChip,
  PortraitPanel,
  SceneUiDirector,
  createStarfield,
  getLayout,
  getShipIconKey,
  getShipColor,
  getShipLabel,
  attachReflowHandler,
  DEPTH_MODAL,
} from "../ui/index.ts";
```

- [ ] **Step 2: Update field declarations**

In the class body, change:

```ts
private contentPanel!: Panel;
```

to:

```ts
private contentPanel!: GlassPanel;
private fleetCountChip!: StatusChip;
private idleCountChip!: StatusChip;
```

- [ ] **Step 3: Replace Panel construction and add chips**

Find the block (around line 79):

```ts
// Content panel
this.contentPanel = new Panel(this, {
  x: L.mainContentLeft,
  y: L.contentTop,
  width: L.mainContentWidth,
  height: L.contentHeight,
  title: "Fleet Management",
});
const content = this.contentPanel.getContentArea();
const absX = L.mainContentLeft + content.x;
const absY = L.contentTop + content.y;

// Cash is already shown in the HUD top bar — no inline duplicate here.

// Fleet table
this.fleetTableFrame = new ScrollFrame(this, {
  x: absX,
  y: absY + 28,
```

Replace with:

```ts
// Content panel
this.contentPanel = new GlassPanel(this, {
  x: L.mainContentLeft,
  y: L.contentTop,
  width: L.mainContentWidth,
  height: L.contentHeight,
  title: "Fleet Management",
});
const content = this.contentPanel.getContentArea();
const absX = L.mainContentLeft + content.x;
const absY = L.contentTop + content.y;

// Fleet summary chips
const fleet = gameStore.getState().fleet;
const idleCount = fleet.filter((s) => !s.routeId).length;
const chipH = 26;
const chipY = absY + chipH / 2;
this.fleetCountChip = new StatusChip(this, {
  x: absX,
  y: chipY,
  width: 110,
  height: chipH,
  label: "Ships",
  value: String(fleet.length),
});
this.idleCountChip = new StatusChip(this, {
  x: absX + 118,
  y: chipY,
  width: 100,
  height: chipH,
  label: "Idle",
  value: String(idleCount),
  variant: idleCount > 0 ? "warn" : "default",
});

// Fleet table
this.fleetTableFrame = new ScrollFrame(this, {
  x: absX,
  y: absY + 36,
```

- [ ] **Step 4: Update table height to compensate for chip row**

The existing table height calculation `content.height - 80` offsets from `absY + 28` (the old offset). Now offset is `absY + 36`. Update both `ScrollFrame` and `DataTable` `height` values:

Find:

```ts
  height: content.height - 80,
});
this.fleetTable = new DataTable(this, {
  x: 0,
  y: 0,
  width: content.width,
  height: content.height - 80,
```

Replace with:

```ts
  height: content.height - 88,
});
this.fleetTable = new DataTable(this, {
  x: 0,
  y: 0,
  width: content.width,
  height: content.height - 88,
```

- [ ] **Step 5: Update chip values in refreshTable**

Find the `refreshTable()` method. After the table refresh, add chip updates. Locate where the method ends and prepend the chip update logic:

```ts
private refreshTable(): void {
  const state = gameStore.getState();
  const fleet = state.fleet;
  // ...existing table build code...

  // Update chips
  const idleCount = fleet.filter((s) => !s.routeId).length;
  this.fleetCountChip.setValue(String(fleet.length));
  this.idleCountChip.setValue(String(idleCount));
  this.idleCountChip.setVariant(idleCount > 0 ? "warn" : "default");
}
```

> Note: add these three lines at the **end** of the existing `refreshTable()` body, before its closing `}`.

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Run tests**

```bash
npm run test
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/scenes/FleetScene.ts
git commit -m "feat(fleet): migrate to GlassPanel and add fleet summary StatusChips"
```

---

## Task 5: Migrate MarketScene

**Files:**

- Modify: `src/scenes/MarketScene.ts`

`MarketScene` has one `Panel` and a `fuelLabel` (Label showing fuel price + trend arrow). Convert the Panel to GlassPanel and the label to a `StatusChip`.

- [ ] **Step 1: Update imports**

In `src/scenes/MarketScene.ts`, replace `Panel` with `GlassPanel` and add `StatusChip`; remove unused `Label` import if it becomes unused:

```ts
import {
  getTheme,
  DataTable,
  ScrollFrame,
  GlassPanel,
  StatusChip,
  PortraitPanel,
  createStarfield,
  getLayout,
  getCargoIconKey,
  getCargoColor,
  getCargoShortLabel,
  attachReflowHandler,
} from "../ui/index.ts";
```

- [ ] **Step 2: Update field declarations**

```ts
private contentPanel!: GlassPanel;
private fuelChip!: StatusChip;
```

Remove the `private fuelLabel!: Label;` declaration.

- [ ] **Step 3: Replace Panel and fuelLabel constructions**

Find (around line 82):

```ts
// --- Main content panel ---
this.contentPanel = new Panel(this, {
  x: L.mainContentLeft,
  y: L.contentTop,
  width: L.mainContentWidth,
  height: L.contentHeight,
  title: "Galaxy Market Overview",
});
const content = this.contentPanel.getContentArea();
const absX = L.mainContentLeft + content.x;
const absY = L.contentTop + content.y;

// Fuel price display inside content panel
const fuelTrendStr = trendArrow(state.market.fuelTrend);
this.fuelLabel = new Label(this, {
  x: absX,
  y: absY + 2,
  text: `Fuel Price: ${formatCash(state.market.fuelPrice)} ${fuelTrendStr}`,
  style: "value",
  color: theme.colors.accent,
});
```

Replace with:

```ts
// --- Main content panel ---
this.contentPanel = new GlassPanel(this, {
  x: L.mainContentLeft,
  y: L.contentTop,
  width: L.mainContentWidth,
  height: L.contentHeight,
  title: "Galaxy Market Overview",
});
const content = this.contentPanel.getContentArea();
const absX = L.mainContentLeft + content.x;
const absY = L.contentTop + content.y;

// Fuel price chip
const fuelTrendStr = trendArrow(state.market.fuelTrend);
const chipH = 26;
this.fuelChip = new StatusChip(this, {
  x: absX,
  y: absY + chipH / 2,
  width: 180,
  height: chipH,
  label: "Fuel",
  value: `${formatCash(state.market.fuelPrice)} ${fuelTrendStr}`,
  variant: state.market.fuelTrend === "rising" ? "warn" : "default",
});
```

- [ ] **Step 4: Update tableFrame Y offset**

Find:

```ts
this.tableFrame = new ScrollFrame(this, {
  x: absX,
  y: absY + 28,
```

Replace with:

```ts
this.tableFrame = new ScrollFrame(this, {
  x: absX,
  y: absY + 36,
```

Also update the height on `tableFrame` and the `DataTable`:

```ts
// tableFrame
  height: content.height - 40,   // was content.height - 32
// DataTable
  height: content.height - 40,   // was content.height - 32
```

- [ ] **Step 5: Replace all fuelLabel usages**

There are three usages to convert:

**In `create()` construction** — already replaced in Step 3 above.

**In the `relayout()` method (around line 237):**

```ts
// Before:
this.fuelLabel.setPosition(absX, absY + 2);

// After:
this.fuelChip.setPosition(absX, absY + chipH / 2);
```

Since `chipH` is a local in `create()`, use the literal `13` (half of 26) in the relayout call, or declare `chipH` as a class constant:

```ts
// At the top of relayout():
const chipH = 26;
this.fuelChip.setPosition(absX, absY + chipH / 2);
```

**In any event-listener that updates the fuel price** — search and replace:

```bash
grep -n "fuelLabel" src/scenes/MarketScene.ts
```

For each `this.fuelLabel.setText(...)`, replace with:

```ts
const s = gameStore.getState();
this.fuelChip.setValue(
  `${formatCash(s.market.fuelPrice)} ${trendArrow(s.market.fuelTrend)}`,
);
this.fuelChip.setVariant(s.market.fuelTrend === "rising" ? "warn" : "default");
```

- [ ] **Step 6: Run typecheck and tests**

```bash
npm run check
```

Expected: all gates PASS.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/MarketScene.ts
git commit -m "feat(market): migrate to GlassPanel and fuel price StatusChip"
```

---

## Task 6: Migrate FinanceScene

**Files:**

- Modify: `src/scenes/FinanceScene.ts`

`FinanceScene` has one `Panel` (`mainPanel`). No bespoke header labels — the first child is a `TabGroup`. Swap Panel → GlassPanel.

- [ ] **Step 1: Update imports**

In `src/scenes/FinanceScene.ts`, replace `Panel` with `GlassPanel` in the `@spacebiz/ui` import:

```ts
import {
  getTheme,
  colorToString,
  Button,
  TabGroup,
  DataTable,
  ScrollFrame,
  Modal,
  GlassPanel,
  SceneUiDirector,
  createStarfield,
  getLayout,
  Slider,
  chamferedRectPoints,
  makeChamferedMaskShape,
} from "@spacebiz/ui";
```

- [ ] **Step 2: Update field declaration**

```ts
private mainPanel!: GlassPanel;
```

- [ ] **Step 3: Replace Panel construction**

Find (around line 132):

```ts
this.mainPanel = new Panel(this, {
  x: L.mainContentLeft,
  y: L.contentTop,
  width: L.mainContentWidth,
  height: L.contentHeight,
  title: "Finance",
});
```

Replace with:

```ts
this.mainPanel = new GlassPanel(this, {
  x: L.mainContentLeft,
  y: L.contentTop,
  width: L.mainContentWidth,
  height: L.contentHeight,
  title: "Finance",
});
```

- [ ] **Step 4: Run typecheck and tests**

```bash
npm run check
```

Expected: all gates PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/FinanceScene.ts
git commit -m "feat(finance): migrate main panel to GlassPanel"
```

---

## Task 7: Migrate RoutesScene

**Files:**

- Modify: `src/scenes/RoutesScene.ts`

`RoutesScene` has 3 `Panel` usages. Only the main `contentPanel` at line ~189 migrates. The panels at lines ~1883 and ~2001 are floating builder panels — leave those as `Panel`.

- [ ] **Step 1: Update imports**

In `src/scenes/RoutesScene.ts`, add `GlassPanel` alongside `Panel` in the imports (keep `Panel` for the two builder panels):

```ts
import {
  // ... existing imports ...
  Panel,
  GlassPanel,
  // ... rest of imports ...
} from "../ui/index.ts";
```

- [ ] **Step 2: Update field declaration**

Find `private contentPanel!: Panel;` and change to:

```ts
private contentPanel!: GlassPanel;
```

- [ ] **Step 3: Replace contentPanel construction**

Find (around line 189):

```ts
// Background panel
this.contentPanel = new Panel(this, {
  x: panelX,
  y: panelY,
  width: panelW,
  height: panelH,
  title: "Route Command Center",
});
```

Replace with:

```ts
// Background panel
this.contentPanel = new GlassPanel(this, {
  x: panelX,
  y: panelY,
  width: panelW,
  height: panelH,
  title: "Route Command Center",
});
```

- [ ] **Step 4: Update tabY to use panel's contentY**

Find (around line 198):

```ts
// Tab group sits at the top of the content area
const tabY = panelY + 38;
```

Replace with:

```ts
// Tab group sits at the top of the content area
const tabY = panelY + this.contentPanel.getContentY();
```

- [ ] **Step 5: Run typecheck and tests**

```bash
npm run check
```

Expected: all gates PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/RoutesScene.ts
git commit -m "feat(routes): migrate main content panel to GlassPanel"
```

---

## Task 8: Migrate EmpireScene

**Files:**

- Modify: `src/scenes/EmpireScene.ts`

`EmpireScene` has one `Panel` and a `filterSummaryLabel` (Label showing empire filter state). Swap Panel → GlassPanel and label → StatusChip.

- [ ] **Step 1: Update imports**

Replace `Panel` with `GlassPanel` and add `StatusChip`; keep `Label` if used elsewhere in the file (check with grep):

```bash
grep -n "Label" src/scenes/EmpireScene.ts
```

If `Label` is only used for `filterSummaryLabel`, remove it. Otherwise keep it. Add `GlassPanel` and `StatusChip`:

```ts
import {
  getTheme,
  Button,
  DataTable,
  ScrollFrame,
  GlassPanel,
  StatusChip,
  PortraitPanel,
  createStarfield,
  getLayout,
  attachReflowHandler,
  GROUP_TAB_STRIP_HEIGHT,
} from "../ui/index.ts";
```

- [ ] **Step 2: Update field declarations**

```ts
private contentPanel!: GlassPanel;
private filterSummaryChip!: StatusChip;
```

Remove: `private filterSummaryLabel!: Label;`

- [ ] **Step 3: Replace Panel and filterSummaryLabel constructions**

Find (around line 91):

```ts
// Content panel
this.contentPanel = new Panel(this, {
  x: L.mainContentLeft,
  y: L.contentTop,
  width: L.mainContentWidth,
  height: L.contentHeight,
  title: "Diplomatic Relations",
});
const content = this.contentPanel.getContentArea();
const absX = L.mainContentLeft + content.x;
const absY = L.contentTop + content.y;
```

Replace with:

```ts
// Content panel
this.contentPanel = new GlassPanel(this, {
  x: L.mainContentLeft,
  y: L.contentTop,
  width: L.mainContentWidth,
  height: L.contentHeight,
  title: "Diplomatic Relations",
});
const content = this.contentPanel.getContentArea();
const absX = L.mainContentLeft + content.x;
const absY = L.contentTop + content.y;
```

Find the `filterSummaryLabel` construction (around line 123):

```ts
this.filterSummaryLabel = new Label(this, {
  x: absX + 8,
  y: absY + toolbarH / 2,
  text: "",
  style: "caption",
});
this.filterSummaryLabel.setOrigin(0, 0.5);
```

Replace with:

```ts
const chipH = 26;
this.filterSummaryChip = new StatusChip(this, {
  x: absX + 8,
  y: absY + toolbarH / 2,
  width: 160,
  height: chipH,
  value: "",
});
```

- [ ] **Step 4: Replace all filterSummaryLabel usages**

There are two other usages of `filterSummaryLabel` after the constructor:

**In the `relayout()` method (around line 189):**

```ts
// Before:
this.filterSummaryLabel.setPosition(
  this.filterToggleBtn.x + this.filterToggleBtn.width + 8,
  absY + toolbarH / 2,
);

// After:
this.filterSummaryChip.setPosition(
  this.filterToggleBtn.x + this.filterToggleBtn.width + 8,
  absY + toolbarH / 2,
);
```

**In the `applyRowFilter()` method (around line 211):**

```ts
// Before:
this.filterSummaryLabel.setText(
  this.filterToPlayer ? `${shown} of ${total} relations` : `${total} relations`,
);

// After:
this.filterSummaryChip.setValue(
  this.filterToPlayer ? `${shown} of ${total} relations` : `${total} relations`,
);
```

- [ ] **Step 5: Run typecheck and tests**

```bash
npm run check
```

Expected: all gates PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/EmpireScene.ts
git commit -m "feat(empire): migrate to GlassPanel and filter StatusChip"
```

---

## Task 9: Migrate CompetitionScene

**Files:**

- Modify: `src/scenes/CompetitionScene.ts`

`CompetitionScene` has one `Panel` and no bespoke header labels. Swap Panel → GlassPanel.

- [ ] **Step 1: Update imports**

Replace `Panel` with `GlassPanel`:

```ts
import {
  getTheme,
  DataTable,
  ScrollFrame,
  GlassPanel,
  PortraitPanel,
  TabGroup,
  StandingsGraph,
  createStarfield,
  getLayout,
  attachReflowHandler,
  GROUP_TAB_STRIP_HEIGHT,
} from "../ui/index.ts";
```

- [ ] **Step 2: Update field declaration**

```ts
private contentPanel!: GlassPanel;
```

- [ ] **Step 3: Replace Panel construction**

Find (around line 104):

```ts
this.contentPanel = new Panel(this, {
  x: L.mainContentLeft,
  y: L.contentTop,
  width: L.mainContentWidth,
  height: L.contentHeight,
  title: ...,
});
```

Replace `new Panel` with `new GlassPanel`.

- [ ] **Step 4: Run typecheck and tests**

```bash
npm run check
```

Expected: all gates PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/CompetitionScene.ts
git commit -m "feat(competition): migrate main panel to GlassPanel"
```

---

## Task 10: Migrate TechTreeScene

**Files:**

- Modify: `src/scenes/TechTreeScene.ts`

`TechTreeScene` has one `Panel` (`mainPanel`). Swap Panel → GlassPanel.

- [ ] **Step 1: Update imports**

Replace `Panel` with `GlassPanel` in `src/scenes/TechTreeScene.ts`.

- [ ] **Step 2: Update field declaration**

```ts
private mainPanel!: GlassPanel;
```

- [ ] **Step 3: Replace Panel construction**

Find (around line 76):

```ts
this.mainPanel = new Panel(this, {
  x: L.mainContentLeft,
  y: contentTop,
  width: L.mainContentWidth,
  height: contentHeight,
  title: ...,
});
```

Replace `new Panel` with `new GlassPanel`.

- [ ] **Step 4: Run typecheck and tests**

```bash
npm run check
```

Expected: all gates PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/TechTreeScene.ts
git commit -m "feat(techtree): migrate main panel to GlassPanel"
```

---

## Task 11: Migrate DiplomacyScene

**Files:**

- Modify: `src/scenes/DiplomacyScene.ts`

`DiplomacyScene` has two `Panel` instances — `targetTablePanel` and `actionPanel` — both are content panels (not floating modals). Both migrate to `GlassPanel`.

- [ ] **Step 1: Update imports**

Replace `Panel` with `GlassPanel` in the `@spacebiz/ui` import block. Keep `Label` as it's used for `actionStatusLabel` and `queuedSummary`.

- [ ] **Step 2: Update field declarations**

```ts
private targetTablePanel!: GlassPanel;
private actionPanel!: GlassPanel;
```

- [ ] **Step 3: Replace both Panel constructions**

Find (around line 226):

```ts
this.targetTablePanel = new Panel(this, {
  ...
});
```

And (around line 279):

```ts
this.actionPanel = new Panel(this, {
  ...
});
```

Replace both `new Panel` with `new GlassPanel`.

- [ ] **Step 4: Run typecheck and tests**

```bash
npm run check
```

Expected: all gates PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/DiplomacyScene.ts
git commit -m "feat(diplomacy): migrate both content panels to GlassPanel"
```

---

## Task 12: Visual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify each migrated scene**

Use the QA console in the browser: `__sft.goToScene("<SceneName>")`.

Scenes to verify in order:

1. `FleetScene` — glass panel visible, Ships/Idle chips in header row
2. `MarketScene` — glass panel visible, fuel price chip in header row
3. `FinanceScene` — glass panel visible, tab group starts at correct Y
4. `RoutesScene` — glass panel visible, tab group starts at correct Y
5. `EmpireScene` — glass panel visible, filter chip in header row
6. `CompetitionScene` — glass panel visible
7. `TechTreeScene` — glass panel visible
8. `DiplomacyScene` — both panes show glass style

- [ ] **Step 3: Final CI check**

```bash
npm run check
```

Expected: all gates PASS.

- [ ] **Step 4: Commit screenshots (if capturing)**

If capturing screenshots per CLAUDE.md workflow, save under `docs/pr-screenshots/pr-<NUMBER>/` and commit.
