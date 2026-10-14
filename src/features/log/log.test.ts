import { describe, expect, it } from "vitest";

import { formatBrewedAt } from "./format";
import { brewSettingsFromLog, emptyLogForm, logDefaultsFromQuery, newLogHref, type RecipeDefaults } from "./prefill";
import { logFormSchema, logToRow } from "./schema";

const recipe: RecipeDefaults = {
  id: "00000000-0000-4000-8000-000000000003",
  doseG: 15,
  ratio: 16,
  grindText: "중간 가늘게",
  waterTempC: 93,
  totalTimeS: 165,
};

describe("brew → log handoff", () => {
  it("builds a link with what was brewed", () => {
    expect(newLogHref({ recipeId: recipe.id, doseG: 20, ratio: 16, iced: true, elapsedS: 171.6 })).toBe(
      `/me/logs/new?recipe=${recipe.id}&dose=20&ratio=16&time=172&iced=1`,
    );
  });

  it("prefills from the brew result, falling back to the recipe", () => {
    const query = Object.fromEntries(
      new URLSearchParams(newLogHref({ recipeId: recipe.id, doseG: 20, ratio: 16, iced: true, elapsedS: 171 })
        .split("?")[1]),
    );
    expect(logDefaultsFromQuery(query, recipe)).toMatchObject({
      recipeId: recipe.id,
      doseG: 20,
      waterG: 320, // total water including ice
      iced: true,
      grindText: "중간 가늘게",
      waterTempC: 93,
      totalTime: "2:51",
      rating: 0,
    });
  });

  it("uses the recipe's values when the query has none or bad ones", () => {
    expect(logDefaultsFromQuery({ dose: "abc", time: "-5" }, recipe)).toMatchObject({
      doseG: 15,
      waterG: 240,
      totalTime: "2:45",
      iced: false,
    });
  });

  it("works without a recipe", () => {
    expect(logDefaultsFromQuery({}, null)).toMatchObject({ recipeId: null, doseG: 15, waterG: 240, totalTime: "" });
  });
});

describe("log → brew again", () => {
  const ultimate = { doseG: 30, ratio: 16.667 };

  it("keeps the recipe ratio when the water matches it (grams are rounded)", () => {
    // 18 × 16.667 = 300.006 → logged as 300g
    expect(brewSettingsFromLog({ doseG: 18, waterG: 300, iced: false }, ultimate)).toEqual({
      doseG: 18,
      ratio: 16.667,
      iced: false,
    });
  });

  it("derives the ratio from the logged water otherwise, iced included", () => {
    expect(brewSettingsFromLog({ doseG: 20, waterG: 300, iced: true }, ultimate)).toEqual({
      doseG: 20,
      ratio: 15,
      iced: true,
    });
    expect(brewSettingsFromLog({ doseG: 15, waterG: 248, iced: false }, recipe)).toMatchObject({ ratio: 16.5 });
  });

  it("falls back to the recipe for out-of-range values", () => {
    expect(brewSettingsFromLog({ doseG: 150, waterG: 300, iced: false }, recipe)).toEqual({
      doseG: 15,
      ratio: 16,
      iced: false,
    });
  });
});

describe("logFormSchema", () => {
  const filled = { ...emptyLogForm(), rating: 4 };

  it("accepts a log with only a rating (the 3-tap path)", () => {
    const values = logFormSchema.parse(filled);
    expect(values).toMatchObject({ rating: 4, acidity: null, beanName: null, roastLevel: null, totalTime: null });
  });

  it("requires a rating", () => {
    const result = logFormSchema.safeParse(emptyLogForm());
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ["rating"], message: "평점을 골라 주세요" });
  });

  it("parses optional fields", () => {
    const values = logFormSchema.parse({
      ...filled,
      beanName: " 예가체프 ",
      roastLevel: "medium_light",
      acidity: 5,
      waterTempC: 92,
      totalTime: "3:05",
      nextAdjustment: "분쇄 한 칸 굵게",
    });
    expect(values).toMatchObject({
      beanName: "예가체프",
      roastLevel: "medium_light",
      acidity: 5,
      waterTempC: 92,
      totalTime: 185,
      nextAdjustment: "분쇄 한 칸 굵게",
    });
  });

  it("rejects out-of-range values", () => {
    expect(logFormSchema.safeParse({ ...filled, waterTempC: 120 }).success).toBe(false);
    expect(logFormSchema.safeParse({ ...filled, totalTime: "9:99" }).success).toBe(false);
    expect(logFormSchema.safeParse({ ...filled, doseG: Number.NaN }).success).toBe(false);
  });

  it("maps to database columns", () => {
    expect(logToRow(logFormSchema.parse({ ...filled, recipeId: recipe.id, iced: true }))).toMatchObject({
      recipe_id: recipe.id,
      rating: 4,
      iced: true,
      dose_g: 15,
      water_g: 240,
      next_adjustment: null,
    });
  });
});

describe("formatBrewedAt", () => {
  it("formats in Korea time regardless of the machine's zone", () => {
    expect(formatBrewedAt("2026-10-10T23:30:00Z")).toBe("10월 11일 (일) 오전 8:30");
    expect(formatBrewedAt("2026-10-11T06:05:00Z")).toBe("10월 11일 (일) 오후 3:05");
  });
});
