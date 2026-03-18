import type Phaser from "phaser";
import { SeededRNG } from "../utils/SeededRNG.ts";
import { getTheme, lerpColor } from "./Theme.ts";

export type PortraitType =
  | "planet_terran"
  | "planet_mining"
  | "planet_agricultural"
  | "planet_industrial"
  | "planet_hubStation"
  | "planet_resort"
  | "planet_research"
  | "ship"
  | "starSystem"
  | "event";

/** Fill a vertical gradient (top to bottom) using horizontal strips. */
function fillGradient(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  topColor: number,
  bottomColor: number,
  steps: number,
): void {
  const stripH = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = steps > 1 ? i / (steps - 1) : 0;
    g.fillStyle(lerpColor(topColor, bottomColor, t), 1);
    g.fillRect(x, y + stripH * i, w, Math.ceil(stripH));
  }
}

// ---------------------------------------------------------------------------
// Planet portraits
// ---------------------------------------------------------------------------

function drawTerran(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  rng: SeededRNG,
): void {
  // Sky gradient
  fillGradient(g, 0, 0, w, h, 0x000033, 0x3366aa, 16);

  // Clouds
  const cloudCount = rng.nextInt(3, 6);
  for (let i = 0; i < cloudCount; i++) {
    const cx = rng.nextFloat(0, w);
    const cy = rng.nextFloat(h * 0.1, h * 0.45);
    const cw = rng.nextFloat(20, 50);
    const ch = rng.nextFloat(4, 10);
    g.fillStyle(0xffffff, 0.15);
    g.fillRect(cx, cy, cw, ch);
  }

  // Terrain bands (lower 45%)
  const terrainTop = Math.floor(h * 0.55);
  const bandH = Math.floor((h - terrainTop) / 2);
  g.fillStyle(0x226633, 1);
  g.fillRect(0, terrainTop, w, bandH);
  g.fillStyle(0x338844, 1);
  g.fillRect(0, terrainTop + bandH, w, h - terrainTop - bandH);

  // City skyline silhouettes
  const buildingCount = rng.nextInt(8, 14);
  const baseY = h;
  for (let i = 0; i < buildingCount; i++) {
    const bx = rng.nextFloat(0, w - 12);
    const bw = rng.nextFloat(8, 18);
    const bh = rng.nextFloat(20, 70);
    g.fillStyle(0x112233, 1);
    g.fillRect(bx, baseY - bh, bw, bh);
    // Antenna on some buildings
    if (rng.chance(0.3)) {
      const ax = bx + bw / 2;
      const aSize = rng.nextFloat(3, 7);
      g.fillTriangle(
        ax - aSize,
        baseY - bh,
        ax + aSize,
        baseY - bh,
        ax,
        baseY - bh - aSize * 2,
      );
    }
  }
}

function drawMining(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  rng: SeededRNG,
): void {
  // Dark gradient
  fillGradient(g, 0, 0, w, h, 0x0a0505, 0x2a1515, 16);

  // Rocky terrain — jagged triangles in lower 50%
  const terrainTop = Math.floor(h * 0.5);
  g.fillStyle(0x443322, 1);
  g.fillRect(0, terrainTop, w, h - terrainTop);
  g.fillStyle(0x332211, 1);
  g.fillRect(0, Math.floor(h * 0.7), w, h - Math.floor(h * 0.7));

  const jagged = rng.nextInt(6, 10);
  for (let i = 0; i < jagged; i++) {
    const tx = rng.nextFloat(0, w);
    const tw = rng.nextFloat(15, 40);
    const th = rng.nextFloat(15, 40);
    g.fillStyle(0x332211, 1);
    g.fillTriangle(
      tx,
      h - th * 0.2,
      tx + tw,
      h - th * 0.2,
      tx + tw / 2,
      h - th,
    );
  }

  // Mining rigs
  const rigCount = rng.nextInt(3, 6);
  for (let i = 0; i < rigCount; i++) {
    const rx = rng.nextFloat(10, w - 20);
    const rw = rng.nextFloat(6, 12);
    const rh = rng.nextFloat(30, 60);
    g.fillStyle(0x221111, 1);
    g.fillRect(rx, h - rh, rw, rh);
    // Small triangle top
    g.fillTriangle(
      rx - 2,
      h - rh,
      rx + rw + 2,
      h - rh,
      rx + rw / 2,
      h - rh - 8,
    );
  }

  // Ore vein lines
  const veinCount = rng.nextInt(3, 7);
  g.lineStyle(1, 0xff6622, 0.6);
  for (let i = 0; i < veinCount; i++) {
    const vx1 = rng.nextFloat(0, w);
    const vy1 = rng.nextFloat(terrainTop, h);
    const vx2 = vx1 + rng.nextFloat(-30, 30);
    const vy2 = vy1 + rng.nextFloat(5, 20);
    g.lineBetween(vx1, vy1, vx2, vy2);
  }
}

