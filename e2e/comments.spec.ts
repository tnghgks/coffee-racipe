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

// The visible thread only (Next keeps earlier pages mounted but hidden).
const thread = (page: Page) => page.getByRole("region", { name: "댓글" });
const comments = (page: Page) => thread(page).getByTestId("comment");

async function postComment(page: Page, body: string) {
  await thread(page).getByRole("textbox", { name: "댓글 쓰기" }).fill(body);
  await thread(page).getByRole("button", { name: "등록" }).click();
}

test("write, edit and delete a comment; visitors read it", async ({ page, browser }) => {
  await signUpAs(page);
  const url = await createPublicRecipe(page, `댓글 ${unique()}`);

  const commenter = await browser.newPage();
  await signUpAs(commenter, new URL(url).pathname);
  await postComment(commenter, "산미가 좋네요");
  await expect(comments(commenter)).toHaveCount(1);
  await expect(comments(commenter).first()).toContainText("산미가 좋네요");
  await expect(thread(commenter).getByRole("textbox", { name: "댓글 쓰기" })).toHaveValue("");
  await expect(thread(commenter).getByRole("heading")).toContainText("1");

  await comments(commenter).first().getByRole("button", { name: "수정" }).click();
  await comments(commenter).first().getByRole("textbox", { name: "댓글 수정" }).fill("산미가 정말 좋네요");
  await comments(commenter).first().getByRole("button", { name: "수정 완료" }).click();
  await expect(comments(commenter).first()).toContainText("산미가 정말 좋네요");
  await expect(comments(commenter).first()).toContainText("(수정됨)");

  // Signed-out visitors read the thread and are offered a login link instead of the form.
  const visitor = await browser.newPage();
  await visitor.goto(url);
  await expect(comments(visitor).first()).toContainText("산미가 정말 좋네요");
  await expect(thread(visitor).getByRole("link", { name: "로그인하고 댓글 쓰기" })).toBeVisible();
  await expect(thread(visitor).getByRole("textbox")).toHaveCount(0);
  await visitor.close();

  // The recipe author can't edit someone else's comment.
  await page.reload();
  await expect(comments(page).first().getByRole("button", { name: "수정" })).toHaveCount(0);

  await comments(commenter).first().getByRole("button", { name: "삭제" }).click();
  await comments(commenter).first().getByRole("button", { name: "삭제" }).click(); // confirm
  await expect(comments(commenter).first()).toHaveText("삭제된 댓글이에요.");
  await expect(thread(commenter).getByRole("heading")).toContainText("0");
  await commenter.close();
});

test("the 6th comment within a minute is rejected and the text is kept", async ({ page }) => {
  await signUpAs(page);
  await createPublicRecipe(page, `도배 ${unique()}`);

  for (let i = 1; i <= 5; i++) {
    await postComment(page, `댓글 ${i}`);
    await expect(comments(page)).toHaveCount(i);
  }
  await postComment(page, "여섯 번째");
  await expect(thread(page).getByText("1분에 5개까지")).toBeVisible();
  await expect(thread(page).getByRole("textbox", { name: "댓글 쓰기" })).toHaveValue("여섯 번째");
  await expect(comments(page)).toHaveCount(5);
});

test("signed-in users report a recipe and a comment", async ({ page, browser }) => {
  await signUpAs(page);
  const url = await createPublicRecipe(page, `신고 ${unique()}`);
  await postComment(page, "작성자 댓글");
  await expect(comments(page)).toHaveCount(1);
  // Authors don't get a report button for their own recipe or comment.
  await expect(thread(page).getByRole("button", { name: /신고/ })).toHaveCount(0);

  const reporter = await browser.newPage();
  await signUpAs(reporter, new URL(url).pathname);

  await thread(reporter).getByRole("button", { name: "레시피 신고" }).click();
  await thread(reporter).getByRole("radio", { name: "스팸·광고" }).check();
  await thread(reporter).getByLabel("자세한 내용").fill("광고 링크가 있어요");
  await thread(reporter).getByRole("button", { name: "신고하기" }).click();
  await expect(thread(reporter).getByText("신고했어요")).toBeVisible();

  await comments(reporter).first().getByRole("button", { name: "신고" }).click();
  await comments(reporter).first().getByRole("button", { name: "신고하기" }).click();
  // A reason is required (native validation keeps the form open).
  await expect(comments(reporter).first().getByText("신고했어요")).toHaveCount(0);
  await comments(reporter).first().getByRole("radio", { name: "욕설·비방" }).check();
  await comments(reporter).first().getByRole("button", { name: "신고하기" }).click();
  await expect(comments(reporter).first().getByText("신고했어요")).toBeVisible();
  await reporter.close();
});

test("community flow: publish → explore → like → fork → comment", async ({ page, browser }) => {
  const tag = unique();
  const { username } = await signUpAs(page);
  const title = `흐름 ${tag}`;
  const url = await createPublicRecipe(page, title);

  const fan = await browser.newPage();
  await signUpAs(fan, "/explore");
  await fan.getByRole("searchbox", { name: "레시피 검색" }).fill(tag);
  await fan.getByRole("searchbox", { name: "레시피 검색" }).press("Enter");
  await fan.getByTestId("explore-list").getByRole("link", { name: new RegExp(title) }).click();
  await expect(fan).toHaveURL(url);

  const like = fan.getByRole("article").getByRole("button", { name: /^좋아요/ });
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");

  await postComment(fan, "잘 마셨어요");
  await expect(comments(fan).first()).toContainText("잘 마셨어요");

  await fan.getByRole("article").getByTestId("fork-link").click();
  await expect(fan).toHaveURL(/\/recipes\/new\?fork=/);
  await fan.getByRole("button", { name: "저장", exact: true }).click();
  await expect(fan).toHaveURL(/\/recipes\/[0-9a-f-]{36}$/);
  await expect(fan.getByRole("article").getByTestId("fork-origin").getByTestId("author-link")).toHaveAttribute(
    "href",
    `/u/${username}`,
  );
  await fan.close();

  // The author sees the like, the comment and the fork.
  await page.reload();
  await expect(page.getByRole("article").getByTestId("like-count")).toHaveText("1");
  await expect(comments(page).first()).toContainText("잘 마셨어요");
  await expect(page.getByRole("article").getByTestId("fork-link")).toContainText("1");
});
