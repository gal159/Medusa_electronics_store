import { defineConfig, devices } from "@playwright/test"

/**
 * E2E konfigūratoriaus scenarijai (`e2e/configurator.spec.ts`).
 * Reikia užpildytos DB (migracijos + seed-components + seed-component-specs).
 * Jei backend (9000) ir storefront (8000) jau veikia, jie panaudojami; kitaip
 * Playwright juos paleidžia pats.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://localhost:8000",
    locale: "lt-LT",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev --prefix ../backend",
      url: "http://localhost:9000/health",
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:8000/lt",
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
})
