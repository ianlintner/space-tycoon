import * as Phaser from "phaser";
import type { Hyperlane, StarSystem } from "../../data/types.ts";
import { perspectiveScale, projectToScreenDesignInto } from "./projection.ts";
import type { Mat4 } from "./Camera3D.ts";
import type { Vec3, ViewportRect } from "./types.ts";

// Gate markers placed where each hyperlane exits the focused system.
// Clicking a gate calls the registered handler with the connected system id
// so the camera can fast-pan there at the same zoom level.

const GATE_DEPTH = 900;
const GATE_LABEL_DEPTH = 905;
const GATE_HITBOX_DEPTH = 910;

// World units from the star centre — just past the max orbit radius (3.0).
const GATE_RADIUS_WORLD = 4.2;

const GATE_HALF = 10; // half-size of the diamond shape in pixels
const GATE_COLOR = 0x4dd0e1; // cyan — matches open hyperlane color

interface GateEntry {
  connectedSystemId: string;
  worldPos: Vec3;
  gfx: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  hitbox: Phaser.GameObjects.Zone;
}

export class HyperGates2D {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private entries: GateEntry[] = [];

  private hyperlanes: Hyperlane[] = [];
  private systemPositions = new Map<string, Vec3>();
  private systemNames = new Map<string, string>();
  private focusedSystemId: string | null = null;
  private clickHandler: ((systemId: string) => void) | null = null;

  private readonly scratchNdc: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.container = container;
  }

  setData(
    hyperlanes: Hyperlane[],
    systems: StarSystem[],
    systemPositions: Map<string, Vec3>,
  ): void {
    this.hyperlanes = hyperlanes;
    this.systemPositions = systemPositions;
    this.systemNames.clear();
    for (const sys of systems) this.systemNames.set(sys.id, sys.name);
    if (this.focusedSystemId) this.rebuild(this.focusedSystemId);
  }

  setClickHandler(handler: ((systemId: string) => void) | null): void {
    this.clickHandler = handler;
  }

  setFocusedSystem(systemId: string | null): void {
    if (this.focusedSystemId === systemId) return;
    this.focusedSystemId = systemId;
    if (!systemId) {
      this.clearEntries();
    } else {
      this.rebuild(systemId);
    }
  }

  update(
    viewProj: Mat4,
    viewMat: Mat4,
    focalLength: number,
    viewport: ViewportRect,
    inSystemMode: boolean,
  ): void {
    for (const e of this.entries) {
      if (!inSystemMode) {
        e.gfx.setVisible(false);
        e.label.setVisible(false);
        e.hitbox.setVisible(false);
        continue;
      }
      const proj = projectToScreenDesignInto(
        this.scratchNdc,
        e.worldPos,
        viewProj,
        viewport,
      );
      const scale = perspectiveScale(e.worldPos, viewMat, focalLength);
      if (!proj.visible || scale <= 0) {
        e.gfx.setVisible(false);
        e.label.setVisible(false);
        e.hitbox.setVisible(false);
        continue;
      }

      e.gfx.setPosition(proj.x, proj.y);
      e.gfx.setVisible(true);

      e.label.setPosition(proj.x, proj.y - GATE_HALF - 4);
      e.label.setVisible(true);

      e.hitbox.setPosition(proj.x, proj.y);
      e.hitbox.setVisible(true);
    }
  }

  destroy(): void {
    this.clearEntries();
  }

  private clearEntries(): void {
    for (const e of this.entries) {
      e.gfx.destroy();
      e.label.destroy();
      e.hitbox.destroy();
    }
    this.entries = [];
  }

  private rebuild(focusedId: string): void {
    this.clearEntries();
    const focusedPos = this.systemPositions.get(focusedId);
    if (!focusedPos) return;

    for (const hl of this.hyperlanes) {
      const isA = hl.systemA === focusedId;
      const isB = hl.systemB === focusedId;
      if (!isA && !isB) continue;

      const connectedId = isA ? hl.systemB : hl.systemA;
      const connectedPos = this.systemPositions.get(connectedId);
      if (!connectedPos) continue;

      // Direction on the XZ plane only — keeps gate on the orbital disc
      // regardless of how far the connected system is in Y.
      const dx = connectedPos.x - focusedPos.x;
      const dz = connectedPos.z - focusedPos.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len < 0.001) continue;

      const worldPos: Vec3 = {
        x: focusedPos.x + (dx / len) * GATE_RADIUS_WORLD,
        y: focusedPos.y,
        z: focusedPos.z + (dz / len) * GATE_RADIUS_WORLD,
      };

      const name = this.systemNames.get(connectedId) ?? connectedId;

      const gfx = this.scene.add.graphics();
      gfx.setDepth(GATE_DEPTH);
      gfx.setVisible(false);
      this.drawGateShape(gfx);
      this.container.add(gfx);

      const label = this.scene.add.text(0, 0, name, {
        fontSize: "9px",
        fontFamily: "monospace",
        color: "#4dd0e1",
        stroke: "#000000",
        strokeThickness: 2,
      });
      label.setOrigin(0.5, 1);
      label.setAlpha(0.85);
      label.setDepth(GATE_LABEL_DEPTH);
      label.setVisible(false);
      this.container.add(label);

      const hitbox = this.scene.add.zone(0, 0, 40, 40);
      hitbox.setInteractive({ useHandCursor: true });
      hitbox.setDepth(GATE_HITBOX_DEPTH);
      hitbox.setVisible(false);
      const cid = connectedId;
      hitbox.on("pointerup", () => this.clickHandler?.(cid));
      hitbox.on("pointerover", () => {
        gfx.clear();
        this.drawGateShape(gfx, true);
        label.setAlpha(1.0);
      });
      hitbox.on("pointerout", () => {
        gfx.clear();
        this.drawGateShape(gfx, false);
        label.setAlpha(0.85);
      });
      this.container.add(hitbox);

      this.entries.push({
        connectedSystemId: connectedId,
        worldPos,
        gfx,
        label,
        hitbox,
      });
    }
  }

  private drawGateShape(
    gfx: Phaser.GameObjects.Graphics,
    hovered = false,
  ): void {
    const s = GATE_HALF;
    const alpha = hovered ? 1.0 : 0.75;
    const fillAlpha = hovered ? 0.3 : 0.12;
    gfx.lineStyle(1.5, GATE_COLOR, alpha);
    gfx.fillStyle(GATE_COLOR, fillAlpha);
    // Diamond outline
    gfx.beginPath();
    gfx.moveTo(0, -s);
    gfx.lineTo(s, 0);
    gfx.lineTo(0, s);
    gfx.lineTo(-s, 0);
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();
    // Inner circle for portal feel
    gfx.lineStyle(0.8, GATE_COLOR, alpha * 0.5);
    gfx.strokeCircle(0, 0, s * 0.5);
  }
}
