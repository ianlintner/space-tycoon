# Planet Visuals Design

**Date:** 2026-05-15
**Status:** Approved

## Overview

Upgrade planet rendering in the focused-system view from plain radial-gradient discs to authored pixel-art sprites with per-planet procedural variation, tilt-cycled rotation suggestion, and depth-split rings for gas giants.

Planets display at 8–60px on screen (perspective-scaled). All authoring is optimised for legibility in the 30–50px range.

## Goals

- Replace the single shared gradient texture per planet type with a distinctive authored 64×64 PNG per `PlanetBiome` (21 total).
- Add per-planet variety (hue tint, ring tilt/colour) derived deterministically from `planet.id` — no data model changes.
- Add a subtle day/night rotation suggestion via a per-planet cosine tint pulse.
- Add depth-split ring sprites for the `GasGiantSkim` biome only (back arc behind planet, front arc in front).

## Non-Goals

- No new fields on `Planet` or changes to save files.
- No sprite-sheet animation (ruled out in favour of procedural tint-cycle).
- No rings for planet types other than `GasGiantSkim`.

## Asset Pipeline (one-time author step)

### Planet base sprites

Generate 21 PNGs at 64×64 with transparent backgrounds using `~/Projects/ai-pixel-art-image-generation/scripts/generate_sprite.py`.

Output path: `public/planets/<biome>.png`

| Biome key         | Visual prompt guidance                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| `breadbasket`     | Lush green with white cloud wisps, warm equatorial band                |
| `subsistence`     | Patchy brown and pale green, dry scrubland                             |
| `aquaculture`     | Deep ocean blue, small grey island clusters                            |
| `coreExtraction`  | Cratered orange-grey, ochre dust, no atmosphere                        |
| `gasGiantSkim`    | Banded gas giant, amber/cream horizontal stripes, storm spot           |
| `asteroidBelt`    | Irregular rocky grey surface, sharp shadows                            |
| `researchCluster` | Night-side glow, city-light grid on dark surface                       |
| `dataHaven`       | Cool blue-grey, geometric light lattice                                |
| `forgeAcademy`    | Industrial purple-brown, magma veins                                   |
| `heavyIndustry`   | Smog-brown, haze-obscured surface                                      |
| `precisionFab`    | Steel grey, specular highlights, orbital-structure silhouette          |
| `shipyards`       | Teal-grey, visible orbital scaffolding ring (painted on surface)       |
| `resort`          | Azure ocean, white-sand equatorial belt                                |
| `artisanGuild`    | Rich amber/scarlet, ornate patterned surface                           |
| `spiceJungle`     | Dense yellow-green canopy, exotic haze                                 |
| `capital`         | Earth-like: blue ocean + continental greens, visible night-side lights |
| `metropolitan`    | Blue-grey, dense continent outlines, city-light bleed                  |
| `adminHub`        | Clean banded blue-white, minimalist                                    |
| `colony`          | Rugged tan, sparse settlement footprints                               |
| `outpost`         | Dusty pale grey, crater-pocked                                         |
| `refuge`          | Icy white-blue, polar coverage                                         |

### Ring overlay sheet

One 128×64 PNG: `public/planets/ring.png`

Layout:

- **Bottom half (y: 32–63):** back-of-ring arc — the lower/rear ellipse half
- **Top half (y: 0–31):** front-of-ring arc — the upper/front ellipse half

The arc should be semi-transparent with a dusty amber/grey gradient and a subtle inner dark gap (Cassini division hint). Transparent outside the ellipse.

This layout lets `setCrop()` split the single PNG into the two depth layers at runtime without needing separate files or a texture atlas.

### Committing generated assets

Follow the existing icon-pipeline convention: generated PNGs are committed to `public/planets/` as a one-time author step. Do not regenerate on CI.

## Data Model

**No changes to `Planet` or `PlanetBiome`.** Ring eligibility is determined entirely by `biome === PlanetBiome.GasGiantSkim`.

## Runtime Architecture

### `PlanetVariation` (new internal type in `Planets2D.ts`)

```ts
interface PlanetVariation {
  baseTint: number; // hue-shifted ±15° from 0xffffff, seeded from planet.id
  ringTint: number; // dust/ice palette tint, gas giants only
  ringTiltDeg: number; // -25..+25 degrees, gas giants only
  rotationPhase: number; // 0..2π, per-planet cosine phase offset
}
```

Derived once in `setPlanets()` via a simple FNV-1a hash on `planet.id` feeding a lightweight seeded PRNG. Same `planet.id` always yields the same `PlanetVariation`.

### `PlanetEntry` (updated)

