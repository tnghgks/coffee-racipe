import { expect, test } from "./fixtures";

// iOS has no install prompt, so the banner shows the "홈 화면에 추가" hint. (Chrome's beforeinstallprompt
// can't be triggered from automation.)
test.use({
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});

const brewUrl = "/recipes/00000000-0000-4000-8000-000000000003/brew";
const banner = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "앱 설치 안내" });

test("the install hint shows once, after brew mode is used twice", async ({ page }) => {
  await page.goto(brewUrl);
  await page.getByRole("button", { name: "추출 시작" }).click();
  await page.goto("/recipes");
  await expect(page.getByTestId("recipe-list")).toBeVisible();
  await expect(banner(page)).toHaveCount(0); // one brew is not enough

  await page.goto(brewUrl);
  await page.getByRole("button", { name: "추출 시작" }).click();
  await page.goto("/recipes");
  await expect(banner(page)).toContainText("홈 화면에 추가");
  await banner(page).getByRole("button", { name: "닫기" }).click();
  await expect(banner(page)).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId("recipe-list")).toBeVisible();
  await expect(banner(page)).toHaveCount(0); // only once
});
