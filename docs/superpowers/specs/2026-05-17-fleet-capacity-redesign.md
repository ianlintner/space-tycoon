# Fleet Capacity Redesign — Spec

**Date:** 2026-05-17  
**Status:** Approved

## Overview

Replace individual ship purchasing and per-route ship assignment with a global fleet capacity pool system. Players act as galactic transport CEOs — connecting and growing a route network, researching hull technology, and managing a Logistics AI. The operational layer (buying ships, assigning them to routes) is eliminated entirely.

---

## 1. Fleet Capacity Pools

Each company has two global capacity pools:

```ts
freightCapacity: number; // FC units available
passengerCapacity: number; // PC units available
```

**Starting values:** FC: 4, PC: 4 — enough for 3–4 short routes, forcing early directional choices.

Each active route consumes capacity units from the matching pool based on distance band:

| Band     | Distance | Capacity cost |
| -------- | -------- | ------------- |
| System   | ≤ 3      | 1 unit        |
| Empire   | 4–8      | 2 units       |
| Galactic | 9+       | 3 units       |

Route `hullLine: "freight" | "passenger"` determines which pool it draws from. Mixed cargo/passenger routes draw from both pools — cost is 1 FC + 1 PC per distance band unit (e.g. an empire mixed route costs 2 FC + 2 PC).

**Utilization** = sum of active route costs ÷ pool size × 100%.

`assignedShipIds[]` on routes and `assignedRouteId` on ships are removed. Routes have no ship references.

---

## 2. Overcapacity Curve

Let `u = usedCapacity / totalCapacity` (1.0 = 100%, 1.5 = 150%).

```
overcrowdingFactor = max(0, u - 1.0)

revenueMultiplier  = 1 - (overcrowdingFactor²  × 0.80)
costMultiplier     = 1 + (overcrowdingFactor³  × 2.00)
```

Revenue degrades quadratically (gentle early). Operating costs blow up cubically (catastrophic late). The gap between the two curves is the trap — revenue looks manageable at 130% while costs are already compounding.

| Utilization | Revenue penalty | Cost increase |
| ----------- | --------------- | ------------- |
| 100%        | 0%              | 0%            |
| 110%        | −0.8%           | +0.2%         |
| 120%        | −3.2%           | +1.6%         |
| 130%        | −7.2%           | +5.4%         |
| 150%        | −20%            | +25%          |
| 175%        | −45%            | +95%          |
| 200%        | −80%            | +200%         |

Above 150%, random route breakdowns trigger as low-probability events, adding operational chaos on top of economic pressure.

The HUD shows a utilization gauge with a green→yellow→orange→red gradient. Exact penalty values are not displayed — players learn the curve through experience.

---

## 3. Hull Lines

Two independent tech tree progressions. Both live in the Engineering branch.

**Freight Hull:** Mk I → Mk II → Mk III → Mk IV → Mk V  
**Passenger Hull:** Mk I → Mk II → Mk III → Mk IV → Mk V

| Mark   | Distance unlock | Revenue mult | Fuel efficiency |
| ------ | --------------- | ------------ | --------------- |
| Mk I   | System (≤3)     | ×1.00        | ×1.00           |
| Mk II  | Empire (≤8)     | ×1.15        | ×0.90           |
| Mk III | Galactic (any)  | ×1.35        | ×0.80           |
| Mk IV  | Galactic        | ×1.60        | ×0.70           |
| Mk V   | Galactic        | ×2.00        | ×0.60           |

**Rules:**

- Hull mark applies globally to all routes of that type — no per-route assignment.
- Empire-range routes are hard-gated behind Mk II. Galactic routes require Mk III.
- Upgrading a mark instantly benefits the entire active network of that hull type.
- Freight and Passenger lines research independently — players choose which to prioritize.

---

## 4. Logistics AI Path

A new tech branch unlocked around turn 5–6. Five levels providing capacity growth and strategic bonuses.

