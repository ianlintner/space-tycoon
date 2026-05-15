import * as Phaser from "phaser";
import type { Hyperlane } from "../../data/types.ts";
import type { Mat4 } from "./Camera3D.ts";
import type { Vec3, ViewportRect } from "./types.ts";
import { projectToScreenDesignInto } from "./projection.ts";

// Custom particle/ship traffic system. We bypass Phaser's ParticleEmitter
// because we need particles whose endpoints are projected screen positions
// that move every frame (camera, orbiting planets), and that proved to be
// fragile with the emitter's radial/angle/speed APIs. Each "ship" is a pooled
// sprite with explicit per-frame state we control directly.

const TRAFFIC_SPARK_TEX_KEY = "traffic2d:spark";
const TRAFFIC_SPARK_SIZE = 24;

// Galaxy traffic: ships drift between connected star systems along hyperlanes.
const TRAFFIC_GALAXY_LIFESPAN_MS = 3500;
const TRAFFIC_GALAXY_FREQ_SPARSE_MS = 900;
const TRAFFIC_GALAXY_FREQ_DENSE_MS = 280;
const TRAFFIC_GALAXY_DEPTH = 350;
const TRAFFIC_GALAXY_SCALE = 0.55;
const TRAFFIC_GALAXY_ALPHA = 0.75;

// System traffic: ships shuttle from each hypergate to each planet.
const TRAFFIC_SYSTEM_LIFESPAN_MS = 2800;
const TRAFFIC_SYSTEM_FREQ_SPARSE_MS = 700;
const TRAFFIC_SYSTEM_FREQ_DENSE_MS = 250;
const TRAFFIC_SYSTEM_DEPTH = 785;
const TRAFFIC_SYSTEM_SCALE = 0.6;
const TRAFFIC_SYSTEM_ALPHA = 0.85;

// Ambient star traffic: faint random sparks at the focused star.
const TRAFFIC_AMBIENT_LIFESPAN_MS = 2200;
const TRAFFIC_AMBIENT_FREQ_MS = 320;
const TRAFFIC_AMBIENT_SPEED_PXS = 35;
const TRAFFIC_AMBIENT_DEPTH = 780;
const TRAFFIC_AMBIENT_SCALE = 0.32;
const TRAFFIC_AMBIENT_ALPHA = 0.45;

const GATE_RADIUS_WORLD = 4.2; // must match HyperGates2D
const POOL_INITIAL_SIZE = 64;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

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
  grad.addColorStop(0.35, "rgba(200, 230, 255, 0.7)");
  grad.addColorStop(1, "rgba(150, 210, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
  return TRAFFIC_SPARK_TEX_KEY;
}

interface Particle {
  sprite: Phaser.GameObjects.Image;
  active: boolean;
  ageMs: number;
  lifeMs: number;
  // Position is in screen design coords (same space as projectToScreenDesignInto).
  x: number;
  y: number;
  vx: number; // px / s
  vy: number;
  baseAlpha: number;
  baseScale: number;
}

interface GalaxyStream {
  worldA: Vec3;
  worldB: Vec3;
  nextSpawnAtMs: number;
  intervalMs: number;
  // Alternates A→B and B→A so the lane has bidirectional traffic.
  fwdNext: boolean;
}

interface SystemStream {
  gateWorldPos: Vec3;
  planetId: string;
  nextSpawnAtMs: number;
  intervalMs: number;
}

interface AmbientStream {
  starWorldPos: Vec3;
  nextSpawnAtMs: number;
  intervalMs: number;
}

export class Traffic2D {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;

  private hyperlanes: Hyperlane[] = [];
  private systemPositions = new Map<string, Vec3>();
  private planetCounts = new Map<string, number>();

  private galaxyStreams: GalaxyStream[] = [];
  private systemStreams: SystemStream[] = [];
  private ambient: AmbientStream | null = null;

  private particles: Particle[] = [];
  private lastFocusedSystemId: string | null = null;
  private lastPlanetIdsKey = "";
  private lastUpdateMs = 0;