```ts
interface PlanetEntry {
  planet: Planet;
  baseSprite: Phaser.GameObjects.Image; // depth = PLANET_DEPTH
  ringBackSprite: Phaser.GameObjects.Image | null; // depth = PLANET_DEPTH - 5
  ringFrontSprite: Phaser.GameObjects.Image | null; // depth = PLANET_DEPTH + 5
  hitbox: Phaser.GameObjects.Zone;
  variation: PlanetVariation;
}
```

`ringBackSprite` and `ringFrontSprite` are `null` for all non-`GasGiantSkim` planets.

### `setPlanets()` changes

Replace `getOrCreatePlanetTexture()` / `colorForPlanet()` with:

1. Compute `PlanetVariation` from `planet.id`.
2. Load base sprite with texture key `"planet:" + planet.biome`.
3. If `GasGiantSkim`: create `ringBackSprite` and `ringFrontSprite`, both using the `"planet:ring"` texture. Apply `setCrop` immediately:
   - `ringBackSprite.setCrop(0, 32, 128, 32)` — bottom half
   - `ringFrontSprite.setCrop(0, 0, 128, 32)` — top half
4. Apply `setTint(variation.baseTint)` to `baseSprite`.
5. Apply `setTint(variation.ringTint)` to ring sprites.

### `update()` changes

For each visible focused planet (after screen projection, same as today):

1. **Position + scale base sprite** — same logic as today, using `size`.
2. **Ring sprites** (if present):
   - Set position to same screen point as base sprite.
   - Set display size to `(size * 1.7, size * 0.85)` — ring extends past the planet edge (1.7× planet diameter wide) and is flattened vertically (`size * 0.85` height, independent of width) to create the perspective-ellipse look. Both factors are tuning constants.
   - Set `setAngle(variation.ringTiltDeg)`.
3. **Rotation tint-cycle:**

   ```ts
   const ROTATION_SPEED = 0.35; // ~18s per cycle
   const cycle = Math.cos(
     realtimeSeconds * ROTATION_SPEED + variation.rotationPhase,
   );
   const brightness = 0.86 + cycle * 0.14; // [0.72, 1.0]
   baseSprite.setTint(multiplyBrightness(variation.baseTint, brightness));
   ```

### `multiplyBrightness(tint, factor)` helper

```ts
function multiplyBrightness(tint: number, factor: number): number {
  const r = Math.min(255, Math.round(((tint >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((tint >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((tint & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}
```

### Deletions

Remove `colorForPlanet()` and `getOrCreatePlanetTexture()` — replaced entirely by authored textures + `PlanetVariation` tints.

## Boot Loading

Add 22 `this.load.image()` calls to `BootScene` (or wherever planets are preloaded):

```ts
for (const biome of Object.values(PlanetBiome)) {
  this.load.image(`planet:${biome}`, `planets/${biome}.png`);
}
this.load.image("planet:ring", "planets/ring.png");
```

The ring PNG is 128×64 (~8KB), biome PNGs average ~5KB each at 64×64 WebP → total new asset budget ≈ 110KB uncompressed, ~40KB gzip. Acceptable for a one-time preload.

## Orbit Rings

No changes. The existing `orbitGfx` Graphics-drawn orbit rings remain as-is.

## Testing

### Unit tests (new file: `src/scenes/galaxy2d/__tests__/PlanetVariation.test.ts`)

1. **Determinism:** `derivePlanetVariation("planet-abc")` called twice returns identical objects.
2. **Distinctness:** Two different IDs produce different `rotationPhase` values.
3. **Range constraints:** `ringTiltDeg` is in `[-25, 25]`, `rotationPhase` in `[0, 2π]`.
4. **Ring eligibility:** `GasGiantSkim` biome → `ringBackSprite` and `ringFrontSprite` non-null in entry.
5. **`multiplyBrightness` clamp:** `multiplyBrightness(0xffffff, 2.0)` returns `0xffffff` (no overflow).

### Manual verification checklist

- Navigate to a system containing a `GasGiantSkim` planet; confirm rings visible, back arc behind disc, front arc in front.
- Zoom in; confirm ring tilt visible, distinct per system.
- Watch a gas giant for ~20s; confirm tint pulse is subtle and not distracting.
- Navigate to two systems with agricultural planets; confirm they look different (hue shift).
- Confirm no TypeScript errors (`npm run typecheck`).
- Confirm all existing tests pass (`npm run test`).

## Implementation Order

1. Generate and commit all 22 asset PNGs (planet sprites + ring).
2. Add preload calls to `BootScene`.
3. Add `PlanetVariation` type + `derivePlanetVariation()` + `multiplyBrightness()` to `Planets2D.ts`.
4. Update `PlanetEntry` to include ring sprites and variation.
5. Update `setPlanets()` to use biome textures, create ring sprites, apply base tints.
6. Update `update()` loop for ring positioning and tint-cycle.
7. Delete `colorForPlanet()` and `getOrCreatePlanetTexture()`.
8. Write unit tests.
9. Run `npm run check` and fix any issues.
