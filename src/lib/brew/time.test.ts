import { describe, expect, it } from "vitest";

import { formatSeconds } from "./time";

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
