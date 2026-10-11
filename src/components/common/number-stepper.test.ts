import { describe, expect, it } from "vitest";

import { stepperSlotChars } from "./number-stepper";

describe("stepperSlotChars", () => {
  it("reserves room for the integer part plus step decimals", () => {
    expect(stepperSlotChars(1, 100, 0.5, 20)).toBe(5); // "100.5"
    expect(stepperSlotChars(10, 20, 0.5, 16)).toBe(4); // "19.5"
    expect(stepperSlotChars(1, 100, 1, 20)).toBe(3); // "100"
  });

  it("widens for a more precise starting value", () => {
    expect(stepperSlotChars(10, 20, 0.5, 16.667)).toBe(6); // "16.667"
  });
});
