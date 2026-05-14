import type { Polygon } from "../data/types.ts";
import type { SeededRNG } from "../utils/SeededRNG.ts";

export interface SpiralPlacement {
  systemPositions: Array<{ x: number; y: number }>;
  empireAssignments: number[];
  empireCentroids: Array<{ x: number; y: number }>;
  empireTerritories: Polygon[];
}

export function placeSpiralGalaxy(opts: {
  rng: SeededRNG;
  systemCount: number;
  empireCount: number;
  arms?: number;
  armSweep?: number;
  radius?: number;
}): SpiralPlacement {
  const { rng, systemCount, empireCount } = opts;
  const arms = opts.arms ?? 2;
  const armSweep = opts.armSweep ?? 1.8 * Math.PI;
  const radius = opts.radius ?? 1000;

  // 1) Candidate generation along arms — wide swept belts, not thin lines.
  const candidateMultiplier = 2.0;
  const candidates: Array<{ x: number; y: number }> = [];
  const numCandidates = Math.ceil(systemCount * candidateMultiplier);
  for (let i = 0; i < numCandidates; i++) {
    const arm = i % arms;
    const tBase = rng.nextFloat(0, 1);
    const t = Math.pow(tBase, 0.7);
    const armOffset = (2 * Math.PI * arm) / arms;
    const angle = armOffset + t * armSweep;
    const r = radius * (0.05 + 0.95 * t);
    const curl = 0.4;
    const cx = r * Math.cos(angle + curl * Math.log(1 + (r / radius) * 5));
    const cy = r * Math.sin(angle + curl * Math.log(1 + (r / radius) * 5));
    // Perpendicular jitter — wider belt so arms fan out naturally.
    const beltHalf = radius * (0.26 + 0.18 * t);
    const radialN = rng.nextFloat(0, 1) + rng.nextFloat(0, 1) - 1;
    const radialMag = beltHalf * radialN;
    const jx = -Math.sin(angle) * radialMag;
    const jy = Math.cos(angle) * radialMag;
    const tangentMag = radius * 0.1 * (rng.nextFloat(0, 1) * 2 - 1);
    const tx = Math.cos(angle) * tangentMag;
    const ty = Math.sin(angle) * tangentMag;
    candidates.push({ x: cx + jx + tx, y: cy + jy + ty });
  }

  // 2) Poisson-disk cull. Min distance is large enough that adjacent stars'
  // planet orbits (up to ~4 world units = ~18 game units) don't overlap, with
  // clear empty space between systems for the zoom-in transition to read.
  const minDist = radius * 0.035;
  const minDist2 = minDist * minDist;
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const kept: Array<{ x: number; y: number }> = [];
  for (const c of candidates) {
    if (kept.length >= systemCount) break;
    let ok = true;
    for (const k of kept) {
      const dx = k.x - c.x;
      const dy = k.y - c.y;
      if (dx * dx + dy * dy < minDist2) {
        ok = false;
        break;
      }
    }
    if (ok) kept.push(c);
  }
  while (kept.length < systemCount) {
    const t = rng.nextFloat(0, 1);
    const arm = rng.nextInt(0, arms - 1);
    const angle = (2 * Math.PI * arm) / arms + t * armSweep;
    const r = radius * (0.1 + 0.9 * t);
    kept.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }

  // 3) k-means clustering with k = empireCount
  const centroids: Array<{ x: number; y: number }> = [];
  const stride = Math.max(1, Math.floor(kept.length / empireCount));
  for (let i = 0; i < empireCount; i++)
    centroids.push({ ...kept[(i * stride) % kept.length] });

  const assignments = new Array(kept.length).fill(0);
  for (let iter = 0; iter < 24; iter++) {
    let changed = false;
    for (let i = 0; i < kept.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const dx = kept[i].x - centroids[c].x;
        const dy = kept[i].y - centroids[c].y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed = true;
      }
    }
    const sums = centroids.map(() => ({ x: 0, y: 0, n: 0 }));
    for (let i = 0; i < kept.length; i++) {
      const a = assignments[i];
      sums[a].x += kept[i].x;
      sums[a].y += kept[i].y;
      sums[a].n += 1;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c].n > 0) {
        centroids[c] = { x: sums[c].x / sums[c].n, y: sums[c].y / sums[c].n };
      }
    }
    if (!changed) break;
  }

  rebalanceEmptyEmpires(kept, assignments, centroids);

  // 4) Convex hull territories — each empire gets the convex hull of its member
  // stars, expanded outward and Chaikin-smoothed into an organic blob shape.
  // This directly follows the actual star distribution rather than Voronoi
  // geometry, so territories look like natural clusters instead of hexagons.
  const pad = radius * 0.08; // outward expansion so stars sit inside the blob
  const territories: Polygon[] = centroids.map((_, i) => {
    const members = kept.filter((__, k) => assignments[k] === i);
    return buildEmpireBlob(members, pad);
  });

  return {
    systemPositions: kept,
    empireAssignments: assignments,
    empireCentroids: centroids,
    empireTerritories: territories,
  };
}

