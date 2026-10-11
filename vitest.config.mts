import { defineConfig } from "vitest/config";

// Unit tests cover pure functions only (src/lib/brew, parsers, helpers); UI flows are tested with Playwright.
// Add jsdom + Testing Library back if component tests are ever needed.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
