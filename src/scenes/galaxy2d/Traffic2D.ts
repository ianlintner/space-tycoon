import * as Phaser from "phaser";
import type { Hyperlane } from "../../data/types.ts";
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

// Prevent unused warnings on skeleton by using the function here
void getOrCreateSparkTexture;

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

  private galaxyEmitters: GalaxyLaneEmitter[] = [];
  private systemGateEmitters: SystemGateEmitter[] = [];
  private systemAmbientEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null =
    null;
  private systemAmbientRunning = false;

  private _hyperlanes: Hyperlane[] = [];
  private _systemPositions = new Map<string, Vec3>();
  private _planetCounts = new Map<string, number>();

  private lastFocusedSystemId: string | null = null;

  private readonly _scratchA: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly _scratchB: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(scene: Phaser.Scene, _container: Phaser.GameObjects.Container) {
    this.scene = scene;
  }

  setGalaxyData(
    hyperlanes: Hyperlane[],
    systemPositions: Map<string, Vec3>,
  ): void {
    this._hyperlanes = hyperlanes;
    this._systemPositions = systemPositions;
    this.rebuildGalaxyEmitters();
  }

  setPlanetCounts(counts: Map<string, number>): void {
    this._planetCounts = counts;
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
    // Use hyperlanes and systemPositions when implemented
    void this._hyperlanes;
    void this._systemPositions;
    void this._planetCounts;
    this.clearGalaxyEmitters();
  }

  private updateGalaxyEmitters(
    _viewProj: Mat4,
    _viewport: ViewportRect,
  ): void {}

  private stopGalaxyEmitters(): void {
    // Use scratch vectors when implemented
    void this._scratchA;
    void this._scratchB;
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
