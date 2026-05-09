# Galaxy & Economy Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh galaxy generation and the trade economy: spiral two-arm layout at three larger size tiers (~300/450/600 systems), per-world tag-based production/consumption with 21 biomes, balanced empires guaranteed via a reconciliation pass, 7 special-resource planets with layered company bonuses, and a lightweight population/food loop.

**Architecture:** Approach C from the spec — a layered generation pipeline with a single reconciliation pass. Old static cargo-profile tables (`PLANET_CARGO_PROFILES`, `PLANET_INDUSTRY_INPUT`) are replaced by per-world `productionTags`/`consumptionTags` derived from biomes at generation time. New helpers live alongside existing ones; the generator is rewired but its return shape remains compatible. Save version bumps; old saves rejected with a friendly message.

**Tech Stack:** TypeScript (strict, `verbatimModuleSyntax`, `erasableSyntaxOnly`), Phaser 4, Vite 8, Vitest 4, Node 22. Run `npm run check` to gate (typecheck + test + build). Run `npm run typecheck` for fast iteration.

**Spec:** [docs/plans/2026-05-09-galaxy-economy-refresh-design.md](../../plans/2026-05-09-galaxy-economy-refresh-design.md)

**Spec adjustments captured during planning:**

1. Reputation tier name in spec was "Trusted"; the codebase uses "respected" (≥50) — we use **respected** for the special-charter gate.
2. Spec mentioned `EmpireBorderManager.borderPolygons[]`; the actual export is `generateBorderPorts(...)` (hyperlane endpoints, a different concept). We add **territory polygons** as a new `Empire.territoryPolygon` field populated by `SpiralPlacer`, leaving the existing `BorderPort` system untouched.
3. `SAVE_VERSION` is currently `8` (in `src/data/constants.ts:17`); we bump to **9**.

---

## File Map

| File                                              | Action     | Purpose                                                                                                                                                                                            |
| ------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/data/types.ts`                               | Modify     | Add `GoodCategory`, `GoodTag`, `SpecialId`, `PlanetBiome`. Extend `Planet` and `Empire`.                                                                                                           |
| `src/data/goodCategories.ts`                      | **Create** | `GoodCategory` mapping + `getGoodCategory()` helper.                                                                                                                                               |
| `src/data/biomes.ts`                              | **Create** | All ~21 biome definitions with produces/consumes/zone weights.                                                                                                                                     |
| `src/data/specialResources.ts`                    | **Create** | 7 special-resource definitions with parent type + bonus specs.                                                                                                                                     |
| `src/data/constants.ts`                           | Modify     | Add `PER_CAPITA_DEMAND`, new size-tier table, `IMPORT_MULTIPLIER`, `SPECIAL_PRICE_MULTIPLIER`, bump `SAVE_VERSION` to 9. **Delete** `PLANET_CARGO_PROFILES` and `PLANET_INDUSTRY_INPUT` (Phase 5). |
| `src/generation/SpiralPlacer.ts`                  | **Create** | Poisson-disk along 2 arms + k-means clustering + Voronoi territories.                                                                                                                              |
| `src/generation/EmpireReconciler.ts`              | **Create** | Reassign biomes until each empire has all 5 required producer types.                                                                                                                               |
| `src/generation/SpecialPlacer.ts`                 | **Create** | Place 7 specials on parent-type-matched worlds.                                                                                                                                                    |
| `src/generation/GalaxyGenerator.ts`               | Modify     | Rewire to use the new pipeline.                                                                                                                                                                    |
| `src/generation/MarketInitializer.ts`             | Modify     | Read tags + population instead of `PLANET_CARGO_PROFILES`.                                                                                                                                         |
| `src/game/economy/PopulationLoop.ts`              | **Create** | Per-world food balance, growth/shrink.                                                                                                                                                             |
| `src/game/economy/CompanyBonusCalculator.ts`      | **Create** | Resolve active-route bonuses from owned specials.                                                                                                                                                  |
| `src/game/economy/MarketUpdater.ts`               | Modify     | Per-capita demand; generic tag-driven industry boost.                                                                                                                                              |
| `src/game/economy/PriceCalculator.ts`             | Modify     | Add `importMultiplier` + `specialPremium`.                                                                                                                                                         |
| `src/game/economy/IndustryChain.ts`               | Modify     | Resolve inputs from tags, not the deleted constant.                                                                                                                                                |
| `src/game/empire/EmpirePolicyGenerator.ts`        | Modify     | Read producer/consumer info from worlds.                                                                                                                                                           |
| `src/game/charters/CharterManager.ts`             | Modify     | List special-cargo charters when reputation ≥ respected.                                                                                                                                           |
| `src/game/simulation/TurnSimulator.ts`            | Modify     | Call `PopulationLoop.tick()` + bonus calculator each turn.                                                                                                                                         |
| `src/game/SaveManager.ts`                         | Modify     | Reject older saves with friendly message.                                                                                                                                                          |
| `src/siteContent.ts`                              | Modify     | Update LABELS / planet-profile content for tag model.                                                                                                                                              |
| `src/ui/RoutePickerMap.ts`                        | Modify     | Stop reading deleted profile constant; use `productionTags`.                                                                                                                                       |
| `src/scenes/galaxy2d/GalaxyView2D.ts`             | Modify     | Render `territoryPolygon` from new generator.                                                                                                                                                      |
| `src/scenes/galaxy2d/Background2D.ts`             | Modify     | If reading sector-centers, switch to spiral-skeleton or keep static visual.                                                                                                                        |
| `src/scenes/PlanetDetailScene.ts`                 | Modify     | Surface biome / production tags in UI.                                                                                                                                                             |
| `src/scenes/EmpireDetailScene.ts` (or equivalent) | Modify     | Display owned specials + archetype.                                                                                                                                                                |

---

## Phase 1 — Foundation: types, constants, save bump (no behavior change yet)

### Task 1: Extend types in `src/data/types.ts`

**Files:**

- Modify: `src/data/types.ts` (add new unions; extend `Planet` and `Empire` interfaces)

- [ ] **Step 1.1: Add new unions and interfaces**

Append after the existing `PlanetType` const (around line 280):

```ts
export const GoodCategory = {
  Bulk: "bulk",
  Strategic: "strategic",
  Premium: "premium",
} as const;
export type GoodCategory = (typeof GoodCategory)[keyof typeof GoodCategory];

export type GoodTag = CargoType;

export const SpecialId = {
  FoodGenesis: "food_genesis",
  RawAdamantine: "raw_adamantine",
  TechJokaero: "tech_jokaero",
  LuxPleasureGarden: "lux_pleasure_garden",
  HzmAntimatterTap: "hzm_antimatter_tap",
  MedPanacea: "med_panacea",
  PaxPilgrimage: "pax_pilgrimage",
} as const;
export type SpecialId = (typeof SpecialId)[keyof typeof SpecialId];

export const PlanetBiome = {
  // Agricultural
  Breadbasket: "breadbasket",
  Subsistence: "subsistence",
  Aquaculture: "aquaculture",
  // Mining
  CoreExtraction: "coreExtraction",
  GasGiantSkim: "gasGiantSkim",
  AsteroidBelt: "asteroidBelt",
  // TechWorld
  ResearchCluster: "researchCluster",
  DataHaven: "dataHaven",
  ForgeAcademy: "forgeAcademy",
  // Manufacturing
  HeavyIndustry: "heavyIndustry",
  PrecisionFab: "precisionFab",
  Shipyards: "shipyards",
  // LuxuryWorld
  Resort: "resort",
  ArtisanGuild: "artisanGuild",
  SpiceJungle: "spiceJungle",
  // CoreWorld
  Capital: "capital",
  Metropolitan: "metropolitan",
  AdminHub: "adminHub",
  // Frontier
  Colony: "colony",
  Outpost: "outpost",
  Refuge: "refuge",
} as const;
export type PlanetBiome = (typeof PlanetBiome)[keyof typeof PlanetBiome];

export interface Polygon {
  vertices: Array<{ x: number; y: number }>;
}

export const EmpireArchetype = {
  Balanced: "balanced",
} as const;
export type EmpireArchetype =
  (typeof EmpireArchetype)[keyof typeof EmpireArchetype];
```

Modify the existing `Planet` interface (around line 523) — add fields:

```ts
export interface Planet {
  id: string;
  name: string;
  systemId: string;
  type: PlanetType;
  biome: PlanetBiome; // NEW
  productionTags: GoodTag[]; // NEW
  consumptionTags: GoodTag[]; // NEW
  productionScale: number; // NEW (0.4-1.8)
  populationCap: number; // NEW (soft cap)
  specialResource?: SpecialId; // NEW (undefined for normal worlds)
  x: number;
  y: number;
  population: number;
  orbitRadius?: number;
  orbitPeriodQuarters?: number;
  orbitPhase?: number;
  orbitInclination?: number;
}
```

Modify the existing `Empire` interface (around line 496) — add fields:

```ts
export interface Empire {
  id: string;
  name: string;
  color: number;
  tariffRate: number;
  disposition: EmpireDisposition;
  homeSystemId: string;
  leaderName: string;
  leaderPortrait: CharacterPortrait;
  routeSlotPool?: EmpireRouteSlotPool;
  archetype: EmpireArchetype; // NEW (always "balanced" in MVP)
  ownedSpecials: SpecialId[]; // NEW
  territoryPolygon?: Polygon; // NEW (Voronoi cell from SpiralPlacer)
}
```

- [ ] **Step 1.2: Run typecheck — expect failures**

```bash
npm run typecheck
```

Expected: errors at every site that constructs a `Planet` or `Empire` without the new fields. We will fix these in subsequent tasks; this step exists only to enumerate the call sites.

- [ ] **Step 1.3: Commit type additions only**

```bash
git add src/data/types.ts
git commit -m "feat(types): add biome, special, archetype, territory types

Extend Planet and Empire with fields needed for the galaxy/economy
refresh. Build is intentionally broken until call sites in subsequent
tasks supply the new fields."
```

---

### Task 2: Add `goodCategories.ts`

**Files:**

- Create: `src/data/goodCategories.ts`
- Create: `src/data/__tests__/goodCategories.test.ts`

- [ ] **Step 2.1: Write the failing test**

Create `src/data/__tests__/goodCategories.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CargoType } from "../types.ts";
import {
  getGoodCategory,
  GoodCategory,
  IMPORT_MULTIPLIER,
} from "../goodCategories.ts";

describe("goodCategories", () => {
  it("classifies food and rawMaterials as Bulk", () => {
    expect(getGoodCategory(CargoType.Food)).toBe(GoodCategory.Bulk);
    expect(getGoodCategory(CargoType.RawMaterials)).toBe(GoodCategory.Bulk);
  });

  it("classifies tech, hazmat, medical as Strategic", () => {
    expect(getGoodCategory(CargoType.Technology)).toBe(GoodCategory.Strategic);
    expect(getGoodCategory(CargoType.Hazmat)).toBe(GoodCategory.Strategic);
    expect(getGoodCategory(CargoType.Medical)).toBe(GoodCategory.Strategic);
  });

  it("classifies luxury and passengers as Premium", () => {
    expect(getGoodCategory(CargoType.Luxury)).toBe(GoodCategory.Premium);
    expect(getGoodCategory(CargoType.Passengers)).toBe(GoodCategory.Premium);
  });

  it("exposes IMPORT_MULTIPLIER for premium goods", () => {
    expect(IMPORT_MULTIPLIER).toBeCloseTo(1.25);
  });
});
```

- [ ] **Step 2.2: Run test — expect FAIL (module missing)**

```bash
npx vitest run src/data/__tests__/goodCategories.test.ts
```

Expected: cannot find module `../goodCategories.ts`.

- [ ] **Step 2.3: Implement `goodCategories.ts`**

Create `src/data/goodCategories.ts`:

```ts
import { CargoType, GoodCategory } from "./types.ts";

const CARGO_TO_CATEGORY: Record<CargoType, GoodCategory> = {
  food: GoodCategory.Bulk,
  rawMaterials: GoodCategory.Bulk,
  technology: GoodCategory.Strategic,
  hazmat: GoodCategory.Strategic,
  medical: GoodCategory.Strategic,
  luxury: GoodCategory.Premium,
  passengers: GoodCategory.Premium,
};

export function getGoodCategory(cargo: CargoType): GoodCategory {
  return CARGO_TO_CATEGORY[cargo];
}

export const IMPORT_MULTIPLIER = 1.25;

export { GoodCategory };
```

- [ ] **Step 2.4: Run test — expect PASS**

```bash
npx vitest run src/data/__tests__/goodCategories.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/data/goodCategories.ts src/data/__tests__/goodCategories.test.ts
git commit -m "feat(data): add good categories and import multiplier"
```

---

### Task 3: Add `biomes.ts` with all 21 biomes

**Files:**

- Create: `src/data/biomes.ts`
- Create: `src/data/__tests__/biomes.test.ts`

- [ ] **Step 3.1: Write the failing test**

Create `src/data/__tests__/biomes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CargoType, PlanetBiome, PlanetType } from "../types.ts";
import { BIOMES, getBiomesForType, getBiome } from "../biomes.ts";