| Level | FC added | PC added | Bonus                                   |
| ----- | -------- | -------- | --------------------------------------- |
| AI-1  | +3       | +3       | Overcapacity warning HUD gauge          |
| AI-2  | +4       | +4       | +5% revenue when utilization ≤ 80%      |
| AI-3  | +5       | +5       | Route breakdown chance −50%             |
| AI-4  | +6       | +5       | Overcapacity cubic cost multiplier ×0.8 |
| AI-5  | +8       | +6       | Efficiency bonus synergy with Hull Mk V |

**Design intent:**

- AI-2 restraint bonus creates counter-pressure against over-expansion.
- AI-4 softens the cubic cost trap for players who invested early — punishes those who skipped it and overextended.
- AI-5 synergy with Hull Mk V rewards the player who builds the full tech stack.

---

## 5. Route Economics

Ships are removed. Money gravity comes from three cost layers:

**Opening fee (one-time, replaces ship purchase):**

| Distance band | Fee     |
| ------------- | ------- |
| System        | 15,000  |
| Empire        | 45,000  |
| Galactic      | 120,000 |

**Per-turn operating cost:**

```
operatingCost = 3000 × distanceBand × hullEfficiencyMultiplier
```

Hull efficiency multiplier: Mk I = ×1.0, Mk II = ×0.90, Mk III = ×0.80, Mk IV = ×0.70, Mk V = ×0.60.

A galactic route at Mk I costs 9,000/turn. At Mk V: 5,400/turn.

**Revenue:**

Existing demand/cargo price system applies, multiplied by hull tier revenue multiplier and capacity overcrowding factor. A well-placed empire route at Mk III returns ~3–4× its operating cost per turn — break-even on opening fee in ~8–12 turns.

**Route closing:**

Player can close a route at any time to reclaim capacity. No refund on opening fee. This is the release valve when overcapacity starts biting — closing routes is a painful but necessary decision.

**Balance targets:**

- Early game: 2–3 system routes generating enough profit to fund first hull research.
- Mid game: hull and AI research racing; empire routes opening up.
- Late game: galactic network with Mk IV–V making the whole empire profitable.

---

## 6. Map View Modes

A toggle button on the galaxy map cycles through three render modes:

**Default mode:** Current neutral route display.

**Cargo mode:** Route lines tinted by cargo type using existing cargo colors (ore = amber, passengers = blue, tech = cyan, etc.). Reveals what the network is carrying and where gaps exist.

**Political mode:** Routes drawn in the owning company's color. Rivals visible in their company colors. Shows territorial dominance at a glance.

**Ships on map (simulation playback):** Abstract fleet icons (not individual ships) travel along routes with a soft company-color glow halo. No individual ship identity — just traffic flow.

No new game state required — view modes are render passes over existing route and simulation data.

---

## 7. Removed Systems

The following are deleted:

- `Ship` interface and `fleet: Ship[]` on company state
- `ShipTemplate` and `SHIP_TEMPLATES` constants
- `ShipClass` union type
- `buyShip()`, `FleetManager`
- `assignedShipIds[]` on `ActiveRoute`
- `assignedRouteId`, `captainId`, `condition`, `age`, `reliability` on ships
- Ship condition decay, overhaul, and maintenance cost per-ship calculations
- AI ship purchasing logic (`AI_BUY_THRESHOLD_MULTIPLIER`, `AI_MAX_FLEET`, etc.)

**Captain system:** Captains are re-scoped from ship-attached to route-attached. A captain assigned to a route provides a bonus directly (e.g. +5% revenue on that route). This preserves captain flavor without requiring individual ships.

---

## 8. Data Migration

Save version must be bumped. Old saves with `fleet: Ship[]` are rejected with a friendly "new version" modal — no migration attempted. Starting capacity values are assigned to existing companies on new game start.

---

## Out of Scope

- Hub-anchored fleet zones (Option B) — deferred, add if global pools feel too simple
- Per-hull-mark special cargo class unlocks — deferred to follow-up pass
- Logistics AI minor bonus tree optimization UI — deferred
