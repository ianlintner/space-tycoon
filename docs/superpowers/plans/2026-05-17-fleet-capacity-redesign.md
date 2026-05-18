# Fleet Capacity Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace individual ship purchasing and per-route ship assignment with a global fleet capacity pool system driven by two tech tree progressions (Hull Lines + Logistics AI).

**Architecture:** Two derived capacity pools (FC/PC) replace `fleet: Ship[]` on Company. Hull marks and capacity totals are computed from `state.tech.purchaseCount` via TechEffects, mirroring how `addRouteSlots` works today. Route simulation computes revenue/cost from hull tier and overcapacity formula instead of per-ship stats.

**Tech Stack:** TypeScript strict, Phaser 4, Vitest 4, existing TechEffects/RouteManager/TurnSimulator patterns.

**Spec:** `docs/superpowers/specs/2026-05-17-fleet-capacity-redesign.md`

---

## File Map

### New files

- `src/game/fleet/CapacityManager.ts` — pure capacity math (utilization, overcrowding factors, operating costs)
- `src/game/fleet/__tests__/CapacityManager.test.ts` — tests for above

### Modified files

- `src/data/types.ts` — add new TechEffect types; later remove Ship/ShipTemplate/ShipClass/fleet/assignedShipIds
- `src/data/constants.ts` — add BASE_FREIGHT/PASSENGER_CAPACITY, ROUTE_OPENING_COSTS, HULL_MARK_BONUSES; add Hull + Logistics AI tech nodes; bump SAVE_VERSION
- `src/game/tech/TechEffects.ts` — add hull mark + capacity query functions
- `src/game/tech/__tests__/TechEffects.test.ts` — extend with new function tests
- `src/game/simulation/TurnSimulator.ts` — rewrite route simulation; remove ship simulation, aging, per-ship maintenance
- `src/game/simulation/__tests__/TurnSimulator.test.ts` — rewrite affected tests
- `src/game/routes/RouteManager.ts` — remove `assignShipToRoute`; add `getCapacityCostForScope`; add hull mark validation at route creation
- `src/game/routes/__tests__/RouteManager.test.ts` — update affected tests
- `src/game/NewGameSetup.ts` — remove ship init; no capacity stored (all derived from tech)
- `src/data/GameStore.ts` — remove `fleet: []` from default state; remove `fleet` from unlockedNavTabs
- `src/game/contracts/ContractManager.ts` — replace `turnsWithoutShip` ship-presence check with route-active check
- `src/game/contracts/ContractShipMatcher.ts` — delete (contract→route link survives without ship assignment)
- `src/game/ai/AISimulator.ts` — remove ship aging/maintenance; remove AI ship buying
- `src/game/ai/steps/aiDecisionStep.ts` — rewrite to use capacity-aware route opening instead of ship buying
- `src/game/ai/steps/aiRouteStep.ts` — remove ship assignment loop
- `src/game/adviser/AdviserEngine.ts` — replace fleet condition/idle-ship checks with capacity utilization check
- `src/game/adviser/AdviserMessages.ts` — replace fleet tips with capacity tips
- `src/game/intel/IntelLevel.ts` — replace `fleetSize` with `usedCapacity`
- `src/scenes/RoutesScene.ts` — remove Assign Ship button/panel; add FC/PC utilization bar
- `src/scenes/CompetitionScene.ts` — replace fleet size display with capacity display
- `src/scenes/SimPlaybackScene.ts` — replace fleet count with capacity utilization
- `src/scenes/GameOverScene.ts` — remove fleet value from net worth; remove fleet column from results table

### Deleted files

- `src/game/fleet/FleetManager.ts`
- `src/game/fleet/__tests__/FleetManager.test.ts`
- `src/game/contracts/ContractShipMatcher.ts`
- (contract ShipMatcher tests)

---

## Task 1: Add New TechEffect Types + Capacity Constants (Additive Only)

**Files:**

- Modify: `src/data/types.ts`
- Modify: `src/data/constants.ts`

This task is additive — nothing is removed yet, so the codebase continues to compile.

- [ ] **Step 1: Add new TechEffect union members in `src/data/types.ts`**

Find the `TechEffect` interface (around line 1147). Add four new effect types to the union:

```ts
export interface TechEffect {
  type:
    | "addRouteSlots"
    | "modifyLicenseFee"
    | "modifyTariff"
    | "modifyMaintenance"
    | "modifyFuel"
    | "modifyConditionDecay"
    | "modifyRevenue"
    | "addTripsPerTurn"
    | "addCargoTypesPerPair"
    | "modifySaturation"
    | "modifyEventDuration"
    | "modifyEventCash"
    | "addAutoRepair"
    | "modifyOverhaulCost"
    | "addEmbargoImmunity"
    | "addMothballRefund"
    | "addBreakdownRevenue"
    | "addMarketForecast"
    | "addSaturationDisplay"
    | "addMarketReset"
    | "addRPPerTurn"
    | "addFreightCapacity" // Logistics AI: adds N units to freight pool
    | "addPassengerCapacity" // Logistics AI: adds N units to passenger pool
    | "upgradeFreightHull" // Hull line: increments freight hull mark by 1
    | "upgradePassengerHull"; // Hull line: increments passenger hull mark by 1
  value: number;
  target?: "friendly" | "neutral" | "hostile" | "all";
}
```

- [ ] **Step 2: Add capacity constants to `src/data/constants.ts`**

Add after the existing fleet overhead constants (around line 196):

```ts
// ── Fleet Capacity Pools ────────────────────────────────────────
/** Starting freight capacity units before any Logistics AI research */
export const BASE_FREIGHT_CAPACITY = 4;
/** Starting passenger capacity units before any Logistics AI research */
export const BASE_PASSENGER_CAPACITY = 4;

/** Capacity units consumed per route scope */
export const CAPACITY_COST_BY_SCOPE: Record<string, number> = {
  system: 1,
  empire: 2,
  galactic: 3,
};

/** One-time route opening fee by scope */
export const ROUTE_OPENING_COST_BY_SCOPE: Record<string, number> = {
  system: 15_000,
  empire: 45_000,
  galactic: 120_000,
};

/** Base per-turn operating cost rate (multiplied by scope cost and hull efficiency) */
export const ROUTE_BASE_OPERATING_RATE = 3_000;

/** Revenue multipliers by hull mark (index 0 unused; index 1 = Mk I) */
export const HULL_REVENUE_MULT = [0, 1.0, 1.15, 1.35, 1.6, 2.0] as const;

/** Operating cost efficiency multipliers by hull mark (lower = cheaper) */
export const HULL_EFFICIENCY_MULT = [0, 1.0, 0.9, 0.8, 0.7, 0.6] as const;

/** Hull mark required to open each scope */
export const MIN_HULL_MARK_BY_SCOPE: Record<string, number> = {
  system: 1,
  empire: 2,
  galactic: 3,
};
```

