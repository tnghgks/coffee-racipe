import { expect, test } from "@playwright/test";

test("home renders and navigates to recipes", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("레시피대로");

  const nav = page.getByRole("navigation", { name: isMobile ? "하단 메뉴" : "주 메뉴" });
  await nav.getByRole("link", { name: "레시피" }).click();

  await expect(page).toHaveURL(/\/recipes$/);
  await expect(nav.getByRole("link", { name: "레시피" })).toHaveAttribute("aria-current", "page");
});

test("no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