function drawAgricultural(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  rng: SeededRNG,
): void {
  // Warm dawn gradient
  fillGradient(g, 0, 0, w, h, 0x1a1a00, 0x664422, 16);

  // Sun
  const sunX = rng.nextFloat(w * 0.2, w * 0.8);
  const sunY = rng.nextFloat(h * 0.15, h * 0.3);
  g.fillStyle(0xffcc44, 0.8);
  g.fillCircle(sunX, sunY, 14);

  // Rolling field bands (lower 50%)
  const fieldTop = Math.floor(h * 0.5);
  const colors = [0x336622, 0x448833, 0x557744];
  const bandH = Math.floor((h - fieldTop) / colors.length);
  for (let i = 0; i < colors.length; i++) {
    g.fillStyle(colors[i], 1);
    g.fillRect(0, fieldTop + bandH * i, w, bandH + 1);
  }

  // Silo / barn silhouettes
  const buildCount = rng.nextInt(3, 6);
  for (let i = 0; i < buildCount; i++) {
    const bx = rng.nextFloat(10, w - 25);
    const bw = rng.nextFloat(12, 22);
    const bh = rng.nextFloat(18, 40);
    g.fillStyle(0x221100, 1);
    g.fillRect(bx, h - bh, bw, bh);
    // Triangle roof
    g.fillTriangle(
      bx - 3,
      h - bh,
      bx + bw + 3,
      h - bh,
      bx + bw / 2,
      h - bh - 10,
    );
  }
}

function drawIndustrial(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  rng: SeededRNG,
): void {
  // Smoky gradient
  fillGradient(g, 0, 0, w, h, 0x0a0a10, 0x2a2a3a, 16);

  // Factory silhouettes
  const factoryCount = rng.nextInt(4, 8);
  for (let i = 0; i < factoryCount; i++) {
    const fx = rng.nextFloat(5, w - 30);
    const fw = rng.nextFloat(20, 40);
    const fh = rng.nextFloat(25, 55);
    g.fillStyle(0x1a1a22, 1);
    g.fillRect(fx, h - fh, fw, fh);

    // Smokestacks
    const stackCount = rng.nextInt(1, 3);
    for (let s = 0; s < stackCount; s++) {
      const sx = fx + rng.nextFloat(2, fw - 4);
      const sw = rng.nextFloat(3, 6);
      const sh = rng.nextFloat(15, 30);
      g.fillStyle(0x1a1a22, 1);
      g.fillRect(sx, h - fh - sh, sw, sh);

      // Smoke wisps above stacks
      const smokeCount = rng.nextInt(2, 4);
      for (let k = 0; k < smokeCount; k++) {
        const smx = sx + rng.nextFloat(-5, 5);
        const smy = h - fh - sh - rng.nextFloat(5, 25);
        g.fillStyle(0x666688, 0.3);
        g.fillRect(smx, smy, rng.nextFloat(4, 12), rng.nextFloat(3, 6));
      }
    }
  }
}

function drawHubStation(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  rng: SeededRNG,
): void {
  // Space gradient
  fillGradient(g, 0, 0, w, h, 0x000005, 0x0a0a2a, 16);

  const cx = w / 2;
  const cy = h / 2;

  // Station ring structure — concentric arcs
  const ringCount = rng.nextInt(2, 4);
  for (let i = 0; i < ringCount; i++) {
    const radius = 20 + i * 18 + rng.nextFloat(-3, 3);
    g.lineStyle(2, 0x334455, 0.8);
    g.strokeCircle(cx, cy, radius);
  }

  // Station core
  g.fillStyle(0x334455, 1);
  g.fillCircle(cx, cy, 8);

  // Docking lights
  const lightCount = rng.nextInt(6, 12);
  for (let i = 0; i < lightCount; i++) {
    const angle = rng.nextFloat(0, Math.PI * 2);
    const dist = rng.nextFloat(15, 55);
    const lx = cx + Math.cos(angle) * dist;
    const ly = cy + Math.sin(angle) * dist;
    g.fillStyle(0x00ffcc, 0.7);
    g.fillCircle(lx, ly, 1.5);
  }
}

