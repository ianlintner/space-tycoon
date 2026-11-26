import { defineConfig, devices } from "@playwright/test";

// Builds the game with --base=/space-tycoon/ and serves it via `vite preview`
// at that prefix, mirroring https://games.cat-herding.net/space-tycoon/.
const PORT = process.env.PLAYWRIGHT_SUBPATH_PORT ?? "4180";

export default defineConfig({
  testDir: "./e2e-subpath",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: `npx vite build --base=/space-tycoon/ --outDir dist-subpath --emptyOutDir && npx vite preview --base=/space-tycoon/ --outDir dist-subpath --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/space-tycoon/`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
