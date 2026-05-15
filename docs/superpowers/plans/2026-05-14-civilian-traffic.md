# Civilian Space Traffic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ambient civilian traffic particles — soft glowing sparks that shimmer along hyperlanes (galaxy view) and radiate from the star toward hypergates (system view), density-weighted by system planet count.

**Architecture:** New `Traffic2D.ts` sub-module owned by `GalaxyView2D`, using Phaser 4 `ParticleEmitter` (one per hyperlane direction in galaxy view, one per gate plus ambient in system view). Emitter `x`/`y` and `angle` are updated each frame to track the 3D-projected screen positions of world-space anchors. LOD switching stops galaxy emitters in system mode and vice versa.

**Tech Stack:** Phaser 4 (`Phaser.GameObjects.Particles.ParticleEmitter`), TypeScript strict, existing `projectToScreenDesignInto` projection utilities.

**Spec:** `docs/superpowers/specs/2026-05-14-civilian-traffic-design.md`

---

## File Map

| File                                  | Action     | Responsibility                   |
| ------------------------------------- | ---------- | -------------------------------- |
| `src/scenes/galaxy2d/Traffic2D.ts`    | **Create** | All traffic particle logic       |
| `src/scenes/galaxy2d/GalaxyView2D.ts` | **Modify** | Wire Traffic2D at 5 touch points |

---

## Task 1: Create Traffic2D.ts skeleton

**Files:**

- Create: `src/scenes/galaxy2d/Traffic2D.ts`

- [ ] **Step 1: Create the file with all imports, spark texture function, interfaces, and class skeleton**

Create `src/scenes/galaxy2d/Traffic2D.ts` with this exact content:

```ts
import * as Phaser from "phaser";
import type { Hyperlane } from "../../data/types.ts";
import { projectToScreenDesignInto } from "./projection.ts";
import type { Mat4 } from "./Camera3D.ts";
import type { Vec3, ViewportRect } from "./types.ts";

const TRAFFIC_SPARK_TEX_KEY = "traffic2d:spark";
const TRAFFIC_SPARK_SIZE = 24;

function getOrCreateSparkTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(TRAFFIC_SPARK_TEX_KEY))
    return TRAFFIC_SPARK_TEX_KEY;
  const size = TRAFFIC_SPARK_SIZE;
  const tex = scene.textures.createCanvas(TRAFFIC_SPARK_TEX_KEY, size, size);
  if (!tex) return TRAFFIC_SPARK_TEX_KEY;
  const ctx = tex.getContext();
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
  grad.addColorStop(0.3, "rgba(200, 230, 255, 0.7)");
  grad.addColorStop(1, "rgba(150, 210, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
  return TRAFFIC_SPARK_TEX_KEY;
}

interface GalaxyLaneEmitter {
  emitterFwd: Phaser.GameObjects.Particles.ParticleEmitter;
  emitterBwd: Phaser.GameObjects.Particles.ParticleEmitter;
  worldA: Vec3;
  worldB: Vec3;
  running: boolean;
}

interface SystemGateEmitter {
  emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  gateWorldPos: Vec3;
  running: boolean;
}

export class Traffic2D {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;

  private galaxyEmitters: GalaxyLaneEmitter[] = [];
  private systemGateEmitters: SystemGateEmitter[] = [];
  private systemAmbientEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null =
    null;
  private systemAmbientRunning = false;

  private hyperlanes: Hyperlane[] = [];
  private systemPositions = new Map<string, Vec3>();
  private planetCounts = new Map<string, number>();

  private lastFocusedSystemId: string | null = null;

  private readonly scratchA: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly scratchB: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.container = container;
  }

  setGalaxyData(
    hyperlanes: Hyperlane[],
    systemPositions: Map<string, Vec3>,
  ): void {
    this.hyperlanes = hyperlanes;
    this.systemPositions = systemPositions;
    this.rebuildGalaxyEmitters();
  }

  setPlanetCounts(counts: Map<string, number>): void {
    this.planetCounts = counts;
    this.rebuildGalaxyEmitters();
  }

  update(
    viewProj: Mat4,
    viewport: ViewportRect,
    inSystemMode: boolean,
    focusedSystemId: string | null,
  ): void {
    if (inSystemMode) {
      this.stopGalaxyEmitters();
      if (focusedSystemId !== this.lastFocusedSystemId) {
        this.rebuildSystemEmitters(focusedSystemId);
        this.lastFocusedSystemId = focusedSystemId;
      }
      this.updateSystemEmitters(viewProj, viewport, focusedSystemId);
    } else {
      this.stopSystemEmitters();
      this.lastFocusedSystemId = null;
      this.updateGalaxyEmitters(viewProj, viewport);
    }
  }

  destroy(): void {
    this.clearGalaxyEmitters();
    this.clearSystemEmitters();
    if (this.scene.textures.exists(TRAFFIC_SPARK_TEX_KEY)) {
      this.scene.textures.remove(TRAFFIC_SPARK_TEX_KEY);
    }
  }

  // ── Private: galaxy ────────────────────────────────────────────────────

  private rebuildGalaxyEmitters(): void {
    this.clearGalaxyEmitters();
  }

  private updateGalaxyEmitters(
    _viewProj: Mat4,
    _viewport: ViewportRect,
  ): void {}

  private stopGalaxyEmitters(): void {
    for (const e of this.galaxyEmitters) {
      if (!e.running) continue;
      e.emitterFwd.stop();
      e.emitterBwd.stop();
      e.running = false;
    }
  }

  private clearGalaxyEmitters(): void {
    for (const e of this.galaxyEmitters) {
      e.emitterFwd.destroy();
      e.emitterBwd.destroy();
    }
    this.galaxyEmitters = [];
  }

  // ── Private: system ────────────────────────────────────────────────────

  private rebuildSystemEmitters(_focusedSystemId: string | null): void {
    this.clearSystemEmitters();
  }

  private updateSystemEmitters(
    _viewProj: Mat4,
    _viewport: ViewportRect,
    _focusedSystemId: string | null,
  ): void {}

  private stopSystemEmitters(): void {
    for (const e of this.systemGateEmitters) {
      if (!e.running) continue;
      e.emitter.stop();
      e.running = false;
    }
    if (this.systemAmbientRunning && this.systemAmbientEmitter) {
      this.systemAmbientEmitter.stop();
      this.systemAmbientRunning = false;
    }
  }

  private clearSystemEmitters(): void {
    for (const e of this.systemGateEmitters) e.emitter.destroy();
    this.systemGateEmitters = [];
    if (this.systemAmbientEmitter) {
      this.systemAmbientEmitter.destroy();
      this.systemAmbientEmitter = null;
    }
    this.systemAmbientRunning = false;
  }
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/galaxy2d/Traffic2D.ts
git commit -m "feat(traffic): add Traffic2D skeleton with spark texture"
```

