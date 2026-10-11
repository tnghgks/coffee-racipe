import { describe, expect, it } from "vitest";

import { scaleRecipe } from "@/lib/brew";

import { emptyRecipeForm, formToSavePayload, recipeFormSchema, recipeToForm, type RecipeFormInput } from "./editor-schema";

const valid = (): RecipeFormInput => ({ ...emptyRecipeForm(), title: "내 V60" });

const issuesAt = (input: RecipeFormInput) => {
  const result = recipeFormSchema.safeParse(input);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
};

describe("recipeFormSchema", () => {
  it("accepts the default form once titled, converting times to seconds", () => {
    const parsed = recipeFormSchema.parse(valid());
    expect(parsed.totalTime).toBe(150);
    expect(parsed.steps.map((s) => s.startAt)).toEqual([0, 40, 70]);
    expect(parsed.waterTempC).toBe(93);
  });

  it("treats an empty temperature as unknown", () => {
    expect(recipeFormSchema.parse({ ...valid(), waterTempC: Number.NaN }).waterTempC).toBeNull();
  });

  it("rejects steps that go back in time", () => {
    const input = valid();
    input.steps[2].startAt = "0:30";
    expect(issuesAt(input)).toMatchObject({ "steps.2.startAt": "이전 단계보다 늦어야 해요" });
  });

  it("rejects water that decreases", () => {
    const input = valid();
    input.steps[1].cumulativeG = 20;
    expect(issuesAt(input)).toMatchObject({ "steps.1.cumulativeG": "이전 단계보다 적을 수 없어요" });
  });

  it("allows a step that adds no water (e.g. stir)", () => {
    const input = valid();
    input.steps.push({ ...input.steps[2], label: "젓기", startAt: "1:30" });
    expect(recipeFormSchema.safeParse(input).success).toBe(true);
  });

  it("requires the last step to match dose × ratio within 2g", () => {
    const input = valid(); // 15g × 16 = 240g
    input.steps[2].cumulativeG = 242;
    expect(recipeFormSchema.safeParse(input).success).toBe(true);
    input.steps[2].cumulativeG = 250;
    expect(issuesAt(input)["steps.2.cumulativeG"]).toContain("총 물량 240g");
  });

  it("requires total time to cover the last step", () => {
    expect(issuesAt({ ...valid(), totalTime: "1:00" })).toMatchObject({ totalTime: "마지막 단계 시작보다 길어야 해요" });
  });

  it("validates basic fields", () => {
    const issues = issuesAt({ ...valid(), title: " ", doseG: Number.NaN, totalTime: "2:99", steps: [] });
    expect(issues).toMatchObject({
      title: "제목을 입력해 주세요",
      doseG: "원두량을 입력해 주세요",
      totalTime: "m:ss 형식으로 입력해 주세요 (예: 2:45)",
      steps: "단계를 하나 이상 추가해 주세요",
    });
  });
});

describe("conversion", () => {
  const stored = {
    title: "V60 울티밋 레시피",
    description: "설명",
    dripper: { slug: "v60", name: "V60", brand: "Hario", sizeLabel: "02", maxDoseG: 30 },
    doseG: 30,
    ratio: 16.667,
    waterTempC: 100,
    grindText: "중간 가늘게",
    totalTimeS: 210,
    steps: [
      { position: 0, label: "뜸", startAtS: 0, waterRatio: 2, note: null },
      { position: 1, label: "1차", startAtS: 45, waterRatio: 10, note: "30초 안에" },
      { position: 2, label: "2차", startAtS: 75, waterRatio: 16.667, note: null },
    ],
  };

  it("prefills grams and m:ss from a stored recipe", () => {
    const form = recipeToForm(stored, { forkedFrom: "00000000-0000-4000-8000-000000000001", titleSuffix: " (복제)" });
    expect(form.title).toBe("V60 울티밋 레시피 (복제)");
    expect(form.totalTime).toBe("3:30");
    expect(form.steps.map((s) => [s.startAt, s.cumulativeG])).toEqual([
      ["0:00", 60],
      ["0:45", 300],
      ["1:15", 500],
    ]);
    expect(form.forkedFrom).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("round-trips: stored → form → payload scales back to the same grams", () => {
    const values = recipeFormSchema.parse(recipeToForm(stored));
    const { recipe, steps } = formToSavePayload(values, "dripper-id");
    expect(recipe).toMatchObject({ dose_g: 30, ratio: 16.667, total_time_s: 210, grind_text: "중간 가늘게" });
    const rescaled = scaleRecipe(
      { ratio: recipe.ratio, steps: steps.map((s) => ({ waterRatio: s.water_ratio })) },
      recipe.dose_g,
    );
    expect(rescaled.steps.map((s) => s.cumulativeWaterG)).toEqual([60, 300, 500]);
    expect(steps[1].note).toBe("30초 안에");
    expect(steps[0].note).toBeNull();
  });
});
