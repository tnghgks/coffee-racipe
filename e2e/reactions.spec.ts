import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { signUpAs, unique } from "./helpers";

async function createPublicRecipe(page: Page, title: string) {
  await page.goto("/recipes/new");
  await page.getByLabel("제목").fill(title);
  await page.getByRole("radio", { name: /^전체 공개/ }).check();
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
  return page.url();
}

// Scoped to the visible article: Next keeps previously visited pages hidden in the DOM.
const likeButton = (page: Page) => page.getByRole("article").getByRole("button", { name: /^좋아요/ });
const saveButton = (page: Page) => page.getByRole("article").getByRole("button", { name: /^저장/ });
const count = (page: Page, kind: "like" | "save") => page.getByRole("article").getByTestId(`${kind}-count`);

test("signed-out visitors are sent to login when they like", async ({ page }) => {
  await page.goto("/recipes/00000000-0000-4000-8000-000000000001");
  await page.getByRole("article").getByRole("link", { name: /^좋아요/ }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Frecipes%2F00000000-0000-4000-8000-000000000001/);
});

test("rapid like clicks settle on the last state and the count stays exact", async ({ page }) => {
  await signUpAs(page);
  const url = await createPublicRecipe(page, `연타 ${unique()}`);

  await expect(likeButton(page)).toBeEnabled();
  for (let i = 0; i < 7; i++) await likeButton(page).click(); // odd number of clicks → liked
  await expect(likeButton(page)).toHaveAttribute("aria-pressed", "true");
  await expect(count(page, "like")).toHaveText("1");

  await page.waitForLoadState("networkidle");
  await page.goto(url);
  await expect(likeButton(page)).toHaveAttribute("aria-pressed", "true");
  await expect(count(page, "like")).toHaveText("1");

  await likeButton(page).click();
  await expect(count(page, "like")).toHaveText("0");
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(likeButton(page)).toHaveAttribute("aria-pressed", "false");
  await expect(count(page, "like")).toHaveText("0");
});

test("simultaneous likes from two users both count", async ({ page, browser }) => {
  await signUpAs(page);
  const url = await createPublicRecipe(page, `동시 ${unique()}`);

  const other = await browser.newPage();
  await signUpAs(other, new URL(url).pathname);
  await expect(likeButton(other)).toBeEnabled();
  await expect(likeButton(page)).toBeEnabled();

  await Promise.all([likeButton(page).click(), likeButton(other).click()]);
  await expect(likeButton(page)).toHaveAttribute("aria-pressed", "true");
  await expect(likeButton(other)).toHaveAttribute("aria-pressed", "true");
  await Promise.all([page.waitForLoadState("networkidle"), other.waitForLoadState("networkidle")]);

  await page.reload();
  await expect(count(page, "like")).toHaveText("2");
  await other.close();
});

test("saved recipes appear on /me/saved until unsaved", async ({ page }) => {
  await signUpAs(page);
  const title = `저장 ${unique()}`;
  const url = await createPublicRecipe(page, title);

  await saveButton(page).click();
  await expect(saveButton(page)).toHaveAttribute("aria-pressed", "true");
  await expect(count(page, "save")).toHaveText("1");
  await page.waitForLoadState("networkidle");

  await page.goto("/me");
  await page.getByRole("link", { name: "저장한 레시피" }).click();
  await expect(page).toHaveURL("/me/saved");
  await expect(page.getByTestId("saved-recipe-list")).toContainText(title);

  await page.goto(url);
  await saveButton(page).click();
  await expect(saveButton(page)).toHaveAttribute("aria-pressed", "false");
  await page.waitForLoadState("networkidle");
  await page.goto("/me/saved");
  await expect(page.getByText("아직 저장한 레시피가 없어요")).toBeVisible();
});

test("a fork links back to its original and the original counts it", async ({ page, browser }) => {
  const { username } = await signUpAs(page);
  const title = `원본 ${unique()}`;
  const url = await createPublicRecipe(page, title);
  const originalPath = new URL(url).pathname;

  const forker = await browser.newPage();
  await signUpAs(forker, originalPath);
  await forker.getByRole("article").getByTestId("fork-link").click();
  await expect(forker).toHaveURL(/\/recipes\/new\?fork=/);
  await forker.getByRole("button", { name: "저장" }).click();
  await expect(forker).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
  expect(new URL(forker.url()).pathname).not.toBe(originalPath);

  const origin = forker.getByRole("article").getByTestId("fork-origin");
  await expect(origin).toContainText("원본:");
  await expect(origin.getByTestId("author-link")).toHaveAttribute("href", `/u/${username}`);
  await origin.getByRole("link", { name: title }).click();
  await expect(forker).toHaveURL(url);
  // The first visit to this URL is still mounted (hidden), so keep only the visible link.
  await expect(forker.getByTestId("fork-link").filter({ visible: true })).toHaveText(/복제해서 수정\s*1$/);
  await forker.close();
});