---

## Task 2: Implement rebuildGalaxyEmitters()

**Files:**

- Modify: `src/scenes/galaxy2d/Traffic2D.ts`

- [ ] **Step 1: Add frequency constants at the top of the file (after TRAFFIC_SPARK_SIZE)**

In `Traffic2D.ts`, add these constants after `const TRAFFIC_SPARK_SIZE = 24;`:

```ts
const TRAFFIC_FREQ_SPARSE_MS = 250; // ms between emissions on quiet lanes
const TRAFFIC_FREQ_DENSE_MS = 80; // ms between emissions on busy lanes
const TRAFFIC_GALAXY_LIFESPAN = 700; // ms
const TRAFFIC_GALAXY_DEPTH = 350;
const TRAFFIC_GALAXY_SPEED_BASE = 55; // px/s — updated per-frame but set at creation
```

Also add this helper after the constants (before `getOrCreateSparkTexture`):

```ts
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}
```

- [ ] **Step 2: Replace the stub `rebuildGalaxyEmitters()` with the full implementation**

Replace the entire `private rebuildGalaxyEmitters(): void { this.clearGalaxyEmitters(); }` method with:

```ts
private rebuildGalaxyEmitters(): void {
  this.clearGalaxyEmitters();
  if (this.hyperlanes.length === 0) return;

  const texKey = getOrCreateSparkTexture(this.scene);

  // Compute per-lane weight (sum of planet counts at both endpoints).
  let maxWeight = 1;
  const weights: number[] = [];
  for (const hl of this.hyperlanes) {
    const a = this.planetCounts.get(hl.systemA) ?? 0;
    const b = this.planetCounts.get(hl.systemB) ?? 0;
    const w = a + b;
    weights.push(w);
    if (w > maxWeight) maxWeight = w;
  }

  for (let i = 0; i < this.hyperlanes.length; i++) {
    const hl = this.hyperlanes[i];
    const worldA = this.systemPositions.get(hl.systemA);
    const worldB = this.systemPositions.get(hl.systemB);
    if (!worldA || !worldB) continue;

    const t = weights[i] / maxWeight;
    const frequencyMs = Math.round(
      lerp(TRAFFIC_FREQ_SPARSE_MS, TRAFFIC_FREQ_DENSE_MS, t),
    );

    const baseConfig = {
      lifespan: TRAFFIC_GALAXY_LIFESPAN,
      speed: TRAFFIC_GALAXY_SPEED_BASE,
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.5, end: 0 },
      blendMode: "ADD",
      frequency: frequencyMs,
      quantity: 1,
      angle: 0,
    };

    const emitterFwd = this.scene.add.particles(0, 0, texKey, {
      ...baseConfig,
    });
    emitterFwd.setDepth(TRAFFIC_GALAXY_DEPTH);
    emitterFwd.stop();
    this.container.add(emitterFwd);

    const emitterBwd = this.scene.add.particles(0, 0, texKey, {
      ...baseConfig,
    });
    emitterBwd.setDepth(TRAFFIC_GALAXY_DEPTH);
    emitterBwd.stop();
    this.container.add(emitterBwd);

    this.galaxyEmitters.push({
      emitterFwd,
      emitterBwd,
      worldA: { x: worldA.x, y: worldA.y, z: worldA.z },
      worldB: { x: worldB.x, y: worldB.y, z: worldB.z },
      running: false,
    });
  }
}
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors. If Phaser 4 rejects the `scene.add.particles()` config type, check that `blendMode: "ADD"` matches the expected string union — try `blendMode: Phaser.BlendModes.ADD` as the alternative.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/galaxy2d/Traffic2D.ts
git commit -m "feat(traffic): implement galaxy emitter setup with density model"
```

