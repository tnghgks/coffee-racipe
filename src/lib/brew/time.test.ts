import { describe, expect, it } from "vitest";

import { formatSeconds, parseClock } from "./time";

describe("parseClock", () => {
  it.each([
    ["1:45", 105],
    ["0:05", 5],
    ["10:00", 600],
    [" 2:30 ", 150],
    ["45", 45],
    ["0", 0],
  ])("%s → %s", (input, expected) => {
    expect(parseClock(input)).toBe(expected);
  });

  it.each(["", "1:75", "1:5", "-3", "abc", "1:30:00", "1.5"])("rejects %s", (input) => {
    expect(parseClock(input)).toBeNull();
  });

  it("round-trips with formatSeconds", () => {
    for (const s of [0, 5, 59, 60, 105, 3599]) expect(parseClock(formatSeconds(s))).toBe(s);
  });
});

describe("formatSeconds", () => {
  it.each([
    [0, "0:00"],
    [5, "0:05"],
    [45, "0:45"],
    [105, "1:45"],
    [600, "10:00"],
    [59.9, "0:59"],
    [-3, "0:00"],
  ])("%s → %s", (input, expected) => {
    expect(formatSeconds(input)).toBe(expected);
  });
});
