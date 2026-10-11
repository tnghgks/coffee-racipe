"use client";

import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { NumberStepper } from "@/components/common/number-stepper";
import { Button } from "@/components/ui/button";
import { formatGrams, formatRatio, scaleRecipe } from "@/lib/brew";

import type { RecipeStep } from "../types";

import { StepTable } from "./step-table";

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
    <section aria-labelledby="calculator-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id="calculator-heading" className="text-lg font-semibold">
          비율 계산기
        </h2>
        {changed && (
          <Button
            variant="ghost"
            size="sm"
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

      <div className="grid gap-3 sm:grid-cols-2">
        <NumberStepper
          label="원두량"
          value={dose}
          onChange={setDose}
          suffix="g"
          {...withinLimits(DOSE_LIMITS, doseG)}
        />
        <NumberStepper
          label="비율"
          value={targetRatio}
          onChange={setTargetRatio}
          prefix="1:"
          {...withinLimits(RATIO_LIMITS, ratio)}
        />
      </div>

      <p className="rounded-lg bg-accent/60 px-4 py-3 text-sm" aria-live="polite">
        원두 <strong className="tabular-nums">{formatGrams(scaled.doseG)}</strong> · {formatRatio(scaled.ratio)} → 물{" "}
        <strong className="text-base tabular-nums" data-testid="total-water">
          {scaled.totalWaterG}g
        </strong>
      </p>

      <StepTable steps={scaled.steps} />
    </section>
  );
}
