import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { signUpAs, unique } from "./helpers";

const feed = (page: Page) => page.getByTestId("explore-list").getByRole("listitem");

async function createRecipe(page: Page, title: string, visibility: "링크 공개" | "전체 공개") {
  await page.goto("/recipes/new");
  await page.getByLabel("제목").fill(title);
  await page.getByRole("radio", { name: new RegExp(`^${visibility}`) }).check();
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
  return page.url();
}

test("signed-out visitors see public recipes only; unlisted opens by link", async ({ page, browser }) => {
  const tag = unique();
  await signUpAs(page);
  await createRecipe(page, `탐색공개 ${tag}`, "전체 공개");
  const unlistedUrl = await createRecipe(page, `탐색링크 ${tag}`, "링크 공개");

  const anonymous = await browser.newPage();
  await anonymous.goto(`/explore?q=${encodeURIComponent(tag)}`);
  await expect(feed(anonymous)).toHaveCount(1);
  await expect(feed(anonymous)).toContainText(`탐색공개 ${tag}`);
  await anonymous.goto(unlistedUrl);
  await expect(anonymous.getByRole("heading", { level: 1 })).toHaveText(`탐색링크 ${tag}`);
  await anonymous.close();
});

test('searching "4:6" works, special characters are safe', async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("searchbox", { name: "레시피 검색" }).fill("4:6");
  await page.getByRole("searchbox", { name: "레시피 검색" }).press("Enter");
  await expect(page).toHaveURL(/q=4%3A6/);
  await expect(feed(page).first()).toContainText("4:6 메소드");

  await page.goto(`/explore?q=${encodeURIComponent(`%_\\'" & | ! :* <->`)}`);
  await expect(page.getByText("조건에 맞는 레시피가 없어요.")).toBeVisible();

  await page.goto(`/explore?q=${encodeURIComponent("울티밋")}`); // partial Korean word
  await expect(feed(page).first()).toContainText("V60 울티밋 레시피");
});

test("filters by dripper, strength and time, and keeps them while searching", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("navigation", { name: "드리퍼 필터" }).getByRole("link", { name: "Chemex" }).click();
  await expect(page).toHaveURL(/dripper=chemex/);
  for (const card of await feed(page).all()) await expect(card).toContainText("Chemex");

  await page.getByRole("navigation", { name: "농도 필터" }).getByRole("link", { name: "진하게" }).click();
  await expect(page).toHaveURL(/dripper=chemex&strength=strong/);
  for (const card of await feed(page).all()) await expect(card).toContainText("1:15");

  await page.getByRole("searchbox", { name: "레시피 검색" }).fill("진하게");
  await page.getByRole("searchbox", { name: "레시피 검색" }).press("Enter");
  await expect(page).toHaveURL(/dripper=chemex/);
  await expect(page).toHaveURL(/strength=strong/);
  await expect(feed(page)).toHaveCount(1);

  await page.getByRole("link", { name: "초기화" }).click();
  await expect(page).toHaveURL(/\/explore$/);
});

test("infinite scroll loads every page without duplicates", async ({ page }) => {
  await page.goto("/explore");
  await expect(feed(page)).toHaveCount(20);

  // Scroll to the end, then wait for that page to arrive (the list grows or the end shows) before
  // scrolling again. A local DB accumulates public recipes from earlier runs, so allow many pages.
  const end = page.getByText("모두 봤어요");
  for (let i = 0; i < 50 && !(await end.isVisible()); i++) {
    const before = await feed(page).count();
    await feed(page).last().scrollIntoViewIfNeeded();
    await expect
      .poll(async () => (await end.isVisible()) || (await feed(page).count()) > before, { timeout: 10_000 })
      .toBe(true);
  }
  await expect(end).toBeVisible();

  // Compare recipe ids (titles can repeat: other tests publish recipes with the same names).
  const ids = await page.getByTestId("explore-list").getByRole("link").evaluateAll((links) =>
    links.map((a) => a.getAttribute("href")).filter((href) => href?.startsWith("/recipes/")),
  );
  expect(ids.length).toBeGreaterThanOrEqual(22);
  expect(new Set(ids).size).toBe(ids.length);
});

test("latest sort puts the most recent recipe first", async ({ page }) => {
  // Scoped by a unique tag: other tests publish recipes in parallel.
  const tag = unique();
  await signUpAs(page);
  await createRecipe(page, `먼저 올린 ${tag}`, "전체 공개");
  await createRecipe(page, `나중에 올린 ${tag}`, "전체 공개");
  await page.goto(`/explore?sort=latest&q=${encodeURIComponent(tag)}`);
  await expect(feed(page)).toHaveCount(2);
  await expect(feed(page).first()).toContainText(`나중에 올린 ${tag}`);
});

test("no horizontal scroll at 375px on /explore", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/explore");
  await expect(feed(page).first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
