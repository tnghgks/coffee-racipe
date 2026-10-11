import { describe, expect, it } from "vitest";

import { doseForServings, servingsForDose } from "./servings";

describe("servings", () => {
  it("converts servings to dose", () => {
    expect(doseForServings(1)).toBe(15);
    expect(doseForServings(4)).toBe(60);
  });

  it.each([
    [15, 1],
    [30, 2],
    [60, 4],
    [20, null],
    [15.5, null],
    [0, null],
  ])("%sg → %s servings", (dose, expected) => {
    expect(servingsForDose(dose)).toBe(expected);
  });

  it("round-trips", () => {
    for (const n of [1, 2, 3, 4]) expect(servingsForDose(doseForServings(n))).toBe(n);
  });
});
