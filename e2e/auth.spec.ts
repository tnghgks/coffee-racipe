import { expect, test } from "./fixtures";
import { completeSetup, devLogin, unique } from "./helpers";

// Uses the dev email login (NEXT_PUBLIC_DEV_LOGIN=1 + local Supabase email auth); OAuth needs real provider keys.

test("signing in for the first time goes through profile setup and back to the original page", async ({ page }) => {
  const id = unique();

  await page.goto("/me");
  await expect(page).toHaveURL(/\/login\?next=%2Fme$/);

  await devLogin(page, `user-${id}@test.local`);
  await expect(page).toHaveURL(/\/me\/setup\?next=%2Fme$/);
  await expect(page.getByRole("heading", { name: "반가워요! 프로필을 정해 주세요" })).toBeVisible();

  await completeSetup(page, `u_${id}`);
  await expect(page).toHaveURL(/\/me$/);
  await expect(page.getByTestId("my-username")).toHaveText(`@u_${id}`);
  // Header avatar reflects the new profile without a reload (initial of "드립 테스터").
  await expect(page.getByTestId("user-avatar")).toHaveText("드");

  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/me");
  await expect(page).toHaveURL(/\/login/);
});

test("validates the username and rejects one that is taken", async ({ page, browser }) => {
  const id = unique();
  const taken = `taken_${id}`;

  // First user claims the name.
  const other = await browser.newPage();
  await other.goto("/login");
  await devLogin(other, `first-${id}@test.local`);
  await completeSetup(other, taken);
  await expect(other).toHaveURL(/localhost:\d+\/$/); // no ?next → back to home
  await other.close();

  await page.goto("/login");
  await devLogin(page, `second-${id}@test.local`);
  await expect(page).toHaveURL(/\/me\/setup/);

  // (Next's route announcer also has role="alert", so match the message text.)
  await completeSetup(page, "Bad Name!");
  await expect(page.getByText("영문 소문자·숫자·밑줄(_)로 3~20자")).toBeVisible();

  await completeSetup(page, taken);
  await expect(page.getByText("이미 사용 중인 이름이에요")).toBeVisible();
  await expect(page).toHaveURL(/\/me\/setup/);
});

test("returning users skip setup and can edit their profile", async ({ page }) => {
  const id = unique();
  const email = `returning-${id}@test.local`;

  await page.goto("/login");
  await devLogin(page, email);
  await completeSetup(page, `r_${id}`);
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await page.goto("/me");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByRole("link", { name: "로그인" })).toBeVisible(); // sign-out finished

  await page.goto("/login?next=%2Frecipes");
  await devLogin(page, email);
  await expect(page).toHaveURL(/\/recipes$/);

  await page.goto("/me/setup");
  await expect(page.getByRole("heading", { name: "프로필 수정" })).toBeVisible();
  await page.getByLabel("소개").fill("아침마다 V60");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("status")).toHaveText("저장했어요.");
  await page.goto("/me");
  await expect(page.getByText("아침마다 V60")).toBeVisible();
});

test("ignores off-site redirect targets after login", async ({ page }) => {
  const id = unique();
  await page.goto("/login?next=%2F%2Fevil.example");
  await devLogin(page, `safe-${id}@test.local`);
  await expect(page).toHaveURL(/\/me\/setup\?next=%2F$/);
});