---

## Task 3: Implement updateGalaxyEmitters()

**Files:**

- Modify: `src/scenes/galaxy2d/Traffic2D.ts`

- [ ] **Step 1: Replace the stub `updateGalaxyEmitters()` with the full implementation**

Replace `private updateGalaxyEmitters(_viewProj: Mat4, _viewport: ViewportRect): void {}` with:

```ts
private updateGalaxyEmitters(viewProj: Mat4, viewport: ViewportRect): void {
  for (const entry of this.galaxyEmitters) {
    const projA = projectToScreenDesignInto(
      this.scratchA,
      entry.worldA,
      viewProj,
      viewport,
    );
    const projB = projectToScreenDesignInto(
      this.scratchB,
      entry.worldB,
      viewProj,
      viewport,
    );

    if (!projA.visible || !projB.visible) {
      if (entry.running) {
        entry.emitterFwd.stop();
        entry.emitterBwd.stop();
        entry.running = false;
      }
      continue;
    }

    const dx = projB.x - projA.x;
    const dy = projB.y - projA.y;
    const screenDist = Math.sqrt(dx * dx + dy * dy);

    if (screenDist < 4) {
      if (entry.running) {
        entry.emitterFwd.stop();
        entry.emitterBwd.stop();
        entry.running = false;
      }
      continue;
    }

    const midX = (projA.x + projB.x) / 2;
    const midY = (projA.y + projB.y) / 2;
    const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    // Speed: traverse half the lane in one lifespan (particles spawn at midpoint).
    const speed = (screenDist / 2) / (TRAFFIC_GALAXY_LIFESPAN / 1000);

    entry.emitterFwd.x = midX;
    entry.emitterFwd.y = midY;
    entry.emitterFwd.angle = { min: angleDeg - 10, max: angleDeg + 10 };
    entry.emitterFwd.speed = speed;

    const reverseAngle = angleDeg + 180;
    entry.emitterBwd.x = midX;
    entry.emitterBwd.y = midY;
    entry.emitterBwd.angle = { min: reverseAngle - 10, max: reverseAngle + 10 };
    entry.emitterBwd.speed = speed;

    if (!entry.running) {
      entry.emitterFwd.start();
      entry.emitterBwd.start();
      entry.running = true;
    }
  }
}
```

