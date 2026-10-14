import { describe, expect, it } from "vitest";

import { formatCount, formatTimeAgo } from "./format";

describe("formatCount", () => {
  it.each([
    [0, "0"],
    [986, "986"],
    [999, "999"],
    [1_000, "1천"],
    [1_299, "1.2천"],
    [9_999, "9.9천"],
    [10_000, "1만"],
    [12_345, "1.2만"],
    [123_456, "12만"],
    [12_345_678, "1,234만"],
  ])("%d → %s", (count, expected) => {
    expect(formatCount(count)).toBe(expected);
  });
});

describe("formatTimeAgo", () => {
  const now = Date.parse("2026-10-14T12:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it.each([
    [ago(30_000), "방금 전"],
    [ago(5 * 60_000), "5분 전"],
    [ago(3 * 3_600_000 + 59 * 60_000), "3시간 전"],
    [ago(2 * 86_400_000), "2일 전"],
  ])("%s → %s", (iso, expected) => {
    expect(formatTimeAgo(iso, now)).toBe(expected);
  });

  it("treats future timestamps (clock skew) as just now", () => {
    expect(formatTimeAgo(new Date(now + 60_000).toISOString(), now)).toBe("방금 전");
  });

  it("shows a Seoul date after a week", () => {
    expect(formatTimeAgo("2026-09-30T16:00:00Z", now)).toBe("2026. 10. 1.");
  });
});
