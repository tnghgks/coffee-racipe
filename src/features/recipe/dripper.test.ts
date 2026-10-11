import { describe, expect, it } from "vitest";

import { dripperLabel, exceedsCapacity } from "./dripper";

describe("dripperLabel", () => {
  it.each([
    [{ brand: "Hario", name: "V60" }, "Hario V60"],
    [{ brand: "Clever", name: "Clever Dripper" }, "Clever Dripper"],
    [{ brand: "Origami", name: "Origami" }, "Origami"],
    [{ brand: "Melitta", name: "Melitta 1구" }, "Melitta 1구"],
    [{ brand: "Kalita", name: "Kalita Wave" }, "Kalita Wave"],
  ])("%o → %s", (dripper, expected) => {
    expect(dripperLabel(dripper)).toBe(expected);
  });
});

describe("exceedsCapacity", () => {
  it("allows doses up to and including the maximum", () => {
    expect(exceedsCapacity(30, { maxDoseG: 30 })).toBe(false);
    expect(exceedsCapacity(15, { maxDoseG: 30 })).toBe(false);
  });

  it("warns above the maximum", () => {
    expect(exceedsCapacity(30.5, { maxDoseG: 30 })).toBe(true);
    expect(exceedsCapacity(45, { maxDoseG: 30 })).toBe(true);
  });

  it("never warns when capacity is unknown", () => {
    expect(exceedsCapacity(100, { maxDoseG: null })).toBe(false);
  });
});
