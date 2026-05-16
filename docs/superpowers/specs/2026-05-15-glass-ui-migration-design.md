# Glass UI Migration — Content Scenes

**Status:** Approved 2026-05-15
**Owner:** UI

## Context

The HUD was modernized in commit `755844a` ("Refactor UI layout and HUD elements for improved compactness and aesthetics"). The new aesthetic uses:

- Lower-alpha glass surfaces (background alpha 0.62–0.72 instead of 0.88–0.92)
- Compact bar heights (top 48px, ticker 24px, bottom bar removed)
- Floating End Turn pill with depth layering instead of a stacked solid bottom bar
- Small "status chips": semi-transparent rounded rectangles with a 1px low-alpha border,
  used to group key/value stats inline (`Charters 4 (2P/2F) · §1,200/q`, etc.)

The eight content scenes (Fleet, Routes, Finance, Market, Empire, Diplomacy, TechTree,
Competition) still use the legacy [Panel](../../../packages/spacebiz-ui/src/Panel.ts):
opaque background, chunky title bar with a tinted rectangle, ambient glow layer. Next
to the new HUD they read as heavy.

## Goals

1. Bring the eight target content scenes visually in line with the new HUD.
2. Do it through reusable primitives so future scenes inherit the look automatically.
3. Avoid touching anything outside the migration target — no font, layout, or behavior
   changes.

## Non-goals

- Modal, RouteBuilderPanel, GalaxySidebarPanel, StationBuilderGrid stay on legacy `Panel`.
  These are floating/contextual surfaces where the chunkier read is correct.
- Setup screens (MainMenu, GalaxySetup, SandboxSetup) — deferred.
- Flow screens (TurnReport, SimSummary, GameOver) — deferred.
- DataTable, ScrollableList, ScrollFrame internals — untouched.
- Font, spacing, or layout-topology changes beyond what GlassPanel / StatusChip imply.

## Architecture

### New primitive 1: `GlassPanel`

Lives at `packages/spacebiz-ui/src/GlassPanel.ts`. Sibling of `Panel`, not a subclass —
keeping them separate avoids regressing the floating panels that still want the legacy
look.

**API parity with `Panel`** — drop-in replacement for the migrated scenes:

```ts
interface GlassPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  titleFontSize?: number;
  /** Background alpha. Default 0.62. */
  backgroundAlpha?: number;
  /** "elevated" gets a slightly brighter fill for nested cards; default "flat". */
  variant?: "elevated" | "flat";
}
```

Public methods match Panel: `setSize(w, h)`, `setTitle(t)`, `getContentY()`,
`getContentArea()`. No `setActive()` glow API — GlassPanel has no glow layer.

**Visual differences from `Panel`:**

- Background nineslice rendered at config `backgroundAlpha` (default 0.62) instead of 1.0.
- No glow layer (no `panel-glow` nineslice, no idle pulse tween).
- Title row: a `Label` in accent color at top-left padding, plus a 1px accent-colored
  underline spanning the panel width (alpha 0.7). No tinted title-bar rectangle.
- Reuses the existing `panel-bg` nineslice texture — the difference is alpha + composition,
  not a new texture.

### New primitive 2: `StatusChip`

Lives at `packages/spacebiz-ui/src/StatusChip.ts`. Container.

```ts
type ChipVariant = "default" | "warn" | "danger" | "success" | "accent";

interface StatusChipConfig {
  x: number;
  y: number;
  /** Optional fixed width. If omitted, chip sizes to content + padding. */
  width?: number;
  height?: number; // default 28
  label?: string; // small dim text on the left
  value: string; // main text, accent-colored per variant
  iconTextureKey?: string; // optional small icon on the far left
  variant?: ChipVariant; // default "default"
}
```

**Visual:**

- Rounded rectangle background, alpha 0.36, fill `theme.colors.background`.
- 1px stroke at alpha 0.26 in `theme.colors.panelBorder` for `default`; the variant
  border color is `loss` (danger), `warning` (warn), `profit` (success), `accent` (accent).