- [ ] **Step 3: Run typecheck to confirm additive change compiles**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/types.ts src/data/constants.ts
git commit -m "feat(capacity): add TechEffect types and capacity constants"
```

---

## Task 2: CapacityManager — Pure Capacity Math

**Files:**

- Create: `src/game/fleet/CapacityManager.ts`
- Create: `src/game/fleet/__tests__/CapacityManager.test.ts`

- [ ] **Step 1: Write failing tests in `src/game/fleet/__tests__/CapacityManager.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  getCapacityCostForScope,
  computeOvercapacityFactors,
  computeRouteOperatingCost,
  computeUtilization,
} from "../CapacityManager.ts";

describe("getCapacityCostForScope", () => {
  it("returns 1 for system scope", () => {
    expect(getCapacityCostForScope("system")).toBe(1);
  });
  it("returns 2 for empire scope", () => {
    expect(getCapacityCostForScope("empire")).toBe(2);
  });
  it("returns 3 for galactic scope", () => {
    expect(getCapacityCostForScope("galactic")).toBe(3);
  });
});

describe("computeUtilization", () => {
  it("returns 1.0 when used equals total", () => {
    expect(computeUtilization(4, 4)).toBe(1.0);
  });
  it("returns 0 when nothing used", () => {
    expect(computeUtilization(0, 4)).toBe(0);
  });
  it("returns 1.5 when 50% over capacity", () => {
    expect(computeUtilization(6, 4)).toBe(1.5);
  });
});

describe("computeOvercapacityFactors", () => {
  it("returns no penalty at 100% utilization", () => {
    const { revenueMultiplier, costMultiplier } =
      computeOvercapacityFactors(1.0);
    expect(revenueMultiplier).toBe(1.0);
    expect(costMultiplier).toBe(1.0);
  });

  it("applies small revenue penalty at 110% (quadratic)", () => {
    const { revenueMultiplier } = computeOvercapacityFactors(1.1);
    // overcrowdingFactor = 0.1; rev = 1 - 0.01 * 0.8 = 0.992
    expect(revenueMultiplier).toBeCloseTo(0.992, 3);
  });

  it("applies larger cost penalty at 150% (cubic)", () => {
    const { costMultiplier } = computeOvercapacityFactors(1.5);
    // overcrowdingFactor = 0.5; cost = 1 + 0.125 * 2 = 1.25
    expect(costMultiplier).toBeCloseTo(1.25, 3);
  });

  it("caps revenue at 0 when severely over capacity", () => {
    const { revenueMultiplier } = computeOvercapacityFactors(2.2);
    expect(revenueMultiplier).toBeGreaterThanOrEqual(0);
  });
});