describe("biomes", () => {
  it("defines exactly 21 biomes total (3 per type x 7 types)", () => {
    expect(Object.keys(BIOMES).length).toBe(21);
  });

  it("breadbasket is Agricultural and produces food", () => {
    const b = getBiome(PlanetBiome.Breadbasket);
    expect(b.parentType).toBe(PlanetType.Agricultural);
    expect(b.produces).toContain(CargoType.Food);
  });

  it("each biome lists at most 3 produce tags and at most 4 consume tags", () => {
    for (const biome of Object.values(BIOMES)) {
      expect(biome.produces.length).toBeLessThanOrEqual(3);
      expect(biome.consumes.length).toBeLessThanOrEqual(4);
    }
  });

  it("getBiomesForType returns 3 biomes for each PlanetType", () => {
    for (const t of Object.values(PlanetType)) {
      expect(getBiomesForType(t).length).toBe(3);
    }
  });

  it("zone weights sum to roughly 1 per biome", () => {
    for (const biome of Object.values(BIOMES)) {
      const sum =
        biome.zoneWeights.inner +
        biome.zoneWeights.middle +
        biome.zoneWeights.outer;
      expect(sum).toBeCloseTo(1.0, 1);
    }
  });
});
```

- [ ] **Step 3.2: Implement `biomes.ts`**

Create `src/data/biomes.ts`:

```ts
import type { CargoType, GoodTag, PlanetBiome, PlanetType } from "./types.ts";
import {
  CargoType as Cargo,
  PlanetBiome as Biome,
  PlanetType as PT,
} from "./types.ts";

export interface BiomeDef {
  id: PlanetBiome;
  parentType: PlanetType;
  produces: GoodTag[];
  consumes: GoodTag[];
  /** Multiplies population per-capita demand for these goods (defaults to 1). */
  consumeMultipliers?: Partial<Record<CargoType, number>>;
  /** Probability weight by orbital zone; should roughly sum to 1. */
  zoneWeights: { inner: number; middle: number; outer: number };
  /** Soft population cap multiplier. */
  popCapMultiplier: number;
  /** Production scale multiplier baseline (rng can vary 0.7..1.3 around this). */
  productionScale: number;
}

export const BIOMES: Record<PlanetBiome, BiomeDef> = {
  // Agricultural
  [Biome.Breadbasket]: {
    id: Biome.Breadbasket,
    parentType: PT.Agricultural,
    produces: [Cargo.Food],
    consumes: [Cargo.Technology, Cargo.Luxury],
    zoneWeights: { inner: 0.1, middle: 0.5, outer: 0.4 },
    popCapMultiplier: 1.4,
    productionScale: 1.4,
  },
  [Biome.Subsistence]: {
    id: Biome.Subsistence,
    parentType: PT.Agricultural,
    produces: [Cargo.Food],
    consumes: [Cargo.Medical],
    zoneWeights: { inner: 0.1, middle: 0.3, outer: 0.6 },
    popCapMultiplier: 0.7,
    productionScale: 0.6,
  },
  [Biome.Aquaculture]: {
    id: Biome.Aquaculture,
    parentType: PT.Agricultural,
    produces: [Cargo.Food, Cargo.Medical],
    consumes: [Cargo.RawMaterials],
    zoneWeights: { inner: 0.2, middle: 0.5, outer: 0.3 },
    popCapMultiplier: 1.0,
    productionScale: 1.0,
  },
  // Mining
  [Biome.CoreExtraction]: {
    id: Biome.CoreExtraction,
    parentType: PT.Mining,
    produces: [Cargo.RawMaterials],
    consumes: [Cargo.Food, Cargo.Medical],
    zoneWeights: { inner: 0.5, middle: 0.4, outer: 0.1 },
    popCapMultiplier: 0.8,
    productionScale: 1.4,
  },
  [Biome.GasGiantSkim]: {
    id: Biome.GasGiantSkim,
    parentType: PT.Mining,
    produces: [Cargo.RawMaterials, Cargo.Hazmat],
    consumes: [Cargo.Technology, Cargo.Food],
    zoneWeights: { inner: 0.1, middle: 0.3, outer: 0.6 },
    popCapMultiplier: 0.5,
    productionScale: 1.0,
  },
  [Biome.AsteroidBelt]: {
    id: Biome.AsteroidBelt,
    parentType: PT.Mining,
    produces: [Cargo.RawMaterials],
    consumes: [Cargo.Food, Cargo.Passengers],
    zoneWeights: { inner: 0.33, middle: 0.34, outer: 0.33 },
    popCapMultiplier: 0.4,
    productionScale: 0.9,
  },
  // TechWorld
  [Biome.ResearchCluster]: {
    id: Biome.ResearchCluster,
    parentType: PT.TechWorld,
    produces: [Cargo.Technology],
    consumes: [Cargo.Food, Cargo.Passengers, Cargo.Luxury],
    zoneWeights: { inner: 0.4, middle: 0.5, outer: 0.1 },
    popCapMultiplier: 1.1,
    productionScale: 1.2,
  },
  [Biome.DataHaven]: {
    id: Biome.DataHaven,
    parentType: PT.TechWorld,
    produces: [Cargo.Technology, Cargo.Passengers],
    consumes: [Cargo.Medical],
    zoneWeights: { inner: 0.6, middle: 0.3, outer: 0.1 },
    popCapMultiplier: 1.0,
    productionScale: 1.0,
  },
  [Biome.ForgeAcademy]: {
    id: Biome.ForgeAcademy,
    parentType: PT.TechWorld,
    produces: [Cargo.Technology],
    consumes: [Cargo.RawMaterials, Cargo.Hazmat],
    zoneWeights: { inner: 0.2, middle: 0.6, outer: 0.2 },
    popCapMultiplier: 0.9,
    productionScale: 1.1,
  },
  // Manufacturing
  [Biome.HeavyIndustry]: {
    id: Biome.HeavyIndustry,
    parentType: PT.Manufacturing,
    produces: [Cargo.Medical, Cargo.Hazmat],
    consumes: [Cargo.RawMaterials, Cargo.Food],
    zoneWeights: { inner: 0.3, middle: 0.5, outer: 0.2 },
    popCapMultiplier: 1.0,
    productionScale: 1.2,
  },
  [Biome.PrecisionFab]: {
    id: Biome.PrecisionFab,
    parentType: PT.Manufacturing,
    produces: [Cargo.Medical],
    consumes: [Cargo.Technology, Cargo.RawMaterials],
    zoneWeights: { inner: 0.6, middle: 0.3, outer: 0.1 },
    popCapMultiplier: 1.0,
    productionScale: 1.0,
  },
  [Biome.Shipyards]: {
    id: Biome.Shipyards,
    parentType: PT.Manufacturing,
    produces: [],
    consumes: [Cargo.RawMaterials, Cargo.Hazmat, Cargo.Technology],
    zoneWeights: { inner: 0.5, middle: 0.4, outer: 0.1 },
    popCapMultiplier: 0.8,
    productionScale: 0.0,
  },
  // LuxuryWorld
  [Biome.Resort]: {
    id: Biome.Resort,
    parentType: PT.LuxuryWorld,
    produces: [Cargo.Luxury],
    consumes: [Cargo.Food, Cargo.Medical, Cargo.Passengers],
    consumeMultipliers: { passengers: 1.5 },
    zoneWeights: { inner: 0.33, middle: 0.34, outer: 0.33 },
    popCapMultiplier: 1.1,
    productionScale: 1.2,
  },
  [Biome.ArtisanGuild]: {
    id: Biome.ArtisanGuild,
    parentType: PT.LuxuryWorld,
    produces: [Cargo.Luxury, Cargo.Technology],
    consumes: [Cargo.RawMaterials, Cargo.Food],
    zoneWeights: { inner: 0.5, middle: 0.4, outer: 0.1 },
    popCapMultiplier: 0.9,
    productionScale: 1.0,
  },
  [Biome.SpiceJungle]: {
    id: Biome.SpiceJungle,
    parentType: PT.LuxuryWorld,
    produces: [Cargo.Luxury, Cargo.Medical],
    consumes: [Cargo.Technology, Cargo.Hazmat],
    zoneWeights: { inner: 0.1, middle: 0.4, outer: 0.5 },
    popCapMultiplier: 1.0,
    productionScale: 0.9,
  },
  // CoreWorld
  [Biome.Capital]: {
    id: Biome.Capital,
    parentType: PT.CoreWorld,
    produces: [Cargo.Passengers],
    consumes: [Cargo.Food, Cargo.Medical, Cargo.Luxury, Cargo.Technology],
    consumeMultipliers: { luxury: 1.5, food: 1.2 },
    zoneWeights: { inner: 0.7, middle: 0.3, outer: 0.0 },
    popCapMultiplier: 1.8,
    productionScale: 1.5,
  },
  [Biome.Metropolitan]: {
    id: Biome.Metropolitan,
    parentType: PT.CoreWorld,
    produces: [Cargo.Passengers, Cargo.Medical],
    consumes: [Cargo.Food, Cargo.Luxury, Cargo.Technology],
    zoneWeights: { inner: 0.5, middle: 0.4, outer: 0.1 },
    popCapMultiplier: 1.4,
    productionScale: 1.2,
  },
  [Biome.AdminHub]: {
    id: Biome.AdminHub,
    parentType: PT.CoreWorld,
    produces: [Cargo.Passengers],
    consumes: [Cargo.Luxury, Cargo.Medical],
    zoneWeights: { inner: 0.6, middle: 0.3, outer: 0.1 },
    popCapMultiplier: 1.2,
    productionScale: 1.1,
  },
  // Frontier
  [Biome.Colony]: {
    id: Biome.Colony,
    parentType: PT.Frontier,
    produces: [],
    consumes: [Cargo.Food, Cargo.Medical, Cargo.Technology],
    zoneWeights: { inner: 0.1, middle: 0.3, outer: 0.6 },
    popCapMultiplier: 0.5,
    productionScale: 0.0,
  },
  [Biome.Outpost]: {
    id: Biome.Outpost,
    parentType: PT.Frontier,
    produces: [Cargo.RawMaterials],
    consumes: [Cargo.Food, Cargo.Medical],
    zoneWeights: { inner: 0.0, middle: 0.2, outer: 0.8 },
    popCapMultiplier: 0.3,
    productionScale: 0.5,
  },
  [Biome.Refuge]: {
    id: Biome.Refuge,
    parentType: PT.Frontier,
    produces: [],
    consumes: [Cargo.Food, Cargo.Medical, Cargo.Passengers],
    zoneWeights: { inner: 0.0, middle: 0.2, outer: 0.8 },
    popCapMultiplier: 0.4,
    productionScale: 0.0,
  },
};

export function getBiome(id: PlanetBiome): BiomeDef {
  return BIOMES[id];
}

export function getBiomesForType(type: PlanetType): BiomeDef[] {
  return Object.values(BIOMES).filter((b) => b.parentType === type);
}
```

- [ ] **Step 3.3: Run test — expect PASS**

```bash
npx vitest run src/data/__tests__/biomes.test.ts
```

- [ ] **Step 3.4: Commit**

```bash
git add src/data/biomes.ts src/data/__tests__/biomes.test.ts
git commit -m "feat(data): add 21 biome definitions with produce/consume tags"
```

---

### Task 4: Add `specialResources.ts`

**Files:**

- Create: `src/data/specialResources.ts`
- Create: `src/data/__tests__/specialResources.test.ts`

- [ ] **Step 4.1: Write the failing test**

Create `src/data/__tests__/specialResources.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CargoType, PlanetType, SpecialId } from "../types.ts";
import {
  SPECIALS,
  getSpecial,
  SPECIAL_PRICE_MULTIPLIER,
} from "../specialResources.ts";

describe("specialResources", () => {
  it("defines exactly 7 specials, one per cargo type", () => {
    expect(Object.keys(SPECIALS).length).toBe(7);
    const cargoTypes = new Set(
      Object.values(SPECIALS).map((s) => s.parentCargo),
    );
    expect(cargoTypes.size).toBe(7);
  });

  it("each special has a parent PlanetType matching parent cargo", () => {
    expect(getSpecial(SpecialId.FoodGenesis).parentPlanetType).toBe(
      PlanetType.Agricultural,
    );
    expect(getSpecial(SpecialId.TechJokaero).parentPlanetType).toBe(
      PlanetType.TechWorld,
    );
    expect(getSpecial(SpecialId.LuxPleasureGarden).parentPlanetType).toBe(
      PlanetType.LuxuryWorld,
    );
  });

  it("special price multiplier is 2.5", () => {
    expect(SPECIAL_PRICE_MULTIPLIER).toBeCloseTo(2.5);
  });

  it("each special declares an active-route bonus shape", () => {
    for (const s of Object.values(SPECIALS)) {
      expect(typeof s.activeRouteBonus.kind).toBe("string");
      expect(typeof s.activeRouteBonus.amount).toBe("number");
    }
  });
});
```

- [ ] **Step 4.2: Implement `specialResources.ts`**

Create `src/data/specialResources.ts`:

```ts
import type { CargoType, PlanetType, SpecialId } from "./types.ts";
import {
  CargoType as Cargo,
  PlanetType as PT,
  SpecialId as SID,
} from "./types.ts";

export type SpecialBonusKind =
  | "popGrowth" // +N% pop growth on served worlds
  | "hullCost" // -N% hull/refit cost
  | "cargoCapacity" // +N flat cargo cap on freighters
  | "reputationGain" // +N% reputation gain rate
  | "fuelCost" // -N% fuel cost
  | "damageRecovery" // -N% turns lost to crew/event damage
  | "passengerPayout"; // +N% passenger contract payouts

export interface SpecialBonus {
  kind: SpecialBonusKind;
  amount: number; // signed percent or flat value depending on kind
}

