import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e", timeout: 30_000, fullyParallel: true,
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  webServer: { command: "npm run start", url: "http://localhost:3000", reuseExistingServer: true },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
