import { describe, expect, it } from "vitest";

import { roundGrams, scaleRecipe, toWaterRatio } from "./scale";

// Seed: "V60 기본 1인분" (15g, 1:16)
const basicV60 = {
  ratio: 16,
  steps: [
    { label: "뜸 들이기", waterRatio: 2 },
    { label: "1차 붓기", waterRatio: 8 },
    { label: "2차 붓기", waterRatio: 12 },
    { label: "3차 붓기", waterRatio: 16 },
  ],
};

// Seed: "V60 울티밋 레시피" (30g, 1:16.667, last step adds no water)
const ultimateV60 = {
  ratio: 16.667,
  steps: [{ waterRatio: 2 }, { waterRatio: 10 }, { waterRatio: 16.667 }, { waterRatio: 16.667 }],
};

const cumulative = (r: ReturnType<typeof scaleRecipe>) => r.steps.map((s) => s.cumulativeWaterG);
const pours = (r: ReturnType<typeof scaleRecipe>) => r.steps.map((s) => s.pourWaterG);

describe("scaleRecipe", () => {
  it("converts the recipe at its own dose", () => {
    const result = scaleRecipe(basicV60, 15);
    expect(cumulative(result)).toEqual([30, 120, 180, 240]);
    expect(pours(result)).toEqual([30, 90, 60, 60]);
    expect(result.totalWaterG).toBe(240);
  });

  it("rescales every step when the dose changes from 15g to 20g", () => {
    const result = scaleRecipe(basicV60, 20);
    expect(cumulative(result)).toEqual([40, 160, 240, 320]);
    expect(pours(result)).toEqual([40, 120, 80, 80]);
    expect(result.totalWaterG).toBe(320);
  });

  it("rounds to whole grams and keeps pours summing to the last cumulative value", () => {
    const result = scaleRecipe(ultimateV60, 20);
    expect(cumulative(result)).toEqual([40, 200, 333, 333]);
    expect(pours(result)).toEqual([40, 160, 133, 0]);
    expect(result.totalWaterG).toBe(333);
    expect(pours(result).reduce((a, b) => a + b, 0)).toBe(333);
  });

  it("keeps the 1:16.667 recipe at exactly 500g for 30g", () => {
    const result = scaleRecipe(ultimateV60, 30);
    expect(cumulative(result)).toEqual([60, 300, 500, 500]);
    expect(result.totalWaterG).toBe(500);
  });

  it("stretches step water proportionally when the ratio changes", () => {
    const result = scaleRecipe(basicV60, 15, { ratio: 15 });
    expect(result.ratio).toBe(15);
    expect(result.totalWaterG).toBe(225);
    expect(cumulative(result)).toEqual([28, 113, 169, 225]);
    expect(pours(result).reduce((a, b) => a + b, 0)).toBe(225);
  });

  it("handles fractional doses", () => {
    const result = scaleRecipe(basicV60, 15.5);
    expect(cumulative(result)).toEqual([31, 124, 186, 248]);
    expect(result.totalWaterG).toBe(248);
  });

  it("returns zeros for a 0g dose", () => {
    const result = scaleRecipe(basicV60, 0);
    expect(cumulative(result)).toEqual([0, 0, 0, 0]);
    expect(pours(result)).toEqual([0, 0, 0, 0]);
    expect(result.totalWaterG).toBe(0);
  });

  it("works with no steps", () => {
    const result = scaleRecipe({ ratio: 16, steps: [] }, 18);
    expect(result.steps).toEqual([]);
    expect(result.totalWaterG).toBe(288);
  });

  it("preserves extra step fields", () => {
    const result = scaleRecipe(basicV60, 15);
    expect(result.steps[1]).toMatchObject({ label: "1차 붓기", waterRatio: 8, cumulativeWaterG: 120 });
  });

  it("does not mutate the input", () => {
    const snapshot = structuredClone(basicV60);
    scaleRecipe(basicV60, 20, { ratio: 15 });
    expect(basicV60).toEqual(snapshot);
  });

  it("reports no ice when brewing hot", () => {
    const result = scaleRecipe(basicV60, 15);
    expect(result.brewWaterG).toBe(240);
    expect(result.iceG).toBe(0);
  });

  describe("iced", () => {
    it("moves 40% of the water into ice and shrinks every step to match", () => {
      const result = scaleRecipe(basicV60, 15, { iceShare: 0.4 });
      expect(result.totalWaterG).toBe(240);
      expect(result.brewWaterG).toBe(144);
      expect(result.iceG).toBe(96);
      expect(cumulative(result)).toEqual([18, 72, 108, 144]);
      expect(pours(result)).toEqual([18, 54, 36, 36]);
    });

    it("keeps brew water + ice equal to the total after rounding", () => {
      const result = scaleRecipe(ultimateV60, 20.5, { iceShare: 0.4 });
      expect(result.brewWaterG + result.iceG).toBe(result.totalWaterG);
      expect(result.steps.at(-1)?.cumulativeWaterG).toBe(result.brewWaterG);
    });

    it("combines with dose and ratio changes", () => {
      const result = scaleRecipe(ultimateV60, 30, { iceShare: 0.4 });
      expect(result.totalWaterG).toBe(500);
      expect(result.brewWaterG).toBe(300);
      expect(result.iceG).toBe(200);
      expect(cumulative(result)).toEqual([36, 180, 300, 300]);
    });

    it.each([-0.1, 1, Number.NaN])("rejects ice share %s", (iceShare) => {
      expect(() => scaleRecipe(basicV60, 15, { iceShare })).toThrow(RangeError);
    });
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("rejects dose %s", (dose) => {
    expect(() => scaleRecipe(basicV60, dose)).toThrow(RangeError);
  });

  it.each([0, -16, Number.NaN])("rejects ratio override %s", (ratio) => {
    expect(() => scaleRecipe(basicV60, 15, { ratio })).toThrow(RangeError);
  });
});

describe("roundGrams", () => {
  it("rounds half up despite float noise", () => {
    expect(15 * 4.1).toBeLessThan(61.5); // 61.49999999999999
    expect(Math.round(15 * 4.1)).toBe(61);
    expect(roundGrams(15 * 4.1)).toBe(62);
    expect(roundGrams(2.5)).toBe(3);
    expect(roundGrams(2.49)).toBe(2);
  });
});

describe("toWaterRatio", () => {
  it("converts grams to a 3-decimal ratio", () => {
    expect(toWaterRatio(500, 30)).toBe(16.667);
    expect(toWaterRatio(60, 30)).toBe(2);
    expect(toWaterRatio(0, 15)).toBe(0);
  });

  it("round-trips through scaleRecipe to the same grams", () => {
    const grams = [45, 150, 225, 300];
    const steps = grams.map((g) => ({ waterRatio: toWaterRatio(g, 18) }));
    const result = scaleRecipe({ ratio: toWaterRatio(300, 18), steps }, 18);
    expect(cumulative(result)).toEqual(grams);
  });

  it("rejects a non-positive dose", () => {
    expect(() => toWaterRatio(100, 0)).toThrow(RangeError);
  });
});
