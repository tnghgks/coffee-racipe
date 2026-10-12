import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

// The service worker only runs in production builds, so PWA specs get their own `next build && next start`.
const PWA_PORT = Number(process.env.PWA_PORT ?? 3100);
const pwaURL = process.env.PLAYWRIGHT_PWA_URL ?? `http://localhost:${PWA_PORT}`;
const PWA_SPEC = /pwa\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] }, testIgnore: PWA_SPEC },
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] }, testIgnore: PWA_SPEC },
    { name: "pwa", use: { ...devices["Pixel 7"], baseURL: pwaURL }, testMatch: PWA_SPEC },
  ],
  webServer: [
    ...(process.env.PLAYWRIGHT_BASE_URL
      ? []
      : [
          {
            command: `pnpm dev --port ${PORT}`,
            url: baseURL,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ]),
    ...(process.env.PLAYWRIGHT_PWA_URL
      ? []
      : [
          {
            command: `pnpm build && pnpm start --port ${PWA_PORT}`,
            url: pwaURL,
            reuseExistingServer: !process.env.CI,
            timeout: 300_000,
          },
        ]),
  ],
});
