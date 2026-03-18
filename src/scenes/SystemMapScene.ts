import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import type { PlanetType } from "../data/types.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Label } from "../ui/Label.ts";
import { Button } from "../ui/Button.ts";

const HUD_TOP = 60;

const PLANET_TYPE_COLORS: Record<PlanetType, number> = {
  terran: 0x4488ff,
  industrial: 0xaa8844,
  mining: 0x888888,
  agricultural: 0x44aa44,
  hubStation: 0xffaa00,
  resort: 0xff44ff,
  research: 0x44ffff,
};

export class SystemMapScene extends Phaser.Scene {
  private systemId = "";

  constructor() {
    super({ key: "SystemMapScene" });
  }

  init(data: { systemId: string }): void {
    this.systemId = data.systemId;
  }

  create(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const system = state.galaxy.systems.find((s) => s.id === this.systemId);
    if (!system) return;

    const planets = state.galaxy.planets.filter(
      (p) => p.systemId === this.systemId,
    );
    const routes = state.activeRoutes;

    // Center of the view
    const cx = 640;
    const cy = 360 + HUD_TOP / 2;

    // Title
    new Label(this, {
      x: 20,
      y: HUD_TOP + 10,
      text: `System: ${system.name}`,
      style: "heading",
      color: theme.colors.accent,
    });

    // Back button
    new Button(this, {
      x: 20,
      y: HUD_TOP + 50,
      width: 160,
      label: "Back to Galaxy",
      onClick: () => {
        this.scene.start("GalaxyMapScene");
      },
    });

    // Central star
    this.add.circle(cx, cy, 30, system.starColor);

    // Build planet positions in a circular layout
    const orbitRadius = 180;
    const planetPositions = new Map<string, { x: number; y: number }>();

    planets.forEach((planet, index) => {
      const angle =
        (index / Math.max(planets.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * orbitRadius;
      const py = cy + Math.sin(angle) * orbitRadius;
      planetPositions.set(planet.id, { x: px, y: py });
    });

    // Draw intra-system route lines
    const routeGraphics = this.add.graphics();
    routeGraphics.lineStyle(1, theme.colors.accent, 0.35);
    for (const route of routes) {
      const originPos = planetPositions.get(route.originPlanetId);
      const destPos = planetPositions.get(route.destinationPlanetId);
      if (!originPos || !destPos) continue;

      routeGraphics.beginPath();
      routeGraphics.moveTo(originPos.x, originPos.y);
      routeGraphics.lineTo(destPos.x, destPos.y);
      routeGraphics.strokePath();
    }

    // Draw orbit ring (decorative)
    const orbitGraphics = this.add.graphics();
    orbitGraphics.lineStyle(1, theme.colors.panelBorder, 0.3);
    orbitGraphics.strokeCircle(cx, cy, orbitRadius);

    // Draw planets
    for (const planet of planets) {
      const pos = planetPositions.get(planet.id);
      if (!pos) continue;

      const planetColor = PLANET_TYPE_COLORS[planet.type] ?? 0xcccccc;
      const planetCircle = this.add.circle(pos.x, pos.y, 16, planetColor);
      planetCircle.setInteractive({ useHandCursor: true });

      // Planet name
      this.add
        .text(pos.x, pos.y + 22, planet.name, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.text),
        })
        .setOrigin(0.5, 0);

      // Planet type label
      this.add
        .text(pos.x, pos.y + 36, planet.type, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        })
        .setOrigin(0.5, 0);

      // Click to see planet detail
      planetCircle.on("pointerup", () => {
        this.scene.launch("PlanetDetailScene", { planetId: planet.id });
        this.scene.pause();
      });

      // Hover effect
      planetCircle.on("pointerover", () => {
        planetCircle.setRadius(20);
      });
      planetCircle.on("pointerout", () => {
        planetCircle.setRadius(16);
      });
    }
  }
}
