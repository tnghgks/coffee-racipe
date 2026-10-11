import { expect, test } from "@playwright/test";

// Requires local Supabase with supabase/seed.sql applied.
const BASIC_V60 = "/recipes/00000000-0000-4000-8000-000000000003"; // 15g, 1:16, steps 2/8/12/16

test("filters official recipes by dripper", async ({ page }) => {
  await page.goto("/recipes");
  const cards = page.getByTestId("recipe-list").getByRole("listitem");
  await expect(cards).toHaveCount(12);

  await page.getByRole("navigation", { name: "드리퍼 필터" }).getByRole("link", { name: "Chemex" }).click();
  await expect(page).toHaveURL(/\/recipes\?dripper=chemex$/);
  await expect(cards).toHaveCount(2);
  for (const card of await cards.all()) {
    await expect(card).toContainText("Chemex");
  }

  await page.getByRole("navigation", { name: "정렬" }).getByRole("link", { name: "인기순" }).click();
  await expect(page).toHaveURL(/dripper=chemex&sort=popular$/);
  await expect(cards).toHaveCount(2);
});

test("rescales every step when the dose changes from 15g to 20g", async ({ page }) => {
  await page.goto(BASIC_V60);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("V60 기본 1인분");
  await expect(page).toHaveTitle(/V60 기본 1인분/);

  const cumulative = page.getByTestId("step-cumulative");
  const total = page.getByTestId("total-water");
  await expect(cumulative).toHaveText(["30g", "120g", "180g", "240g"]);
  await expect(total).toHaveText("240g");

  await page.getByRole("textbox", { name: "원두량" }).fill("20");
  await expect(cumulative).toHaveText(["40g", "160g", "240g", "320g"]);
  await expect(page.getByTestId("step-pour")).toHaveText(["+40g", "+120g", "+80g", "+80g"]);
  await expect(total).toHaveText("320g");

  await page.getByRole("button", { name: "원두량 0.5 늘리기" }).click();
  await expect(total).toHaveText("328g");

  await page.getByRole("button", { name: "원래대로" }).click();
  await expect(total).toHaveText("240g");
});

test("changing the ratio stretches the steps", async ({ page }) => {
  await page.goto(BASIC_V60);
  await page.getByRole("textbox", { name: "비율" }).fill("15");
  await expect(page.getByTestId("total-water")).toHaveText("225g");
  await expect(page.getByTestId("step-cumulative").last()).toHaveText("225g");
});

test("unknown recipe shows not found", async ({ page }) => {
  await page.goto("/recipes/00000000-0000-4000-8000-0000000000ff");
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();
});

for (const path of ["/recipes", BASIC_V60]) {
  test(`no horizontal scroll at 375px on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