export interface SpecialDef {
  id: SpecialId;
  name: string;
  parentCargo: CargoType;
  parentPlanetType: PlanetType;
  description: string;
  activeRouteBonus: SpecialBonus;
}

export const SPECIALS: Record<SpecialId, SpecialDef> = {
  [SID.FoodGenesis]: {
    id: SID.FoodGenesis,
    name: "Genesis Produce",
    parentCargo: Cargo.Food,
    parentPlanetType: PT.Agricultural,
    description: "Bio-engineered super-crops with extraordinary yield.",
    activeRouteBonus: { kind: "popGrowth", amount: 5 },
  },
  [SID.RawAdamantine]: {
    id: SID.RawAdamantine,
    name: "Adamantine Lode",
    parentCargo: Cargo.RawMaterials,
    parentPlanetType: PT.Mining,
    description: "Hyper-dense alloy ore prized by shipwrights.",
    activeRouteBonus: { kind: "hullCost", amount: -10 },
  },
  [SID.TechJokaero]: {
    id: SID.TechJokaero,
    name: "Jokaero Artifacts",
    parentCargo: Cargo.Technology,
    parentPlanetType: PT.TechWorld,
    description: "Sapient artisans whose tools defy physics.",
    activeRouteBonus: { kind: "cargoCapacity", amount: 1 },
  },
  [SID.LuxPleasureGarden]: {
    id: SID.LuxPleasureGarden,
    name: "Pleasure Garden Vintages",
    parentCargo: Cargo.Luxury,
    parentPlanetType: PT.LuxuryWorld,
    description: "Legendary vintages found nowhere else.",
    activeRouteBonus: { kind: "reputationGain", amount: 15 },
  },
  [SID.HzmAntimatterTap]: {
    id: SID.HzmAntimatterTap,
    name: "Antimatter Tap",
    parentCargo: Cargo.Hazmat,
    parentPlanetType: PT.Mining,
    description:
      "A stable antimatter well, supremely dangerous and supremely valuable.",
    activeRouteBonus: { kind: "fuelCost", amount: -10 },
  },
  [SID.MedPanacea]: {
    id: SID.MedPanacea,
    name: "Panacea Bloom",
    parentCargo: Cargo.Medical,
    parentPlanetType: PT.Manufacturing,
    description: "A wonder-drug source whose flowers bloom only here.",
    activeRouteBonus: { kind: "damageRecovery", amount: -25 },
  },
  [SID.PaxPilgrimage]: {
    id: SID.PaxPilgrimage,
    name: "Pilgrimage Spire",
    parentCargo: Cargo.Passengers,
    parentPlanetType: PT.CoreWorld,
    description:
      "Galactic cultural capital; everyone wants to visit at least once.",
    activeRouteBonus: { kind: "passengerPayout", amount: 20 },
  },
};

export function getSpecial(id: SpecialId): SpecialDef {
  return SPECIALS[id];
}

export function getSpecialsForCargo(cargo: CargoType): SpecialDef[] {
  return Object.values(SPECIALS).filter((s) => s.parentCargo === cargo);
}

export const SPECIAL_PRICE_MULTIPLIER = 2.5;
```

- [ ] **Step 4.3: Run test — expect PASS**

```bash
npx vitest run src/data/__tests__/specialResources.test.ts
```

- [ ] **Step 4.4: Commit**

```bash
git add src/data/specialResources.ts src/data/__tests__/specialResources.test.ts
git commit -m "feat(data): add 7 special-resource definitions and helpers"
```

---

### Task 5: Add new constants and bump SAVE_VERSION

**Files:**

- Modify: `src/data/constants.ts` (add new constants; do NOT delete old ones yet — we delete in Phase 5 once nothing reads them)

- [ ] **Step 5.1: Add new constants near `BASE_CARGO_PRICES` (around line 660)**

Open `src/data/constants.ts`. After the existing `BASE_CARGO_PRICES` block:

```ts
// Per-capita demand by cargo type (population × this = base demand units).
// Industrial-input goods (technology, rawMaterials, hazmat) are biome-driven, not pop-driven.
export const PER_CAPITA_DEMAND: Partial<Record<CargoType, number>> = {
  food: 1.0,
  medical: 0.1,
  luxury: 0.2,
  passengers: 0.05,
};

// Population dynamics
export const FOOD_DEFICIT_TURNS_TO_SHRINK = 3;
export const FOOD_SURPLUS_TURNS_TO_GROW = 5;
export const POP_SHRINK_RATE_PER_TURN = 0.02;
export const POP_GROW_RATE_PER_TURN = 0.01;

// Galaxy size tiers (replaces old preset tables)
export const GALAXY_TIERS = {
  quick: {
    systemCount: 300,
    empireCount: 11,
    planetsPerSystem: { min: 1, max: 4 },
  },
  standard: {
    systemCount: 450,
    empireCount: 12,
    planetsPerSystem: { min: 1, max: 4 },
  },
  epic: {
    systemCount: 600,
    empireCount: 14,
    planetsPerSystem: { min: 1, max: 4 },
  },
} as const;

// Reconciliation rule: balanced empires must produce all 5 of these.
export const REQUIRED_PRODUCER_TYPES: CargoType[] = [
  "food",
  "rawMaterials",
  "technology",
  "medical",
  "luxury",
];

// Reputation gate for special-cargo charters
export const SPECIAL_CHARTER_TIER_THRESHOLD = "respected"; // ReputationTier
```

- [ ] **Step 5.2: Bump `SAVE_VERSION` from 8 to 9**

In `src/data/constants.ts:17` (or wherever `SAVE_VERSION` is defined):

```ts
export const SAVE_VERSION = 9;
```

- [ ] **Step 5.3: Run typecheck**

```bash
npm run typecheck
```

Expected: still has the existing failures from Task 1; the new constants themselves should typecheck.

- [ ] **Step 5.4: Commit**

```bash
git add src/data/constants.ts
git commit -m "feat(data): add per-capita demand, galaxy tiers, bump SAVE_VERSION to 9"
```

---

### Task 6: SaveManager rejects v<9 with friendly message

**Files:**

- Modify: `src/game/SaveManager.ts`
- Modify or create: `src/game/__tests__/SaveManager.test.ts`

- [ ] **Step 6.1: Open `src/game/SaveManager.ts`. Find the load function (envelope.version check) and add a friendly rejection branch**

The current logic (per survey) checks `envelope.version === 1` at line ~38. Replace with a check that any version below current `SAVE_VERSION` is rejected with a clear error:

```ts
import { SAVE_VERSION } from "../data/constants.ts";

// inside load function, replace prior version check:
if (envelope.version !== SAVE_VERSION) {
  throw new Error(
    `Incompatible save (v${envelope.version}). This alpha build requires save v${SAVE_VERSION}. Please start a new game.`,
  );
}
```

- [ ] **Step 6.2: Add a test**

Add to `src/game/__tests__/SaveManager.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readSave } from "../SaveManager.ts";
import { SAVE_VERSION } from "../../data/constants.ts";

describe("SaveManager save-version compatibility", () => {
  it("rejects saves older than current SAVE_VERSION with a friendly message", () => {
    const oldEnvelope = JSON.stringify({
      version: SAVE_VERSION - 1,
      payload: {},
    });
    expect(() => readSave(oldEnvelope)).toThrow(/Incompatible save/);
  });
});
```

- [ ] **Step 6.3: Run test — expect PASS**

```bash
npx vitest run src/game/__tests__/SaveManager.test.ts
```

- [ ] **Step 6.4: Commit**

```bash
git add src/game/SaveManager.ts src/game/__tests__/SaveManager.test.ts
git commit -m "feat(save): reject pre-v9 saves with friendly error"
```

---

## Phase 2 — Generation pipeline (the core of the refresh)

### Task 7: Implement `SpiralPlacer.ts`

**Files:**

- Create: `src/generation/SpiralPlacer.ts`
- Create: `src/generation/__tests__/SpiralPlacer.test.ts`

**Public API:**

```ts
export interface SpiralPlacement {
  systemPositions: Array<{ x: number; y: number }>;
  empireAssignments: number[]; // index into systemPositions → empireIndex
  empireCentroids: Array<{ x: number; y: number }>;
  empireTerritories: Polygon[]; // Voronoi cell per empire
}

export function placeSpiralGalaxy(opts: {
  rng: SeededRNG;
  systemCount: number;
  empireCount: number;
  arms?: number; // default 2
  armSweep?: number; // default 1.8 * Math.PI
  radius?: number; // default 1000
}): SpiralPlacement;
```

- [ ] **Step 7.1: Write failing tests**

Create `src/generation/__tests__/SpiralPlacer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SeededRNG } from "../../utils/SeededRNG.ts";
import { placeSpiralGalaxy } from "../SpiralPlacer.ts";

describe("placeSpiralGalaxy", () => {
  it("returns the requested system count", () => {
    const r = placeSpiralGalaxy({
      rng: new SeededRNG(1),
      systemCount: 300,
      empireCount: 11,
    });
    expect(r.systemPositions.length).toBe(300);
  });

  it("assigns every system to a valid empire index", () => {
    const r = placeSpiralGalaxy({
      rng: new SeededRNG(1),
      systemCount: 300,
      empireCount: 11,
    });
    expect(r.empireAssignments.length).toBe(300);
    expect(r.empireCentroids.length).toBe(11);
    for (const a of r.empireAssignments) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(11);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = placeSpiralGalaxy({
      rng: new SeededRNG(42),
      systemCount: 100,
      empireCount: 6,
    });
    const b = placeSpiralGalaxy({
      rng: new SeededRNG(42),
      systemCount: 100,
      empireCount: 6,
    });
    expect(a.systemPositions).toEqual(b.systemPositions);
    expect(a.empireAssignments).toEqual(b.empireAssignments);
  });

  it("every empire gets at least one system", () => {
    const r = placeSpiralGalaxy({
      rng: new SeededRNG(7),
      systemCount: 100,
      empireCount: 6,
    });
    const counts = new Array(6).fill(0);
    r.empireAssignments.forEach((e) => counts[e]++);
    for (const c of counts) expect(c).toBeGreaterThan(0);
  });

  it("produces a polygon per empire territory", () => {
    const r = placeSpiralGalaxy({
      rng: new SeededRNG(1),
      systemCount: 200,
      empireCount: 8,
    });
    expect(r.empireTerritories.length).toBe(8);
    for (const poly of r.empireTerritories) {
      expect(poly.vertices.length).toBeGreaterThanOrEqual(3);
    }
  });
});
```

- [ ] **Step 7.2: Implement `SpiralPlacer.ts`**

The implementation has 4 phases internally: candidate generation, Poisson-disk culling, k-means clustering, Voronoi territories.

Create `src/generation/SpiralPlacer.ts`:

```ts
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

  // 1) Candidate generation along arms
  const candidateMultiplier = 2.0;
  const candidates: Array<{ x: number; y: number }> = [];
  const numCandidates = Math.ceil(systemCount * candidateMultiplier);
  for (let i = 0; i < numCandidates; i++) {
    const arm = i % arms;
    const tBase = rng.nextFloat();
    const t = Math.pow(tBase, 0.7); // bias outward slightly
    const armOffset = (2 * Math.PI * arm) / arms;
    const angle = armOffset + t * armSweep;
    const r = radius * (0.05 + 0.95 * t);
    // logarithmic spiral curl
    const curl = 0.4;
    const cx = r * Math.cos(angle + curl * Math.log(1 + (r / radius) * 5));
    const cy = r * Math.sin(angle + curl * Math.log(1 + (r / radius) * 5));
    // jitter perpendicular to arm
    const jitterMag = radius * 0.04 * (rng.nextFloat() * 2 - 1);
    const jx = -Math.sin(angle) * jitterMag;
    const jy = Math.cos(angle) * jitterMag;
    candidates.push({ x: cx + jx, y: cy + jy });
  }

  // 2) Poisson-disk cull until we hit systemCount
  const minDist = radius * 0.018;
  const minDist2 = minDist * minDist;
  // Shuffle candidates so culling is unbiased
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
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
  // Backfill if we ran out of candidates
  while (kept.length < systemCount) {
    const t = rng.nextFloat();
    const arm = rng.nextInt(arms);
    const angle = (2 * Math.PI * arm) / arms + t * armSweep;
    const r = radius * (0.1 + 0.9 * t);
    kept.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }

  // 3) k-means clustering with k = empireCount
  const centroids: Array<{ x: number; y: number }> = [];
  // Seed centroids: pick `empireCount` evenly spaced systems
  const stride = Math.max(1, Math.floor(kept.length / empireCount));
  for (let i = 0; i < empireCount; i++)
    centroids.push({ ...kept[(i * stride) % kept.length] });

  const assignments = new Array(kept.length).fill(0);
  for (let iter = 0; iter < 24; iter++) {
    // assign step
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
    // update step
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

  // Guarantee every empire has at least 1 system: rebalance singletons
  rebalanceEmptyEmpires(kept, assignments, centroids);

  // 4) Voronoi territories — simple bounded-cell approximation
  const territories = buildBoundedVoronoi(centroids, radius * 1.4);

  return {
    systemPositions: kept,
    empireAssignments: assignments,
    empireCentroids: centroids,
    empireTerritories: territories,
  };
}

