import { describe, expect, it } from "vitest";

import { dripperLabel } from "./dripper";

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
