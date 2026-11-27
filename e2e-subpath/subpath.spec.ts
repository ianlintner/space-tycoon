import { test, expect } from "@playwright/test";

// Subpath smoke: the production build is served under /space-tycoon/ (the
// Cat Herding Games hub path). Any root-absolute fetch (e.g. /assets/...,
// /portraits/...) would escape the prefix and 404 here, failing CI.
const PREFIX = "/space-tycoon/";

test("game boots under the /space-tycoon/ subpath with no escaped requests", async ({
  page,
}) => {
  const escaped: string[] = [];
  const failed: string[] = [];
  const pageErrors: string[] = [];

  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.hostname === "localhost" && !url.pathname.startsWith(PREFIX)) {
      escaped.push(url.pathname);
    }
  });
  page.on("response", (res) => {
    const url = new URL(res.url());
    if (url.hostname === "localhost" && res.status() >= 400) {
      failed.push(`${res.status()} ${url.pathname}`);
    }
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto(PREFIX);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  // Give boot-time asset loading (portraits, video backdrop) time to fire.
  await page.waitForTimeout(5_000);

  expect(escaped, "requests outside the base path").toEqual([]);
  expect(failed, "same-origin requests that failed").toEqual([]);
  expect(pageErrors).toEqual([]);
});
