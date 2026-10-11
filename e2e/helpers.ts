import { expect, type Page } from "@playwright/test";

/** Unique suffix for emails/usernames so tests never collide (DB is shared across runs). */
export const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Dev email login (NEXT_PUBLIC_DEV_LOGIN=1); signs up automatically on first use. */
export async function devLogin(page: Page, email: string, password = "password123") {
  const form = page.locator("form", { hasText: "개발용 로그인" });
  await form.getByLabel("이메일").fill(email);
  await form.getByLabel("비밀번호").fill(password);
  await form.getByRole("button", { name: "이메일로 로그인" }).click();
}

export async function completeSetup(page: Page, username: string, displayName = "드립 테스터") {
  await page.getByLabel("사용자 이름").fill(username);
  await page.getByLabel("표시 이름").fill(displayName);
  await page.getByRole("button", { name: "시작하기" }).click();
}

/** Creates a brand-new user with a username and lands on `next`. */
export async function signUpAs(page: Page, next = "/") {
  const id = unique();
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await devLogin(page, `e2e-${id}@test.local`);
  await expect(page).toHaveURL(/\/me\/setup/);
  await completeSetup(page, `e2e_${id}`.slice(0, 20));
  await expect(page).not.toHaveURL(/\/me\/setup/);
  return { username: `e2e_${id}`.slice(0, 20) };
}
