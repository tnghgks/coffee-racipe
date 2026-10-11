"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { NumberStepper } from "@/components/common/number-stepper";
import { Button } from "@/components/ui/button";
import { scaleRecipe } from "@/lib/brew";

import type { RecipeStep } from "../types";

import { StepTimeline } from "./step-timeline";

type RecipeCalculatorProps = {
  doseG: number;
  ratio: number;
  steps: RecipeStep[];
};

export const DOSE_LIMITS = { min: 1, max: 100, step: 0.5 } as const;
export const RATIO_LIMITS = { min: 10, max: 20, step: 0.5 } as const;

/** Widens the stepper range so the recipe's own value is always reachable. */
const withinLimits = (limits: { min: number; max: number; step: number }, value: number) => ({
  min: Math.min(limits.min, value),
  max: Math.max(limits.max, value),
  step: limits.step,
});

export function RecipeCalculator({ doseG, ratio, steps }: RecipeCalculatorProps) {
  const [dose, setDose] = useState(doseG);
  const [targetRatio, setTargetRatio] = useState(ratio);

  const scaled = useMemo(
    () => scaleRecipe({ ratio, steps }, dose, { ratio: targetRatio }),
    [ratio, steps, dose, targetRatio],
  );
  const changed = dose !== doseG || targetRatio !== ratio;

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="비율 계산기" className="rounded-2xl border bg-card p-4 shadow-xs sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">원두</span>
            <NumberStepper
              label="원두량"
              value={dose}
              onChange={setDose}
              suffix="g"
              className="-ml-1"
              {...withinLimits(DOSE_LIMITS, doseG)}
            />
          </div>
          <ArrowRight className="mb-3 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-medium text-muted-foreground">물</span>
            <span
              className="flex h-11 items-baseline gap-0.5 font-bold tabular-nums"
              aria-live="polite"
              data-testid="total-water"
            >
              {/* Reserve 4 digits (up to 100g × 1:20) so the row doesn't shift. */}
              <span className="min-w-[4ch] text-right text-3xl text-primary">{scaled.totalWaterG}</span>
              <span className="text-base font-normal text-muted-foreground">g</span>
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">비율</span>
            <NumberStepper
              label="비율"
              value={targetRatio}
              onChange={setTargetRatio}
              prefix="1:"
              size="sm"
              {...withinLimits(RATIO_LIMITS, ratio)}
            />
          </div>
          {changed && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setDose(doseG);
                setTargetRatio(ratio);
              }}
            >
              <RotateCcw aria-hidden />
              원래대로
            </Button>
          )}
        </div>
      </section>

      <section aria-labelledby="steps-heading" className="flex flex-col gap-4">
        <h2 id="steps-heading" className="text-lg font-semibold">
          단계
        </h2>
        <StepTimeline steps={scaled.steps} totalWaterG={scaled.totalWaterG} />
      </section>
    </div>
  );
}
