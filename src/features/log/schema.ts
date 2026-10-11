import { z } from "zod";

import { parseClock } from "@/lib/brew";

/** Shared by the log form (client) and saveBrewLog (server). Mirrors the brew_logs table checks. */

export const ROAST_LEVELS = ["light", "medium_light", "medium", "medium_dark", "dark"] as const;
export type RoastLevel = (typeof ROAST_LEVELS)[number];

export const ROAST_LABELS: Record<RoastLevel, string> = {
  light: "라이트",
  medium_light: "미디엄 라이트",
  medium: "미디엄",
  medium_dark: "미디엄 다크",
  dark: "다크",
};

/** Number inputs registered with valueAsNumber give NaN when empty. */
const optionalInt = (min: number, max: number, message: string) =>
  z.union([z.nan().transform(() => null), z.null(), z.number().int(message).min(min, message).max(max, message)]);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max}자 이내`)
    .transform((value) => value || null);

/** 1–5 taps; 0 means "not chosen" in the form. */
const score = z.union([z.literal(0).transform(() => null), z.number().int().min(1).max(5)]);

export const logFormSchema = z.object({
  recipeId: z.uuid().nullable(),
  beanName: optionalText(100),
  roaster: optionalText(100),
  roastLevel: z.union([z.literal("").transform(() => null), z.enum(ROAST_LEVELS)]),
  doseG: z.number({ error: "원두량을 입력해 주세요" }).refine(Number.isFinite, "원두량을 입력해 주세요").pipe(
    z.number().gt(0, "0보다 커야 해요").max(200, "200g 이하"),
  ),
  waterG: z.number({ error: "물량을 입력해 주세요" }).refine(Number.isFinite, "물량을 입력해 주세요").pipe(
    z.number().int("정수로 입력해 주세요").gt(0, "0보다 커야 해요").max(6000, "6000g 이하"),
  ),
  iced: z.boolean(),
  grindText: optionalText(100),
  waterTempC: optionalInt(60, 100, "60~100°C"),
  totalTime: z
    .string()
    .trim()
    .transform((text, ctx) => {
      if (!text) return null;
      const seconds = parseClock(text);
      if (seconds === null || seconds <= 0 || seconds > 3600) {
        ctx.addIssue({ code: "custom", message: "m:ss 형식으로 입력해 주세요 (예: 2:45)" });
        return z.NEVER;
      }
      return seconds;
    }),
  rating: z.number().int().min(1, "평점을 골라 주세요").max(5),
  acidity: score,
  sweetness: score,
  body: score,
  notes: optionalText(2000),
  nextAdjustment: optionalText(500),
});

export type LogFormInput = z.input<typeof logFormSchema>;
export type LogFormValues = z.output<typeof logFormSchema>;

/** Row for insert/update (user_id and brewed_at default in the database). */
export function logToRow(values: LogFormValues) {
  return {
    recipe_id: values.recipeId,
    bean_name: values.beanName,
    roaster: values.roaster,
    roast_level: values.roastLevel,
    dose_g: values.doseG,
    water_g: values.waterG,
    iced: values.iced,
    grind_text: values.grindText,
    water_temp_c: values.waterTempC,
    total_time_s: values.totalTime,
    rating: values.rating,
    acidity: values.acidity,
    sweetness: values.sweetness,
    body: values.body,
    notes: values.notes,
    next_adjustment: values.nextAdjustment,
  };
}
