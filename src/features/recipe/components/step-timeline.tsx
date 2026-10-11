import { formatSeconds, type ScaledStep } from "@/lib/brew";

import type { RecipeStep } from "../types";

/**
 * Steps as a timeline. The big number is the scale reading to pour up to; the bar shows how far
 * through the total water this step takes you (earlier water faded, this step's pour solid).
 */
export function StepTimeline({ steps, totalWaterG }: { steps: ScaledStep<RecipeStep>[]; totalWaterG: number }) {
  if (steps.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">등록된 단계가 없습니다.</p>;
  }

  const percent = (grams: number) => (totalWaterG > 0 ? Math.min(100, (grams / totalWaterG) * 100) : 0);

  return (
    <ol className="flex flex-col" aria-label="추출 단계">
      {steps.map((step, index) => {
        const from = percent(step.cumulativeWaterG - step.pourWaterG);
        const to = percent(step.cumulativeWaterG);
        const isLast = index === steps.length - 1;

        return (
          <li key={step.position} className="grid grid-cols-[3rem_1fr] gap-x-3" data-testid="recipe-step">
            {/* time + connector line */}
            <div className="flex flex-col items-center">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium tabular-nums text-secondary-foreground">
                {formatSeconds(step.startAtS)}
              </span>
              {!isLast && <span className="mt-1 w-px flex-1 bg-border" aria-hidden />}
            </div>

            <div className={isLast ? "pb-1" : "pb-6"}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{step.label}</span>
                <span className="flex items-baseline gap-2 tabular-nums">
                  <span className="text-xs text-muted-foreground" data-testid="step-pour">
                    {step.pourWaterG > 0 ? `+${step.pourWaterG}g` : "–"}
                  </span>
                  <span className="text-xl font-bold" data-testid="step-cumulative">
                    {step.cumulativeWaterG}g
                  </span>
                </span>
              </div>

              <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="absolute inset-y-0 left-0 bg-primary/25" style={{ width: `${from}%` }} />
                <div className="absolute inset-y-0 bg-primary" style={{ left: `${from}%`, width: `${to - from}%` }} />
              </div>

              {step.note && <p className="mt-2 text-sm text-muted-foreground">{step.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
