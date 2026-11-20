import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const useLocal = !process.env.E2E_BASE_URL;
const channel = process.env.E2E_CHROME_CHANNEL; // ex.: "chrome" para usar o Google Chrome instalado

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure", locale: "pt-PT", timezoneId: "Africa/Maputo" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", channel } },
  ],
  webServer: useLocal
    ? { command: "npx next start -p 3100", url: baseURL, reuseExistingServer: true, timeout: 120_000 }
    : undefined,
});
