import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the static export in /out, so run
// `npm run build` first (`npm run test:e2e` does both).
const PORT = 4321;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    // The installed Google Chrome, so no browser download is needed.
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
  webServer: {
    command: `npx --yes serve@14.2.4 out -l ${PORT}`,
    url: `http://localhost:${PORT}/ur/`,
    reuseExistingServer: !process.env.CI,
  },
});
