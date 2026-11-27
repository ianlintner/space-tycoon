# ST-PLAY ticket 5 — player outcome balance (Quick, seeded headless)

## Method

`src/game/simulation/__tests__/PlayerOutcomeBalance.test.ts` runs five fixed
seeds (`42, 100, 256, 777, 2026`) through the real Quick-preset game loop:

- **passive**: open the single highest-estimated-profit route on turn 1 using
  `scanAllRouteOpportunities`, then take no action for the rest of the game;
- **active**: each turn, accept at most one profitable contract, queue the next
  priority tech when the research queue drains, and open the best affordable
  route until capacity or slots run out.

Both policies use the same public action functions the UI uses (`createRoute`,
`addCargoLock`, `acceptContract`, `instantUnlockOrQueue`). No game logic is
stubbed; `simulateTurn` runs the market, AI, contracts and research unmodified.
Outcomes come from `getGameOutcome` and scores from `rankCompanies` (ticket 2).

**No constants were changed.** The existing economy already satisfies the
targets once outcomes are ranked, so the smallest possible tuning change is
none. This file pins the measured numbers so a future regression is visible.

## Results (final net worth, Quick/25 turns, 4 companies)

| Seed | Passive NW | Passive rank | Best rival NW (passive run) | Active NW | Active rank | Best rival NW (active run) |
| ---: | ---------: | -----------: | --------------------------: | --------: | ----------: | -------------------------: |
|   42 |  1,225,367 |          4/4 |                   6,776,225 | 6,847,541 |     **1/4** |                  6,394,188 |
|  100 |  1,339,052 |          4/4 |                   6,916,517 | 8,065,709 |     **1/4** |                  6,729,600 |
|  256 |  1,298,912 |          4/4 |                   7,018,583 | 7,740,854 |     **1/4** |                  7,146,704 |
|  777 |  1,456,015 |          4/4 |                   7,230,851 | 7,298,702 |         2/4 |                  7,700,089 |
| 2026 |  1,355,049 |          4/4 |                   6,775,598 | 8,136,636 |     **1/4** |                  7,172,491 |

Before this ticket the audit (`PLAYABLE.md`) recorded only the passive shape:
§1.1–1.4 M against rivals at §5.9–7.0 M, which ticket 2 correctly re-labelled
as a last-place finish. The passive column above reproduces that range on all
five seeds. The active columns are the new evidence that a decision-making
player can win.

## Targets

- Passive in the bottom half on every seed: **5/5** (rank 4/4 each time).
- Active reaches #1 on at least 3 of 5 seeds: **4/5** (42, 100, 256, 2026).
- Active never bankrupt: **0 bankruptcies** across all five seeds.

## Reproduction

```sh
npx vitest run src/game/simulation/__tests__/PlayerOutcomeBalance.test.ts
```

The test logs the full table via `console.table`; the same run is part of
`npx vitest run src/game/simulation` and `npm run check`.