function drawResort(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  rng: SeededRNG,
): void {
  // Bright gradient (turquoise to pink)
  fillGradient(g, 0, 0, w, h, 0x002233, 0x883366, 16);

  // Golden sun
  const sunX = rng.nextFloat(w * 0.3, w * 0.7);
  g.fillStyle(0xffcc44, 0.8);
  g.fillCircle(sunX, h * 0.2, 16);

  // Water bands (lower 40%)
  const waterTop = Math.floor(h * 0.6);
  const waterH = Math.floor((h - waterTop) / 2);
  g.fillStyle(0x006688, 1);
  g.fillRect(0, waterTop, w, waterH);
  g.fillStyle(0x007799, 1);
  g.fillRect(0, waterTop + waterH, w, h - waterTop - waterH);

  // Dome silhouettes
  const domeCount = rng.nextInt(3, 6);
  for (let i = 0; i < domeCount; i++) {
    const dx = rng.nextFloat(10, w - 20);
    const dr = rng.nextFloat(10, 22);
    g.fillStyle(0x442244, 1);
    g.fillRect(dx - dr, h * 0.6 - dr * 0.3, dr * 2, dr * 0.6);
    // Dome top arc (half-circle approximation via triangle)
    g.fillTriangle(
      dx - dr,
      h * 0.6 - dr * 0.3,
      dx + dr,
      h * 0.6 - dr * 0.3,
      dx,
      h * 0.6 - dr * 1.1,
    );
  }
}

function drawResearch(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  rng: SeededRNG,
): void {
  // Deep purple gradient
  fillGradient(g, 0, 0, w, h, 0x0a0015, 0x1a0a2a, 16);

  // Telescope dish silhouettes
  const dishCount = rng.nextInt(2, 4);
  for (let i = 0; i < dishCount; i++) {
    const dx = rng.nextFloat(20, w - 30);
    const dy = h - rng.nextFloat(20, 50);
    const dr = rng.nextFloat(12, 22);

    // Support rod
    g.fillStyle(0x221133, 1);
    g.fillRect(dx - 1, dy, 3, h - dy);

    // Dish (partial circle via triangle)
    g.fillTriangle(dx - dr, dy, dx + dr, dy, dx, dy - dr * 0.8);
  }

  // Data stream lines (thin vertical neon lines)
  const streamCount = rng.nextInt(5, 12);
  g.lineStyle(1, 0x44ffff, 0.4);
  for (let i = 0; i < streamCount; i++) {
    const sx = rng.nextFloat(0, w);
    const sy1 = rng.nextFloat(0, h * 0.4);
    const sy2 = sy1 + rng.nextFloat(10, 40);
    g.lineBetween(sx, sy1, sx, sy2);
  }
}

// ---------------------------------------------------------------------------
// Ship portrait
// ---------------------------------------------------------------------------