  private readonly scratchA: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly scratchB: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.container = container;
    getOrCreateSparkTexture(scene);
    for (let i = 0; i < POOL_INITIAL_SIZE; i++)
      this.particles.push(this.createParticle());
  }

  setGalaxyData(
    hyperlanes: Hyperlane[],
    systemPositions: Map<string, Vec3>,
  ): void {
    this.hyperlanes = hyperlanes;
    this.systemPositions = systemPositions;
    this.rebuildGalaxyStreams();
  }

  setPlanetCounts(counts: Map<string, number>): void {
    this.planetCounts = counts;
    this.rebuildGalaxyStreams();
  }

  update(
    viewProj: Mat4,
    viewport: ViewportRect,
    inSystemMode: boolean,
    focusedSystemId: string | null,
    focusedPlanetWorldPositions: ReadonlyMap<string, Vec3>,
  ): void {
    const nowMs = this.scene.time.now;
    const dtMs = this.lastUpdateMs === 0 ? 16 : nowMs - this.lastUpdateMs;
    this.lastUpdateMs = nowMs;

    if (inSystemMode) {
      const planetIdsKey = sortedKeysJoined(focusedPlanetWorldPositions);
      if (
        focusedSystemId !== this.lastFocusedSystemId ||
        planetIdsKey !== this.lastPlanetIdsKey
      ) {
        this.rebuildSystemStreams(focusedSystemId, focusedPlanetWorldPositions);
        this.lastFocusedSystemId = focusedSystemId;
        this.lastPlanetIdsKey = planetIdsKey;
      }
      this.spawnSystemParticles(
        viewProj,
        viewport,
        focusedPlanetWorldPositions,
        nowMs,
      );
    } else {
      if (this.lastFocusedSystemId !== null || this.systemStreams.length > 0) {
        this.systemStreams = [];
        this.ambient = null;
        this.lastFocusedSystemId = null;
        this.lastPlanetIdsKey = "";
      }
      this.spawnGalaxyParticles(viewProj, viewport, nowMs);
    }

    this.advanceParticles(dtMs);
  }

  destroy(): void {
    for (const p of this.particles) p.sprite.destroy();
    this.particles = [];
    if (this.scene.textures.exists(TRAFFIC_SPARK_TEX_KEY)) {
      this.scene.textures.remove(TRAFFIC_SPARK_TEX_KEY);
    }
  }

  // ── Particle pool ──────────────────────────────────────────────────────

  private createParticle(): Particle {
    const sprite = this.scene.add.image(0, 0, TRAFFIC_SPARK_TEX_KEY);
    sprite.setVisible(false);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    sprite.setActive(false);
    this.container.add(sprite);
    return {
      sprite,
      active: false,
      ageMs: 0,
      lifeMs: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      baseAlpha: 1,
      baseScale: 1,
    };
  }

  private acquireParticle(): Particle {
    for (const p of this.particles) if (!p.active) return p;
    const grown = this.createParticle();
    this.particles.push(grown);
    return grown;
  }

  private launchParticle(
    p: Particle,
    sx: number,
    sy: number,
    vx: number,
    vy: number,
    lifeMs: number,
    baseAlpha: number,
    baseScale: number,
    depth: number,
  ): void {
    p.active = true;
    p.ageMs = 0;
    p.lifeMs = lifeMs;
    p.x = sx;
    p.y = sy;
    p.vx = vx;
    p.vy = vy;
    p.baseAlpha = baseAlpha;
    p.baseScale = baseScale;
    p.sprite.setActive(true);
    p.sprite.setPosition(sx, sy);
    p.sprite.setAlpha(baseAlpha);
    p.sprite.setScale(baseScale);
    p.sprite.setDepth(depth);
    p.sprite.setVisible(true);
  }

  private advanceParticles(dtMs: number): void {
    const dtSec = dtMs / 1000;
    for (const p of this.particles) {
      if (!p.active) continue;
      p.ageMs += dtMs;
      if (p.ageMs >= p.lifeMs) {
        p.active = false;
        p.sprite.setActive(false);
        p.sprite.setVisible(false);
        continue;
      }
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;

      // Smooth fade-in over first 15% of life, fade-out across the rest.
      const t = p.ageMs / p.lifeMs;
      const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      p.sprite.setPosition(p.x, p.y);
      p.sprite.setAlpha(p.baseAlpha * fade);
      p.sprite.setScale(p.baseScale);
    }
  }

  // ── Galaxy lanes ───────────────────────────────────────────────────────

  private rebuildGalaxyStreams(): void {
    this.galaxyStreams = [];
    if (this.hyperlanes.length === 0) return;

    let maxWeight = 1;
    for (const hl of this.hyperlanes) {
      const a = this.planetCounts.get(hl.systemA) ?? 0;
      const b = this.planetCounts.get(hl.systemB) ?? 0;
      const w = a + b;
      if (w > maxWeight) maxWeight = w;
    }

    const baseMs = this.scene.time.now;
    for (const hl of this.hyperlanes) {
      const worldA = this.systemPositions.get(hl.systemA);
      const worldB = this.systemPositions.get(hl.systemB);
      if (!worldA || !worldB) continue;
      const a = this.planetCounts.get(hl.systemA) ?? 0;
      const b = this.planetCounts.get(hl.systemB) ?? 0;
      const t = (a + b) / maxWeight;
      const intervalMs = Math.round(
        lerp(TRAFFIC_GALAXY_FREQ_SPARSE_MS, TRAFFIC_GALAXY_FREQ_DENSE_MS, t),
      );
      this.galaxyStreams.push({
        worldA: { x: worldA.x, y: worldA.y, z: worldA.z },
        worldB: { x: worldB.x, y: worldB.y, z: worldB.z },
        nextSpawnAtMs: baseMs + Math.random() * intervalMs,
        intervalMs,
        fwdNext: Math.random() < 0.5,
      });
    }
  }

  private spawnGalaxyParticles(
    viewProj: Mat4,
    viewport: ViewportRect,
    nowMs: number,
  ): void {
    for (const stream of this.galaxyStreams) {
      if (nowMs < stream.nextSpawnAtMs) continue;
      const projA = projectToScreenDesignInto(
        this.scratchA,
        stream.worldA,
        viewProj,
        viewport,
      );
      const projB = projectToScreenDesignInto(
        this.scratchB,
        stream.worldB,
        viewProj,
        viewport,
      );
      if (!projA.visible || !projB.visible) {
        stream.nextSpawnAtMs = nowMs + stream.intervalMs;
        continue;
      }
      const dx = projB.x - projA.x;
      const dy = projB.y - projA.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 4) {
        stream.nextSpawnAtMs = nowMs + stream.intervalMs;
        continue;
      }
      const lifeMs = TRAFFIC_GALAXY_LIFESPAN_MS;
      const fwd = stream.fwdNext;
      stream.fwdNext = !fwd;
      const sx = fwd ? projA.x : projB.x;
      const sy = fwd ? projA.y : projB.y;
      const vx = (fwd ? dx : -dx) / (lifeMs / 1000);
      const vy = (fwd ? dy : -dy) / (lifeMs / 1000);
      const p = this.acquireParticle();
      this.launchParticle(
        p,
        sx,
        sy,
        vx,
        vy,
        lifeMs,
        TRAFFIC_GALAXY_ALPHA,
        TRAFFIC_GALAXY_SCALE,
        TRAFFIC_GALAXY_DEPTH,
      );
      stream.nextSpawnAtMs = nowMs + stream.intervalMs;
    }
  }

  // ── System: gate → planet ─────────────────────────────────────────────

  private rebuildSystemStreams(
    focusedSystemId: string | null,
    focusedPlanetWorldPositions: ReadonlyMap<string, Vec3>,
  ): void {
    this.systemStreams = [];
    this.ambient = null;
    if (!focusedSystemId) return;
    const focusedPos = this.systemPositions.get(focusedSystemId);
    if (!focusedPos) return;

    const planetIds = Array.from(focusedPlanetWorldPositions.keys());
    const planetCount = planetIds.length;
    const densityT = Math.min(1, planetCount / 4);
    const perStreamFreqMs = Math.round(
      lerp(
        TRAFFIC_SYSTEM_FREQ_SPARSE_MS,
        TRAFFIC_SYSTEM_FREQ_DENSE_MS,
        densityT,
      ),
    );

    const baseMs = this.scene.time.now;
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
      for (const planetId of planetIds) {
        this.systemStreams.push({
          gateWorldPos: { ...gateWorldPos },
          planetId,
          nextSpawnAtMs: baseMs + Math.random() * perStreamFreqMs,
          intervalMs: perStreamFreqMs,
        });
      }
    }

    this.ambient = {
      starWorldPos: { x: focusedPos.x, y: focusedPos.y, z: focusedPos.z },
      nextSpawnAtMs: baseMs,
      intervalMs: TRAFFIC_AMBIENT_FREQ_MS,
    };
  }

  private spawnSystemParticles(
    viewProj: Mat4,
    viewport: ViewportRect,
    focusedPlanetWorldPositions: ReadonlyMap<string, Vec3>,
    nowMs: number,
  ): void {
    for (const stream of this.systemStreams) {
      if (nowMs < stream.nextSpawnAtMs) continue;
      const planetWorld = focusedPlanetWorldPositions.get(stream.planetId);
      if (!planetWorld) {
        stream.nextSpawnAtMs = nowMs + stream.intervalMs;
        continue;
      }
      const gateProj = projectToScreenDesignInto(
        this.scratchA,
        stream.gateWorldPos,
        viewProj,
        viewport,
      );
      const planetProj = projectToScreenDesignInto(
        this.scratchB,
        planetWorld,
        viewProj,
        viewport,
      );
      if (!gateProj.visible || !planetProj.visible) {
        stream.nextSpawnAtMs = nowMs + stream.intervalMs;
        continue;
      }
      const dx = planetProj.x - gateProj.x;
      const dy = planetProj.y - gateProj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 4) {
        stream.nextSpawnAtMs = nowMs + stream.intervalMs;
        continue;
      }
      const lifeMs = TRAFFIC_SYSTEM_LIFESPAN_MS;
      const vx = dx / (lifeMs / 1000);
      const vy = dy / (lifeMs / 1000);
      const p = this.acquireParticle();
      this.launchParticle(
        p,
        gateProj.x,
        gateProj.y,
        vx,
        vy,
        lifeMs,
        TRAFFIC_SYSTEM_ALPHA,
        TRAFFIC_SYSTEM_SCALE,
        TRAFFIC_SYSTEM_DEPTH,
      );
      stream.nextSpawnAtMs = nowMs + stream.intervalMs;
    }

    // Ambient at star — random radial sparks.
    if (this.ambient && nowMs >= this.ambient.nextSpawnAtMs) {
      const starProj = projectToScreenDesignInto(
        this.scratchA,
        this.ambient.starWorldPos,
        viewProj,
        viewport,
      );
      if (starProj.visible) {
        const angle = Math.random() * Math.PI * 2;
        const vx = Math.cos(angle) * TRAFFIC_AMBIENT_SPEED_PXS;
        const vy = Math.sin(angle) * TRAFFIC_AMBIENT_SPEED_PXS;
        const p = this.acquireParticle();
        this.launchParticle(
          p,
          starProj.x,
          starProj.y,
          vx,
          vy,
          TRAFFIC_AMBIENT_LIFESPAN_MS,
          TRAFFIC_AMBIENT_ALPHA,
          TRAFFIC_AMBIENT_SCALE,
          TRAFFIC_AMBIENT_DEPTH,
        );
      }
      this.ambient.nextSpawnAtMs = nowMs + this.ambient.intervalMs;
    }
  }
}

function sortedKeysJoined(map: ReadonlyMap<string, unknown>): string {
  const keys = Array.from(map.keys());
  keys.sort();
  return keys.join("|");
}
