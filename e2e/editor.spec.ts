import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

import { signUpAs } from "./helpers";

const BASIC_V60 = "/recipes/00000000-0000-4000-8000-000000000003"; // official, 15g 1:16, 30/120/180/240g

const step = (page: Page, index: number, field: "이름" | "시작 시각" | "누적 물량(g)") =>
  page.getByLabel(field === "이름" ? `${index + 1}번째 단계 이름` : `${index + 1}번째 단계 ${field}`);

async function createRecipe(page: Page, title: string) {
  await page.goto("/recipes/new");
  await page.getByLabel("제목").fill(title);
  // Defaults: V60, 15g, 1:16, 2:30, steps 0:00/0:40/1:10 → 30/150/240g
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
  return page.url().split("/").at(-1)!;
}

test("login → create a recipe → brew it", async ({ page }) => {
  await signUpAs(page, "/recipes/new");
  await expect(page).toHaveURL(/\/recipes\/new$/);

  await page.getByLabel("제목").fill("아침 V60");
  await page.getByLabel("원두량 (g)").fill("20");
  await page.getByRole("button", { name: /마지막 단계를 320g에 맞추기/ }).click();
  await step(page, 1, "누적 물량(g)").fill("200");
  await page.getByRole("button", { name: "저장" }).click();

  await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("아침 V60");
  await expect(page.getByRole("article").getByText("나만 보기")).toBeVisible();
  // Scope to the visible recipe: Next keeps the editor page mounted (hidden) for back navigation.
  await expect(page.getByRole("article").getByTestId("step-cumulative")).toHaveText(["30g", "200g", "320g"]);
  await expect(page.getByRole("link", { name: "수정", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "이 설정으로 추출 시작" }).click();
  await expect(page).toHaveURL(/\/brew$/);
  await expect(page.getByTestId("brew-step")).toHaveText("뜸 들이기");
  await expect(page.getByTestId("brew-target")).toHaveText("30");

  await page.goto("/me/recipes");
  await expect(page.getByTestId("my-recipe-list")).toContainText("아침 V60");
});

test("blocks steps that go back in time or water, and a mismatched total", async ({ page }) => {
  await signUpAs(page, "/recipes/new");
  await page.getByLabel("제목").fill("잘못된 레시피");

  await step(page, 2, "시작 시각").fill("0:30"); // before step 2 (0:40)
  await step(page, 1, "누적 물량(g)").fill("20"); // less than step 1 (30g)
  await page.getByRole("button", { name: "저장" }).click();

  await expect(page.getByText("이전 단계보다 늦어야 해요")).toBeVisible();
  await expect(page.getByText("이전 단계보다 적을 수 없어요")).toBeVisible();
  await expect(page).toHaveURL(/\/recipes\/new$/);

  await step(page, 2, "시작 시각").fill("1:10");
  await step(page, 1, "누적 물량(g)").fill("150");
  await page.getByLabel("비율 (1:x)").fill("17"); // total becomes 255g, last step still 240g
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("마지막 단계는 총 물량 255g(원두 × 비율)과 같아야 해요")).toBeVisible();

  await page.getByRole("button", { name: /마지막 단계를 255g에 맞추기/ }).click();
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
});

test("forks an official recipe and links back to the original", async ({ page }) => {
  await signUpAs(page);
  await page.goto(BASIC_V60);
  await page.getByRole("link", { name: "복제해서 수정" }).click();

  await expect(page).toHaveURL(/\/recipes\/new\?fork=/);
  await expect(page.getByLabel("제목")).toHaveValue("V60 기본 1인분 (내 버전)");
  await expect(step(page, 3, "누적 물량(g)")).toHaveValue("240");
  await page.getByRole("button", { name: "저장" }).click();

  await expect(page).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("link", { name: "V60 기본 1인분" })).toBeVisible(); // 원본 link
  await expect(page.getByRole("link", { name: "수정", exact: true })).toBeVisible();
});

test("anonymous fork goes through login and comes back to the editor", async ({ page }) => {
  await page.goto(BASIC_V60);
  await page.getByRole("link", { name: "복제해서 수정" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Frecipes%2Fnew%3Ffork%3D/);
});

test("edits and deletes own recipe", async ({ page }) => {
  await signUpAs(page);
  const id = await createRecipe(page, "고칠 레시피");

  await page.getByRole("link", { name: "수정", exact: true }).click();
  await expect(page).toHaveURL(`/recipes/${id}/edit`);
  // The /recipes/new editor from createRecipe() is still mounted (hidden) for back navigation.
  await page.getByLabel("제목").filter({ visible: true }).fill("고친 레시피");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("고친 레시피");

  await page.goto(`/recipes/${id}/edit`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "레시피 삭제" }).click();
  await expect(page).toHaveURL(/\/me\/recipes$/);
  await expect(page.getByText("아직 만든 레시피가 없어요")).toBeVisible();
  await page.goto(`/recipes/${id}`);
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();
});

test("other users cannot see or edit a private recipe", async ({ page, browser }) => {
  await signUpAs(page);
  const id = await createRecipe(page, "비밀 레시피");

  const other = await browser.newPage();
  await signUpAs(other);
  await other.goto(`/recipes/${id}`);
  await expect(other.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();
  await other.goto(`/recipes/${id}/edit`);
  await expect(other.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();
  await other.close();

  const anonymous = await browser.newPage();
  await anonymous.goto(`/recipes/${id}`);
  await expect(anonymous.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();
  await anonymous.goto(`/recipes/${id}/edit`);
  await expect(anonymous).toHaveURL(/\/login\?next=/);
  await anonymous.close();
});

test("no horizontal scroll at 375px in the editor", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signUpAs(page, "/recipes/new");
  await expect(page.getByLabel("제목")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
