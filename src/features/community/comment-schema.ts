import { z } from "zod";

/** Shared by the comment forms and the Server Actions. Mirrors the DB check (1–1000 characters). */
export const COMMENT_MAX_LENGTH = 1000;

export const commentBodySchema = z
  .string()
  .trim()
  .min(1, "내용을 입력해 주세요")
  .max(COMMENT_MAX_LENGTH, `${COMMENT_MAX_LENGTH}자까지 쓸 수 있어요`);

export const reportReasons = {
  spam: "스팸·광고",
  abuse: "욕설·비방",
  copyright: "저작권 침해",
  other: "기타",
} as const;
export type ReportReason = keyof typeof reportReasons;
export type ReportTarget = "recipe" | "comment";

export const REPORT_DETAIL_MAX_LENGTH = 500;

export const reportSchema = z.object({
  targetType: z.enum(["recipe", "comment"]),
  targetId: z.uuid(),
  reason: z.enum(Object.keys(reportReasons) as [ReportReason, ...ReportReason[]], "신고 사유를 골라 주세요"),
  detail: z
    .string()
    .trim()
    .max(REPORT_DETAIL_MAX_LENGTH, `${REPORT_DETAIL_MAX_LENGTH}자까지 쓸 수 있어요`)
    .transform((value) => value || null),
});

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Fixed time zone so the server and the browser render the same text. */
export function formatCommentTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}
