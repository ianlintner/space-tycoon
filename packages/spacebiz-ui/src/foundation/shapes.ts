import * as Phaser from "phaser";

/**
 * Compute the 8 vertices of a chamfered (cut-45°) rectangle as a flat
 * [x0,y0, x1,y1, …, x7,y7] array. Chamfer is clamped to half the shorter side.
 */
export function chamferedRectPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
): number[] {
  const cc = Math.max(0, Math.min(c, Math.min(w, h) / 2));
  return [
    x + cc,
    y,
    x + w - cc,
    y,
    x + w,
    y + cc,
    x + w,
    y + h - cc,
    x + w - cc,
    y + h,
    x + cc,
    y + h,
    x,
    y + h - cc,
    x,
    y + cc,
  ];
}

interface ChamferableGraphics {
  beginPath(): unknown;
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  closePath(): unknown;
  fillPath?(): unknown;
  strokePath?(): unknown;
}

function tracePath(
  g: ChamferableGraphics,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
): void {
  const pts = chamferedRectPoints(x, y, w, h, c);
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) {
    g.lineTo(pts[i], pts[i + 1]);
  }
  g.closePath();
}

export function fillChamferedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
): void {
  tracePath(g as unknown as ChamferableGraphics, x, y, w, h, c);
  (g as unknown as ChamferableGraphics).fillPath?.();
}

export function strokeChamferedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
): void {
  tracePath(g as unknown as ChamferableGraphics, x, y, w, h, c);
  (g as unknown as ChamferableGraphics).strokePath?.();
}

export function traceChamferedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
): void {
  const pts = chamferedRectPoints(x, y, w, h, c);
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) {
    ctx.lineTo(pts[i], pts[i + 1]);
  }
  ctx.closePath();
}

export function makeChamferedMaskShape(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
  color = 0xffffff,
): Phaser.GameObjects.Polygon {
  const points = chamferedRectPoints(0, 0, w, h, c);
  return scene.add.polygon(x, y, points, color).setOrigin(0, 0);
}
