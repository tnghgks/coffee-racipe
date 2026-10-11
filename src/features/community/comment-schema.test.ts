import { describe, expect, it } from "vitest";

import { commentBodySchema, formatCommentTime, reportSchema } from "./comment-schema";

const id = "00000000-0000-4000-8000-000000000001";

describe("commentBodySchema", () => {
  it("trims and accepts normal text", () => {
    expect(commentBodySchema.parse("  맛있어요  ")).toBe("맛있어요");
  });

  it("rejects blank and too long text", () => {
    expect(commentBodySchema.safeParse("   ").success).toBe(false);
    expect(commentBodySchema.safeParse("가".repeat(1001)).success).toBe(false);
    expect(commentBodySchema.safeParse("가".repeat(1000)).success).toBe(true);
  });
});

describe("reportSchema", () => {
  it("turns an empty detail into null", () => {
    expect(reportSchema.parse({ targetType: "recipe", targetId: id, reason: "spam", detail: "  " })).toEqual({
      targetType: "recipe",
      targetId: id,
      reason: "spam",
      detail: null,
    });
  });

  it("requires a known reason and target", () => {
    expect(reportSchema.safeParse({ targetType: "recipe", targetId: id, reason: "boring", detail: "" }).success).toBe(false);
    expect(reportSchema.safeParse({ targetType: "user", targetId: id, reason: "spam", detail: "" }).success).toBe(false);
    expect(reportSchema.safeParse({ targetType: "recipe", targetId: "x", reason: "spam", detail: "" }).success).toBe(false);
  });
});

describe("formatCommentTime", () => {
  it("uses Korea time regardless of the machine's zone", () => {
    expect(formatCommentTime("2026-10-11T15:30:00Z")).toContain("12");
    expect(formatCommentTime("2026-10-11T15:30:00Z")).toContain("00:30");
  });
});
