import path from "node:path";
import { defineConfig } from "@playwright/test";
import { ADMIN_PORT, API_PORT, WEB_PORT } from "./support/urls";

const repoRoot = path.resolve(__dirname, "..");

// Chromium only — this repo has no existing cross-browser requirement, and
// a single project keeps the "one command, live servers" suite fast enough
// to actually run locally rather than only in CI.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  timeout: 60_000,
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npm run dev",
      cwd: path.join(repoRoot, "apps/api"),
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // `-p` forwarded through the app's own unchanged `dev` script
      // (`next dev --turbopack`) — only Playwright launches it on a fixed
      // port; `npm run dev` elsewhere still auto-increments as before.
      command: `npm run dev -- -p ${WEB_PORT}`,
      cwd: path.join(repoRoot, "apps/web"),
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- -p ${ADMIN_PORT}`,
      cwd: path.join(repoRoot, "apps/admin"),
      port: ADMIN_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
