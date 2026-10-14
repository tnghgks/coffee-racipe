"use client";

import { ArrowRight, Bean, Flame, Play, RotateCcw, Snowflake, Thermometer, Timer } from "lucide-react";
import type { ReactNode } from "react";

import { NumberStepper } from "@/components/common/number-stepper";
import { SegmentedControl } from "@/components/common/segmented-control";
import { Button } from "@/components/ui/button";
import { CapacityNotice, IcedGuide } from "@/features/recipe/components/calculator-notices";
import { StepTimeline } from "@/features/recipe/components/step-timeline";
import type { RecipeDetail } from "@/features/recipe/types";
import {
  DOSE_LIMITS,
  doseForServings,
  formatSeconds,
  RATIO_LIMITS,
  SERVING_DOSE_G,
  SERVING_OPTIONS,
  servingsForDose,
  widenLimits,
  type ScaledRecipe,
} from "@/lib/brew";
import { cn } from "@/lib/utils";

import type { BrewSettings } from "../settings";

type BrewPrepProps = {
  recipe: Pick<RecipeDetail, "doseG" | "ratio" | "dripper" | "waterTempC" | "grindText" | "totalTimeS">;
  settings: BrewSettings;
  scaled: ScaledRecipe<RecipeDetail["steps"][number]>;
  onChange: (settings: BrewSettings) => void;
  onStart: () => void;
  /** The viewer's last "next time" note, read on the server. */
  note?: ReactNode;
};

const serveOptions = [
  { value: "hot", label: "핫", icon: Flame, activeClassName: "bg-primary text-primary-foreground shadow-sm" },
  { value: "iced", label: "아이스", icon: Snowflake, activeClassName: "bg-sky-600 text-white shadow-sm" },
] as const;

const servingOptions = SERVING_OPTIONS.map((n) => ({ value: String(n), label: `${n}인분` }));

/** Before the clock starts: dial in dose, ratio and hot/iced, check the conditions, then start. */
export function BrewPrep({ recipe, settings, scaled, onChange, onStart, note }: BrewPrepProps) {
  const { doseG: dose, ratio: targetRatio, iced } = settings;
  const set = (patch: Partial<BrewSettings>) => onChange({ ...settings, ...patch });
  const changed = dose !== recipe.doseG || targetRatio !== recipe.ratio;
  const servings = servingsForDose(dose);

  const conditions = [
    recipe.waterTempC && { icon: Thermometer, label: "물 온도", value: `${recipe.waterTempC}°C` },
    recipe.grindText && { icon: Bean, label: "분쇄도", value: recipe.grindText },
    { icon: Timer, label: "총 시간", value: formatSeconds(recipe.totalTimeS) },
  ].filter((condition) => !!condition);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 pt-4 pb-6">
        <section aria-label="추출 설정" className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs">
          <SegmentedControl
            label="온도"
            options={serveOptions}
            value={iced ? "iced" : "hot"}
            onChange={(mode) => set({ iced: mode === "iced" })}
            className="self-start"
          />

          <div className="flex flex-col gap-1.5">
            <SegmentedControl
              label="인분"
              options={servingOptions}
              value={servings === null ? null : String(servings)}
              onChange={(value) => set({ doseG: doseForServings(Number(value)) })}
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
                onChange={(doseG) => set({ doseG })}
                suffix="g"
                className="-ml-1"
                {...widenLimits(DOSE_LIMITS, recipe.doseG)}
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
          <CapacityNotice dripper={recipe.dripper} doseG={dose} />

          {iced && <IcedGuide iceG={scaled.iceG} />}

          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">비율</span>
              <NumberStepper
                label="비율"
                value={targetRatio}
                onChange={(ratio) => set({ ratio })}
                prefix="1:"
                size="sm"
                {...widenLimits(RATIO_LIMITS, recipe.ratio)}
              />
            </div>
            {changed && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => set({ doseG: recipe.doseG, ratio: recipe.ratio })}
              >
                <RotateCcw aria-hidden />
                원래대로
              </Button>
            )}
          </div>
        </section>

        {note}

        <ul className="flex flex-wrap gap-2" aria-label="추출 조건">
          {conditions.map(({ icon: Icon, label, value }) => (
            <li
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground"
            >
              <Icon className="size-4 opacity-70" aria-hidden />
              <span className="sr-only">{label}</span>
              {value}
            </li>
          ))}
        </ul>

        <section aria-labelledby="prep-steps-heading" className="flex flex-col gap-4">
          <h2 id="prep-steps-heading" className="text-lg font-semibold">
            단계 {iced && <span className="text-sm font-normal text-muted-foreground">· 뜨거운 물 기준</span>}
          </h2>
          <StepTimeline steps={scaled.steps} totalWaterG={scaled.brewWaterG} />
        </section>
      </div>

      {/* Start stays in reach while scrolling through the steps. */}
      <div className="sticky bottom-0 border-t bg-background/90 px-4 pt-3 pb-4 backdrop-blur">
        <Button size="lg" className="mx-auto flex h-14 w-full max-w-lg text-base" onClick={onStart}>
          <Play aria-hidden />
          추출 시작
        </Button>
      </div>
    </div>
  );
}