function rebalanceEmptyEmpires(
  points: Array<{ x: number; y: number }>,
  assignments: number[],
  centroids: Array<{ x: number; y: number }>,
): void {
  for (let c = 0; c < centroids.length; c++) {
    if (!assignments.includes(c)) {
      // steal the system farthest from its current centroid
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

function buildBoundedVoronoi(
  sites: Array<{ x: number; y: number }>,
  bound: number,
): Polygon[] {
  // For each site, build the convex polygon defined by half-plane intersections
  // with every other site, clipped to the [-bound, bound] square.
  const result: Polygon[] = [];
  const square: Array<{ x: number; y: number }> = [
    { x: -bound, y: -bound },
    { x: bound, y: -bound },
    { x: bound, y: bound },
    { x: -bound, y: bound },
  ];
  for (let i = 0; i < sites.length; i++) {
    let poly = square.slice();
    for (let j = 0; j < sites.length; j++) {
      if (i === j) continue;
      poly = clipHalfPlane(poly, sites[i], sites[j]);
      if (poly.length === 0) break;
    }
    result.push({ vertices: poly });
  }
  return result;
}

function clipHalfPlane(
  poly: Array<{ x: number; y: number }>,
  inside: { x: number; y: number },
  outside: { x: number; y: number },
): Array<{ x: number; y: number }> {
  // Keep points closer to `inside` than `outside` (perpendicular bisector half-plane).
  const mx = (inside.x + outside.x) / 2;
  const my = (inside.y + outside.y) / 2;
  const nx = inside.x - outside.x;
  const ny = inside.y - outside.y;
  // half-plane: nx*(p.x - mx) + ny*(p.y - my) >= 0
  const isInside = (p: { x: number; y: number }) =>
    nx * (p.x - mx) + ny * (p.y - my) >= 0;
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ai = isInside(a);
    const bi = isInside(b);
    if (ai) out.push(a);
    if (ai !== bi) {
      // intersect segment a-b with the bisector line
      const da = nx * (a.x - mx) + ny * (a.y - my);
      const db = nx * (b.x - mx) + ny * (b.y - my);
      const t = da / (da - db);
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return out;
}
```

- [ ] **Step 7.3: Run tests — expect PASS**

```bash
npx vitest run src/generation/__tests__/SpiralPlacer.test.ts
```

- [ ] **Step 7.4: Commit**

```bash
git add src/generation/SpiralPlacer.ts src/generation/__tests__/SpiralPlacer.test.ts
git commit -m "feat(generation): add SpiralPlacer (Poisson-disk + k-means + Voronoi)"
```

---

### Task 8: Implement `EmpireReconciler.ts`

**Files:**

- Create: `src/generation/EmpireReconciler.ts`
- Create: `src/generation/__tests__/EmpireReconciler.test.ts`

**Public API:**

```ts
export function reconcileEmpireProduction(opts: {
  empire: Empire;
  worlds: Planet[]; // worlds belonging to this empire
  rng: SeededRNG;
}): { reassigned: number }; // count of biome reassignments performed
```

- [ ] **Step 8.1: Write the failing test**

Create `src/generation/__tests__/EmpireReconciler.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { reconcileEmpireProduction } from "../EmpireReconciler.ts";
import {
  CargoType,
  EmpireArchetype,
  PlanetBiome,
  PlanetType,
} from "../../data/types.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";
import { REQUIRED_PRODUCER_TYPES } from "../../data/constants.ts";

function makeFrontier(id: string): any {
  return {
    id,
    name: id,
    systemId: "s1",
    type: PlanetType.Frontier,
    biome: PlanetBiome.Colony,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 5,
    population: 1,
    x: 0,
    y: 0,
  };
}

function makeEmpire(): any {
  return {
    id: "e1",
    name: "E1",
    color: 0,
    tariffRate: 0.1,
    disposition: "neutral",
    homeSystemId: "s1",
    leaderName: "L",
    leaderPortrait: "x",
    archetype: EmpireArchetype.Balanced,
    ownedSpecials: [],
  };
}

describe("reconcileEmpireProduction", () => {
  it("ensures every required producer type is covered", () => {
    const empire = makeEmpire();
    const worlds = [
      makeFrontier("w1"),
      makeFrontier("w2"),
      makeFrontier("w3"),
      makeFrontier("w4"),
      makeFrontier("w5"),
    ];
    reconcileEmpireProduction({ empire, worlds, rng: new SeededRNG(1) });
    const produced = new Set(worlds.flatMap((w) => w.productionTags));
    for (const t of REQUIRED_PRODUCER_TYPES) {
      expect(produced.has(t)).toBe(true);
    }
  });

  it("does nothing when coverage is already complete", () => {
    const empire = makeEmpire();
    const w = makeFrontier("w1");
    w.productionTags = [
      "food",
      "rawMaterials",
      "technology",
      "medical",
      "luxury",
    ];
    const r = reconcileEmpireProduction({
      empire,
      worlds: [w],
      rng: new SeededRNG(1),
    });
    expect(r.reassigned).toBe(0);
  });

  it("never crashes when fewer worlds than required types", () => {
    const empire = makeEmpire();
    const worlds = [makeFrontier("w1"), makeFrontier("w2")];
    expect(() =>
      reconcileEmpireProduction({ empire, worlds, rng: new SeededRNG(1) }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 8.2: Implement `EmpireReconciler.ts`**

Create `src/generation/EmpireReconciler.ts`:

```ts
import { BIOMES, getBiomesForType } from "../data/biomes.ts";
import { REQUIRED_PRODUCER_TYPES } from "../data/constants.ts";
import type { CargoType, Empire, Planet, PlanetBiome } from "../data/types.ts";
import { PlanetType } from "../data/types.ts";
import type { SeededRNG } from "../utils/SeededRNG.ts";

export function reconcileEmpireProduction(opts: {
  empire: Empire;
  worlds: Planet[];
  rng: SeededRNG;
}): { reassigned: number } {
  const { worlds, rng } = opts;
  let reassigned = 0;

  for (const required of REQUIRED_PRODUCER_TYPES) {
    if (coverageHas(worlds, required)) continue;

    const target = pickReassignmentTarget(worlds, required);
    if (!target) continue; // no candidate — log handled by caller

    const newBiome =
      pickBiomeForGood(target.type, required, rng) ??
      syntheticFrontierFor(required);
    target.biome = newBiome.id;
    target.productionTags = [...newBiome.produces];
    target.consumptionTags = [...newBiome.consumes];
    target.productionScale = newBiome.productionScale;
    reassigned += 1;
  }

  return { reassigned };
}

function coverageHas(worlds: Planet[], good: CargoType): boolean {
  return worlds.some((w) => w.productionTags.includes(good));
}

function pickReassignmentTarget(
  worlds: Planet[],
  _good: CargoType,
): Planet | undefined {
  // Prefer Frontier worlds first (neutral-purpose), then worlds with empty productionTags
  const frontiers = worlds.filter((w) => w.type === PlanetType.Frontier);
  if (frontiers.length > 0) return frontiers[0];
  const empty = worlds.filter((w) => w.productionTags.length === 0);
  if (empty.length > 0) return empty[0];
  return worlds[0];
}

function pickBiomeForGood(type: PlanetType, good: CargoType, rng: SeededRNG) {
  const candidates = getBiomesForType(type).filter((b) =>
    b.produces.includes(good),
  );
  if (candidates.length === 0) {
    // search across all types (keeps original type but uses synthetic fallback logic)
    const all = Object.values(BIOMES).filter((b) => b.produces.includes(good));
    if (all.length === 0) return null;
    return all[rng.nextInt(all.length)];
  }
  return candidates[rng.nextInt(candidates.length)];
}

function syntheticFrontierFor(good: CargoType) {
  // Last-resort synthetic biome — never crashes generation.
  return {
    id: `synthetic_${good}` as PlanetBiome,
    parentType: PlanetType.Frontier,
    produces: [good],
    consumes: ["food" as CargoType, "medical" as CargoType],
    zoneWeights: { inner: 0.33, middle: 0.34, outer: 0.33 },
    popCapMultiplier: 0.5,
    productionScale: 0.5,
  };
}
```

- [ ] **Step 8.3: Run tests — expect PASS**

```bash
npx vitest run src/generation/__tests__/EmpireReconciler.test.ts
```

- [ ] **Step 8.4: Commit**

```bash
git add src/generation/EmpireReconciler.ts src/generation/__tests__/EmpireReconciler.test.ts
git commit -m "feat(generation): add EmpireReconciler ensuring 5 required producer types"
```

---

### Task 9: Implement `SpecialPlacer.ts`

**Files:**

- Create: `src/generation/SpecialPlacer.ts`
- Create: `src/generation/__tests__/SpecialPlacer.test.ts`

**Public API:**

```ts
export function placeSpecials(opts: {
  empires: Empire[];
  systems: System[];
  planets: Planet[];
  rng: SeededRNG;
}): SpecialPlacementResult;

export interface SpecialPlacementResult {
  placed: Array<{ specialId: SpecialId; empireId: string; planetId: string }>;
  skipped: SpecialId[]; // when no parent-type world is available in any empire
}
```

- [ ] **Step 9.1: Write failing tests**

Create `src/generation/__tests__/SpecialPlacer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { placeSpecials } from "../SpecialPlacer.ts";
import {
  EmpireArchetype,
  PlanetBiome,
  PlanetType,
  SpecialId,
} from "../../data/types.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";
import { SPECIALS } from "../../data/specialResources.ts";

function makePlanet(
  id: string,
  sysId: string,
  type: PlanetType,
  biome: PlanetBiome,
  empireId: string,
): any {
  return {
    id,
    name: id,
    systemId: sysId,
    type,
    biome,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1,
    populationCap: 5,
    population: 1,
    x: 0,
    y: 0,
    // for placer convenience we tag empire via systems; here we mock-co-locate
    _empireId: empireId,
  };
}

function makeSystem(id: string, empireId: string): any {
  return { id, name: id, x: 0, y: 0, empireId, planetIds: [] };
}

function makeEmpire(id: string): any {
  return {
    id,
    name: id,
    color: 0,
    tariffRate: 0.1,
    disposition: "neutral",
    homeSystemId: "s1",
    leaderName: "L",
    leaderPortrait: "x",
    archetype: EmpireArchetype.Balanced,
    ownedSpecials: [],
  };
}

describe("placeSpecials", () => {
  it("places at most 7 specials on parent-type-matched worlds", () => {
    const empires = [makeEmpire("e1"), makeEmpire("e2")];
    const systems = [makeSystem("s1", "e1"), makeSystem("s2", "e2")];
    const planets = [
      makePlanet(
        "p_food",
        "s1",
        PlanetType.Agricultural,
        PlanetBiome.Breadbasket,
        "e1",
      ),
      makePlanet(
        "p_tech",
        "s2",
        PlanetType.TechWorld,
        PlanetBiome.ResearchCluster,
        "e2",
      ),
    ];
    const r = placeSpecials({
      empires,
      systems,
      planets,
      rng: new SeededRNG(1),
    });
    expect(r.placed.length + r.skipped.length).toBe(7);
    for (const p of r.placed) {
      const def = SPECIALS[p.specialId];
      const planet = planets.find((pl) => pl.id === p.planetId)!;
      expect(planet.type).toBe(def.parentPlanetType);
    }
  });

  it("is deterministic with same seed", () => {
    const setup = () => {
      const empires = [makeEmpire("e1"), makeEmpire("e2"), makeEmpire("e3")];
      const systems = [
        makeSystem("s1", "e1"),
        makeSystem("s2", "e2"),
        makeSystem("s3", "e3"),
      ];
      const planets = Object.values(PlanetType).map((t, i) =>
        makePlanet(
          `p${i}`,
          `s${(i % 3) + 1}`,
          t,
          PlanetBiome.Colony,
          `e${(i % 3) + 1}`,
        ),
      );
      return { empires, systems, planets };
    };
    const a = placeSpecials({ ...setup(), rng: new SeededRNG(99) });
    const b = placeSpecials({ ...setup(), rng: new SeededRNG(99) });
    expect(a.placed.map((x) => x.specialId)).toEqual(
      b.placed.map((x) => x.specialId),
    );
  });
});
```

- [ ] **Step 9.2: Implement `SpecialPlacer.ts`**

Create `src/generation/SpecialPlacer.ts`:

```ts
import { SPECIALS } from "../data/specialResources.ts";
import type {
  Empire,
  Planet,
  PlanetType,
  SpecialId,
  System,
} from "../data/types.ts";
import type { SeededRNG } from "../utils/SeededRNG.ts";

export interface SpecialPlacementResult {
  placed: Array<{ specialId: SpecialId; empireId: string; planetId: string }>;
  skipped: SpecialId[];
}

export function placeSpecials(opts: {
  empires: Empire[];
  systems: System[];
  planets: Planet[];
  rng: SeededRNG;
}): SpecialPlacementResult {
  const { empires, systems, planets, rng } = opts;
  const result: SpecialPlacementResult = { placed: [], skipped: [] };

  // Map planet id -> empire id via systems
  const planetEmpire: Record<string, string> = {};
  const empireSize: Record<string, number> = {};
  for (const sys of systems) {
    if (!sys.empireId) continue;
    empireSize[sys.empireId] = (empireSize[sys.empireId] ?? 0) + 1;
    for (const pid of sys.planetIds ?? []) planetEmpire[pid] = sys.empireId;
  }

  // For each special, in fixed order (deterministic)
  for (const special of Object.values(SPECIALS)) {
    // Find candidate planets matching parent type with an empire owner not already loaded with 3 specials
    const candidates = planets.filter((p) => {
      const eId = planetEmpire[p.id] ?? (p as any)._empireId;
      if (!eId) return false;
      const empire = empires.find((e) => e.id === eId);
      if (!empire) return false;
      if (p.type !== special.parentPlanetType) return false;
      if (empire.ownedSpecials.length >= 3) return false;
      return true;
    });

    if (candidates.length === 0) {
      result.skipped.push(special.id);
      continue;
    }

    // Weight by territory size (bigger empires more likely)
    const weights = candidates.map((p) => {
      const eId = planetEmpire[p.id] ?? (p as any)._empireId;
      return empireSize[eId] ?? 1;
    });
    const chosen = weightedPick(candidates, weights, rng);
    chosen.specialResource = special.id;
    chosen.productionScale = Math.min(2.0, chosen.productionScale * 1.4);
    if (!chosen.productionTags.includes(special.parentCargo)) {
      chosen.productionTags = [...chosen.productionTags, special.parentCargo];
    }
    const eId = planetEmpire[chosen.id] ?? (chosen as any)._empireId;
    const empire = empires.find((e) => e.id === eId)!;
    empire.ownedSpecials = [...empire.ownedSpecials, special.id];
    result.placed.push({
      specialId: special.id,
      empireId: eId,
      planetId: chosen.id,
    });
  }

  return result;
}

function weightedPick<T>(items: T[], weights: number[], rng: SeededRNG): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.nextFloat() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
```

- [ ] **Step 9.3: Run tests — expect PASS**

```bash
npx vitest run src/generation/__tests__/SpecialPlacer.test.ts
```

- [ ] **Step 9.4: Commit**

```bash
git add src/generation/SpecialPlacer.ts src/generation/__tests__/SpecialPlacer.test.ts
git commit -m "feat(generation): add SpecialPlacer for 7 special-resource worlds"
```

---

### Task 10: Rewire `GalaxyGenerator.ts` to use the new pipeline

**Files:**

- Modify: `src/generation/GalaxyGenerator.ts`
- Modify: `src/generation/__tests__/GalaxyGenerator.test.ts`

This is the largest change. The new `generateGalaxy` flow:

```text
1. Read tier from preset (GALAXY_TIERS).
2. SpiralPlacer.placeSpiralGalaxy → systemPositions, empireAssignments, centroids, territories.
3. Build Empire[] from centroids/territories. Initialize archetype="balanced", ownedSpecials=[].
4. Build System[] from systemPositions, attach to empires via assignments.
5. For each system: pick planet count (1..4); assign type by orbital zone weights;
   for each planet: pick a biome for that type weighted by zone; resolve productionTags,
   consumptionTags, productionScale (× rng jitter), populationCap, initial population.
6. For each empire: reconcileEmpireProduction(empire, ownedWorlds, rng).
7. SpecialPlacer.placeSpecials.
8. Generate hyperlanes (existing MST-first path) — no other change.
9. Return GalaxyData (same shape, with new Planet/Empire fields populated).
```

- [ ] **Step 10.1: Write a failing integration test**

Modify `src/generation/__tests__/GalaxyGenerator.test.ts`. Add:

```ts
import { generateGalaxy } from "../GalaxyGenerator.ts";
import { REQUIRED_PRODUCER_TYPES } from "../../data/constants.ts";

describe("generateGalaxy (refresh)", () => {
  it("Quick tier produces approximately 300 systems and 11 empires", () => {
    const g = generateGalaxy(123, "quick");
    expect(g.systems.length).toBeGreaterThanOrEqual(290);
    expect(g.systems.length).toBeLessThanOrEqual(310);
    expect(g.empires.length).toBe(11);
  });

  it("every empire has territoryPolygon set", () => {
    const g = generateGalaxy(1, "quick");
    for (const e of g.empires) {
      expect(e.territoryPolygon).toBeDefined();
      expect(e.territoryPolygon!.vertices.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every empire produces all 5 required cargo types after reconciliation", () => {
    const g = generateGalaxy(7, "quick");
    for (const e of g.empires) {
      const empireWorlds = g.planets.filter(
        (p) => g.systems.find((s) => s.id === p.systemId)?.empireId === e.id,
      );
      const produced = new Set(empireWorlds.flatMap((p) => p.productionTags));
      for (const required of REQUIRED_PRODUCER_TYPES) {
        expect(
          produced.has(required),
          `empire ${e.id} missing producer for ${required}`,
        ).toBe(true);
      }
    }
  });

  it("places between 5 and 7 specials per galaxy", () => {
    const g = generateGalaxy(3, "quick");
    const specialPlanets = g.planets.filter(
      (p) => p.specialResource !== undefined,
    );
    expect(specialPlanets.length).toBeGreaterThanOrEqual(5);
    expect(specialPlanets.length).toBeLessThanOrEqual(7);
  });
});
```

- [ ] **Step 10.2: Refactor `GalaxyGenerator.ts`**

The implementation is large. Open `src/generation/GalaxyGenerator.ts` and:

1. Remove the `generateEmpireSectorCenters`, `generateBridgeSystems`, and `ensureAllPlanetTypes` paths.
2. Replace with calls into `placeSpiralGalaxy`, `reconcileEmpireProduction`, `placeSpecials`.

Key sections (replacing lines ~513–800 in the existing file):

```ts
import { GALAXY_TIERS } from "../data/constants.ts";
import { placeSpiralGalaxy } from "./SpiralPlacer.ts";
import { reconcileEmpireProduction } from "./EmpireReconciler.ts";
import { placeSpecials } from "./SpecialPlacer.ts";
import { BIOMES, getBiomesForType } from "../data/biomes.ts";
import { EmpireArchetype, PlanetType } from "../data/types.ts";

export function generateGalaxy(
  seed: number,
  gamePreset: "quick" | "standard" | "epic" = "standard",
  galaxyShape: GalaxyShape = "spiral",
  hyperlaneDensity: HyperlaneDensity = "medium",
): GalaxyData {
  const rng = new SeededRNG(seed);
  const tier = GALAXY_TIERS[gamePreset];

  // 1. Spiral + cluster
  const placement = placeSpiralGalaxy({
    rng,
    systemCount: tier.systemCount,
    empireCount: tier.empireCount,
  });

  // 2. Build empires
  const empires: Empire[] = placement.empireCentroids.map((centroid, i) => ({
    id: `empire_${i}`,
    name: pickEmpireName(rng, i),
    color: pickEmpireColor(i),
    tariffRate: 0.1,
    disposition: pickDisposition(rng),
    homeSystemId: "",
    leaderName: pickLeaderName(rng),
    leaderPortrait: pickLeaderPortrait(rng),
    archetype: EmpireArchetype.Balanced,
    ownedSpecials: [],
    territoryPolygon: placement.empireTerritories[i],
  }));

  // 3. Build systems
  const systems: System[] = placement.systemPositions.map((pos, i) => {
    const empireIdx = placement.empireAssignments[i];
    const empireId = empires[empireIdx].id;
    return {
      id: `system_${i}`,
      name: pickSystemName(rng, i),
      x: pos.x,
      y: pos.y,
      empireId,
      planetIds: [],
    };
  });

  // 3a. Assign each empire's first system as its home
  for (let i = 0; i < empires.length; i++) {
    const homeSys = systems.find((s) => s.empireId === empires[i].id);
    if (homeSys) empires[i].homeSystemId = homeSys.id;
  }

  // 4. Generate planets per system
  const planets: Planet[] = [];
  for (const sys of systems) {
    const planetCount =
      rng.nextInt(tier.planetsPerSystem.max - tier.planetsPerSystem.min + 1) +
      tier.planetsPerSystem.min;
    for (let slot = 0; slot < planetCount; slot++) {
      const zone =
        slot < planetCount / 3
          ? "inner"
          : slot < (2 * planetCount) / 3
            ? "middle"
            : "outer";
      const type = pickPlanetType(zone, rng);
      const biome = pickBiome(type, zone, rng);
      const def = BIOMES[biome];
      const populationCap =
        Math.floor(rng.nextInt(8) + 2) * def.popCapMultiplier;
      const planet: Planet = {
        id: `planet_${planets.length}`,
        name: pickPlanetName(rng, sys.id, slot),
        systemId: sys.id,
        type,
        biome,
        productionTags: [...def.produces],
        consumptionTags: [...def.consumes],
        productionScale: def.productionScale * (0.85 + rng.nextFloat() * 0.3),
        populationCap,
        population: Math.max(
          0.5,
          populationCap * (0.4 + rng.nextFloat() * 0.4),
        ),
        x: sys.x,
        y: sys.y,
        orbitRadius: 0.4 + slot * 0.7,
        orbitPeriodQuarters: 4 + slot * 2,
        orbitPhase: rng.nextFloat() * 2 * Math.PI,
        orbitInclination: rng.nextFloat() * 0.05,
      };
      planets.push(planet);
      sys.planetIds.push(planet.id);
    }
  }

  // 5. Reconcile balance per empire
  for (const empire of empires) {
    const empireWorlds = planets.filter(
      (p) => systems.find((s) => s.id === p.systemId)?.empireId === empire.id,
    );
    reconcileEmpireProduction({ empire, worlds: empireWorlds, rng });
  }

  // 6. Place specials
  placeSpecials({ empires, systems, planets, rng });

  // 7. Hyperlanes (existing logic, unchanged)
  const hyperlanes = generateHyperlanes(systems, hyperlaneDensity, rng);

  // 8. Sectors — keep field for compat; map to empireCentroids
  const sectors = empires.map((e, i) => ({
    id: `sector_${i}`,
    empireId: e.id,
    centerX: placement.empireCentroids[i].x,
    centerY: placement.empireCentroids[i].y,
  }));

  return { sectors, empires, systems, planets, hyperlanes };
}

function pickPlanetType(
  zone: "inner" | "middle" | "outer",
  rng: SeededRNG,
): PlanetType {
  // simple zone weights — keep existing weighting if defined elsewhere
  const inner = [
    PlanetType.CoreWorld,
    PlanetType.TechWorld,
    PlanetType.Mining,
    PlanetType.Manufacturing,
  ];
  const middle = [
    PlanetType.Agricultural,
    PlanetType.Manufacturing,
    PlanetType.LuxuryWorld,
    PlanetType.TechWorld,
  ];
  const outer = [
    PlanetType.Frontier,
    PlanetType.Agricultural,
    PlanetType.Mining,
  ];
  const pool = zone === "inner" ? inner : zone === "middle" ? middle : outer;
  return pool[rng.nextInt(pool.length)];
}

function pickBiome(
  type: PlanetType,
  zone: "inner" | "middle" | "outer",
  rng: SeededRNG,
) {
  const candidates = getBiomesForType(type);
  const weights = candidates.map((b) => b.zoneWeights[zone] || 0.01);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.nextFloat() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i].id;
  }
  return candidates[candidates.length - 1].id;
}
```

(`pickEmpireName`, `pickSystemName`, etc. — keep existing helpers from `GalaxyGenerator.ts`. `generateHyperlanes` is the existing hyperlane code, unchanged.)

- [ ] **Step 10.3: Run typecheck — fix any unrelated breakage**

```bash
npm run typecheck
```

There will be errors in callers that read `Planet`/`Empire` fields that no longer exist (none — we only added). Errors in places that read `PLANET_CARGO_PROFILES` are expected and addressed in Phase 3.

- [ ] **Step 10.4: Run integration tests — expect PASS**

```bash
npx vitest run src/generation/__tests__/GalaxyGenerator.test.ts
```

- [ ] **Step 10.5: Commit**

```bash
git add src/generation/GalaxyGenerator.ts src/generation/__tests__/GalaxyGenerator.test.ts
git commit -m "feat(generation): rewire GalaxyGenerator to spiral+reconcile+specials pipeline"
```

---

### Task 11: Migrate `MarketInitializer.ts` to read tags

**Files:**

- Modify: `src/generation/MarketInitializer.ts`
- Modify: `src/generation/__tests__/MarketInitializer.test.ts` (if exists; create otherwise)

- [ ] **Step 11.1: Write the test**

Add to (or create) `src/generation/__tests__/MarketInitializer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createPlanetMarket } from "../MarketInitializer.ts";
import { CargoType, PlanetBiome, PlanetType } from "../../data/types.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";

function makePlanet(overrides: any = {}): any {
  return {
    id: "p1",
    name: "Planet 1",
    systemId: "s1",
    type: PlanetType.Agricultural,
    biome: PlanetBiome.Breadbasket,
    productionTags: ["food"],
    consumptionTags: ["technology", "luxury"],
    productionScale: 1.4,
    populationCap: 10,
    population: 5,
    x: 0,
    y: 0,
    ...overrides,
  };
}

describe("createPlanetMarket (tag-driven)", () => {
  it("seeds positive baseSupply for produced cargo and zero for non-produced", () => {
    const market = createPlanetMarket(makePlanet(), new SeededRNG(1));
    expect(market.entries.food.baseSupply).toBeGreaterThan(0);
    expect(market.entries.rawMaterials.baseSupply).toBe(0);
  });

  it("seeds positive baseDemand for consumption tags + per-capita goods", () => {
    const market = createPlanetMarket(makePlanet(), new SeededRNG(1));
    expect(market.entries.technology.baseDemand).toBeGreaterThan(0); // consumption tag
    expect(market.entries.luxury.baseDemand).toBeGreaterThan(0); // consumption tag + per-capita
    expect(market.entries.food.baseDemand).toBeGreaterThan(0); // per-capita
  });

  it("baseDemand scales with population", () => {
    const small = createPlanetMarket(
      makePlanet({ population: 1 }),
      new SeededRNG(1),
    );
    const big = createPlanetMarket(
      makePlanet({ population: 20 }),
      new SeededRNG(1),
    );
    expect(big.entries.food.baseDemand).toBeGreaterThan(
      small.entries.food.baseDemand,
    );
  });
});
```

- [ ] **Step 11.2: Refactor `MarketInitializer.ts`**

Replace the body of `createPlanetMarket`:

```ts
import { BASE_CARGO_PRICES, PER_CAPITA_DEMAND } from "../data/constants.ts";
import type { CargoType, Planet } from "../data/types.ts";
import { CargoType as Cargo } from "../data/types.ts";
import { BIOMES } from "../data/biomes.ts";
import type { SeededRNG } from "../utils/SeededRNG.ts";

const ALL_CARGO: CargoType[] = [
  Cargo.Passengers,
  Cargo.RawMaterials,
  Cargo.Food,
  Cargo.Technology,
  Cargo.Luxury,
  Cargo.Hazmat,
  Cargo.Medical,
];

export function createPlanetMarket(planet: Planet, rng: SeededRNG) {
  const biome = BIOMES[planet.biome];
  const consumeMul = biome?.consumeMultipliers ?? {};

  const entries: Record<CargoType, any> = {} as any;
  for (const cargo of ALL_CARGO) {
    const isProduced = planet.productionTags.includes(cargo);
    const isConsumed = planet.consumptionTags.includes(cargo);
    const perCap = PER_CAPITA_DEMAND[cargo] ?? 0;

    const baseSupply = isProduced
      ? Math.max(0.1, planet.productionScale * (3 + rng.nextFloat() * 2))
      : 0;

    const popDemand =
      perCap > 0 ? perCap * planet.population * (consumeMul[cargo] ?? 1) : 0;
    const tagDemand = isConsumed ? 2 + rng.nextFloat() * 2 : 0;
    const baseDemand = popDemand + tagDemand;

    entries[cargo] = {
      baseSupply,
      baseDemand,
      currentPrice: BASE_CARGO_PRICES[cargo],
      saturation: 0,
      trend: "stable" as const,
      trendMomentum: 0,
      eventModifier: 1,
    };
  }

  return { planetId: planet.id, entries };
}
```

- [ ] **Step 11.3: Run tests — expect PASS**

```bash
npx vitest run src/generation/__tests__/MarketInitializer.test.ts
```

- [ ] **Step 11.4: Commit**

```bash
git add src/generation/MarketInitializer.ts src/generation/__tests__/MarketInitializer.test.ts
git commit -m "feat(market): seed planet markets from biome tags + population"
```

---

## Phase 3 — Economy wiring

### Task 12: Update `MarketUpdater.ts` for per-capita demand and tag-driven boost

**Files:**

- Modify: `src/game/economy/MarketUpdater.ts`
- Modify: `src/game/economy/__tests__/MarketUpdater.test.ts`

- [ ] **Step 12.1: Add a test for the tag-driven boost**

Append to existing `MarketUpdater.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { updateMarket } from "../MarketUpdater.ts";
import { CargoType, PlanetBiome, PlanetType } from "../../../data/types.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";

function makeProducerPlanet(): any {
  return {
    id: "p1",
    name: "P1",
    systemId: "s1",
    type: PlanetType.TechWorld,
    biome: PlanetBiome.ForgeAcademy,
    productionTags: [CargoType.Technology],
    consumptionTags: [CargoType.RawMaterials, CargoType.Hazmat],
    productionScale: 1.0,
    populationCap: 5,
    population: 3,
    x: 0,
    y: 0,
  };
}

function makeMarket(): any {
  return {
    p1: {
      planetId: "p1",
      entries: {
        passengers: baselineEntry(),
        rawMaterials: baselineEntry(),
        food: baselineEntry(),
        technology: baselineEntry(0.5), // saturated halfway
        luxury: baselineEntry(),
        hazmat: baselineEntry(),
        medical: baselineEntry(),
      },
    },
  };
}

function baselineEntry(saturation = 0.5): any {
  return {
    baseSupply: 4,
    baseDemand: 2,
    currentPrice: 40,
    saturation,
    trend: "stable",
    trendMomentum: 0,
    eventModifier: 1,
  };
}

describe("updateMarket — biome-driven industry boost", () => {
  it("decays tech saturation faster when planet has its inputs satisfied", () => {
    const planet = makeProducerPlanet();

    const boosted = makeMarket();
    updateMarket(boosted as any, new SeededRNG(1), new Set(["p1"]), [planet]);

    const baseline = makeMarket();
    updateMarket(baseline as any, new SeededRNG(1), new Set<string>(), [
      planet,
    ]);

    expect(boosted.p1.entries.technology.saturation).toBeLessThan(
      baseline.p1.entries.technology.saturation,
    );
  });
});
```

Adjust import paths and the test seed/initial values to match the existing test file's helpers if they conflict — the assertion (boosted < baseline saturation) is the contract.

- [ ] **Step 12.2: Modify `MarketUpdater.ts`**

In `src/game/economy/MarketUpdater.ts`, replace the lookup at line ~52 (currently reading `PLANET_CARGO_PROFILES`) with the biome-tag equivalent. The boost should fire if the planet's `consumptionTags` are satisfied by active inbound routes (any inbound route counts):

```ts
// Replace:
//   const profile = PLANET_CARGO_PROFILES[planet.type];
// With:
const planet = planets?.find((p) => p.id === entry.planetId);
if (!planet) continue;

const isProducer = planet.productionTags.length > 0;
const inputsSatisfied = activeProducerIds?.has(planet.id) ?? false;

if (isProducer && inputsSatisfied) {
  for (const tag of planet.productionTags) {
    // existing boost logic on entry[tag]
  }
}
```

- [ ] **Step 12.3: Run tests — expect PASS**

```bash
npx vitest run src/game/economy/__tests__/MarketUpdater.test.ts
```

- [ ] **Step 12.4: Commit**

```bash
git add src/game/economy/MarketUpdater.ts src/game/economy/__tests__/MarketUpdater.test.ts
git commit -m "feat(market): drive industry boost from biome tags"
```

---

### Task 13: Extend `PriceCalculator.ts`

**Files:**

- Modify: `src/game/economy/PriceCalculator.ts`
- Modify: `src/game/economy/__tests__/PriceCalculator.test.ts`

**New API:**

```ts
export interface PriceContext {
  cargoType: CargoType;
  isCrossEmpireImport?: boolean; // sale crosses an empire border
  specialId?: SpecialId; // cargo is a special variant
}

export function calculatePrice(
  entry: CargoMarketEntry,
  ctx: PriceContext,
): number;
```

- [ ] **Step 13.1: Write tests**

Add to `src/game/economy/__tests__/PriceCalculator.test.ts`:

```ts
import { calculatePrice } from "../PriceCalculator.ts";
import { CargoType, SpecialId } from "../../data/types.ts";
import { IMPORT_MULTIPLIER } from "../../data/goodCategories.ts";
import { SPECIAL_PRICE_MULTIPLIER } from "../../data/specialResources.ts";

describe("calculatePrice extensions", () => {
  it("applies import multiplier (~1.25) on premium cross-empire sales", () => {
    const e = makeEntry(CargoType.Luxury);
    const dom = calculatePrice(e, { cargoType: CargoType.Luxury });
    const imp = calculatePrice(e, {
      cargoType: CargoType.Luxury,
      isCrossEmpireImport: true,
    });
    expect(imp).toBeCloseTo(dom * IMPORT_MULTIPLIER, 5);
  });

  it("does not apply import multiplier on bulk goods", () => {
    const e = makeEntry(CargoType.Food);
    const dom = calculatePrice(e, { cargoType: CargoType.Food });
    const imp = calculatePrice(e, {
      cargoType: CargoType.Food,
      isCrossEmpireImport: true,
    });
    expect(imp).toBeCloseTo(dom, 5);
  });

  it("special cargo earns ×2.5 premium and ignores saturation", () => {
    const saturated = makeEntry(CargoType.Luxury, { saturation: 0.9 });
    const normal = calculatePrice(saturated, { cargoType: CargoType.Luxury });
    const special = calculatePrice(saturated, {
      cargoType: CargoType.Luxury,
      specialId: SpecialId.LuxPleasureGarden,
    });
    expect(special).toBeGreaterThan(normal * 2);
  });
});
```

- [ ] **Step 13.2: Modify `PriceCalculator.ts`**

```ts
import {
  getGoodCategory,
  GoodCategory,
  IMPORT_MULTIPLIER,
} from "../../data/goodCategories.ts";
import { SPECIAL_PRICE_MULTIPLIER } from "../../data/specialResources.ts";
import type {
  CargoMarketEntry,
  CargoType,
  SpecialId,
} from "../../data/types.ts";

export interface PriceContext {
  cargoType: CargoType;
  isCrossEmpireImport?: boolean;
  specialId?: SpecialId;
}

export function calculatePrice(
  entry: CargoMarketEntry,
  ctx: PriceContext,
): number {
  const supplyDemand =
    entry.baseSupply <= 0
      ? 1
      : Math.min(
          3,
          Math.max(0.5, entry.baseDemand / Math.max(0.1, entry.baseSupply)),
        );

  const saturationFactor = ctx.specialId
    ? 1 // specials ignore saturation
    : 1 - Math.min(0.8, entry.saturation * 0.8);

  const trendModifier =
    entry.trend === "rising" ? 1.15 : entry.trend === "falling" ? 0.85 : 1;

  const importMul =
    ctx.isCrossEmpireImport &&
    getGoodCategory(ctx.cargoType) === GoodCategory.Premium
      ? IMPORT_MULTIPLIER
      : 1;

  const specialMul = ctx.specialId ? SPECIAL_PRICE_MULTIPLIER : 1;

  return (
    entry.currentPrice *
    supplyDemand *
    saturationFactor *
    trendModifier *
    entry.eventModifier *
    importMul *
    specialMul
  );
}
```

- [ ] **Step 13.3: Update existing callers**

Search for `calculatePrice(` and update each call site to pass a `PriceContext`. For domestic non-special trades the new arg is just `{ cargoType }`.

```bash
grep -rn "calculatePrice(" src/ --include="*.ts"
```

- [ ] **Step 13.4: Run tests — expect PASS**

```bash
npx vitest run src/game/economy/__tests__/PriceCalculator.test.ts
```

- [ ] **Step 13.5: Commit**

```bash
git add src/game/economy/PriceCalculator.ts src/game/economy/__tests__/PriceCalculator.test.ts $(grep -lrn "calculatePrice(" src/ --include="*.ts")
git commit -m "feat(price): add import multiplier and special premium"
```

---

### Task 14: Implement `PopulationLoop.ts`

**Files:**

- Create: `src/game/economy/PopulationLoop.ts`
- Create: `src/game/economy/__tests__/PopulationLoop.test.ts`

- [ ] **Step 14.1: Write tests**

Create `src/game/economy/__tests__/PopulationLoop.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { tickPopulation, type PopulationTickInput } from "../PopulationLoop.ts";

function makePlanet(pop: number, cap: number): any {
  return { id: "p1", population: pop, populationCap: cap };
}

describe("tickPopulation", () => {
  it("shrinks population after 3 turns of food deficit", () => {
    const planet = makePlanet(10, 20);
    const state = { foodDeficitStreak: 3, foodSurplusStreak: 0 };
    const r = tickPopulation({
      planet,
      foodBalance: -5,
      medicalSatisfied: true,
      state,
    });
    expect(r.newPopulation).toBeLessThan(10);
  });

  it("does not shrink before 3 turns of deficit", () => {
    const planet = makePlanet(10, 20);
    const state = { foodDeficitStreak: 1, foodSurplusStreak: 0 };
    const r = tickPopulation({
      planet,
      foodBalance: -5,
      medicalSatisfied: true,
      state,
    });
    expect(r.newPopulation).toBe(10);
  });

  it("grows population when surplus + medical satisfied for 5 turns", () => {
    const planet = makePlanet(10, 20);
    const state = { foodDeficitStreak: 0, foodSurplusStreak: 5 };
    const r = tickPopulation({
      planet,
      foodBalance: 5,
      medicalSatisfied: true,
      state,
    });
    expect(r.newPopulation).toBeGreaterThan(10);
  });

  it("never grows past populationCap", () => {
    const planet = makePlanet(20, 20);
    const state = { foodDeficitStreak: 0, foodSurplusStreak: 10 };
    const r = tickPopulation({
      planet,
      foodBalance: 100,
      medicalSatisfied: true,
      state,
    });
    expect(r.newPopulation).toBeLessThanOrEqual(20);
  });
});
```

- [ ] **Step 14.2: Implement `PopulationLoop.ts`**

```ts
import {
  FOOD_DEFICIT_TURNS_TO_SHRINK,
  FOOD_SURPLUS_TURNS_TO_GROW,
  POP_SHRINK_RATE_PER_TURN,
  POP_GROW_RATE_PER_TURN,
} from "../../data/constants.ts";
import type { Planet } from "../../data/types.ts";

export interface PopulationStreaks {
  foodDeficitStreak: number;
  foodSurplusStreak: number;
}

export interface PopulationTickInput {
  planet: Pick<Planet, "id" | "population" | "populationCap">;
  foodBalance: number; // production - demand
  medicalSatisfied: boolean;
  state: PopulationStreaks;
}

export interface PopulationTickResult {
  newPopulation: number;
  newState: PopulationStreaks;
}

export function tickPopulation(
  input: PopulationTickInput,
): PopulationTickResult {
  const { planet, foodBalance, medicalSatisfied, state } = input;

  let { foodDeficitStreak, foodSurplusStreak } = state;
  if (foodBalance < 0) {
    foodDeficitStreak += 1;
    foodSurplusStreak = 0;
  } else if (foodBalance > 0 && medicalSatisfied) {
    foodSurplusStreak += 1;
    foodDeficitStreak = 0;
  } else {
    foodDeficitStreak = 0;
    foodSurplusStreak = 0;
  }

  let newPopulation = planet.population;
  if (foodDeficitStreak >= FOOD_DEFICIT_TURNS_TO_SHRINK) {
    newPopulation = Math.max(
      0.1,
      planet.population * (1 - POP_SHRINK_RATE_PER_TURN),
    );
  } else if (foodSurplusStreak >= FOOD_SURPLUS_TURNS_TO_GROW) {
    newPopulation = Math.min(
      planet.populationCap,
      planet.population * (1 + POP_GROW_RATE_PER_TURN),
    );
  }

  return {
    newPopulation,
    newState: { foodDeficitStreak, foodSurplusStreak },
  };
}
```

- [ ] **Step 14.3: Run tests — expect PASS**

```bash
npx vitest run src/game/economy/__tests__/PopulationLoop.test.ts
```

- [ ] **Step 14.4: Commit**

```bash
git add src/game/economy/PopulationLoop.ts src/game/economy/__tests__/PopulationLoop.test.ts
git commit -m "feat(economy): add lightweight population/food loop"
```

---

### Task 15: Implement `CompanyBonusCalculator.ts`

**Files:**

- Create: `src/game/economy/CompanyBonusCalculator.ts`
- Create: `src/game/economy/__tests__/CompanyBonusCalculator.test.ts`

- [ ] **Step 15.1: Write tests**

```ts
import { describe, expect, it } from "vitest";
import { computeCompanyBonuses } from "../CompanyBonusCalculator.ts";
import { SpecialId } from "../../data/types.ts";

describe("computeCompanyBonuses", () => {
  it("returns zero bonuses with no specials", () => {
    const r = computeCompanyBonuses({ activeSpecialRoutes: [] });
    expect(r.fuelCostMultiplier).toBe(1);
    expect(r.cargoCapacityBonus).toBe(0);
    expect(r.repGainMultiplier).toBe(1);
  });

  it("applies -10% fuel for antimatter tap when route active", () => {
    const r = computeCompanyBonuses({
      activeSpecialRoutes: [SpecialId.HzmAntimatterTap],
    });
    expect(r.fuelCostMultiplier).toBeCloseTo(0.9);
  });

  it("stacks two bonuses additively", () => {
    const r = computeCompanyBonuses({
      activeSpecialRoutes: [SpecialId.TechJokaero, SpecialId.LuxPleasureGarden],
    });
    expect(r.cargoCapacityBonus).toBe(1);
    expect(r.repGainMultiplier).toBeCloseTo(1.15);
  });
});
```

- [ ] **Step 15.2: Implement**

```ts
import { SPECIALS } from "../../data/specialResources.ts";
import type { SpecialId } from "../../data/types.ts";

export interface CompanyBonusBundle {
  popGrowthMultiplier: number; // 1.0 baseline, e.g. 1.05 for +5%
  hullCostMultiplier: number; // 1.0 baseline
  cargoCapacityBonus: number; // flat addition per ship
  repGainMultiplier: number;
  fuelCostMultiplier: number;
  damageRecoveryMultiplier: number;
  passengerPayoutMultiplier: number;
}

export function computeCompanyBonuses(opts: {
  activeSpecialRoutes: SpecialId[];
}): CompanyBonusBundle {
  const bundle: CompanyBonusBundle = {
    popGrowthMultiplier: 1,
    hullCostMultiplier: 1,
    cargoCapacityBonus: 0,
    repGainMultiplier: 1,
    fuelCostMultiplier: 1,
    damageRecoveryMultiplier: 1,
    passengerPayoutMultiplier: 1,
  };
  for (const id of opts.activeSpecialRoutes) {
    const def = SPECIALS[id];
    const a = def.activeRouteBonus.amount;
    switch (def.activeRouteBonus.kind) {
      case "popGrowth":
        bundle.popGrowthMultiplier *= 1 + a / 100;
        break;
      case "hullCost":
        bundle.hullCostMultiplier *= 1 + a / 100;
        break;
      case "cargoCapacity":
        bundle.cargoCapacityBonus += a;
        break;
      case "reputationGain":
        bundle.repGainMultiplier *= 1 + a / 100;
        break;
      case "fuelCost":
        bundle.fuelCostMultiplier *= 1 + a / 100;
        break;
      case "damageRecovery":
        bundle.damageRecoveryMultiplier *= 1 + a / 100;
        break;
      case "passengerPayout":
        bundle.passengerPayoutMultiplier *= 1 + a / 100;
        break;
    }
  }
  return bundle;
}
```

- [ ] **Step 15.3: Run tests — expect PASS**

```bash
npx vitest run src/game/economy/__tests__/CompanyBonusCalculator.test.ts
```

- [ ] **Step 15.4: Commit**

```bash
git add src/game/economy/CompanyBonusCalculator.ts src/game/economy/__tests__/CompanyBonusCalculator.test.ts
git commit -m "feat(economy): add CompanyBonusCalculator for special-route bonuses"
```

---

### Task 16: Wire `PopulationLoop` into `TurnSimulator.ts`

**Files:**

- Modify: `src/game/simulation/TurnSimulator.ts`
- Modify: `src/data/types.ts` (extend GameState with per-planet streaks if not already stored)
- Modify: `src/game/simulation/__tests__/TurnSimulator.test.ts`

- [ ] **Step 16.1: Add streak storage**

In `src/data/types.ts`, add to GameState (find existing GameState definition):

```ts
export interface PopulationStreaksMap {
  [planetId: string]: { foodDeficitStreak: number; foodSurplusStreak: number };
}

// extend GameState with:
//   populationStreaks: PopulationStreaksMap;
```

Initialize to `{}` in any GameState constructor.

- [ ] **Step 16.2: Insert tick call after market update**

In `src/game/simulation/TurnSimulator.ts` (around line 645–650, after `updateMarket(...)`):

```ts
import { tickPopulation } from "../economy/PopulationLoop.ts";

// ... after updateMarket(...) ...
for (const planet of nextState.galaxy.planets) {
  const market = nextState.market.entries[planet.id];
  if (!market) continue;
  const foodEntry = market.entries.food;
  const medEntry = market.entries.medical;
  const foodBalance = foodEntry.baseSupply - foodEntry.baseDemand;
  const medSatisfied = medEntry.baseSupply >= medEntry.baseDemand * 0.8;
  const prev = nextState.populationStreaks[planet.id] ?? {
    foodDeficitStreak: 0,
    foodSurplusStreak: 0,
  };
  const r = tickPopulation({
    planet,
    foodBalance,
    medicalSatisfied: medSatisfied,
    state: prev,
  });
  planet.population = r.newPopulation;
  nextState.populationStreaks[planet.id] = r.newState;
}
```

- [ ] **Step 16.3: Add a test**

Add to `src/game/simulation/__tests__/TurnSimulator.test.ts`:

```ts
it("shrinks planet population after sustained food deficit", () => {
  const state = makeStateWithStarvingPlanet("p1");
  let s = state;
  for (let i = 0; i < 5; i++) s = simulateTurn(s);
  expect(s.galaxy.planets.find((p) => p.id === "p1")!.population).toBeLessThan(
    state.galaxy.planets.find((p) => p.id === "p1")!.population,
  );
});
```

(`makeStateWithStarvingPlanet` is a test helper — implement using existing test utilities in this file.)

- [ ] **Step 16.4: Run tests — expect PASS**

```bash
npx vitest run src/game/simulation/__tests__/TurnSimulator.test.ts
```

- [ ] **Step 16.5: Commit**

```bash
git add src/game/simulation/TurnSimulator.ts src/data/types.ts src/game/simulation/__tests__/TurnSimulator.test.ts
git commit -m "feat(simulation): tick PopulationLoop each turn"
```

---

### Task 17: Update `IndustryChain.ts` to resolve from tags

**Files:**

- Modify: `src/game/economy/IndustryChain.ts`
- Modify: `src/game/economy/__tests__/IndustryChain.test.ts`

- [ ] **Step 17.1: Replace input lookup**

In `src/game/economy/IndustryChain.ts`, replace `getInputCargo(planetType)` with biome-based resolution. Since biomes carry consumption tags, the "input" is now just any consumption tag the planet has.

```ts
import type { CargoType, Planet } from "../../data/types.ts";

/** A planet's industrial inputs are its biome's consumption tags. */
export function getInputCargoTags(planet: Planet): CargoType[] {
  return planet.consumptionTags;
}

/** A planet's industrial outputs are its production tags. */
export function getOutputCargoTags(planet: Planet): CargoType[] {
  return planet.productionTags;
}

// getActiveProducers signature unchanged but its inner check uses getInputCargoTags now.
```

Update existing callers (`MarketUpdater`, etc.) to use the new tag-based functions.

- [ ] **Step 17.2: Update tests**

Modify `IndustryChain.test.ts` to construct planets with `productionTags` / `consumptionTags` instead of relying on `PLANET_INDUSTRY_INPUT`.

- [ ] **Step 17.3: Run tests — expect PASS**

```bash
npx vitest run src/game/economy/__tests__/IndustryChain.test.ts
```

- [ ] **Step 17.4: Commit**

```bash
git add src/game/economy/IndustryChain.ts src/game/economy/__tests__/IndustryChain.test.ts
git commit -m "refactor(industry): resolve input/output from biome tags"
```

---

### Task 18: Update `EmpirePolicyGenerator.ts` to read from worlds

**Files:**

- Modify: `src/game/empire/EmpirePolicyGenerator.ts`
- Modify: `src/game/empire/__tests__/` (existing test if any)

- [ ] **Step 18.1: Replace `PLANET_CARGO_PROFILES` reads (lines ~99 and ~108)**

```ts
// Replace:
//   const profile = PLANET_CARGO_PROFILES[planet.type];
//   for (const c of profile.produces) producesSet.add(c);
//   for (const c of profile.demands) demandsSet.add(c);
// With:
for (const c of planet.productionTags) producesSet.add(c);
for (const c of planet.consumptionTags) demandsSet.add(c);
```

- [ ] **Step 18.2: Run typecheck and any related tests**

```bash
npm run typecheck
npx vitest run src/game/empire/
```

- [ ] **Step 18.3: Commit**

```bash
git add src/game/empire/EmpirePolicyGenerator.ts
git commit -m "refactor(empire): read producer/demand info from world tags"
```

---

## Phase 4 — Charters and UI plumbing

### Task 19: Special-cargo charters in `CharterManager.ts`

**Files:**

- Modify: `src/game/charters/CharterManager.ts`
- Modify: `src/game/charters/__tests__/CharterManager.test.ts` (or create)

**Behavior:** When `getAllCharters(empire, ...)` returns charters, append a special-cargo charter for each `empire.ownedSpecials` if and only if player reputation with this empire ≥ "respected".

- [ ] **Step 19.1: Write a test**

```ts
import { getAllCharters } from "../CharterManager.ts";
import { SpecialId } from "../../data/types.ts";

describe("special-cargo charters", () => {
  it("are listed when reputation ≥ respected", () => {
    const empire = { /* ... */ ownedSpecials: [SpecialId.LuxPleasureGarden] };
    const charters = getAllCharters(empire, { reputationTier: "respected" });
    expect(
      charters.some((c) => c.specialId === SpecialId.LuxPleasureGarden),
    ).toBe(true);
  });

  it("are NOT listed when reputation < respected", () => {
    const empire = { /* ... */ ownedSpecials: [SpecialId.LuxPleasureGarden] };
    const charters = getAllCharters(empire, { reputationTier: "unknown" });
    expect(
      charters.some((c) => c.specialId === SpecialId.LuxPleasureGarden),
    ).toBe(false);
  });
});
```

- [ ] **Step 19.2: Implement**

In `CharterManager.ts`, extend `getAllCharters` (or wrap it) to compose existing charters + special-cargo charters:

```ts
import { SPECIAL_CHARTER_TIER_THRESHOLD } from "../../data/constants.ts";
import { SPECIALS } from "../../data/specialResources.ts";

const TIER_RANK: Record<string, number> = {
  notorious: 0,
  unknown: 1,
  respected: 2,
  renowned: 3,
  legendary: 4,
};

function meetsThreshold(tier: string): boolean {
  return (
    (TIER_RANK[tier] ?? 0) >= (TIER_RANK[SPECIAL_CHARTER_TIER_THRESHOLD] ?? 2)
  );
}

// In getAllCharters or wherever charters are listed for an empire:
if (meetsThreshold(playerCtx.reputationTier)) {
  for (const id of empire.ownedSpecials) {
    const def = SPECIALS[id];
    charters.push({
      kind: "specialCargo",
      specialId: id,
      cargoType: def.parentCargo,
      // populate other fields per existing Charter shape
    });
  }
}
```

- [ ] **Step 19.3: Run tests — expect PASS**

```bash
npx vitest run src/game/charters/
```

- [ ] **Step 19.4: Commit**

```bash
git add src/game/charters/CharterManager.ts src/game/charters/__tests__/CharterManager.test.ts
git commit -m "feat(charters): list special-cargo charters at respected+ reputation"
```

---

### Task 20: Update `siteContent.ts` and `RoutePickerMap.ts` consumers

**Files:**

- Modify: `src/siteContent.ts`
- Modify: `src/ui/RoutePickerMap.ts`

- [ ] **Step 20.1: `siteContent.ts` — replace any rendering that lists `PLANET_CARGO_PROFILES[type].produces`**

```ts
// Before (around line 4 / 302):
//   const produces = PLANET_CARGO_PROFILES[type].produces;
// After: produce/consume info now comes per-world. siteContent likely shows
// per-type *summary* labels — switch to listing the union of all biome produces
// for that type:
import { getBiomesForType } from "./data/biomes.ts";
const summary = getBiomesForType(type).flatMap((b) => b.produces);
```

(Read the file first; the call is in the LABELS constant.)

- [ ] **Step 20.2: `RoutePickerMap.ts:354` — replace produces lookup**

The current lookup `PLANET_CARGO_PROFILES[planet.type].produces` becomes `planet.productionTags`. Update the call site accordingly (~line 354).

- [ ] **Step 20.3: Verify build**

```bash
npm run typecheck
```

- [ ] **Step 20.4: Commit**

```bash
git add src/siteContent.ts src/ui/RoutePickerMap.ts
git commit -m "refactor(ui): switch consumers to per-planet productionTags"
```

---

### Task 21: Surface `ownedSpecials` and `archetype` in empire detail UI

**Files:**

- Modify: `src/scenes/EmpireDetailScene.ts` (or whichever scene displays empire info — search for it)

- [ ] **Step 21.1: Find the empire-detail scene**

```bash
grep -rln "ownedSpecials\|EmpireDetailScene\|empire.leader" src/scenes/ --include="*.ts"
```

- [ ] **Step 21.2: Add a "Notable Resources" section listing each `ownedSpecials` with its `SPECIALS[id].name` and a one-line description**

```ts
import { SPECIALS } from "../data/specialResources.ts";

// inside the scene's render path:
if (empire.ownedSpecials.length > 0) {
  const lines = empire.ownedSpecials.map((id) => {
    const def = SPECIALS[id];
    return `${def.name} — ${def.description}`;
  });
  // append to the rendered empire panel using existing UI primitives
}
```

- [ ] **Step 21.3: Manual visual check (deferred to Phase 5 playthrough)**

- [ ] **Step 21.4: Commit**

```bash
git add src/scenes/EmpireDetailScene.ts
git commit -m "feat(ui): surface owned specials in empire detail"
```

---

### Task 22: Surface `biome` and `productionTags` in `PlanetDetailScene.ts`

**Files:**

- Modify: `src/scenes/PlanetDetailScene.ts`

- [ ] **Step 22.1: Add biome label and produce/consume tag chips**

Find where `population` is rendered (line ~126 per survey). Add adjacent labels:

```ts
import { BIOMES } from "../data/biomes.ts";
import { SPECIALS } from "../data/specialResources.ts";

// inside render:
const biome = BIOMES[planet.biome];
addLabel(`Biome: ${biome.id}`);
addLabel(`Produces: ${planet.productionTags.join(", ") || "—"}`);
addLabel(`Consumes: ${planet.consumptionTags.join(", ") || "—"}`);
if (planet.specialResource) {
  const def = SPECIALS[planet.specialResource];
  addLabel(`★ ${def.name}: ${def.description}`);
}
```

- [ ] **Step 22.2: Commit**

```bash
git add src/scenes/PlanetDetailScene.ts
git commit -m "feat(ui): show biome, production tags, and specials on planet detail"
```

---

### Task 23: Render empire territories on `GalaxyView2D.ts`

**Files:**

- Modify: `src/scenes/galaxy2d/GalaxyView2D.ts`

- [ ] **Step 23.1: Read `empire.territoryPolygon` and draw a translucent fill**

Find where existing border rendering happens. Add a polygon-fill pass:

```ts
const g = this.add.graphics();
for (const empire of this.galaxy.empires) {
  if (!empire.territoryPolygon) continue;
  g.fillStyle(empire.color, 0.12);
  g.beginPath();
  const v = empire.territoryPolygon.vertices;
  g.moveTo(toScreenX(v[0].x), toScreenY(v[0].y));
  for (let i = 1; i < v.length; i++)
    g.lineTo(toScreenX(v[i].x), toScreenY(v[i].y));
  g.closePath();
  g.fillPath();
}
```

(`toScreenX` / `toScreenY` are the existing camera-projection helpers in this scene.)

- [ ] **Step 23.2: Manual visual check during Phase 5 playthrough.**

- [ ] **Step 23.3: Commit**

```bash
git add src/scenes/galaxy2d/GalaxyView2D.ts
git commit -m "feat(galaxy2d): render empire territories from Voronoi polygons"
```

---

## Phase 5 — Cleanup, fuzz, perf, validation

### Task 24: Delete obsolete constants

**Files:**

- Modify: `src/data/constants.ts`

- [ ] **Step 24.1: Confirm no imports remain**

```bash
grep -rn "PLANET_CARGO_PROFILES\|PLANET_INDUSTRY_INPUT" src/ --include="*.ts"
```

Expected: only the constant definitions remain. If any consumers remain, fix them (update tests, etc.).

- [ ] **Step 24.2: Delete the constants**

In `src/data/constants.ts`, delete `PLANET_CARGO_PROFILES` (lines 587–626) and `PLANET_INDUSTRY_INPUT` (lines 638–646).

- [ ] **Step 24.3: Run typecheck + tests**

```bash
npm run typecheck && npm run test
```

- [ ] **Step 24.4: Commit**

```bash
git add src/data/constants.ts
git commit -m "chore(data): remove obsolete PLANET_CARGO_PROFILES and PLANET_INDUSTRY_INPUT"
```

---

### Task 25: Property/fuzz test for generation determinism

**Files:**

- Create: `src/generation/__tests__/GalaxyGenerator.fuzz.test.ts`

- [ ] **Step 25.1: Write fuzz tests**

```ts
import { describe, expect, it } from "vitest";
import { generateGalaxy } from "../GalaxyGenerator.ts";
import { REQUIRED_PRODUCER_TYPES } from "../../data/constants.ts";

describe("generateGalaxy fuzz", () => {
  it("never crashes across 50 seeds at quick tier", () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(() => generateGalaxy(seed, "quick")).not.toThrow();
    }
  });

  it("every empire satisfies producer coverage across 30 seeds", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = generateGalaxy(seed, "quick");
      for (const e of g.empires) {
        const empireWorlds = g.planets.filter(
          (p) => g.systems.find((s) => s.id === p.systemId)?.empireId === e.id,
        );
        const produced = new Set(empireWorlds.flatMap((p) => p.productionTags));
        for (const required of REQUIRED_PRODUCER_TYPES) {
          expect(
            produced.has(required),
            `seed=${seed} empire=${e.id} missing ${required}`,
          ).toBe(true);
        }
      }
    }
  });

  it("places 5..7 specials across all seeds", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = generateGalaxy(seed, "quick");
      const specials = g.planets.filter((p) => p.specialResource);
      expect(specials.length).toBeGreaterThanOrEqual(5);
      expect(specials.length).toBeLessThanOrEqual(7);
    }
  });
});
```

- [ ] **Step 25.2: Run fuzz tests — expect PASS**

```bash
npx vitest run src/generation/__tests__/GalaxyGenerator.fuzz.test.ts
```

- [ ] **Step 25.3: Commit**

```bash
git add src/generation/__tests__/GalaxyGenerator.fuzz.test.ts
git commit -m "test(generation): fuzz test producer coverage and special count"
```

---

### Task 26: Population stability fuzz

**Files:**

- Create: `src/game/economy/__tests__/PopulationLoop.fuzz.test.ts`

- [ ] **Step 26.1: Write the fuzz test**

```ts
import { describe, expect, it } from "vitest";
import { tickPopulation } from "../PopulationLoop.ts";

describe("PopulationLoop fuzz", () => {
  it("matched supply/demand reaches steady state and never NaN", () => {
    let pop = 10;
    let state = { foodDeficitStreak: 0, foodSurplusStreak: 0 };
    for (let t = 0; t < 100; t++) {
      const r = tickPopulation({
        planet: { id: "p", population: pop, populationCap: 20 },
        foodBalance: 0,
        medicalSatisfied: true,
        state,
      });
      pop = r.newPopulation;
      state = r.newState;
      expect(Number.isFinite(pop)).toBe(true);
    }
  });
});
```

- [ ] **Step 26.2: Run + commit**

```bash
npx vitest run src/game/economy/__tests__/PopulationLoop.fuzz.test.ts
git add src/game/economy/__tests__/PopulationLoop.fuzz.test.ts
git commit -m "test(economy): fuzz population stability under matched supply"
```

---

### Task 27: Run full CI gate; fix any cascading test failures

- [ ] **Step 27.1: Run the gate**

```bash
npm run check
```

If failures appear (likely in tests that built `Planet` / `Empire` objects without the new fields), fix them in place. Common pattern: add the missing required fields.

- [ ] **Step 27.2: Commit each batch of fixes**

```bash
git add <fixed test files>
git commit -m "test: update fixtures for refreshed Planet/Empire shape"
```

---

### Task 28: Manual playthrough at Quick tier with screenshots

**Per CLAUDE.md (`docs/pr-screenshots/pr-<NUM>/`):**

- [ ] **Step 28.1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 28.2: Use the QA console (`window.__sft`) to start a Quick game and visit:**
  - Galaxy view (verify two-arm spiral and Voronoi territory tints)
  - Planet detail (verify biome + tag display)
  - Empire detail (verify owned specials surface)
  - Charter list at low rep (specials hidden) and at respected rep (specials visible — use `__sft.setReputation(empireId, 50)`)

- [ ] **Step 28.3: Save screenshots to `docs/pr-screenshots/pr-<NUM>/galaxy.png`, `planet-detail.png`, `empire-detail.png`, `charters-low-rep.png`, `charters-high-rep.png`**

- [ ] **Step 28.4: Commit screenshots**

```bash
git add docs/pr-screenshots/pr-<NUM>/
git commit -m "docs: add screenshots for galaxy/economy refresh"
```

---

### Task 29: Performance smoke check at Standard tier

- [ ] **Step 29.1: Add a lightweight benchmark test (vitest)**

Create `src/game/simulation/__tests__/turn-perf.bench.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateGalaxy } from "../../../generation/GalaxyGenerator.ts";
import { simulateTurn } from "../TurnSimulator.ts";

describe("turn perf", () => {
  it("standard tier turn tick runs within 300ms (loose budget)", () => {
    const g = generateGalaxy(1, "standard");
    const state = makeInitialState(g); // existing helper
    const start = performance.now();
    simulateTurn(state);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(300);
  });
});
```

- [ ] **Step 29.2: Run; if it exceeds budget, file a follow-up issue rather than blocking this PR**

```bash
npx vitest run src/game/simulation/__tests__/turn-perf.bench.test.ts
```

- [ ] **Step 29.3: Commit**

```bash
git add src/game/simulation/__tests__/turn-perf.bench.test.ts
git commit -m "test(perf): standard-tier turn-tick smoke benchmark"
```

---

### Task 30: Final CI gate + PR

- [ ] **Step 30.1: Run `npm run check`. Must be green.**

```bash
npm run check
```

- [ ] **Step 30.2: Push branch and open PR with screenshots section per CLAUDE.md**

```bash
git push -u origin <branch>
gh pr create --title "feat: galaxy & economy refresh (spiral + biomes + specials + pop loop)" --body "$(cat <<'EOF'
## Summary
- ~300/450/600-system spiral galaxy with two-arm Voronoi territories
- Per-world tag-based production/consumption from 21 biomes
- Balanced empires guaranteed via reconciliation pass
- 7 special-resource planets with layered company bonuses
- Lightweight population/food loop tied to per-capita demand
- Save version bumped to 9; old saves rejected with a friendly error

Spec: `docs/plans/2026-05-09-galaxy-economy-refresh-design.md`
Plan: `docs/superpowers/plans/2026-05-09-galaxy-economy-refresh.md`

## Test plan
- [ ] `npm run check` green
- [ ] Manual playthrough screenshots attached
- [ ] Fuzz tests cover producer coverage + special count + population stability

## Screenshots
![Galaxy](docs/pr-screenshots/pr-<NUM>/galaxy.png)
![Planet detail](docs/pr-screenshots/pr-<NUM>/planet-detail.png)
![Empire detail](docs/pr-screenshots/pr-<NUM>/empire-detail.png)
![Charters (low rep)](docs/pr-screenshots/pr-<NUM>/charters-low-rep.png)
![Charters (high rep)](docs/pr-screenshots/pr-<NUM>/charters-high-rep.png)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Plan complete

After Task 30 the refresh is shippable:

- 7 specials placed deterministically per galaxy
- Every balanced empire produces all 5 required cargo types
- Worlds have biome-driven `productionTags` / `consumptionTags`, `productionScale`, `populationCap`
- Population grows/shrinks based on food balance
- Premium goods earn an import multiplier across borders
- Special-cargo charters appear at respected+ reputation
- Old saves are rejected with a clear message
- `PLANET_CARGO_PROFILES` and `PLANET_INDUSTRY_INPUT` are gone

**Future plans (not in this initiative):** specialized empire archetypes, deeper production chains, performance work at Epic tier, internal-empire politics.
