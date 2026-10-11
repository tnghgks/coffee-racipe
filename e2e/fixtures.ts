import { test as base, expect } from "@playwright/test";

/**
 * Every spec imports `test` from here. Fails a test on browser console errors and uncaught exceptions,
 * so dev-only problems (hydration mismatches, Next prerender warnings) don't slip through green runs.
 */

// Expected noise: 404 navigations (not-found tests) log a failed resource load.
const IGNORED = [/Failed to load resource: the server responded with a status of 404/];

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" && !IGNORED.some((re) => re.test(message.text()))) {
          errors.push(message.text().slice(0, 500));
        }
      });
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      await use(errors);
      expect(errors, "browser console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
