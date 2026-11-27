import { test, expect } from "./fixtures/sft.ts";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Full-loop smoke: Main menu → new game wizard (Quick) → Rex tutorial →
 * End Turn until the game is over → TurnReport "View Results" →
 * GameOverScene → "Play Again" → MainMenuScene.
 *
 * Records page errors, console errors and HTTP >= 400 responses from boot and
 * asserts there are none. Only report/dialogue "continue" buttons are
 * dismissed — no QA shortcuts into GameOverScene (forceGameOver would bypass
 * the TurnReport → GameOver hand-off this spec exists to protect).
 */
// Video capture needs a separate ffmpeg download; this spec asserts on errors,
// not footage.
test.use({ video: "off" });

test.describe("Full loop", () => {
  test("menu → results → play again with zero errors", async ({
    page,
    sft,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1280, height: 720 });

    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const badResponses: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("response", (r) => {
      if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
    });
    // The fixture navigated before the listeners were attached; reload so the
    // whole boot is observed.
    await page.reload();
    await sft.ready();

    const has = (id: string) =>
      page.evaluate(
        (i) =>
          window.__sft?.list().some((w) => w.testId === i && w.visible) ??
          false,
        id,
      );
    const waitWidget = (id: string, timeout = 30_000) =>
      page.waitForFunction(
        (i) =>
          window.__sft?.list().some((w) => w.testId === i && w.visible) ??
          false,
        id,
        { timeout, polling: 100 },
      );
    const clickWhenReady = async (id: string, timeout = 30_000) => {
      await waitWidget(id, timeout);
      await sft.click(id);
    };
    const activeScenes = async () => (await sft.currentScene()).active;

    // 1. Menu → Quick game → Launch
    await clickWhenReady("btn-new-game");
    await clickWhenReady("btn-quick");
    await clickWhenReady("btn-launch");

    // 2. Rex intro + tutorial
    await clickWhenReady("btn-let-s-go", 60_000);
    for (let k = 0; k < 10; k++) {
      await page.waitForTimeout(1500);
      if (!(await has("btn-continue"))) break;
      await sft.click("btn-continue");
    }

    // Test-only shortcut: a real 25-turn Quick game is too slow for CI, so cap
    // the run at 4 more turns. The game still ends through the normal
    // end-turn → TurnReport → "View Results" path (>= 3 genuine end-turns).
    const startTurn = (await sft.state<{ turn: number }>()).turn;
    await sft.actions.setMaxTurns(startTurn + 3);

    // 3. End turns until game over
    let realTurns = 0;
    const deadline = Date.now() + 180_000;
    const isOver = async () =>
      (await sft.state<{ gameOver: boolean }>()).gameOver;
    while (!(await isOver()) && Date.now() < deadline) {
      for (let k = 0; k < 6; k++) {
        const w = await sft.list();
        const c = w.find(
          (x) =>
            x.enabled &&
            x.visible &&
            /^(btn-continue|modal-ok|btn-accept|btn-ok)/.test(x.testId),
        );
        if (!c) break;
        await sft.click(c.testId);
        await page.waitForTimeout(400);
      }
      const before = (await sft.state<{ turn: number }>()).turn;
      if (await sft.actions.endTurn()) {
        realTurns++;
        await page
          .waitForFunction(
            (b) => {
              const s = window.__sft!.state() as {
                turn: number;
                gameOver: boolean;
              };
              return s.turn !== b || s.gameOver;
            },
            before,
            { timeout: 30_000, polling: 100 },
          )
          .catch(() => undefined);
      }
      for (let k = 0; k < 60; k++) {
        if (!(await activeScenes()).includes("SimPlaybackScene")) break;
        await page.waitForTimeout(500);
      }
      await page.waitForTimeout(300);
    }
    expect(await isOver(), "game reached gameOver").toBe(true);
    expect(realTurns).toBeGreaterThanOrEqual(3);

    // 4. View Results → GameOverScene → Play Again → MainMenuScene
    await clickWhenReady("btn-view-results", 60_000);
    await page.waitForFunction(
      () => window.__sft?.currentScene().active.includes("GameOverScene"),
      undefined,
      { timeout: 15_000 },
    );
    await waitWidget("btn-play-again");
    await page.waitForTimeout(1500);

    const outDir = path.join(process.cwd(), "docs", "pr-screenshots");
    fs.mkdirSync(outDir, { recursive: true });
    await page.screenshot({
      path: path.join(outDir, "st-play-1-results-1280.png"),
    });

    await sft.click("btn-play-again");
    await page.waitForFunction(
      () => window.__sft?.currentScene().active.includes("MainMenuScene"),
      undefined,
      { timeout: 15_000 },
    );

    console.log(
      `full-loop: pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length} badResponses=${badResponses.length} endTurns=${realTurns}`,
    );
    expect(pageErrors, "page errors").toEqual([]);
    expect(consoleErrors, "console errors").toEqual([]);
    expect(badResponses, "responses >= 400").toEqual([]);
  });
});