> **Phaser 4 API note:** `emitter.angle = { min, max }` and `emitter.speed = value` use the EmitterOp setters introduced in Phaser 4. If these assignments cause a TypeScript error (EmitterOp is not assignable from `{ min, max }`), cast as `any` for now and file a note — the runtime behavior is correct because Phaser 4's EmitterOp setters accept these shapes.

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/scenes/galaxy2d/Traffic2D.ts
git commit -m "feat(traffic): implement per-frame galaxy emitter projection and angle update"
```

---

## Task 4: Wire Traffic2D into GalaxyView2D

**Files:**

- Modify: `src/scenes/galaxy2d/GalaxyView2D.ts`

- [ ] **Step 1: Add the import**

In `GalaxyView2D.ts`, add this import alongside the other sub-module imports (after the `HyperGates2D` import, around line 21):

```ts
import { Traffic2D } from "./Traffic2D.ts";
```

- [ ] **Step 2: Add the field declaration**

In `GalaxyView2D`, add the field after `private readonly gates: HyperGates2D;` (around line 284):

```ts
private readonly traffic: Traffic2D;
```

- [ ] **Step 3: Construct in constructor**

In the constructor, after `this.gates = new HyperGates2D(this.scene, this.galaxyContainer);` (around line 341), add:

```ts
this.traffic = new Traffic2D(this.scene, this.galaxyContainer);
```

- [ ] **Step 4: Wire setGalaxy()**

In `setGalaxy()`, after `this.gates.setData(hyperlanes, systems, this.systemPositions);` (around line 520), add:

```ts
this.traffic.setGalaxyData(hyperlanes, this.systemPositions);
```

- [ ] **Step 5: Wire setPlanets()**

Replace the current `setPlanets()` body (around line 1177):

```ts
setPlanets(planets: import("../../data/types.ts").Planet[]): void {
  if (this.destroyed) return;
  this.planets.setPlanets(planets, this.systemPositions);
  const counts = new Map<string, number>();
  for (const planet of planets) {
    counts.set(planet.systemId, (counts.get(planet.systemId) ?? 0) + 1);
  }
  this.traffic.setPlanetCounts(counts);
}
```

- [ ] **Step 6: Wire update()**

In `update()`, after the `this.gates.update(...)` call block (around line 901), add:

```ts
this.traffic.update(viewProj, this.viewport, systemMode, this.focusedSystemId);
```

- [ ] **Step 7: Wire destroy()**

In `destroy()`, after `this.gates.destroy();` (around line 1280), add:

```ts
this.traffic.destroy();
```

- [ ] **Step 8: Verify typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 9: Start dev server and verify galaxy traffic is visible**

```bash
npm run dev
```

Open the game, enter the galaxy map. You should see small glowing sparks drifting along hyperlanes. If nothing appears, open the browser console and check for Phaser particle-related errors. Common issues:

- `scene.add.particles` API mismatch → check Phaser 4 docs for the correct factory signature
- `blendMode: "ADD"` rejected → try `blendMode: Phaser.BlendModes.ADD`
- `emitter.angle = { ... }` type error → cast as `any` per the note in Task 3

- [ ] **Step 10: Commit**

```bash
git add src/scenes/galaxy2d/GalaxyView2D.ts src/scenes/galaxy2d/Traffic2D.ts
git commit -m "feat(traffic): wire Traffic2D into GalaxyView2D — galaxy-view sparks live"
```

---

## Task 5: Implement rebuildSystemEmitters()

**Files:**

- Modify: `src/scenes/galaxy2d/Traffic2D.ts`

- [ ] **Step 1: Add system-view constants after TRAFFIC_GALAXY_DEPTH**

In `Traffic2D.ts`, after `const TRAFFIC_GALAXY_DEPTH = 350;`, add:

```ts
const TRAFFIC_SYSTEM_LIFESPAN = 800; // ms
const TRAFFIC_SYSTEM_FREQ_SPARSE_MS = 300;
const TRAFFIC_SYSTEM_FREQ_DENSE_MS = 60;
const TRAFFIC_MAX_PLANETS = 6;
const GATE_RADIUS_WORLD = 4.2; // must match HyperGates2D
const TRAFFIC_SYSTEM_DEPTH = 785;
const TRAFFIC_AMBIENT_DEPTH = 780;
const TRAFFIC_SYSTEM_SPEED_BASE = 40; // px/s initial value, updated per-frame
```

- [ ] **Step 2: Replace the stub `rebuildSystemEmitters()` with the full implementation**

Replace `private rebuildSystemEmitters(_focusedSystemId: string | null): void { this.clearSystemEmitters(); }` with:

```ts
private rebuildSystemEmitters(focusedSystemId: string | null): void {
  this.clearSystemEmitters();
  if (!focusedSystemId) return;

  const focusedPos = this.systemPositions.get(focusedSystemId);
  if (!focusedPos) return;

  const texKey = getOrCreateSparkTexture(this.scene);

  const planetCount = this.planetCounts.get(focusedSystemId) ?? 0;
  const densityT = Math.min(1, planetCount / TRAFFIC_MAX_PLANETS);
  const gateFreqMs = Math.round(
    lerp(TRAFFIC_SYSTEM_FREQ_SPARSE_MS, TRAFFIC_SYSTEM_FREQ_DENSE_MS, densityT),
  );

  // One directional emitter per connected hypergate.
  for (const hl of this.hyperlanes) {
    const isA = hl.systemA === focusedSystemId;
    const isB = hl.systemB === focusedSystemId;
    if (!isA && !isB) continue;

    const connectedId = isA ? hl.systemB : hl.systemA;
    const connectedPos = this.systemPositions.get(connectedId);
    if (!connectedPos) continue;

    const dx = connectedPos.x - focusedPos.x;
    const dz = connectedPos.z - focusedPos.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.001) continue;

    const gateWorldPos: Vec3 = {
      x: focusedPos.x + (dx / len) * GATE_RADIUS_WORLD,
      y: focusedPos.y,
      z: focusedPos.z + (dz / len) * GATE_RADIUS_WORLD,
    };

    const emitter = this.scene.add.particles(0, 0, texKey, {
      lifespan: TRAFFIC_SYSTEM_LIFESPAN,
      speed: TRAFFIC_SYSTEM_SPEED_BASE,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.65, end: 0 },
      blendMode: "ADD",
      frequency: gateFreqMs,
      quantity: 1,
      angle: 0,
    });
    emitter.setDepth(TRAFFIC_SYSTEM_DEPTH);
    emitter.stop();
    this.container.add(emitter);

    this.systemGateEmitters.push({
      emitter,
      gateWorldPos,
      running: false,
    });
  }

  // Ambient emitter at the star — low-density omnidirectional traffic.
  const ambientFreqMs = Math.round(
    lerp(400, 120, densityT),
  );
  const ambientEmitter = this.scene.add.particles(0, 0, texKey, {
    lifespan: TRAFFIC_SYSTEM_LIFESPAN,
    speed: { min: 15, max: 35 },
    scale: { start: 0.25, end: 0 },
    alpha: { start: 0.35, end: 0 },
    blendMode: "ADD",
    frequency: ambientFreqMs,
    quantity: 1,
    angle: { min: 0, max: 360 },
  });
  ambientEmitter.setDepth(TRAFFIC_AMBIENT_DEPTH);
  ambientEmitter.stop();
  this.container.add(ambientEmitter);
  this.systemAmbientEmitter = ambientEmitter;
}
```

- [ ] **Step 3: Verify typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/scenes/galaxy2d/Traffic2D.ts
git commit -m "feat(traffic): implement system-view gate and ambient emitter setup"
```

