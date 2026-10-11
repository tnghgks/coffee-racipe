import { describe, expect, it } from "vitest";

import { formatGrams, formatRatio } from "./format";

describe("formatRatio", () => {
  it.each([
    [16, "1:16"],
    [16.667, "1:16.7"],
    [15.5, "1:15.5"],
    [15.04, "1:15"],
  ])("%s → %s", (input, expected) => {
    expect(formatRatio(input)).toBe(expected);
  });
});

describe("formatGrams", () => {
  it.each([
    [15, "15g"],
    [15.5, "15.5g"],
    [20.04, "20g"],
  ])("%s → %s", (input, expected) => {
    expect(formatGrams(input)).toBe(expected);
  });
});
