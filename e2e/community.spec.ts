import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { signUpAs } from "./helpers";

type Visibility = "나만 보기" | "링크 공개" | "전체 공개";

async function createRecipe(page: Page, title: string, visibility: Visibility) {
  await page.goto("/recipes/new");
  await page.getByLabel("제목").fill(title);
  await page.getByRole("radio", { name: new RegExp(`^${visibility}`) }).check();
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
  return page.url();
}

test("a public recipe shows its author and appears on the author's profile", async ({ page, browser }) => {
  const { username } = await signUpAs(page);
  const url = await createRecipe(page, "공개 V60", "전체 공개");

  const article = page.getByRole("article");
  await expect(article.getByTestId("author-link")).toContainText(`@${username}`);
  await article.getByTestId("author-link").click();
  await expect(page).toHaveURL(`/u/${username}`);
  await expect(page.getByTestId("profile-recipe-list")).toContainText("공개 V60");

  // Visible to signed-out visitors too, but /recipes stays official-only.
  const anonymous = await browser.newPage();
  await anonymous.goto(`/u/${username}`);
  await expect(anonymous.getByTestId("profile-recipe-list").getByRole("listitem")).toHaveCount(1);
  await anonymous.goto(url);
  await expect(anonymous.getByRole("heading", { level: 1 })).toHaveText("공개 V60");
  await anonymous.goto("/recipes");
  await expect(anonymous.getByTestId("recipe-list").getByRole("listitem")).toHaveCount(12);
  await expect(anonymous.getByTestId("recipe-list")).not.toContainText("공개 V60");
  await anonymous.close();
});

test("an unlisted recipe opens by link but is not listed", async ({ page, browser }) => {
  const { username } = await signUpAs(page);
  const url = await createRecipe(page, "링크 전용 레시피", "링크 공개");
  await expect(page.getByRole("article").getByText("링크 공개")).toBeVisible();

  const anonymous = await browser.newPage();
  await anonymous.goto(url);
  await expect(anonymous.getByRole("heading", { level: 1 })).toHaveText("링크 전용 레시피");
  await anonymous.goto(`/u/${username}`);
  await expect(anonymous.getByText("아직 공개한 레시피가 없어요.")).toBeVisible();
  await anonymous.close();
});

test("editing keeps the chosen visibility", async ({ page }) => {
  await signUpAs(page);
  const url = await createRecipe(page, "공개 유지", "전체 공개");
  await page.goto(`${new URL(url).pathname}/edit`);
  await expect(page.getByRole("radio", { name: /^전체 공개/ })).toBeChecked();
});

test("renaming yourself updates your name on public recipes right away", async ({ page }) => {
  const { username } = await signUpAs(page);
  const url = await createRecipe(page, "이름 바뀌는 레시피", "전체 공개");
  await expect(page.getByRole("article").getByTestId("author-link")).toContainText("드립 테스터");

  await page.goto("/me/setup");
  await page.getByLabel("표시 이름").fill("새 이름");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("status")).toHaveText("저장했어요.");

  await page.goto(url);
  await expect(page.getByRole("article").getByTestId("author-link")).toContainText("새 이름");
  await page.goto(`/u/${username}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("새 이름");
});

test("official recipes show the badge and no author", async ({ page }) => {
  await page.goto("/recipes/00000000-0000-4000-8000-000000000003");
  const article = page.getByRole("article");
  await expect(article.getByText("공식")).toBeVisible();
  await expect(article.getByTestId("author-link")).toHaveCount(0);
});

test("unknown profiles are not found", async ({ page }) => {
  await page.goto("/u/no_such_user_here");
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();
});
