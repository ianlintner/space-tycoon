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
 *
 * The communication modal gates its action buttons behind a frame-driven
 * typewriter. Under software GL in CI that timer can take well over a minute,
 * which made the Rex intro step flake. Every dialogue is therefore opened by
 * first waiting for its widget registration, then clicking the dialog text
 * area (the game's built-in "skip typewriter" affordance).
 */
// Video capture needs a separate ffmpeg download; this spec asserts on errors,
// not footage.
test.use({ video: "off" });

/** Inside the 1280×720 dialog text hit-zone (never overlaps its buttons). */
const TYPEWRITER_SKIP_X = 700;
const TYPEWRITER_SKIP_Y = 380;

test.describe("Full loop", () => {
  test("menu → results → play again with zero errors", async ({
    page,
    sft,
  }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 720 });

    const startedAt = Date.now();
    const mark = (label: string) =>
      console.log(`full-loop: ${label} @${Date.now() - startedAt}ms`);
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

    type QAWidget = { testId: string; visible: boolean; enabled: boolean };
    type QAWindow = {
      __sft?: {
        list(): QAWidget[];
        currentScene(): { active: string[] };
        state(): unknown;
      };
    };
    const waitRegistered = (id: string, timeout = 30_000) =>
      page.waitForFunction(
        (i) =>
          (window as unknown as QAWindow).__sft
            ?.list()
            .some((w) => w.testId === i) ?? false,
        id,
        { timeout, polling: 100 },
      );
    const waitWidget = (id: string, timeout = 30_000) =>
      page.waitForFunction(
        (i) =>
          (window as unknown as QAWindow).__sft
            ?.list()
            .some((w) => w.testId === i && w.visible) ?? false,
        id,
        { timeout, polling: 100 },
      );
    const clickWhenReady = async (id: string, timeout = 30_000) => {
      await waitWidget(id, timeout);
      const result = await sft.click(id);
      expect(result?.ok, `${id} click landed`).toBe(true);
    };
    const activeScenes = async () => (await sft.currentScene()).active;
    /** Reveal a communication modal's buttons without waiting for its timer. */
    const skipTypewriter = async () => {
      await page.mouse.click(TYPEWRITER_SKIP_X, TYPEWRITER_SKIP_Y);
    };
    /** Wait for a dialogue's buttons and make them actionable immediately. */
    const openDialogue = async (id: string, timeout = 30_000) => {
      await waitRegistered(id, timeout);
      await skipTypewriter();
      await waitWidget(id, 15_000);
    };

    // 1. Menu → Quick game → Launch. Verify the scene hand-off after each
    // click so a swallowed click cannot masquerade as a slow tutorial.
    await clickWhenReady("btn-new-game");
    await waitWidget("btn-quick");
    await clickWhenReady("btn-quick");
    await waitWidget("btn-launch");
    await clickWhenReady("btn-launch");
    await page.waitForFunction(
      () =>
        (window as unknown as QAWindow).__sft
          ?.currentScene()
          .active.includes("GameHUDScene") ?? false,
      undefined,
      { timeout: 60_000, polling: 100 },
    );
    mark("hud-active");

    // 2. Rex intro + tutorial. The intro is only scheduled on a fresh game;
    // assert the precondition instead of waiting blindly for its buttons.
    const introState = await sft.state<{
      turn: number;
      gameOver: boolean;
      activeRoutes: unknown[];
      adviser?: { tutorialSkipped: boolean; tutorialComplete: boolean };
    }>();
    expect(introState.turn, "fresh game starts on turn 1").toBe(1);
    expect(introState.activeRoutes.length, "no routes before tutorial").toBe(0);
    expect(
      introState.adviser?.tutorialSkipped ||
        introState.adviser?.tutorialComplete,
      "tutorial still eligible",
    ).toBeFalsy();
    await openDialogue("btn-let-s-go", 30_000);
    await sft.click("btn-let-s-go");
    mark("rex-intro-dismissed");
    const tutorialDeadline = Date.now() + 60_000;
    let step = 0;
    while (Date.now() < tutorialDeadline) {
      const tut0 = await sft.state<{
        adviser?: { tutorialComplete: boolean };
      }>();
      if (tut0.adviser?.tutorialComplete) break;

      // Rex now asks the player to choose the first route. His choice buttons
      // are typewriter-gated like the intro, so reveal them before clicking.
      const pickChoice = await waitRegistered("btn-i-ll-pick-one", 2_000)
        .then(() => true)
        .catch(() => false);
      if (pickChoice) {
        await skipTypewriter();
        await waitWidget("btn-i-ll-pick-one", 15_000);
        await sft.click("btn-i-ll-pick-one");
        await waitWidget("btn-create-route-enter", 15_000);
        expect(await sft.actions.selectFirstFinderRow()).toBe(true);
        await sft.click("btn-create-route-enter");
        mark("rex-picked-first-route");
        await page.waitForTimeout(300);
        continue;
      }
      const fallbackChoice = await waitRegistered("btn-do-it-for-me", 2_000)
        .then(() => true)
        .catch(() => false);
      if (fallbackChoice) {
        await skipTypewriter();
        await waitWidget("btn-do-it-for-me", 15_000);
        await sft.click("btn-do-it-for-me");
        continue;
      }

      const appeared = await waitRegistered("btn-continue", 15_000)
        .then(() => true)
        .catch(() => false);
      if (!appeared) continue;
      await skipTypewriter();
      await waitWidget("btn-continue", 15_000);
      await sft.click("btn-continue");
      const tut = await sft.state<{
        activeRoutes: unknown[];
        adviser?: { tutorialComplete: boolean };
      }>();
      mark(
        `rex-step-${step++} routes=${tut.activeRoutes.length} complete=${tut.adviser?.tutorialComplete}`,
      );
      await page.waitForTimeout(500);
    }
    mark("tutorial-complete");

    // Test-only shortcut: a real 25-turn Quick game is too slow for CI, so cap
    // the run at 4 more turns. The game still ends through the normal
    // end-turn → TurnReport → "View Results" path (>= 3 genuine end-turns).
    const startTurn = (await sft.state<{ turn: number }>()).turn;
    await sft.actions.setMaxTurns(startTurn + 3);
    mark(
      `pre-loop turn=${startTurn} scenes=${(await sft.currentScene()).active.join(",")}`,
    );

    // 3. End turns until game over
    let realTurns = 0;
    let standingsChecked = false;
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
      if (
        !standingsChecked &&
        (await sft.state<{ turn: number }>()).turn >= 2
      ) {
        // The HUD standings chip must carry its rank label by turn 2.
        await page.waitForFunction(
          () =>
            (window as unknown as QAWindow).__sft
              ?.list()
              .some(
                (w) =>
                  w.testId === "hud-standings" &&
                  w.visible &&
                  (w as QAWidget & { label?: string }).label?.includes(
                    "Rank #",
                  ),
              ) ?? false,
          undefined,
          { timeout: 30_000, polling: 100 },
        );
        standingsChecked = true;
        mark("hud-standings-visible");
      }
    }
    expect(await isOver(), "game reached gameOver").toBe(true);
    expect(standingsChecked, "hud-standings chip verified").toBe(true);
    expect(realTurns).toBeGreaterThanOrEqual(3);
    mark(`game-over after ${realTurns} turns`);

    // 4. View Results → GameOverScene → Play Again → MainMenuScene
    await clickWhenReady("btn-view-results", 60_000);
    await page.waitForFunction(
      () => window.__sft?.currentScene().active.includes("GameOverScene"),
      undefined,
      { timeout: 15_000 },
    );
    await waitWidget("btn-play-again");
    await page.waitForTimeout(1500);

    const outcome = await sft.getGameOutcome();
    expect(
      outcome.displayed,
      "GameOverScene exposes its rendered outcome",
    ).not.toBeNull();
    expect(outcome.displayed!.outcome).toEqual(outcome.outcome);
    expect(outcome.displayed!.heading, "headline matches getGameOutcome").toBe(
      outcome.outcome.label,
    );
    expect(outcome.outcome.of, "all companies ranked").toBeGreaterThan(1);
    expect(
      outcome.displayed!.playerRow,
      "player's own ranking row is rendered",
    ).toContain("(You)");
    mark(
      `outcome=${outcome.outcome.label} rank=${outcome.outcome.rank}/${outcome.outcome.of} playerRow=${outcome.displayed!.playerRow}`,
    );

    // Keep local runs from overwriting the committed PR capture. CI can opt
    // into a different path with SFT_SCREENSHOT_PATH.
    const shot =
      process.env.SFT_SCREENSHOT_PATH ??
      path.join(process.cwd(), "test-results", "full-loop-results-1280.png");
    fs.mkdirSync(path.dirname(shot), { recursive: true });
    await page.screenshot({ path: shot });

    await sft.click("btn-play-again");
    await page.waitForFunction(
      () => window.__sft?.currentScene().active.includes("MainMenuScene"),
      undefined,
      { timeout: 15_000 },
    );

    console.log(
      `full-loop: pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length} badResponses=${badResponses.length} endTurns=${realTurns} elapsed=${Date.now() - startedAt}ms screenshot=${shot}`,
    );
    expect(pageErrors, "page errors").toEqual([]);
    expect(consoleErrors, "console errors").toEqual([]);
    expect(badResponses, "responses >= 400").toEqual([]);
  });
});