// ---------------------------------------------------------------------------
// Empire blob construction
// ---------------------------------------------------------------------------

function buildEmpireBlob(
  members: Array<{ x: number; y: number }>,
  pad: number,
): Polygon {
  // Centroid of actual member stars (not k-means centroid).
  let cx = 0;
  let cy = 0;
  for (const m of members) {
    cx += m.x;
    cy += m.y;
  }
  cx /= Math.max(1, members.length);
  cy /= Math.max(1, members.length);

  if (members.length < 3) {
    // Fallback: small circle for tiny empires.
    return circlePolygon(cx, cy, pad * 1.5, 16);
  }

  const hull = convexHull(members);
  if (hull.length < 3) {
    return circlePolygon(cx, cy, pad * 1.5, 16);
  }

  // Expand each hull vertex outward from the star centroid so all member
  // stars land clearly inside the blob, not on the boundary.
  const expanded = hull.map((v) => {
    const dx = v.x - cx;
    const dy = v.y - cy;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) return { x: v.x + pad, y: v.y };
    return { x: cx + (dx / d) * (d + pad), y: cy + (dy / d) * (d + pad) };
  });

  // Chaikin corner-cutting — 3 passes gives smooth organic curves.
  const smoothed = chaikin(expanded, 3);

  return { vertices: smoothed };
}

function circlePolygon(
  cx: number,
  cy: number,
  r: number,
  segments: number,
): Polygon {
  const verts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    verts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return { vertices: verts };
}

// ---------------------------------------------------------------------------
// Convex hull — Andrew's monotone chain
// ---------------------------------------------------------------------------

function convexHull(
  pts: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
  const sorted = [...pts].sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y));

  const cross = (
    o: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Array<{ x: number; y: number }> = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0
    )
      lower.pop();
    lower.push(p);
  }

  const upper: Array<{ x: number; y: number }> = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]!;
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0
    )
      upper.pop();
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

// ---------------------------------------------------------------------------
// Chaikin corner-cutting — each pass replaces every edge with two new
// vertices at the 1/4 and 3/4 positions, progressively rounding corners.
// ---------------------------------------------------------------------------

function chaikin(
  poly: Array<{ x: number; y: number }>,
  iterations: number,
): Array<{ x: number; y: number }> {
  let p = poly;
  for (let iter = 0; iter < iterations; iter++) {
    const next: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i]!;
      const b = p[(i + 1) % p.length]!;
      next.push(
        { x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y },
        { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y },
      );
    }
    p = next;
  }
  return p;
}

// ---------------------------------------------------------------------------
// k-means helper
// ---------------------------------------------------------------------------

function rebalanceEmptyEmpires(
  points: Array<{ x: number; y: number }>,
  assignments: number[],
  centroids: Array<{ x: number; y: number }>,
): void {
  for (let c = 0; c < centroids.length; c++) {
    if (!assignments.includes(c)) {
      let stealIdx = 0;
      let stealD = -1;
      for (let i = 0; i < points.length; i++) {
        const a = assignments[i];
        const dx = points[i].x - centroids[a].x;
        const dy = points[i].y - centroids[a].y;
        const d = dx * dx + dy * dy;
        if (d > stealD) {
          stealD = d;
          stealIdx = i;
        }
      }
      assignments[stealIdx] = c;
      centroids[c] = { ...points[stealIdx] };
    }
  }
}
