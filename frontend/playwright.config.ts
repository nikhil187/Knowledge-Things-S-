import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests for Knowledge Things.
 *
 * globalSetup: Starts backend on port 3001 if not already running; waits for /health.
 * globalTeardown: Stops backend if we started it.
 * webServer: Starts frontend on port 3000 (reuses existing in dev).
 *
 * Run: npm run e2e (from frontend/)
 *
 * Manual mode: Start backend + frontend yourself, then npm run e2e.
 * Backend health is checked before tests; fails fast with clear message if down.
 *
 * Produces: e2e-report.md (AI-readable), test-results/ (screenshots, trace, video)
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  outputDir: "test-results",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["./e2e/ai-reporter.ts"],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on",
    screenshot: "on",
    video: "on",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  timeout: 120_000,
  expect: { timeout: 15_000 },
});