---

## Task 6: Implement updateSystemEmitters() and complete LOD switching

**Files:**

- Modify: `src/scenes/galaxy2d/Traffic2D.ts`

- [ ] **Step 1: Replace the stub `updateSystemEmitters()` with the full implementation**

Replace `private updateSystemEmitters(_viewProj: Mat4, _viewport: ViewportRect, _focusedSystemId: string | null): void {}` with:

```ts
private updateSystemEmitters(
  viewProj: Mat4,
  viewport: ViewportRect,
  focusedSystemId: string | null,
): void {
  if (!focusedSystemId) return;

  const focusedPos = this.systemPositions.get(focusedSystemId);
  if (!focusedPos) return;

  const starProj = projectToScreenDesignInto(
    this.scratchA,
    focusedPos,
    viewProj,
    viewport,
  );

  if (!starProj.visible) {
    this.stopSystemEmitters();
    return;
  }

  // Update each gate emitter: position at star, angle toward gate.
  for (const entry of this.systemGateEmitters) {
    const gateProj = projectToScreenDesignInto(
      this.scratchB,
      entry.gateWorldPos,
      viewProj,
      viewport,
    );

    if (!gateProj.visible) {
      if (entry.running) {
        entry.emitter.stop();
        entry.running = false;
      }
      continue;
    }

    const dx = gateProj.x - starProj.x;
    const dy = gateProj.y - starProj.y;
    const screenDist = Math.sqrt(dx * dx + dy * dy);

    if (screenDist < 4) {
      if (entry.running) {
        entry.emitter.stop();
        entry.running = false;
      }
      continue;
    }

    const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    const speed = screenDist / (TRAFFIC_SYSTEM_LIFESPAN / 1000);

    entry.emitter.x = starProj.x;
    entry.emitter.y = starProj.y;
    entry.emitter.angle = { min: angleDeg - 8, max: angleDeg + 8 };
    entry.emitter.speed = speed;

    if (!entry.running) {
      entry.emitter.start();
      entry.running = true;
    }
  }

  // Ambient emitter stays at the star position.
  if (this.systemAmbientEmitter) {
    this.systemAmbientEmitter.x = starProj.x;
    this.systemAmbientEmitter.y = starProj.y;
    if (!this.systemAmbientRunning) {
      this.systemAmbientEmitter.start();
      this.systemAmbientRunning = true;
    }
  }
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Start dev server, zoom into a star system, verify system-view traffic**

```bash
npm run dev
```

Click a star to fly into system view. You should see sparks radiating from the star toward each gate diamond. In the browser console: `__sft.goToScene("GalaxyMapScene")` can fast-travel to the map; click any star to fly in. Expect:

- Sparks drifting outward from star center toward gate positions
- Soft glow (additive blend — sparks appear brighter over dark background)
- Ambient omnidirectional shimmer at low density around the star
- LOD switch: sparks disappear when zooming back out to galaxy view, hyperlane sparks reappear

- [ ] **Step 4: Commit**

```bash
git add src/scenes/galaxy2d/Traffic2D.ts
git commit -m "feat(traffic): implement system-view emitter per-frame update and LOD switching"
```

---

## Task 7: Final check, tuning, and clean commit

**Files:**

- Modify: `src/scenes/galaxy2d/Traffic2D.ts` (constants only if tuning needed)

- [ ] **Step 1: Run the full CI gate**

```bash
npm run check
```

Expected: typecheck passes, all tests pass, production build succeeds.

- [ ] **Step 2: Visual tuning pass (if needed)**

If traffic density looks wrong — too sparse, too dense, wrong size:

- Adjust `TRAFFIC_FREQ_SPARSE_MS` / `TRAFFIC_FREQ_DENSE_MS` (higher = slower emission)
- Adjust `scale: { start: N, end: 0 }` on emitter configs (0.3 is ~9px at creation for a 24px texture)
- Adjust `TRAFFIC_GALAXY_LIFESPAN` / `TRAFFIC_SYSTEM_LIFESPAN` (longer = particles travel further per lane)
- Adjust `alpha: { start: N }` for overall brightness (additive blend makes them appear brighter than the alpha number suggests)

- [ ] **Step 3: Commit any tuning changes**

```bash
git add src/scenes/galaxy2d/Traffic2D.ts
git commit -m "feat(traffic): tune civilian traffic particle density and visual parameters"
```

---

## Known Phaser 4 API Caveats

If you hit TypeScript errors on `emitter.angle = { min, max }` or `emitter.speed = value`:

```ts
// Cast to bypass EmitterOp type strictness if needed:
(emitter.angle as unknown as { min: number; max: number }).min = angleDeg - 10;
(emitter.angle as unknown as { min: number; max: number }).max = angleDeg + 10;

// Or use emitter.fromJSON / emitter.setConfig if available in your Phaser 4 build.
// Or: destroy + recreate emitter on significant angle change (> 15°).
```

If `scene.add.particles(x, y, texture, config)` does not match Phaser 4's factory signature, check whether your version uses:

```ts
// Alternative Phaser 4 factory (some builds):
const emitter = scene.add.particles(texKey, config);
emitter.x = x;
emitter.y = y;
```
