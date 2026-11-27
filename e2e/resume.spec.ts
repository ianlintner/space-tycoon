import { test, expect } from "./fixtures/sft.ts";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Persistence: New Quick game → 3 end-turns → reload → the main menu offers
 * Continue (from the per-turn autosave) → clicking it restores the same turn
 * and cash as before the reload.
 *
 * Dialogue handling mirrors full-loop.spec.ts: the communication modal gates
 * its buttons behind a frame-driven typewriter, so every dialogue is opened by
 * clicking the text area (the built-in "skip typewriter" affordance).
 */
test.use({ video: "off" });

const TYPEWRITER_SKIP_X = 700;
const TYPEWRITER_SKIP_Y = 380;

type QAWidget = { testId: string; visible: boolean; enabled: boolean };
type QAWindow = {
  __sft?: {
    list(): QAWidget[];
    currentScene(): { active: string[] };
    state(): unknown;
  };
};

test.describe("Resume from autosave", () => {
  test("reload → Continue restores the same turn and cash", async ({
    page,
    sft,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1280, height: 720 });

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
    const skipTypewriter = () =>
      page.mouse.click(TYPEWRITER_SKIP_X, TYPEWRITER_SKIP_Y);
    const activeScenes = async () => (await sft.currentScene()).active;

    // 1. Fresh menu has nothing to continue.
    await waitWidget("btn-continue");
    const initial = (await sft.list()).find((w) => w.testId === "btn-continue");
    expect(initial?.enabled, "no save yet → Continue disabled").toBe(false);

    // 2. New Quick game → Launch.
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

    // 3. Rex intro + tutorial.
    await waitRegistered("btn-let-s-go");
    await skipTypewriter();
    await waitWidget("btn-let-s-go", 15_000);
    await sft.click("btn-let-s-go");
    const tutorialDeadline = Date.now() + 60_000;
    while (Date.now() < tutorialDeadline) {
      const tut = await sft.state<{
        adviser?: { tutorialComplete: boolean };
      }>();
      if (tut.adviser?.tutorialComplete) break;
      // Rex's choice buttons are typewriter-gated; reveal them before clicking.
      const pickChoice = await waitRegistered("btn-i-ll-pick-one", 2_000)
        .then(() => true)
        .catch(() => false);
      if (pickChoice) {
        await skipTypewriter();
        await waitWidget("btn-i-ll-pick-one", 15_000);
        await sft.click("btn-i-ll-pick-one");
        await waitWidget("btn-create-route-enter", 15_000);
        await sft.actions.selectFirstFinderRow();
        await sft.click("btn-create-route-enter");
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
      await page.waitForTimeout(500);
    }

    // 4. Play three real end-turns; after each, wait for the quarterly report
    // (which writes the autosave) and dismiss it.
    let reportsSeen = 0;
    const deadline = Date.now() + 180_000;
    while (reportsSeen < 3 && Date.now() < deadline) {
      for (let k = 0; k < 6; k++) {
        const w = await sft.list();
        const c = w.find(
          (x) =>
            x.enabled &&
            x.visible &&
            /^(modal-ok|btn-accept|btn-ok)/.test(x.testId),
        );
        if (!c) break;
        await sft.click(c.testId);
        await page.waitForTimeout(400);
      }
      const before = (await sft.state<{ turn: number }>()).turn;
      if (await sft.actions.endTurn()) {
        await page
          .waitForFunction(
            (b) => {
              const s = window.__sft!.state() as { turn: number };
              return s.turn !== b;
            },
            before,
            { timeout: 60_000, polling: 100 },
          )
          .catch(() => undefined);
      }
      // Wait for the report scene, then the autosave has been written.
      await page
        .waitForFunction(
          () =>
            window.__sft?.currentScene().active.includes("TurnReportScene") ??
            false,
          undefined,
          { timeout: 60_000, polling: 200 },
        )
        .catch(() => undefined);
      // The report is non-blocking (no dismiss button): End Turn stays usable.
      if ((await activeScenes()).includes("TurnReportScene")) reportsSeen++;
    }
    expect(reportsSeen, "three quarterly reports seen").toBe(3);

    // 5. Snapshot the state at the third report, then let IndexedDB commit.
    const before = await sft.state<{ turn: number; cash: number }>();
    expect(before.turn).toBeGreaterThanOrEqual(4);
    await page.waitForFunction(
      async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open("sft-saves");
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        const value = await new Promise<unknown>((resolve) => {
          const req = db
            .transaction("kv", "readonly")
            .objectStore("kv")
            .get("sft_autosave");
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
        db.close();
        return typeof value === "string" && value.length > 0;
      },
      undefined,
      { timeout: 15_000, polling: 250 },
    );

    // 6. Reload → Continue must be enabled.
    await page.reload();
    await sft.ready();
    await waitWidget("btn-continue", 60_000);
    const cont = (await sft.list()).find((w) => w.testId === "btn-continue");
    expect(cont?.enabled, "autosave enables Continue after reload").toBe(true);

    // Let the menu settle, then capture the evidence screenshot.
    await page.waitForTimeout(1500);
    const shot =
      process.env.SFT_SCREENSHOT_PATH ??
      path.join(process.cwd(), "test-results", "st-play-6-continue-1280.png");
    fs.mkdirSync(path.dirname(shot), { recursive: true });
    await page.screenshot({ path: shot });

    // 7. Continue → same turn and cash.
    await sft.click("btn-continue");
    await page.waitForFunction(
      () =>
        window.__sft?.currentScene().active.includes("GameHUDScene") ?? false,
      undefined,
      { timeout: 30_000, polling: 100 },
    );
    const after = await sft.state<{ turn: number; cash: number }>();
    expect(after.turn, "same turn after resume").toBe(before.turn);
    expect(after.cash, "same cash after resume").toBe(before.cash);
  });
});
