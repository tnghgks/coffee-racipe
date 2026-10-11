"use client";

import { ArrowRight, Flame, Play, RotateCcw, Snowflake } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { NumberStepper } from "@/components/common/number-stepper";
import { SegmentedControl } from "@/components/common/segmented-control";
import { Button, buttonVariants } from "@/components/ui/button";
import { brewSettingsQuery, type BrewSettings } from "@/features/brew/settings";
import {
  DEFAULT_ICE_SHARE,
  DOSE_LIMITS,
  doseForServings,
  RATIO_LIMITS,
  scaleRecipe,
  SERVING_DOSE_G,
  SERVING_OPTIONS,
  servingsForDose,
  widenLimits,
} from "@/lib/brew";
import { cn } from "@/lib/utils";

import type { Dripper, RecipeStep } from "../types";

import { CapacityNotice, IcedGuide } from "./calculator-notices";
import { StepTimeline } from "./step-timeline";

type RecipeCalculatorProps = {
  recipeId: string;
  dripper: Dripper;
  /** The recipe's own dose and ratio ("원래대로" returns to these). */
  doseG: number;
  ratio: number;
  steps: RecipeStep[];
  /** Starting values, e.g. carried back from brew mode via the query string. */
  initial: BrewSettings;
};

type ServeMode = "hot" | "iced";

const serveOptions = [
  { value: "hot", label: "핫", icon: Flame, activeClassName: "bg-primary text-primary-foreground shadow-sm" },
  { value: "iced", label: "아이스", icon: Snowflake, activeClassName: "bg-sky-600 text-white shadow-sm" },
] as const;

const servingOptions = SERVING_OPTIONS.map((n) => ({ value: String(n), label: `${n}인분` }));

export function RecipeCalculator({ recipeId, dripper, doseG, ratio, steps, initial }: RecipeCalculatorProps) {
  const [dose, setDose] = useState(initial.doseG);
  const [targetRatio, setTargetRatio] = useState(initial.ratio);
  const [mode, setMode] = useState<ServeMode>(initial.iced ? "iced" : "hot");
  const iced = mode === "iced";

  const scaled = useMemo(
    () => scaleRecipe({ ratio, steps }, dose, { ratio: targetRatio, iceShare: iced ? DEFAULT_ICE_SHARE : 0 }),
    [ratio, steps, dose, targetRatio, iced],
  );
  const changed = dose !== doseG || targetRatio !== ratio;
  const servings = servingsForDose(dose);
  const brewHref = `/recipes/${recipeId}/brew${brewSettingsQuery({ doseG: dose, ratio: targetRatio, iced }, { doseG, ratio })}`;

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="비율 계산기" className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-5">
        <SegmentedControl label="온도" options={serveOptions} value={mode} onChange={setMode} className="self-start" />

        <div className="flex flex-col gap-1.5">
          <SegmentedControl
            label="인분"
            options={servingOptions}
            value={servings === null ? null : String(servings)}
            onChange={(value) => setDose(doseForServings(Number(value)))}
            size="sm"
            className="grid w-full grid-cols-4"
          />
          <p className="text-xs text-muted-foreground">1인분 = 원두 {SERVING_DOSE_G}g</p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">원두</span>
            <NumberStepper
              label="원두량"
              value={dose}
              onChange={setDose}
              suffix="g"
              className="-ml-1"
              {...widenLimits(DOSE_LIMITS, doseG)}
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

        {/* Below the dose row so the button being pressed never moves when this appears. */}
        <CapacityNotice dripper={dripper} doseG={dose} />

        {iced && <IcedGuide iceG={scaled.iceG} />}

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">비율</span>
            <NumberStepper
              label="비율"
              value={targetRatio}
              onChange={setTargetRatio}
              prefix="1:"
              size="sm"
              {...widenLimits(RATIO_LIMITS, ratio)}
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
        <Link href={brewHref} className={cn(buttonVariants({ size: "lg" }), "h-12 text-base")}>
          <Play aria-hidden />이 설정으로 추출 시작
        </Link>
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
