import { expect, test } from "./fixtures";

// Requires local Supabase with supabase/seed.sql applied.
const BASIC_V60 = "/recipes/00000000-0000-4000-8000-000000000003"; // 15g, 1:16, steps 2/8/12/16

test("filters official recipes by dripper", async ({ page }) => {
  await page.goto("/recipes");
  const cards = page.getByTestId("recipe-list").getByRole("listitem");
  await expect(cards).toHaveCount(22);

  await page.getByRole("navigation", { name: "드리퍼 필터" }).getByRole("link", { name: "Chemex" }).click();
  await expect(page).toHaveURL(/\/recipes\?dripper=chemex$/);
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) {
    await expect(card).toContainText("Chemex");
  }

  await page.getByRole("navigation", { name: "정렬" }).getByRole("link", { name: "인기순" }).click();
  await expect(page).toHaveURL(/dripper=chemex&sort=popular$/);
  await expect(cards).toHaveCount(3);
});

test("rescales every step when the dose changes from 15g to 20g", async ({ page }) => {
  await page.goto(BASIC_V60);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("V60 기본 1인분");
  await expect(page).toHaveTitle(/V60 기본 1인분/);

  const cumulative = page.getByTestId("step-cumulative");
  const total = page.getByTestId("brew-water");
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
  await expect(page.getByTestId("brew-water")).toHaveText("225g");
  await expect(page.getByTestId("step-cumulative").last()).toHaveText("225g");
});

test("switches between hot and iced", async ({ page }) => {
  await page.goto(BASIC_V60);
  const serve = page.getByRole("radiogroup", { name: "온도" });
  const brewWater = page.getByTestId("brew-water");
  await expect(serve.getByRole("radio", { name: "핫" })).toBeChecked();
  await expect(page.getByTestId("ice-water")).toHaveCount(0);

  await serve.getByRole("radio", { name: "아이스" }).click();
  await expect(brewWater).toHaveText("144g");
  await expect(page.getByTestId("ice-water")).toHaveText("96g");
  await expect(page.getByTestId("step-cumulative")).toHaveText(["18g", "72g", "108g", "144g"]);

  // dose changes keep the iced split
  await page.getByRole("textbox", { name: "원두량" }).fill("20");
  await expect(brewWater).toHaveText("192g");
  await expect(page.getByTestId("ice-water")).toHaveText("128g");

  await serve.getByRole("radio", { name: "핫" }).click();
  await expect(brewWater).toHaveText("320g");
  await expect(page.getByTestId("ice-water")).toHaveCount(0);
});

test("picks servings and reflects manual doses", async ({ page }) => {
  await page.goto(BASIC_V60); // 15g = 1인분
  const servings = page.getByRole("radiogroup", { name: "인분" });
  const dose = page.getByRole("textbox", { name: "원두량" });
  await expect(servings.getByRole("radio", { name: "1인분" })).toBeChecked();

  await servings.getByRole("radio", { name: "3인분" }).click();
  await expect(dose).toHaveValue("45");
  await expect(page.getByTestId("brew-water")).toHaveText("720g");
  await expect(servings.getByRole("radio", { name: "3인분" })).toBeChecked();

  // an in-between dose clears the selection
  await dose.fill("20");
  await expect(servings.getByRole("radio", { checked: true })).toHaveCount(0);

  // servings combine with iced
  await page.getByRole("radiogroup", { name: "온도" }).getByRole("radio", { name: "아이스" }).click();
  await servings.getByRole("radio", { name: "2인분" }).click();
  await expect(page.getByTestId("brew-water")).toHaveText("288g");
  await expect(page.getByTestId("ice-water")).toHaveText("192g");
});

test("warns when the dose exceeds the dripper capacity", async ({ page }) => {
  await page.goto(BASIC_V60); // Hario V60 02: up to 30g
  const servings = page.getByRole("radiogroup", { name: "인분" });
  const warning = page.getByText("원두 30g까지 권장해요");
  await expect(warning).toHaveCount(0);

  await servings.getByRole("radio", { name: "2인분" }).click(); // 30g: at the limit
  await expect(warning).toHaveCount(0);

  await servings.getByRole("radio", { name: "3인분" }).click(); // 45g
  await expect(warning).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Hario V60 02 사이즈");

  await servings.getByRole("radio", { name: "1인분" }).click();
  await expect(warning).toHaveCount(0);
});

test("stepping into decimals does not shift the layout", async ({ page }) => {
  await page.goto(BASIC_V60);
  const doseUp = page.getByRole("button", { name: "원두량 0.5 늘리기" });
  const ratioUp = page.getByRole("button", { name: "비율 0.5 늘리기" });
  const arrowRow = page.getByTestId("brew-water");

  const before = await Promise.all([doseUp.boundingBox(), ratioUp.boundingBox(), arrowRow.boundingBox()]);
  await doseUp.click(); // 15 → 15.5
  await ratioUp.click(); // 16 → 16.5
  await expect(page.getByRole("textbox", { name: "원두량" })).toHaveValue("15.5");
  await expect(page.getByRole("textbox", { name: "비율" })).toHaveValue("16.5");
  const after = await Promise.all([doseUp.boundingBox(), ratioUp.boundingBox(), arrowRow.boundingBox()]);

  expect(after).toEqual(before);
});

test("credits the original author when there is one", async ({ page }) => {
  await page.goto("/recipes/00000000-0000-4000-8000-000000000002"); // 4:6
  const credit = page.getByRole("complementary", { name: "원작자" });
  await expect(credit).toContainText("Tetsu Kasuya");
  await expect(credit).toContainText("월드 브루어스 컵 챔피언");

  await page.goto(BASIC_V60); // in-house recipe
  await expect(page.getByRole("complementary", { name: "원작자" })).toHaveCount(0);
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
