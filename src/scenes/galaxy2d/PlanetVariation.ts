import type { Planet } from "../../data/types.ts";
import { PlanetBiome } from "../../data/types.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";

export interface PlanetVariation {
  baseTint: number;
  ringTint: number;
  ringTiltDeg: number;
  rotationPhase: number;
}

export function isRinged(biome: string): boolean {
  return biome === PlanetBiome.GasGiantSkim;
}

function hashPlanetId(id: string): number {
  // FNV-1a 32-bit hash
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const RING_TINTS = [0xd4a87a, 0xc8b898, 0xe8d0a0, 0xb8a088, 0xd0c8b0];

export function derivePlanetVariation(planet: Planet): PlanetVariation {
  const rng = new SeededRNG(hashPlanetId(planet.id));
  // Light per-planet hue tint: each channel 235–255
  const r = 235 + Math.floor(rng.next() * 21);
  const g = 235 + Math.floor(rng.next() * 21);
  const b = 235 + Math.floor(rng.next() * 21);
  const baseTint = (r << 16) | (g << 8) | b;
  const ringed = isRinged(planet.biome);
  const ringTint = ringed
    ? RING_TINTS[Math.floor(rng.next() * RING_TINTS.length)]!
    : 0xffffff;
  const ringTiltDeg = ringed ? rng.nextFloat(-25, 25) : 0;
  const rotationPhase = rng.nextFloat(0, Math.PI * 2);
  return { baseTint, ringTint, ringTiltDeg, rotationPhase };
}

export function multiplyBrightness(tint: number, factor: number): number {
  const r = Math.min(255, Math.round(((tint >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((tint >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((tint & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}
