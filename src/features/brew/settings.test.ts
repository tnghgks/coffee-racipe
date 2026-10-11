import { describe, expect, it } from "vitest";

import { brewSettingsQuery, parseBrewSettings } from "./settings";

const recipe = { doseG: 15, ratio: 16 };

describe("parseBrewSettings", () => {
  it("defaults to the recipe's values", () => {
    expect(parseBrewSettings({}, recipe)).toEqual({ doseG: 15, ratio: 16, iced: false });
  });

  it("reads dose, ratio and iced", () => {
    expect(parseBrewSettings({ dose: "20.5", ratio: "15", iced: "1" }, recipe)).toEqual({
      doseG: 20.5,
      ratio: 15,
      iced: true,
    });
  });

  it.each([
    [{ dose: "abc" }, 15],
    [{ dose: "0" }, 15],
    [{ dose: "500" }, 15],
    [{ dose: "" }, 15],
    [{ dose: ["30", "40"] }, 30],
  ])("dose %o → %s", (params, expected) => {
    expect(parseBrewSettings(params, recipe).doseG).toBe(expected);
  });

  it("rejects ratios outside the allowed range", () => {
    expect(parseBrewSettings({ ratio: "50" }, recipe).ratio).toBe(16);
  });

  it("accepts a recipe value outside the default range", () => {
    expect(parseBrewSettings({ ratio: "8" }, { doseG: 20, ratio: 8 }).ratio).toBe(8);
  });

  it("only treats iced=1 as iced", () => {
    expect(parseBrewSettings({ iced: "true" }, recipe).iced).toBe(false);
  });
});

describe("brewSettingsQuery", () => {
  it("is empty when nothing differs from the recipe", () => {
    expect(brewSettingsQuery({ doseG: 15, ratio: 16, iced: false }, recipe)).toBe("");
  });

  it("includes only changed values", () => {
    expect(brewSettingsQuery({ doseG: 20, ratio: 16, iced: true }, recipe)).toBe("?dose=20&iced=1");
  });

  it("round-trips through the parser", () => {
    const settings = { doseG: 22.5, ratio: 15.5, iced: true };
    const params = Object.fromEntries(new URLSearchParams(brewSettingsQuery(settings, recipe)));
    expect(parseBrewSettings(params, recipe)).toEqual(settings);
  });
});
