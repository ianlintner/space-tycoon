import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Label } from "../ui/Label.ts";
import { createStarfield } from "../ui/Starfield.ts";
import { addPulseTween } from "../ui/AmbientFX.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";

import type { GameHUDScene } from "./GameHUDScene.ts";

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

    // Starfield background
    createStarfield(this);

    // Subtle title (caption style, top-left)
    new Label(this, {
      x: 20,
      y: HUD_TOP + 10,
      text: "Galaxy Map",
      style: "caption",
      color: theme.colors.textDim,
    });

    // Draw sectors as semi-transparent ellipses with gradient edge effect
    for (const sector of sectors) {
      // Outer nebula ellipse — gently breathes for a cosmic atmosphere
      const outerEllipse = this.add
        .ellipse(sector.x, sector.y + HUD_TOP, 230, 185, sector.color, 0.06)
        .setOrigin(0.5, 0.5);
      addPulseTween(this, outerEllipse, {
        minAlpha: 0.03,
        maxAlpha: 0.1,
        duration: 4000 + Math.random() * 2000,
        delay: Math.random() * 3000,
      });

      // Inner sector ellipse
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

    // Draw active route lines between systems with breathing animation + flow pips
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

      // Glow pip — tiny dot that glides along the route continuously
      const pip = this.add.circle(
        originSys.x,
        originSys.y + HUD_TOP,
        2,
        theme.colors.accent,
        0.7,
      );
      this.tweens.add({
        targets: pip,
        x: destSys.x,
        y: destSys.y + HUD_TOP,
        duration: theme.ambient.routeFlowDuration,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Math.random() * theme.ambient.routeFlowDuration,
      });
    }

    // Enhanced route breathing using theme ambient values
    this.tweens.add({
      targets: routeGraphics,
      alpha: {
        from: theme.ambient.routePulseAlphaMin,
        to: theme.ambient.routePulseAlphaMax,
      },
      duration: theme.ambient.routePulseDuration,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Draw each star system
    for (const system of systems) {
      const sysX = system.x;
      const sysY = system.y + HUD_TOP;
      const mainRadius = 6;

      // Glow halo behind the star dot — pulses with a faint heartbeat
      const halo = this.add
        .circle(sysX, sysY, mainRadius * 2.5, system.starColor)
        .setAlpha(0.18);
      addPulseTween(this, halo, {
        minAlpha: 0.08,
        maxAlpha: 0.3,
        duration: 2500 + Math.random() * 2000,
        delay: Math.random() * 2000,
      });

      // Star dot
      const star = this.add.circle(sysX, sysY, mainRadius, system.starColor);
      star.setInteractive({ useHandCursor: true });

      // Name label
      this.add
        .text(sysX, sysY + 12, system.name, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.text),
        })
        .setOrigin(0.5, 0);

      // Click to drill into system — route through HUD
      star.on("pointerup", () => {
        getAudioDirector().sfx("map_star_select");
        const hud = this.scene.get("GameHUDScene") as GameHUDScene;
        hud.switchContentScene("SystemMapScene", { systemId: system.id });
      });

      // Hover effect
      star.on("pointerover", () => {
        star.setRadius(9);
      });
      star.on("pointerout", () => {
        star.setRadius(mainRadius);
      });
    }
  }
}
