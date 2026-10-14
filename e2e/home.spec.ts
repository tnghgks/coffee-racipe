import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { signUpAs } from "./helpers";

const ULTIMATE = "00000000-0000-4000-8000-000000000001"; // V60 울티밋 레시피
const FOUR_SIX = "00000000-0000-4000-8000-000000000002"; // 4:6 메소드, 20g · 1:15
const PULSE = "00000000-0000-4000-8000-000000000005"; // 칼리타 웨이브 펄스 푸어

async function expectImageLoaded(image: Locator) {
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
}

async function react(page: Page, recipeId: string, kind: "좋아요" | "저장") {
  await page.goto(`/recipes/${recipeId}`);
  const button = page.getByRole("article").getByRole("button", { name: new RegExp(`^${kind}`) });
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

test("home renders and navigates to recipes", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("레시피대로");

  const nav = page.getByRole("navigation", { name: isMobile ? "하단 메뉴" : "주 메뉴" });
  await nav.getByRole("link", { name: "레시피" }).click();

  await expect(page).toHaveURL(/\/recipes$/);
  await expect(nav.getByRole("link", { name: "레시피" })).toHaveAttribute("aria-current", "page");
});

test("visitors see popular and new recipes with photos", async ({ page }) => {
  await page.goto("/");
  await expectImageLoaded(page.getByRole("main").locator("img").first()); // hero

  const popular = page.getByTestId("popular-recipes");
  await expect(popular.getByRole("listitem").first()).toBeVisible();
  await expect(popular.getByLabel("1위")).toBeVisible();
  await expectImageLoaded(popular.locator("img").first());

  const fresh = page.getByTestId("new-recipes");
  await expect(fresh.getByRole("listitem").first()).toBeVisible();
  await expect(fresh.locator("time").first()).toHaveText(/전$|\d+\. \d+\. \d+\.$/);

  await page.getByRole("link", { name: "새로 올라온 레시피 더 보기" }).click();
  await expect(page).toHaveURL(/\/explore\?sort=latest$/);
});

test("signed-in home: brew the last recipe again and open saved or liked ones", async ({ page }) => {
  await signUpAs(page);
  await react(page, ULTIMATE, "저장");
  await react(page, PULSE, "좋아요");

  await page.goto(`/me/logs/new?recipe=${FOUR_SIX}&dose=18&ratio=15&iced=1&time=200`);
  await page.getByLabel("다음엔 이렇게").fill("첫 붓기 조금 줄이기");
  await page.getByRole("radio", { name: "4점" }).click();
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page).not.toHaveURL(/\/new/);

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("안녕하세요, 드립 테스터님");

  const last = page.getByTestId("continue-brew");
  await expect(last).toContainText("4:6 메소드");
  await expect(last).toContainText("원두 18g · 1:15 · 아이스");
  await expect(last).toContainText("다음엔: 첫 붓기 조금 줄이기");
  await expect(last.getByRole("link", { name: "이 레시피로 다시 추출" })).toHaveAttribute(
    "href",
    `/recipes/${FOUR_SIX}/brew?dose=18&iced=1`,
  );

  const saved = page.getByTestId("home-saved");
  const liked = page.getByTestId("home-liked");
  await expect(saved).toContainText("V60 울티밋 레시피");
  await expect(liked).toBeHidden();
  await page.getByRole("radio", { name: "좋아요한 레시피" }).click();
  await expect(saved).toBeHidden();
  await expect(liked).toContainText("칼리타 웨이브 펄스 푸어");

  await page.getByRole("link", { name: "좋아요한 레시피 전체 보기" }).click();
  await expect(page).toHaveURL(/\/me\/liked$/);
  await expect(page.getByTestId("liked-recipe-list")).toContainText("칼리타 웨이브 펄스 푸어");

  // Back keeps the home page's state (Next preserves it), so the liked tab is still open.
  await page.goBack();
  await page.getByTestId("home-liked").filter({ visible: true }).getByRole("link", { name: /칼리타 웨이브 펄스 푸어/ }).click();
  await expect(page).toHaveURL(new RegExp(`/recipes/${PULSE}$`));
});

test("a new member sees empty lists and no brew-again card", async ({ page }) => {
  await signUpAs(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("안녕하세요");
  await expect(page.getByTestId("continue-brew")).toHaveCount(0);
  await expect(page.getByTestId("home-saved")).toContainText("“저장”을 누르면 여기에 모여요");
  await expect(page.getByTestId("popular-recipes")).toBeVisible();
});

test("no horizontal scroll at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByTestId("popular-recipes")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
