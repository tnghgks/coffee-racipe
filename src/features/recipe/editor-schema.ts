import { z } from "zod";

import { formatSeconds, parseClock, roundGrams, toWaterRatio } from "@/lib/brew";

import type { RecipeDetail } from "./types";

/**
 * Recipe editor schema, shared by the form (client) and saveRecipe (server).
 * People type grams (cumulative scale readings) and m:ss times; the DB stores ratios to the dose.
 */

/** How far the last step's water may be from dose × ratio before it counts as a mismatch. */
export const WATER_TOLERANCE_G = 2;
export const MAX_STEPS = 20;

const clock = (message: string) =>
  z
    .string()
    .trim()
    .transform((text, ctx) => {
      const seconds = parseClock(text);
      if (seconds === null || seconds > 3600) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return seconds;
    });

/** Number inputs registered with valueAsNumber give NaN when empty. */
const requiredNumber = (message: string) => z.number({ error: message }).refine(Number.isFinite, message);

const stepSchema = z.object({
  label: z.string().trim().min(1, "단계 이름을 입력해 주세요").max(50, "50자 이내"),
  startAt: clock("m:ss 형식으로 입력해 주세요 (예: 0:40)"),
  cumulativeG: requiredNumber("누적 물량을 입력해 주세요").pipe(z.number().min(0, "0g 이상").max(3000, "3000g 이하")),
  note: z.string().trim().max(500, "500자 이내"),
});

export const recipeFormSchema = z
  .object({
    title: z.string().trim().min(1, "제목을 입력해 주세요").max(100, "100자 이내"),
    description: z.string().trim().max(2000, "2000자 이내"),
    dripperSlug: z.string().min(1, "드리퍼를 골라 주세요"),
    doseG: requiredNumber("원두량을 입력해 주세요").pipe(z.number().gt(0, "0보다 커야 해요").max(200, "200g 이하")),
    ratio: requiredNumber("비율을 입력해 주세요").pipe(z.number().min(1, "1 이상").max(30, "30 이하")),
    waterTempC: z.union([
      z.nan().transform(() => null),
      z.number().int("정수로 입력해 주세요").min(60, "60°C 이상").max(100, "100°C 이하"),
    ]),
    grindText: z.string().trim().max(100, "100자 이내"),
    totalTime: clock("m:ss 형식으로 입력해 주세요 (예: 2:45)"),
    visibility: z.enum(["private", "unlisted", "public"]),
    forkedFrom: z.uuid().nullable(),
    steps: z.array(stepSchema).min(1, "단계를 하나 이상 추가해 주세요").max(MAX_STEPS, `단계는 ${MAX_STEPS}개까지`),
  })
  .superRefine((recipe, ctx) => {
    recipe.steps.forEach((step, i) => {
      const prev = recipe.steps[i - 1];
      if (prev && step.startAt < prev.startAt) {
        ctx.addIssue({ code: "custom", path: ["steps", i, "startAt"], message: "이전 단계보다 늦어야 해요" });
      }
      if (prev && step.cumulativeG < prev.cumulativeG) {
        ctx.addIssue({ code: "custom", path: ["steps", i, "cumulativeG"], message: "이전 단계보다 적을 수 없어요" });
      }
    });

    const last = recipe.steps.at(-1);
    if (last && last.startAt > recipe.totalTime) {
      ctx.addIssue({ code: "custom", path: ["totalTime"], message: "마지막 단계 시작보다 길어야 해요" });
    }

    const totalWaterG = roundGrams(recipe.doseG * recipe.ratio);
    if (last && Math.abs(last.cumulativeG - totalWaterG) > WATER_TOLERANCE_G) {
      ctx.addIssue({
        code: "custom",
        path: ["steps", recipe.steps.length - 1, "cumulativeG"],
        message: `마지막 단계는 총 물량 ${totalWaterG}g(원두 × 비율)과 같아야 해요`,
      });
    }
  });

export type RecipeFormInput = z.input<typeof recipeFormSchema>;
export type RecipeFormValues = z.output<typeof recipeFormSchema>;

export function emptyRecipeForm(): RecipeFormInput {
  return {
    title: "",
    description: "",
    dripperSlug: "v60",
    doseG: 15,
    ratio: 16,
    waterTempC: 93,
    grindText: "",
    totalTime: "2:30",
    visibility: "private",
    forkedFrom: null,
    steps: [
      { label: "뜸 들이기", startAt: "0:00", cumulativeG: 30, note: "" },
      { label: "1차 붓기", startAt: "0:40", cumulativeG: 150, note: "" },
      { label: "2차 붓기", startAt: "1:10", cumulativeG: 240, note: "" },
    ],
  };
}

/** Prefills the editor from a stored recipe (for editing, or as a fork with `forkedFrom`). */
export function recipeToForm(
  recipe: Pick<
    RecipeDetail,
    | "title"
    | "description"
    | "dripper"
    | "doseG"
    | "ratio"
    | "waterTempC"
    | "grindText"
    | "totalTimeS"
    | "steps"
    | "visibility"
  >,
  /** keepVisibility: editing keeps the current setting; forks start private. */
  options: { forkedFrom?: string | null; titleSuffix?: string; keepVisibility?: boolean } = {},
): RecipeFormInput {
  return {
    title: `${recipe.title}${options.titleSuffix ?? ""}`.slice(0, 100),
    description: recipe.description ?? "",
    dripperSlug: recipe.dripper.slug,
    doseG: recipe.doseG,
    ratio: recipe.ratio,
    waterTempC: recipe.waterTempC ?? Number.NaN,
    grindText: recipe.grindText ?? "",
    totalTime: formatSeconds(recipe.totalTimeS),
    visibility: options.keepVisibility ? recipe.visibility : "private",
    forkedFrom: options.forkedFrom ?? null,
    steps: recipe.steps.map((step) => ({
      label: step.label,
      startAt: formatSeconds(step.startAtS),
      cumulativeG: roundGrams(recipe.doseG * step.waterRatio),
      note: step.note ?? "",
    })),
  };
}

/** Arguments for the save_recipe database function (which resolves the dripper slug itself). */
export function formToSavePayload(values: RecipeFormValues) {
  return {
    recipe: {
      title: values.title,
      description: values.description || null,
      dripper_slug: values.dripperSlug,
      dose_g: values.doseG,
      ratio: values.ratio,
      water_temp_c: values.waterTempC,
      grind_text: values.grindText || null,
      total_time_s: values.totalTime,
      visibility: values.visibility,
      forked_from: values.forkedFrom,
    },
    steps: values.steps.map((step) => ({
      label: step.label,
      start_at_s: step.startAt,
      water_ratio: toWaterRatio(step.cumulativeG, values.doseG),
      note: step.note || null,
    })),
  };
}
