import { test, expect } from "./fixtures/sft.ts";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Outcome capture/assertion spec for ST-PLAY-2.
 *
 * The full-loop spec exercises the real TurnReport → GameOver hand-off. These
 * two cases instead seed state through the QA facade so the rank headline and
 * the always-visible player row can be captured deterministically:
 *   - a passive run whose score is below the rivals (FINISHED #N OF M)
 *   - a seeded run where player cash puts them at #1 (VICTORY)
 */
test.use({ video: "off" });

const shotDir = process.env.SFT_OUTCOME_SHOTS;

async function reachGameOver(
  page: import("@playwright/test").Page,
  sft: import("./fixtures/SftDriver.ts").SftDriver,
  opts: { seed: number; cash?: number; rivalCash?: number },
) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await sft.ready();
  await sft.actions.seed(opts.seed);
  await sft.actions.seedRivals(opts.seed);
  if (opts.cash !== undefined) await sft.actions.setPlayerCash(opts.cash);
  if (opts.rivalCash !== undefined) {
    await sft.actions.setRivalCash(0, opts.rivalCash);
  }
  await sft.actions.forceGameOver("completed");
  await page.waitForFunction(
    () =>
      window.__sft?.currentScene().active.includes("GameOverScene") ?? false,
    null,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1200);
  return sft.getGameOutcome();
}

async function capture(
  page: import("@playwright/test").Page,
  name: string,
): Promise<void> {
  if (!shotDir) return;
  fs.mkdirSync(path.resolve(shotDir), { recursive: true });
  await page.screenshot({ path: path.resolve(shotDir, name) });
}

test("placed run: headline says Finished #N of M and player row is visible", async ({
  page,
  sft,
}) => {
  const { outcome, displayed } = await reachGameOver(page, sft, {
    seed: 4242,
    rivalCash: 50_000_000,
  });
  expect(outcome.kind, "seeded rival winner puts player in a placed rank").toBe(
    "placed",
  );
  expect(outcome.rank).toBeGreaterThan(1);
  expect(outcome.rank).toBeLessThanOrEqual(outcome.of);
  expect(displayed!.heading).toBe(outcome.label);
  expect(displayed!.subtitle).toMatch(/Finished #\d+ of \d+/i);
  expect(displayed!.playerRow).toContain("(You)");
  await capture(page, "st-play-2-placed-1280.png");
});

test("seeded #1 run: headline says Victory and player row is visible", async ({
  page,
  sft,
}) => {
  const { outcome, displayed } = await reachGameOver(page, sft, {
    seed: 4242,
    cash: 50_000_000,
  });
  expect(outcome.kind).toBe("victory");
  expect(outcome.rank).toBe(1);
  expect(displayed!.heading).toBe("VICTORY!");
  expect(displayed!.subtitle).toContain("#1 of");
  expect(displayed!.playerRow).toContain("(You)");
  await capture(page, "st-play-2-victory-1280.png");
});