function drawShip(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  rng: SeededRNG,
  data?: Record<string, unknown>,
): void {
  // Space background
  fillGradient(g, 0, 0, w, h, 0x000000, 0x050510, 8);

  const theme = getTheme();
  const cx = w / 2;
  const cy = h / 2;
  const shipColor = 0x445566;
  const shipClass = (data?.shipClass as string) ?? "cargoShuttle";

  // Ship body varies by class
  switch (shipClass) {
    case "cargoShuttle": {
      // Small boxy shape
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 15, cy - 8, 30, 16);
      g.fillTriangle(cx + 15, cy - 6, cx + 15, cy + 6, cx + 24, cy);
      break;
    }
    case "passengerShuttle": {
      // Sleek elongated
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 22, cy - 5, 44, 10);
      g.fillTriangle(cx + 22, cy - 4, cx + 22, cy + 4, cx + 32, cy);
      break;
    }
    case "mixedHauler": {
      // Medium boxy
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 18, cy - 10, 36, 20);
      g.fillTriangle(cx + 18, cy - 8, cx + 18, cy + 8, cx + 28, cy);
      break;
    }
    case "fastCourier": {
      // Narrow body + wide triangle tail
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 10, cy - 4, 28, 8);
      g.fillTriangle(cx + 18, cy - 3, cx + 18, cy + 3, cx + 28, cy);
      // Wide tail
      g.fillTriangle(cx - 10, cy - 14, cx - 10, cy + 14, cx - 22, cy);
      break;
    }
    case "bulkFreighter": {
      // Large rectangular body
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 25, cy - 12, 50, 24);
      g.fillTriangle(cx + 25, cy - 10, cx + 25, cy + 10, cx + 34, cy);
      break;
    }
    case "starLiner": {
      // Elegant long body with fins
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 28, cy - 6, 56, 12);
      g.fillTriangle(cx + 28, cy - 5, cx + 28, cy + 5, cx + 38, cy);
      // Fins
      g.fillTriangle(cx - 20, cy - 6, cx - 10, cy - 6, cx - 15, cy - 16);
      g.fillTriangle(cx - 20, cy + 6, cx - 10, cy + 6, cx - 15, cy + 16);
      break;
    }
    case "megaHauler": {
      // Massive rectangular body
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 30, cy - 15, 60, 30);
      g.fillTriangle(cx + 30, cy - 12, cx + 30, cy + 12, cx + 40, cy);
      break;
    }
    case "luxuryLiner": {
      // Long sleek body with decorative lines
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 32, cy - 7, 64, 14);
      g.fillTriangle(cx + 32, cy - 5, cx + 32, cy + 5, cx + 42, cy);
      // Decorative accent lines
      g.lineStyle(1, theme.colors.accent, 0.5);
      g.lineBetween(cx - 30, cy - 3, cx + 30, cy - 3);
      g.lineBetween(cx - 30, cy + 3, cx + 30, cy + 3);
      break;
    }
    default: {
      // Fallback: basic shape
      g.fillStyle(shipColor, 1);
      g.fillRect(cx - 15, cy - 8, 30, 16);
      g.fillTriangle(cx + 15, cy - 6, cx + 15, cy + 6, cx + 24, cy);
      break;
    }
  }

  // Engine glow at the back
  const engineX = cx - 30 + rng.nextFloat(-2, 2);
  g.fillStyle(theme.colors.accent, 0.7);
  g.fillCircle(engineX, cy, 4);
  g.lineStyle(1, theme.colors.accent, 0.2);
  g.strokeCircle(engineX, cy, 8);
}

// ---------------------------------------------------------------------------
// Star system portrait
// ---------------------------------------------------------------------------

function drawStarSystem(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  rng: SeededRNG,
  data?: Record<string, unknown>,
): void {
  const theme = getTheme();

  // Pure black background
  g.fillStyle(0x000000, 1);
  g.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const starColor =
    typeof data?.starColor === "number" ? data.starColor : theme.colors.accent;
  const starRadius = Math.floor(w / 5);

  // Central star
  g.fillStyle(starColor, 1);
  g.fillCircle(cx, cy, starRadius);

  // Glow ring
  g.lineStyle(2, starColor, 0.25);
  g.strokeCircle(cx, cy, starRadius + 4);

  // Orbiting planets
  const planetCount = rng.nextInt(3, 5);
  for (let i = 0; i < planetCount; i++) {
    const orbitR = starRadius + 14 + i * 14;
    // Orbit line
    g.lineStyle(1, 0xffffff, 0.1);
    g.strokeCircle(cx, cy, orbitR);
    // Planet dot
    const angle = rng.nextFloat(0, Math.PI * 2);
    const px = cx + Math.cos(angle) * orbitR;
    const py = cy + Math.sin(angle) * orbitR;
    g.fillStyle(lerpColor(0x4488cc, 0xccaa44, rng.next()), 1);
    g.fillCircle(px, py, 2.5);
  }
}

// ---------------------------------------------------------------------------
// Event portrait
// ---------------------------------------------------------------------------

