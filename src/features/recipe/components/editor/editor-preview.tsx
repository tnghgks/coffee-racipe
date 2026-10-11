"use client";

import { useWatch } from "react-hook-form";

import { formatGrams, formatRatio, formatSeconds, parseClock, roundGrams, type ScaledStep } from "@/lib/brew";

import type { RecipeFormInput } from "../../editor-schema";
import type { RecipeStep } from "../../types";
import { StepTimeline } from "../step-timeline";

/** Turns half-typed form steps into timeline steps; blanks fall back to the previous step's water. */
function previewSteps(steps: RecipeFormInput["steps"], doseG: number): ScaledStep<RecipeStep>[] {
  const cumulative: number[] = [];
  for (const [i, step] of steps.entries()) {
    cumulative.push(Number.isFinite(step.cumulativeG) ? step.cumulativeG : (cumulative[i - 1] ?? 0));
  }
  return steps.map((step, i) => ({
    position: i,
    label: step.label || "(이름 없음)",
    startAtS: parseClock(step.startAt) ?? 0,
    waterRatio: doseG > 0 ? cumulative[i] / doseG : 0,
    note: step.note || null,
    cumulativeWaterG: cumulative[i],
    pourWaterG: cumulative[i] - (cumulative[i - 1] ?? 0),
  }));
}

/** Live preview of the steps as they will appear on the recipe page. */
export function EditorPreview() {
  const [doseG, ratio, totalTime, steps] = useWatch<RecipeFormInput, ["doseG", "ratio", "totalTime", "steps"]>({
    name: ["doseG", "ratio", "totalTime", "steps"],
  });

  const dose = Number.isFinite(doseG) ? doseG : 0;
  const totalWaterG = Number.isFinite(ratio) ? roundGrams(dose * ratio) : 0;
  const preview = previewSteps(steps, dose);
  const lastG = preview.at(-1)?.cumulativeWaterG ?? 0;
  const total = parseClock(totalTime);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">미리보기</h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          원두 {formatGrams(dose)} · {Number.isFinite(ratio) ? formatRatio(ratio) : "–"} · 물 {totalWaterG}g
          {total !== null && ` · ${formatSeconds(total)}`}
        </p>
      </div>
      <StepTimeline steps={preview} totalWaterG={Math.max(totalWaterG, lastG)} />
    </div>
  );
}
