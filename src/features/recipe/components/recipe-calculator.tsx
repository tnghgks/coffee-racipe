"use client";

import { ArrowRight, Flame, RotateCcw, Snowflake } from "lucide-react";
import { useMemo, useState } from "react";

import { NumberStepper } from "@/components/common/number-stepper";
import { SegmentedControl } from "@/components/common/segmented-control";
import { Button } from "@/components/ui/button";
import { DEFAULT_ICE_SHARE, scaleRecipe } from "@/lib/brew";
import { cn } from "@/lib/utils";

import type { RecipeStep } from "../types";

import { StepTimeline } from "./step-timeline";

type RecipeCalculatorProps = {
  doseG: number;
  ratio: number;
  steps: RecipeStep[];
};

type ServeMode = "hot" | "iced";

const serveOptions = [
  { value: "hot", label: "핫", icon: Flame, activeClassName: "bg-primary text-primary-foreground shadow-sm" },
  { value: "iced", label: "아이스", icon: Snowflake, activeClassName: "bg-sky-600 text-white shadow-sm" },
] as const;

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
  const [mode, setMode] = useState<ServeMode>("hot");
  const iced = mode === "iced";

  const scaled = useMemo(
    () => scaleRecipe({ ratio, steps }, dose, { ratio: targetRatio, iceShare: iced ? DEFAULT_ICE_SHARE : 0 }),
    [ratio, steps, dose, targetRatio, iced],
  );
  const changed = dose !== doseG || targetRatio !== ratio;

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="비율 계산기" className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5">
        <SegmentedControl label="온도" options={serveOptions} value={mode} onChange={setMode} className="self-start" />

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
            <span className="text-xs font-medium text-muted-foreground">{iced ? "뜨거운 물" : "물"}</span>
            <span
              className="flex h-11 items-baseline gap-0.5 font-bold tabular-nums"
              aria-live="polite"
              data-testid="brew-water"
            >
              {/* Reserve 4 digits (up to 100g × 1:20) so the row doesn't shift. */}
              <span className={cn("min-w-[4ch] text-right text-3xl", iced ? "text-sky-700" : "text-primary")}>
                {scaled.brewWaterG}
              </span>
              <span className="text-base font-normal text-muted-foreground">g</span>
            </span>
          </div>
        </div>

        {iced && (
          <div className="flex flex-col gap-1 rounded-xl bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
            <p className="flex items-center justify-between gap-2 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <Snowflake className="size-4" aria-hidden />
                서버에 얼음
              </span>
              <span className="tabular-nums" data-testid="ice-water">
                {scaled.iceG}g
              </span>
            </p>
            <p className="text-xs text-sky-800/80">
              얼음 담은 서버를 저울에 올리고 영점을 맞춘 뒤 내리세요. 아래 물량은 뜨거운 물 기준이고, 분쇄도는 한 단계
              가늘게 하면 좋아요.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t pt-3">
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
          단계 {iced && <span className="text-sm font-normal text-muted-foreground">· 뜨거운 물 기준</span>}
        </h2>
        <StepTimeline steps={scaled.steps} totalWaterG={scaled.brewWaterG} />
      </section>
    </div>
  );
}