function drawEvent(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  rng: SeededRNG,
  data?: Record<string, unknown>,
): void {
  const category = (data?.category as string) ?? "flavor";
  const cx = w / 2;
  const cy = h / 2;

  switch (category) {
    case "market": {
      fillGradient(g, 0, 0, w, h, 0x001a0a, 0x0a2a1a, 12);
      // Chart lines (zigzag)
      g.lineStyle(2, 0x00ff88, 0.7);
      const segments = rng.nextInt(5, 9);
      let px = 10;
      let py = cy + rng.nextFloat(-20, 20);
      for (let i = 0; i < segments; i++) {
        const nx = px + (w - 20) / segments;
        const ny = cy + rng.nextFloat(-30, 30);
        g.lineBetween(px, py, nx, ny);
        px = nx;
        py = ny;
      }
      break;
    }
    case "hazard": {
      fillGradient(g, 0, 0, w, h, 0x1a0505, 0x330a0a, 12);
      // Explosion burst — radiating triangles
      const burstCount = rng.nextInt(8, 14);
      for (let i = 0; i < burstCount; i++) {
        const angle =
          (i / burstCount) * Math.PI * 2 + rng.nextFloat(-0.15, 0.15);
        const innerR = rng.nextFloat(6, 12);
        const outerR = rng.nextFloat(25, 45);
        const spread = rng.nextFloat(0.08, 0.18);
        g.fillStyle(lerpColor(0xff2222, 0xff8800, rng.next()), 0.7);
        g.fillTriangle(
          cx + Math.cos(angle - spread) * innerR,
          cy + Math.sin(angle - spread) * innerR,
          cx + Math.cos(angle + spread) * innerR,
          cy + Math.sin(angle + spread) * innerR,
          cx + Math.cos(angle) * outerR,
          cy + Math.sin(angle) * outerR,
        );
      }
      break;
    }
    case "opportunity": {
      fillGradient(g, 0, 0, w, h, 0x0a1a0a, 0x0a2a0a, 12);
      // Starburst — radiating lines
      const rayCount = rng.nextInt(10, 18);
      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2;
        const len = rng.nextFloat(20, 50);
        g.lineStyle(1, 0x44ff44, 0.6);
        g.lineBetween(
          cx + Math.cos(angle) * 5,
          cy + Math.sin(angle) * 5,
          cx + Math.cos(angle) * len,
          cy + Math.sin(angle) * len,
        );
      }
      break;
    }
    default: {
      // Flavor: decorative swirl
      fillGradient(g, 0, 0, w, h, 0x0a051a, 0x1a0a2a, 12);
      const curveCount = rng.nextInt(4, 8);
      g.lineStyle(1, 0xaa88ff, 0.5);
      for (let i = 0; i < curveCount; i++) {
        const startAngle = rng.nextFloat(0, Math.PI * 2);
        const radius = rng.nextFloat(10, 40);
        const steps = 12;
        let prevX = cx + Math.cos(startAngle) * radius;
        let prevY = cy + Math.sin(startAngle) * radius;
        for (let s = 1; s <= steps; s++) {
          const a = startAngle + (s / steps) * Math.PI;
          const r = radius + s * 2;
          const curX = cx + Math.cos(a) * r;
          const curY = cy + Math.sin(a) * r;
          g.lineBetween(prevX, prevY, curX, curY);
          prevX = curX;
          prevY = curY;
        }
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function drawPortrait(
  graphics: Phaser.GameObjects.Graphics,
  type: PortraitType,
  width: number,
  height: number,
  seed: number,
  data?: Record<string, unknown>,
): void {
  const rng = new SeededRNG(seed);

  switch (type) {
    case "planet_terran":
      drawTerran(graphics, width, height, rng);
      break;
    case "planet_mining":
      drawMining(graphics, width, height, rng);
      break;
    case "planet_agricultural":
      drawAgricultural(graphics, width, height, rng);
      break;
    case "planet_industrial":
      drawIndustrial(graphics, width, height, rng);
      break;
    case "planet_hubStation":
      drawHubStation(graphics, width, height, rng);
      break;
    case "planet_resort":
      drawResort(graphics, width, height, rng);
      break;
    case "planet_research":
      drawResearch(graphics, width, height, rng);
      break;
    case "ship":
      drawShip(graphics, width, height, rng, data);
      break;
    case "starSystem":
      drawStarSystem(graphics, width, height, rng, data);
      break;
    case "event":
      drawEvent(graphics, width, height, rng, data);
      break;
  }
}