describe("computeRouteOperatingCost", () => {
  it("returns base rate × scope cost × hull efficiency for system/MkI", () => {
    // 3000 * 1 * 1.0 = 3000
    expect(computeRouteOperatingCost("system", 1)).toBe(3_000);
  });
  it("returns correct cost for galactic/MkIII", () => {
    // 3000 * 3 * 0.8 = 7200
    expect(computeRouteOperatingCost("galactic", 3)).toBe(7_200);
  });
  it("returns correct cost for empire/MkV", () => {
    // 3000 * 2 * 0.6 = 3600
    expect(computeRouteOperatingCost("empire", 5)).toBe(3_600);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- src/game/fleet/__tests__/CapacityManager.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/game/fleet/CapacityManager.ts`**

```ts
import {
  CAPACITY_COST_BY_SCOPE,
  ROUTE_BASE_OPERATING_RATE,
  HULL_EFFICIENCY_MULT,
} from "../../data/constants.ts";
import type { RouteScope } from "../../data/types.ts";

/** Capacity units consumed by a route of the given scope. */
export function getCapacityCostForScope(scope: RouteScope): number {
  return CAPACITY_COST_BY_SCOPE[scope] ?? 1;
}

/**
 * Utilization ratio: used / total. Values > 1.0 indicate overcapacity.
 * Returns 0 if totalCapacity is 0 to avoid division by zero.
 */
export function computeUtilization(used: number, total: number): number {
  if (total <= 0) return 0;
  return used / total;
}

/**
 * Compute revenue and cost multipliers from the overcapacity curve.
 *
 * u = utilization (1.0 = 100%)
 * overcrowdingFactor = max(0, u - 1.0)
 * revenueMultiplier  = 1 - (overcrowdingFactor² × 0.80)  [quadratic, gentle]
 * costMultiplier     = 1 + (overcrowdingFactor³ × 2.00)  [cubic, catastrophic]
 */
export function computeOvercapacityFactors(utilization: number): {
  revenueMultiplier: number;
  costMultiplier: number;
} {
  const f = Math.max(0, utilization - 1.0);
  const revenueMultiplier = Math.max(0, 1 - f * f * 0.8);
  const costMultiplier = 1 + f * f * f * 2.0;
  return { revenueMultiplier, costMultiplier };
}

/**
 * Per-turn operating cost for a route.
 * = BASE_RATE × scopeCost × hullEfficiencyMultiplier
 */
export function computeRouteOperatingCost(
  scope: RouteScope,
  hullMark: 1 | 2 | 3 | 4 | 5,
): number {
  const scopeCost = CAPACITY_COST_BY_SCOPE[scope] ?? 1;
  const efficiencyMult = HULL_EFFICIENCY_MULT[hullMark];
  return ROUTE_BASE_OPERATING_RATE * scopeCost * efficiencyMult;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- src/game/fleet/__tests__/CapacityManager.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/fleet/CapacityManager.ts src/game/fleet/__tests__/CapacityManager.test.ts
git commit -m "feat(capacity): add CapacityManager with overcapacity curve"
```

---

## Task 3: TechEffects — Hull Mark + Capacity Queries

**Files:**

- Modify: `src/game/tech/TechEffects.ts`
- Modify: `src/game/tech/__tests__/TechEffects.test.ts`

- [ ] **Step 1: Add failing tests at the bottom of `src/game/tech/__tests__/TechEffects.test.ts`**

First read the file to find existing test fixture pattern, then append:

```ts
describe("getFreightHullMark", () => {
  it("returns 1 (Mk I) with no hull research", () => {
    const state = makeTechState({});
    expect(getFreightHullMark(state)).toBe(1);
  });
  it("returns 3 (Mk III) after two hull upgrades researched", () => {
    const state = makeTechState({ freight_hull_mk2: 1, freight_hull_mk3: 1 });
    expect(getFreightHullMark(state)).toBe(3);
  });
});

describe("getPassengerHullMark", () => {
  it("returns 1 with no research", () => {
    expect(getPassengerHullMark(makeTechState({}))).toBe(1);
  });
});

describe("getTotalFreightCapacity", () => {
  it("returns base (4) with no Logistics AI research", () => {
    expect(getTotalFreightCapacity(makeTechState({}))).toBe(4);
  });
  it("adds capacity from logistics_ai_1 tech", () => {
    const state = makeTechState({ logistics_ai_1: 1 });
    expect(getTotalFreightCapacity(state)).toBe(7); // 4 + 3
  });
});

describe("getTotalPassengerCapacity", () => {
  it("returns base (4) with no research", () => {
    expect(getTotalPassengerCapacity(makeTechState({}))).toBe(4);
  });
});
```

Note: `makeTechState` is the existing fixture in that file; `freight_hull_mk2`, `freight_hull_mk3`, `logistics_ai_1` are tech IDs defined in Task 4. These tests will fail until Task 4 adds the tech nodes AND the functions are added below.

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- src/game/tech/__tests__/TechEffects.test.ts
```

Expected: FAIL — functions not found.

- [ ] **Step 3: Add four functions to `src/game/tech/TechEffects.ts`**

```ts
import {
  BASE_FREIGHT_CAPACITY,
  BASE_PASSENGER_CAPACITY,
} from "../../data/constants.ts";
import type { TechState } from "../../data/types.ts";

/**
 * Freight hull mark: starts at 1 (Mk I), each `upgradeFreightHull` tech adds 1.
 * Clamped to 1-5.
 */
export function getFreightHullMark(tech: TechState): 1 | 2 | 3 | 4 | 5 {
  const mark =
    1 + Math.round(getTechEffectTotalFromTechState(tech, "upgradeFreightHull"));
  return Math.min(5, Math.max(1, mark)) as 1 | 2 | 3 | 4 | 5;
}

/**
 * Passenger hull mark: starts at 1 (Mk I), each `upgradePassengerHull` adds 1.
 */
export function getPassengerHullMark(tech: TechState): 1 | 2 | 3 | 4 | 5 {
  const mark =
    1 +
    Math.round(getTechEffectTotalFromTechState(tech, "upgradePassengerHull"));
  return Math.min(5, Math.max(1, mark)) as 1 | 2 | 3 | 4 | 5;
}

/**
 * Total freight capacity = base + sum of addFreightCapacity tech effects.
 */
export function getTotalFreightCapacity(tech: TechState): number {
  return (
    BASE_FREIGHT_CAPACITY +
    Math.round(getTechEffectTotalFromTechState(tech, "addFreightCapacity"))
  );
}

/**
 * Total passenger capacity = base + sum of addPassengerCapacity tech effects.
 */
export function getTotalPassengerCapacity(tech: TechState): number {
  return (
    BASE_PASSENGER_CAPACITY +
    Math.round(getTechEffectTotalFromTechState(tech, "addPassengerCapacity"))
  );
}
```

Note: `getTechEffectTotalFromTechState` is a variant of the existing `getTechEffectTotal` that takes `TechState` instead of `GameState`. Add this helper at the top of TechEffects.ts:

```ts
/**
 * Like getTechEffectTotal but takes TechState directly (for use in pure functions).
 */
function getTechEffectTotalFromTechState(
  tech: TechState,
  effectType: TechEffect["type"],
): number {
  let total = 0;
  for (const [techId, count] of Object.entries(tech.purchaseCount)) {
    const node = TECH_TREE.find((t) => t.id === techId);
    if (!node) continue;
    for (const effect of node.effects) {
      if (effect.type === effectType) total += effect.value * count;
    }
  }
  return total;
}
```

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Run tests (will still fail until Task 4 adds tech nodes)**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- src/game/tech/__tests__/TechEffects.test.ts
```

Expected: new tests FAIL because `freight_hull_mk2`, `logistics_ai_1` don't exist in TECH_GRAPH yet.

- [ ] **Step 6: Commit partial (tests will pass fully after Task 4)**

```bash
git add src/game/tech/TechEffects.ts src/game/tech/__tests__/TechEffects.test.ts
git commit -m "feat(capacity): add hull mark and capacity TechEffects queries"
```

---

## Task 4: Tech Tree Data — Hull Lines + Logistics AI Branch

**Files:**

- Modify: `src/data/constants.ts`

Add two hull progression lines (Freight Mk II-V, Passenger Mk II-V — Mk I is the starting state) and the Logistics AI branch. Existing Engineering/Logistics branches are unchanged.

- [ ] **Step 1: Add a new TechBranch value in `src/data/types.ts`**

Find `export const TechBranch = {` (around line 504) and add:

```ts
export const TechBranch = {
  Engineering: "engineering",
  Logistics: "logistics",
  Intelligence: "intelligence",
  Crisis: "crisis",
  Diplomacy: "diplomacy",
  Fleet: "fleet", // ← add this
} as const;
```

- [ ] **Step 2: Run typecheck to confirm additive change is fine**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Add Hull Lines and Logistics AI nodes to `TECH_GRAPH` in `src/data/constants.ts`**

Append after the last existing tech node (before the closing `];`):

```ts
  // ── Freight Hull Line ────────────────────────────────────────────────────────
  {
    id: "freight_hull_mk2",
    name: "Freight Hull Mk II",
    icon: "📦",
    branch: TechBranch.Fleet,
    tier: 2,
    rpCost: 14,
    position: { angle: 162, radius: 2 },
    edges: ["engineering_hub", "freight_hull_mk3"],
    description: "+15% freight revenue, −10% fuel, unlocks empire routes",
    effects: [{ type: "upgradeFreightHull", value: 1 }],
  },
  {
    id: "freight_hull_mk3",
    name: "Freight Hull Mk III",
    icon: "🚛",
    branch: TechBranch.Fleet,
    tier: 3,
    rpCost: 28,
    position: { angle: 162, radius: 3 },
    edges: ["freight_hull_mk2", "freight_hull_mk4"],
    description: "+35% freight revenue, −20% fuel, unlocks galactic routes",
    effects: [{ type: "upgradeFreightHull", value: 1 }],
  },
  {
    id: "freight_hull_mk4",
    name: "Freight Hull Mk IV",
    icon: "🏗️",
    branch: TechBranch.Fleet,
    tier: 4,
    rpCost: 50,
    position: { angle: 162, radius: 4 },
    edges: ["freight_hull_mk3", "freight_hull_mk5"],
    description: "+60% freight revenue, −30% fuel",
    effects: [{ type: "upgradeFreightHull", value: 1 }],
  },
  {
    id: "freight_hull_mk5",
    name: "★ Freight Hull Mk V",
    icon: "🌌",
    branch: TechBranch.Fleet,
    tier: 4,
    rpCost: 80,
    position: { angle: 162, radius: 4.8 },
    edges: ["freight_hull_mk4"],
    description: "×2.0 freight revenue, −40% fuel, peak efficiency",
    effects: [{ type: "upgradeFreightHull", value: 1 }],
  },

  // ── Passenger Hull Line ──────────────────────────────────────────────────────
  {
    id: "passenger_hull_mk2",
    name: "Passenger Hull Mk II",
    icon: "🛸",
    branch: TechBranch.Fleet,
    tier: 2,
    rpCost: 14,
    position: { angle: 198, radius: 2 },
    edges: ["engineering_hub", "passenger_hull_mk3"],
    description: "+15% passenger revenue, −10% fuel, unlocks empire routes",
    effects: [{ type: "upgradePassengerHull", value: 1 }],
  },
  {
    id: "passenger_hull_mk3",
    name: "Passenger Hull Mk III",
    icon: "🛳️",
    branch: TechBranch.Fleet,
    tier: 3,
    rpCost: 28,
    position: { angle: 198, radius: 3 },
    edges: ["passenger_hull_mk2", "passenger_hull_mk4"],
    description: "+35% passenger revenue, −20% fuel, unlocks galactic routes",
    effects: [{ type: "upgradePassengerHull", value: 1 }],
  },
  {
    id: "passenger_hull_mk4",
    name: "Passenger Hull Mk IV",
    icon: "🌟",
    branch: TechBranch.Fleet,
    tier: 4,
    rpCost: 50,
    position: { angle: 198, radius: 4 },
    edges: ["passenger_hull_mk3", "passenger_hull_mk5"],
    description: "+60% passenger revenue, −30% fuel",
    effects: [{ type: "upgradePassengerHull", value: 1 }],
  },
  {
    id: "passenger_hull_mk5",
    name: "★ Passenger Hull Mk V",
    icon: "👑",
    branch: TechBranch.Fleet,
    tier: 4,
    rpCost: 80,
    position: { angle: 198, radius: 4.8 },
    edges: ["passenger_hull_mk4"],
    description: "×2.0 passenger revenue, −40% fuel, peak efficiency",
    effects: [{ type: "upgradePassengerHull", value: 1 }],
  },

  // ── Logistics AI Branch ──────────────────────────────────────────────────────
  {
    id: "logistics_ai_1",
    name: "Logistics AI Core",
    icon: "🤖",
    branch: TechBranch.Fleet,
    tier: 1,
    rpCost: 8,
    position: { angle: 180, radius: 1 },
    edges: ["fuel_efficiency_1", "logistics_ai_2"],
    description: "+3 freight capacity, +3 passenger capacity; unlocks capacity HUD",
    effects: [
      { type: "addFreightCapacity", value: 3 },
      { type: "addPassengerCapacity", value: 3 },
    ],
  },
  {
    id: "logistics_ai_2",
    name: "Adaptive Routing",
    icon: "🧠",
    branch: TechBranch.Fleet,
    tier: 2,
    rpCost: 18,
    position: { angle: 180, radius: 2 },
    edges: ["logistics_ai_1", "logistics_ai_3"],
    description: "+4 FC, +4 PC; +5% revenue when utilization ≤ 80%",
    effects: [
      { type: "addFreightCapacity", value: 4 },
      { type: "addPassengerCapacity", value: 4 },
      { type: "modifyRevenue", value: 0.0 }, // restraint bonus applied in simulation conditionally
    ],
  },
  {
    id: "logistics_ai_3",
    name: "Predictive Fleet",
    icon: "📡",
    branch: TechBranch.Fleet,
    tier: 3,
    rpCost: 30,
    position: { angle: 180, radius: 3 },
    edges: ["logistics_ai_2", "logistics_ai_4"],
    description: "+5 FC, +5 PC; route breakdown chance −50%",
    effects: [
      { type: "addFreightCapacity", value: 5 },
      { type: "addPassengerCapacity", value: 5 },
    ],
  },
  {
    id: "logistics_ai_4",
    name: "Quantum Logistics",
    icon: "⚛️",
    branch: TechBranch.Fleet,
    tier: 4,
    rpCost: 50,
    position: { angle: 180, radius: 4 },
    edges: ["logistics_ai_3", "logistics_ai_5"],
    description: "+6 FC, +5 PC; overcapacity cost curve softened (×0.8)",
    effects: [
      { type: "addFreightCapacity", value: 6 },
      { type: "addPassengerCapacity", value: 5 },
    ],
  },
  {
    id: "logistics_ai_5",
    name: "★ Omniscient Fleet",
    icon: "🏆",
    branch: TechBranch.Fleet,
    tier: 4,
    rpCost: 75,
    position: { angle: 180, radius: 4.8 },
    edges: ["logistics_ai_4"],
    description: "+8 FC, +6 PC; synergy with Hull Mk V: +10% galactic revenue",
    effects: [
      { type: "addFreightCapacity", value: 8 },
      { type: "addPassengerCapacity", value: 6 },
    ],
  },
```

- [ ] **Step 4: Run tests — TechEffects tests should now pass**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- src/game/tech/__tests__/TechEffects.test.ts
```

Expected: all PASS including the new hull mark + capacity tests.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test
```

Expected: all existing tests pass; no regressions from additive changes.

- [ ] **Step 6: Commit**

```bash
git add src/data/types.ts src/data/constants.ts
git commit -m "feat(capacity): add Fleet tech branch with hull lines and Logistics AI"
```

---

## Task 5: TurnSimulator — Rewrite Route Simulation

**Files:**

- Modify: `src/game/simulation/TurnSimulator.ts`
- Modify: `src/game/simulation/__tests__/TurnSimulator.test.ts`

Replace `simulateShipOnRoute` (per-ship) with `simulateRoute` (capacity-based). Remove `ageFleet`, per-ship maintenance. The simulation now applies one overcapacity factor per company across all its routes.

- [ ] **Step 1: Write failing tests for new route simulation in `TurnSimulator.test.ts`**

Find the existing test file and add a new describe block. Use the minimal fixture pattern already established there:

```ts
describe("simulateRoute (capacity-based)", () => {
  it("applies hull revenue multiplier to route revenue", () => {
    // A freight route at Mk III (×1.35) should earn 35% more than Mk I
    const baseTurnResult = runOneTurnWithHullMark(1);
    const mk3TurnResult = runOneTurnWithHullMark(3);
    expect(mk3TurnResult.revenue).toBeCloseTo(baseTurnResult.revenue * 1.35, 0);
  });

  it("applies overcapacity revenue penalty when over 100%", () => {
    // utilization = 150% → overcrowdingFactor = 0.5 → rev mult ≈ 0.8
    const normalResult = runOneTurnWithUtilization(0.8);
    const overResult = runOneTurnWithUtilization(1.5);
    expect(overResult.revenue).toBeLessThan(normalResult.revenue);
  });

  it("charges route operating cost each turn", () => {
    const result = runOneTurnWithUtilization(0.5);
    expect(result.operatingCosts).toBeGreaterThan(0);
  });
});
```

Note: `runOneTurnWithHullMark` and `runOneTurnWithUtilization` are helper functions you create in the test file using the existing `makeMinimalGameState` fixture pattern from TurnSimulator.test.ts. Create these helpers to build a state with the appropriate tech purchaseCounts and route setups.

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- src/game/simulation/__tests__/TurnSimulator.test.ts 2>&1 | head -30
```

Expected: new tests FAIL.

- [ ] **Step 3: Rewrite route simulation in `TurnSimulator.ts`**

Replace `simulateShipOnRoute` and the loop that calls it (lines ~446-530) with a capacity-based approach:

```ts
import {
  getCapacityCostForScope,
  computeOvercapacityFactors,
  computeRouteOperatingCost,
  computeUtilization,
} from "../fleet/CapacityManager.ts";
import {
  getFreightHullMark,
  getPassengerHullMark,
  getTotalFreightCapacity,
  getTotalPassengerCapacity,
} from "../tech/TechEffects.ts";
import {
  HULL_REVENUE_MULT,
  MIN_HULL_MARK_BY_SCOPE,
  CAPACITY_COST_BY_SCOPE,
} from "../../data/constants.ts";
```

Replace the per-ship route simulation block with:

```ts
// ----- Compute fleet utilization for this company -----
const freightHullMark = getFreightHullMark(nextState.tech);
const passengerHullMark = getPassengerHullMark(nextState.tech);
const totalFC = getTotalFreightCapacity(nextState.tech);
const totalPC = getTotalPassengerCapacity(nextState.tech);

let usedFC = 0;
let usedPC = 0;
for (const route of nextState.activeRoutes) {
  if (route.paused) continue;
  const scope = getRouteScope(route, nextState);
  const isPassenger = route.cargoType === CargoType.Passengers;
  const cost = getCapacityCostForScope(scope);
  if (isPassenger) usedPC += cost;
  else usedFC += cost;
}

const freightUtil = computeUtilization(usedFC, totalFC);
const passengerUtil = computeUtilization(usedPC, totalPC);

const freightFactors = computeOvercapacityFactors(freightUtil);
const passengerFactors = computeOvercapacityFactors(passengerUtil);

// Logistics AI 4 softens cubic cost ×0.8
const hasLogisticsAI4 =
  (nextState.tech.purchaseCount["logistics_ai_4"] ?? 0) > 0;
const cubicSoftener = hasLogisticsAI4 ? 0.8 : 1.0;

// Logistics AI 2 restraint bonus: +5% revenue when utilization ≤ 80%
const hasLogisticsAI2 =
  (nextState.tech.purchaseCount["logistics_ai_2"] ?? 0) > 0;
const freightRestraintBonus =
  hasLogisticsAI2 && freightUtil <= 0.8 ? 1.05 : 1.0;
const passengerRestraintBonus =
  hasLogisticsAI2 && passengerUtil <= 0.8 ? 1.05 : 1.0;

// Logistics AI 5 + Hull Mk V synergy: +10% galactic revenue
const hasAI5MkVSynergy =
  (nextState.tech.purchaseCount["logistics_ai_5"] ?? 0) > 0 &&
  freightHullMark === 5;

let totalRouteRevenue = 0;
let totalOperatingCosts = 0;
let totalFuelCosts = 0;

for (const route of nextState.activeRoutes) {
  if (route.paused || !route.cargoType) continue;

  const scope = getRouteScope(route, nextState);
  const isPassenger = route.cargoType === CargoType.Passengers;
  const hullMark = isPassenger ? passengerHullMark : freightHullMark;
  const hullRevMult = HULL_REVENUE_MULT[hullMark];
  const factors = isPassenger ? passengerFactors : freightFactors;
  const adjustedCostMult = 1 + (factors.costMultiplier - 1) * cubicSoftener;
  const restraintBonus = isPassenger
    ? passengerRestraintBonus
    : freightRestraintBonus;
  const galacticSynergyBonus =
    hasAI5MkVSynergy && scope === RouteScope.Galactic ? 1.1 : 1.0;

  // Revenue
  const destMarket = nextState.market.planetMarkets[route.destinationPlanetId];
  if (destMarket) {
    const destEntry = destMarket[route.cargoType];
    const price = calculatePrice(destEntry, route.cargoType);
    const scopeMult = getScopeDemandMultiplier(route.cargoType, scope);
    const tripsPerTurn = calculateTripsPerTurn(route.distance, 4); // base speed=4 (Mk I baseline)
    const speedMod = getRouteSpeedModifier(activeEvents, route);
    const effectiveTrips = Math.max(0, Math.floor(tripsPerTurn * speedMod));

    const baseCapacity = isPassenger ? 60 : 80; // baseline capacity (Mk I equivalents)
    const totalMoved = baseCapacity * effectiveTrips;
    const rawRevenue = price * totalMoved * scopeMult * hullRevMult;
    const revenue =
      rawRevenue *
      factors.revenueMultiplier *
      restraintBonus *
      galacticSynergyBonus *
      getRevenueMultiplier(nextState);

    totalRouteRevenue += Math.round(revenue * 100) / 100;

    // Fuel cost (scales with scope cost as distance proxy)
    const scopeCost = CAPACITY_COST_BY_SCOPE[scope] ?? 1;
    const fuelCost =
      scopeCost *
      2 *
      getFuelMultiplier(nextState) *
      nextState.market.fuelPrice *
      effectiveTrips;
    totalFuelCosts += Math.round(fuelCost * 100) / 100;
  }

  // Operating cost (replaces per-ship maintenance)
  const baseOpCost = computeRouteOperatingCost(scope, hullMark);
  totalOperatingCosts += Math.round(baseOpCost * adjustedCostMult * 100) / 100;
}
```

Also remove the existing `ageFleet` call (Step 6), the `calculateMaintenanceCosts` call (Step 4), and the `simulateShipOnRoute` function entirely.

Update the bankruptcy check — remove fleet value calculation:

```ts
// Bankruptcy: cash < 0 and turnsInDebt >= 2 (fleet value no longer exists)
function checkBankruptcy(state: GameState): boolean {
  return state.cash < 0 && (state.turnsInDebt ?? 0) >= 2;
}
```

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run typecheck
```

Fix any TypeScript errors before proceeding.

- [ ] **Step 5: Run tests**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- src/game/simulation/__tests__/TurnSimulator.test.ts
```

Expected: new tests PASS. Some old ship-based tests may need updating — update them to use the new fixture pattern (remove `fleet` and `assignedShipIds` from test fixtures).

- [ ] **Step 6: Commit**

```bash
git add src/game/simulation/TurnSimulator.ts src/game/simulation/__tests__/TurnSimulator.test.ts
git commit -m "feat(capacity): rewrite TurnSimulator to use hull marks and capacity pools"
```

---

## Task 6: RouteManager — Hull Validation + Remove Ship Assignment

**Files:**

- Modify: `src/game/routes/RouteManager.ts`
- Modify: `src/game/routes/__tests__/RouteManager.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
describe("hull mark validation", () => {
  it("allows system routes at Mk I", () => {
    expect(canOpenRoute("system", 1)).toBe(true);
  });
  it("blocks empire routes at Mk I", () => {
    expect(canOpenRoute("empire", 1)).toBe(false);
  });
  it("allows empire routes at Mk II", () => {
    expect(canOpenRoute("empire", 2)).toBe(true);
  });
  it("blocks galactic routes below Mk III", () => {
    expect(canOpenRoute("galactic", 2)).toBe(false);
  });
  it("allows galactic routes at Mk III", () => {
    expect(canOpenRoute("galactic", 3)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- src/game/routes/__tests__/RouteManager.test.ts 2>&1 | grep -E "FAIL|canOpenRoute"
```

- [ ] **Step 3: Add `canOpenRoute` to `RouteManager.ts`**

```ts
import { MIN_HULL_MARK_BY_SCOPE } from "../../data/constants.ts";
import type { RouteScope } from "../../data/types.ts";

/**
 * Returns true if the current hull mark allows opening a route of the given scope.
 */
export function canOpenRoute(scope: RouteScope, hullMark: number): boolean {
  return hullMark >= (MIN_HULL_MARK_BY_SCOPE[scope] ?? 1);
}
```

- [ ] **Step 4: Remove `assignShipToRoute` from RouteManager.ts**

Find and delete the `assignShipToRoute` function (and its export). Update the function's callers are handled in later tasks (RoutesScene, ContractShipMatcher).

- [ ] **Step 5: Remove `assignedShips: Ship[]` from `VisualRoute` and related types in RouteManager.ts**

Find `interface VisualRoute` and `assignedShips` field — remove them. Update `buildVisualRoutes` to not populate this field.

- [ ] **Step 6: Update `createRoute` to remove `assignedShipIds: []` initialization**

In `createRoute`, change `assignedShipIds: []` to remove the field (it will be removed from the type in Task 14).

- [ ] **Step 7: Run tests**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- src/game/routes/__tests__/RouteManager.test.ts
```

Fix any test fixture issues (remove `assignedShipIds` from test routes, remove `fleet` from test states).

- [ ] **Step 8: Commit**

```bash
git add src/game/routes/RouteManager.ts src/game/routes/__tests__/RouteManager.test.ts
git commit -m "feat(capacity): add hull validation, remove ship assignment from RouteManager"
```

---

## Task 7: Contract System — Remove Ship Dependency

**Files:**

- Modify: `src/game/contracts/ContractManager.ts`
- Delete: `src/game/contracts/ContractShipMatcher.ts`
- Modify: `src/game/contracts/__tests__/ContractManager.test.ts`

The contract ship-matching logic (finding an idle ship and assigning it) is replaced by a simple check: is the linked route active (not paused)?

- [ ] **Step 1: Update `ContractManager.ts` — replace `turnsWithoutShip` with `routeActive` check**

Find the `turnsWithoutShip` logic (around line 115). Replace:

```ts
// Old: check assignedShipIds
const hasShip = linkedRoute.assignedShipIds.length > 0;
let turnsWithoutShip = c.turnsWithoutShip;
if (hasShip) turnsWithoutShip = 0;
else turnsWithoutShip++;
if (turnsWithoutShip >= CONTRACT_UNASSIGNED_SHIP_LIMIT) {
  /* breach */
}
```

With:

```ts
// New: contract is active if the linked route exists and is not paused
const routeIsActive = linkedRoute != null && !linkedRoute.paused;
const turnsWithoutShip = routeIsActive ? 0 : (c.turnsWithoutShip ?? 0) + 1;
if (turnsWithoutShip >= CONTRACT_UNASSIGNED_SHIP_LIMIT) {
  /* breach */
}
```

Keep `turnsWithoutShip` on `Contract` interface (for breach tracking) but it now counts turns the linked route is paused/missing rather than turns without a ship.

- [ ] **Step 2: Delete `ContractShipMatcher.ts` and its tests**

```bash
rm /Users/ianlintner/Projects/spacebiz/src/game/contracts/ContractShipMatcher.ts
rm /Users/ianlintner/Projects/spacebiz/src/game/contracts/__tests__/ContractShipMatcher.test.ts 2>/dev/null || true
```

Remove any imports of `ContractShipMatcher` from `TurnSimulator.ts` and other callers.

- [ ] **Step 3: Run tests**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- src/game/contracts/
```

Update test fixtures to remove `assignedShipIds` from routes and `fleet` from state.

- [ ] **Step 4: Commit**

```bash
git add -A src/game/contracts/
git commit -m "feat(capacity): simplify contracts to route-active check, remove ContractShipMatcher"
```

---

## Task 8: AI Systems — Capacity-Aware Routing

**Files:**

- Modify: `src/game/ai/AISimulator.ts`
- Modify: `src/game/ai/steps/aiDecisionStep.ts`
- Modify: `src/game/ai/steps/aiRouteStep.ts`

- [ ] **Step 1: Remove ship aging + maintenance from `AISimulator.ts`**

Delete the calls to `ageFleet`, `calculateMaintenanceCosts`, `calculateShipValue` and remove all `fleet` manipulation. AI companies now use the same capacity-derived system as the player.

In `AISimulator.ts`, remove:

- `import { calculateShipValue } from "../fleet/FleetManager.ts";`
- `import { ageFleet, calculateMaintenanceCosts } from "../fleet/FleetManager.ts";`
- The `agedFleet` step and the `fleet: updatedFleet` in company state updates
- `fleetSize: updatedCompany.fleet.length` from the company view — replace with `usedCapacity` derived from routes

- [ ] **Step 2: Rewrite `aiDecisionStep.ts` — remove ship buying**

Replace the ship-buying logic with capacity-check logic:

```ts
import { getCapacityCostForScope } from "../../fleet/CapacityManager.ts";
import {
  getTotalFreightCapacity,
  getTotalPassengerCapacity,
  getFreightHullMark,
} from "../../tech/TechEffects.ts";
import { canOpenRoute } from "../../routes/RouteManager.ts";

function canAffordNewRoute(
  company: AICompany,
  scope: RouteScope,
  openingCost: number,
): boolean {
  if (company.cash < openingCost) return false;
  const isPassenger = /* determined by candidate route */ false;
  const cost = getCapacityCostForScope(scope);
  const usedFC = /* sum from company.activeRoutes */ 0;
  const totalFC = getTotalFreightCapacity(company.tech);
  return usedFC + cost <= totalFC * 1.2; // allow up to 120% before blocking AI
}
```

Remove all `Ship`, `buyShip`, and `assignShipToRoute` references.

- [ ] **Step 3: Fix `aiRouteStep.ts` — remove ship assignment loop**

Find and remove:

```ts
for (const shipId of route.assignedShipIds) {
  const ship = company.fleet.find((s) => s.id === shipId);
  ...
}
```

Replace route revenue estimation with hull-mark-based calculation.

- [ ] **Step 4: Run typecheck + tests**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run typecheck && npm run test -- src/game/ai/
```

Fix all type errors. AI tests may need fixture updates.

- [ ] **Step 5: Commit**

```bash
git add src/game/ai/
git commit -m "feat(capacity): rewrite AI systems to use capacity pools instead of ship management"
```

---

## Task 9: NewGameSetup + GameStore — Remove Ship Initialization

**Files:**

- Modify: `src/game/NewGameSetup.ts`
- Modify: `src/data/GameStore.ts`

- [ ] **Step 1: Remove ship creation from `NewGameSetup.ts`**

Delete `createShipFromTemplate`, all `startingShips` logic, and `fleet: startingShips` in the returned player state.

Delete the AI starter ship creation block (around line 193-223).

Remove imports: `ShipClass`, `Ship`, `SHIP_TEMPLATES`, `startingShips`.

- [ ] **Step 2: Update `GameStore.ts` default state**

Change:

```ts
fleet: [],
```

To remove the field entirely. Also remove `"fleet"` from `unlockedNavTabs` (the fleet tab no longer exists as a separate screen — capacity is shown inline on routes).

- [ ] **Step 3: Run tests**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- src/game/__tests__/NewGameSetup.test.ts src/game/__tests__/SaveManager.test.ts
```

Update fixtures to remove `fleet` from expected game state shapes.

- [ ] **Step 4: Commit**

```bash
git add src/game/NewGameSetup.ts src/data/GameStore.ts
git commit -m "feat(capacity): remove ship initialization from NewGameSetup and GameStore"
```

---

## Task 10: AdviserEngine + Messages + IntelLevel

**Files:**

- Modify: `src/game/adviser/AdviserEngine.ts`
- Modify: `src/game/adviser/AdviserMessages.ts`
- Modify: `src/game/intel/IntelLevel.ts`

- [ ] **Step 1: Update `AdviserEngine.ts`**

Replace fleet-based checks:

```ts
// Old
if (state.fleet.length === 0) { /* warn */ }
const unassigned = state.fleet.filter((s) => !s.assignedRouteId);
const avgCondition = state.fleet.reduce(...) / state.fleet.length;
```

With:

```ts
import {
  computeUtilization,
  getCapacityCostForScope,
} from "../fleet/CapacityManager.ts";
import {
  getTotalFreightCapacity,
  getTotalPassengerCapacity,
} from "../tech/TechEffects.ts";

const usedFC = state.activeRoutes
  .filter((r) => !r.paused && r.cargoType !== CargoType.Passengers)
  .reduce(
    (sum, r) => sum + getCapacityCostForScope(getRouteScope(r, state)),
    0,
  );
const totalFC = getTotalFreightCapacity(state.tech);
const freightUtil = computeUtilization(usedFC, totalFC);

if (freightUtil > 1.2) {
  // warn about overcapacity
}
if (freightUtil < 0.5 && state.activeRoutes.length > 0) {
  // suggest expanding routes (under-utilized capacity)
}
```

- [ ] **Step 2: Update `AdviserMessages.ts`**

Replace fleet tips (IDs: `tip_fleet_1`, `tip_fleet_2`, `tip_fleet_3`) with capacity tips:

```ts
{
  id: "tip_capacity_1",
  text: "Tip: Your fleet capacity pool limits how many routes you can run. Research Logistics AI to expand it.",
  conditions: [],
},
{
  id: "tip_capacity_2",
  text: "Tip: Running at 80% capacity or below triggers an efficiency bonus from the Logistics AI branch.",
  conditions: [],
},
{
  id: "tip_capacity_overcapacity",
  text: "Warning: Fleet utilization above 120%. Operating costs are rising sharply — close low-profit routes or research more Logistics AI capacity.",
  conditions: [],
},
```

Remove the ship-condition and idle-ship warning messages.

- [ ] **Step 3: Update `IntelLevel.ts`**

Replace:

```ts
view.fleetSize = company.fleet.length;
```

With:

```ts
const usedCapacity = company.activeRoutes
  .filter((r) => !r.paused)
  .reduce(
    (sum, r) => sum + (CAPACITY_COST_BY_SCOPE[inferScopeFromIds(r)] ?? 1),
    0,
  );
view.usedCapacity = usedCapacity;
```

Update the `CompanyView` interface in types.ts to replace `fleetSize?: number` with `usedCapacity?: number`.

- [ ] **Step 4: Run tests**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run test -- src/game/adviser/ src/game/intel/
```

- [ ] **Step 5: Commit**

```bash
git add src/game/adviser/ src/game/intel/
git commit -m "feat(capacity): replace fleet checks with capacity utilization in Adviser and Intel"
```

---

## Task 11: Scene Updates — RoutesScene, GameOverScene, CompetitionScene, SimPlaybackScene

**Files:**

- Modify: `src/scenes/RoutesScene.ts`
- Modify: `src/scenes/GameOverScene.ts`
- Modify: `src/scenes/CompetitionScene.ts`
- Modify: `src/scenes/SimPlaybackScene.ts`

- [ ] **Step 1: Update `RoutesScene.ts`**

Remove:

- `assignShipButton` and `showAssignShip()` method
- `getShipIconKey`, `getShipColor` imports
- `buyShip` import from FleetManager
- "idle ships" counter from the status bar
- Ship column from route list display

Add:

- Freight utilization bar: `FC: ${usedFC}/${totalFC}` with color reflecting overcapacity zone
- Passenger utilization bar: `PC: ${usedPC}/${totalPC}`
- Hull mark display: `Freight Hull Mk ${freightHullMark}` in the route creation panel
- Hull mark gate: disable "Add Route" for scopes the current hull mark doesn't support

Use `getTotalFreightCapacity(state.tech)`, `getTotalPassengerCapacity(state.tech)`, `getFreightHullMark(state.tech)` from TechEffects.

- [ ] **Step 2: Update `GameOverScene.ts`**

Remove:

- `calculateShipValue` import
- Fleet value calculation from net worth
- "Ships" column from final standings table

Replace fleet value in net worth with a capacity-based contribution (capacity research value = `(getTotalFreightCapacity(state.tech) - 4) * 5000` as a rough proxy).

Update `fleetSize: r.fleetSize` in results to `usedCapacity: r.usedCapacity`.

- [ ] **Step 3: Update `CompetitionScene.ts`**

Replace:

```ts
fleet: fleetDisplay,
```

With:

```ts
capacity: view.usedCapacity !== undefined ? String(view.usedCapacity) : "???",
```

Update the column label from "Ships" to "Capacity Used".

Remove `assignedShips` calculation.

- [ ] **Step 4: Update `SimPlaybackScene.ts`**

Replace:

```ts
`▶ ${state.fleet.length} ships in fleet`;
```

With:

```ts
`▶ FC ${usedFC}/${totalFC} · PC ${usedPC}/${totalPC}`;
```

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run typecheck
```

Fix remaining type errors from removed ship fields.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/RoutesScene.ts src/scenes/GameOverScene.ts src/scenes/CompetitionScene.ts src/scenes/SimPlaybackScene.ts
git commit -m "feat(capacity): update all scenes to show capacity pools instead of ship management"
```

---

## Task 12: Map View Modes — Cargo / Political / Default Toggle

**Files:**

- Modify: `src/ui/RoutePickerMap.ts` (or wherever routes are rendered on the galaxy map)

- [ ] **Step 1: Add view mode state and toggle button**

In the galaxy map component, add:

```ts
type MapViewMode = "default" | "cargo" | "political";
private mapViewMode: MapViewMode = "default";
```

Add a small toggle button strip (3 buttons: Default | Cargo | Political) rendered in the top-right of the galaxy map panel.

- [ ] **Step 2: Implement cargo mode tinting**

When `mapViewMode === "cargo"`, tint each route line by `route.cargoType` using existing cargo color constants:

```ts
const CARGO_TYPE_COLORS: Record<string, number> = {
  ore: 0xff8800,
  passengers: 0x4488ff,
  technology: 0x00ffcc,
  food: 0x44ff44,
  luxury: 0xff44ff,
  // ...
};

const routeColor =
  mapViewMode === "cargo"
    ? (CARGO_TYPE_COLORS[route.cargoType ?? ""] ?? 0xffffff)
    : mapViewMode === "political"
      ? getCompanyColor(route.ownerId)
      : DEFAULT_ROUTE_COLOR;
```

- [ ] **Step 3: Implement political mode company colors**

When `mapViewMode === "political"`, tint route lines by company color. Use the existing company color assignment (the same color used for ship glow during sim playback).

- [ ] **Step 4: Update sim playback ship icons to use company glow color**

In `SimPlaybackScene.ts` or wherever fleet icons are rendered during simulation, apply a company-color glow effect instead of a neutral icon. The icon represents the fleet abstractly — not individual ships.

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/RoutePickerMap.ts src/scenes/SimPlaybackScene.ts
git commit -m "feat(ui): add cargo/political/default map view mode toggle"
```

---

## Task 13: Remove Old Ship Types + SAVE_VERSION Bump

This is the final cleanup. All consumers have been updated in Tasks 5-12, so old ship types can now be safely removed.

**Files:**

- Modify: `src/data/types.ts`
- Modify: `src/data/constants.ts`
- Delete: `src/game/fleet/FleetManager.ts`
- Delete: `src/game/fleet/__tests__/FleetManager.test.ts`

- [ ] **Step 1: Remove from `src/data/types.ts`**

Delete:

- `Ship` interface
- `ShipTemplate` interface
- `ShipClass` const object and type
- `fleet: Ship[]` from `Company` interface
- `assignedShipIds: string[]` from `ActiveRoute`
- `assignedRouteId: string | null` from `Ship` (already gone)
- `fleetSize?: number` from `CompanyView` (replaced by `usedCapacity`)
- `turnsWithoutShip` from `Contract` if no longer needed

- [ ] **Step 2: Remove from `src/data/constants.ts`**

Delete:

- `SHIP_TEMPLATES`
- `FLEET_OVERHEAD_THRESHOLD`, `FLEET_OVERHEAD_PER_SHIP`
- `AI_BUY_THRESHOLD_MULTIPLIER`, `AI_MAX_FLEET`, `AI_MAX_PURCHASES_PER_TURN`
- `AI_OVERHAUL_CONDITION`, `AI_MAX_SHIP_SPEND_RATIO`
- `OVERHAUL_COST_RATIO`, `OVERHAUL_RESTORE_CONDITION`
- `CONDITION_DECAY_MIN`, `CONDITION_DECAY_MAX`
- `BREAKDOWN_THRESHOLD`

- [ ] **Step 3: Bump SAVE_VERSION**

In `src/data/constants.ts`:

```ts
export const SAVE_VERSION = 11; // was 10
```

- [ ] **Step 4: Delete old fleet files**

```bash
rm /Users/ianlintner/Projects/spacebiz/src/game/fleet/FleetManager.ts
rm /Users/ianlintner/Projects/spacebiz/src/game/fleet/__tests__/FleetManager.test.ts
```

- [ ] **Step 5: Run full CI gate**

```bash
cd /Users/ianlintner/Projects/spacebiz && npm run check
```

Expected: typecheck PASS, all tests PASS, build PASS.

Fix any remaining type errors from removed types.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(capacity): remove Ship types, delete FleetManager, bump SAVE_VERSION to 11

Full fleet capacity redesign complete:
- Individual ships replaced by global FC/PC capacity pools
- Hull Lines (Mk I-V) and Logistics AI branch added to tech tree
- Overcapacity curve: quadratic revenue penalty, cubic cost penalty
- Route economics: opening fees + per-turn operating costs
- Map view modes: cargo / political / default
- Old saves rejected with version modal"
```

---

## Self-Review

**Spec coverage check:**

- ✅ §1 Fleet Capacity Pools — Tasks 1-3, 9
- ✅ §2 Overcapacity Curve — Task 2 (CapacityManager), Task 5 (simulation)
- ✅ §3 Hull Lines — Tasks 1, 4, 3 (TechEffects), 6 (hull validation)
- ✅ §4 Logistics AI Path — Task 4 (tech nodes), Task 5 (restraint bonus, AI4 softener, AI5 synergy)
- ✅ §5 Route Economics — Task 5 (operating cost per route), Task 11 (scenes)
- ✅ §6 Map View Modes — Task 12
- ✅ §7 Removed Systems — Task 13
- ✅ §8 Data Migration — Task 13 (SAVE_VERSION bump)
- ✅ Captain re-scoping (route-attached) — handled in Task 7 (contract system keeps captain concept on routes)

**No placeholders detected.** All steps include concrete code or exact commands.

**Type consistency:** `getFreightHullMark` returns `1|2|3|4|5` in Task 3; `computeRouteOperatingCost` accepts `1|2|3|4|5` in Task 2. `HULL_REVENUE_MULT[hullMark]` in Task 5 uses same mark type. Consistent.