- Value color follows variant; label stays `textDim`.
- Public methods: `setValue(text)`, `setVariant(v)`, `setLabel(text)`, `setSize(w, h)`.

### Migration: Phase 1 — Core gameplay (4 scenes)

Files:

- [src/scenes/FleetScene.ts](../../../src/scenes/FleetScene.ts)
- [src/scenes/RoutesScene.ts](../../../src/scenes/RoutesScene.ts)
- [src/scenes/FinanceScene.ts](../../../src/scenes/FinanceScene.ts)
- [src/scenes/MarketScene.ts](../../../src/scenes/MarketScene.ts)

Per scene:

1. Replace `new Panel(...)` for the main content panel with `new GlassPanel(...)`. Keep
   constructor args identical — the API is compatible.
2. Identify any bespoke header rows showing key/value stats (e.g. ship counts, cash
   inline, market tick, R&D budget). Replace with a horizontal cluster of `StatusChip`
   instances. Aim for 2–5 chips per scene header.
3. Do not touch DataTable/ScrollFrame/ScrollableList configuration or content rendering.
4. Run `npm run check` after each scene.
5. Capture a screenshot per scene via Claude Preview MCP, save under
   `docs/pr-screenshots/pr-<NUMBER>/<scene>.png`.

### Migration: Phase 2 — Strategy (4 scenes)

Files:

- [src/scenes/EmpireScene.ts](../../../src/scenes/EmpireScene.ts)
- [src/scenes/DiplomacyScene.ts](../../../src/scenes/DiplomacyScene.ts)
- [src/scenes/TechTreeScene.ts](../../../src/scenes/TechTreeScene.ts)
- [src/scenes/CompetitionScene.ts](../../../src/scenes/CompetitionScene.ts)

Same procedure as Phase 1. Diplomacy and Competition have multi-pane layouts; only the
outer content panel is in scope — inner panes can adopt GlassPanel with
`variant: "elevated"` if it improves the read, but it's not required.

## Testing

- `GlassPanel.test.ts` — construct with and without title, assert `getContentArea()`
  rectangle, `setSize()` reflow, `setTitle()` updates label text.
- `StatusChip.test.ts` — construct with each variant, assert background color/stroke
  match expected variant, `setVariant()` swaps colors, `setValue()` updates value text.
- Existing `Panel.test.ts` stays green (Panel is untouched).
- All eight migrated scenes: existing scene tests must stay green. Scene tests don't
  assert on Panel internals so no test changes expected.
- CI gates (`npm run check`) must pass after each phase.

## Visual verification

Per [CLAUDE.md](../../../CLAUDE.md) UI workflow, each migrated scene gets a screenshot
under `docs/pr-screenshots/pr-<NUMBER>/<scene>.png`. The screenshot must show the
default content state (no modal open, no selection). Captured via Claude Preview MCP
with the `spacebiz-dev` launch config, using `__sft.goToScene("<SceneName>")` to jump
straight in.

## Risks

- **Test coverage gap on Panel internals.** Confirmed by inspection that scene tests
  don't snapshot Panel rendering, only behavior. Risk is low.
- **Visual regression on floating panels** — mitigated by keeping `Panel` unchanged.
- **Style drift between Phase 1 and Phase 2** — mitigated by extracting `StatusChip`
  before scene migration begins, so both phases use the same building block.

## Out of scope explicitly

| Area                                                      | Decision                  |
| --------------------------------------------------------- | ------------------------- |
| Modal                                                     | Keep legacy Panel         |
| RouteBuilderPanel, GalaxySidebarPanel, StationBuilderGrid | Keep legacy Panel         |
| Setup / flow / game-over scenes                           | Deferred                  |
| Theme colors, fonts, spacing tokens                       | No changes                |
| DataTable / ScrollFrame / ScrollableList                  | No changes                |
| HUD (GameHUDScene)                                        | Already done in `755844a` |
