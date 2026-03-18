import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Label } from "../ui/Label.ts";

const HUD_TOP = 60;

export class GalaxyMapScene extends Phaser.Scene {
  constructor() {
    super({ key: "GalaxyMapScene" });
  }

  create(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const { sectors, systems, planets } = state.galaxy;
    const routes = state.activeRoutes;

    // Title
    new Label(this, {
      x: 20,
      y: HUD_TOP + 10,
      text: "Galaxy Map",
      style: "heading",
      color: theme.colors.accent,
    });

    // Draw sectors as semi-transparent ellipses
    for (const sector of sectors) {
      this.add
        .ellipse(sector.x, sector.y + HUD_TOP, 200, 160, sector.color, 0.12)
        .setOrigin(0.5, 0.5);

      this.add
        .text(sector.x, sector.y + HUD_TOP - 70, sector.name, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        })
        .setOrigin(0.5);
    }

    // Build a lookup: planetId -> systemId
    const planetSystemMap = new Map<string, string>();
    for (const planet of planets) {
      planetSystemMap.set(planet.id, planet.systemId);
    }

    // Build a lookup: systemId -> system
    const systemMap = new Map<string, { x: number; y: number }>();
    for (const sys of systems) {
      systemMap.set(sys.id, { x: sys.x, y: sys.y });
    }

    // Draw active route lines between systems
    const routeGraphics = this.add.graphics();
    routeGraphics.lineStyle(1, theme.colors.accent, 0.4);
    for (const route of routes) {
      const originSysId = planetSystemMap.get(route.originPlanetId);
      const destSysId = planetSystemMap.get(route.destinationPlanetId);
      if (!originSysId || !destSysId) continue;
      const originSys = systemMap.get(originSysId);
      const destSys = systemMap.get(destSysId);
      if (!originSys || !destSys) continue;

      routeGraphics.beginPath();
      routeGraphics.moveTo(originSys.x, originSys.y + HUD_TOP);
      routeGraphics.lineTo(destSys.x, destSys.y + HUD_TOP);
      routeGraphics.strokePath();
    }

    // Draw each star system
    for (const system of systems) {
      const sysX = system.x;
      const sysY = system.y + HUD_TOP;

      // Star dot
      const star = this.add.circle(sysX, sysY, 6, system.starColor);
      star.setInteractive({ useHandCursor: true });

      // Name label
      this.add
        .text(sysX, sysY + 12, system.name, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.text),
        })
        .setOrigin(0.5, 0);

      // Click to drill into system
      star.on("pointerup", () => {
        this.scene.start("SystemMapScene", { systemId: system.id });
      });

      // Hover effect
      star.on("pointerover", () => {
        star.setRadius(9);
      });
      star.on("pointerout", () => {
        star.setRadius(6);
      });
    }
  }
}
