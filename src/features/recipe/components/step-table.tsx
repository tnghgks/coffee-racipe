import { formatSeconds, type ScaledStep } from "@/lib/brew";

import type { RecipeStep } from "../types";

export function StepTable({ steps }: { steps: ScaledStep<RecipeStep>[] }) {
  if (steps.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">등록된 단계가 없습니다.</p>;
  }

  return (
    <table className="w-full table-fixed border-collapse text-sm">
      <caption className="sr-only">추출 단계별 시간과 물량</caption>
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th scope="col" className="w-12 py-2 font-medium">
            시간
          </th>
          <th scope="col" className="py-2 font-medium">
            단계
          </th>
          <th scope="col" className="w-16 py-2 text-right font-medium">
            누적
          </th>
          <th scope="col" className="w-16 py-2 text-right font-medium">
            붓기
          </th>
          <th scope="col" className="hidden w-2/5 py-2 pl-4 font-medium md:table-cell">
            메모
          </th>
        </tr>
      </thead>
      <tbody>
        {steps.map((step) => (
          <tr key={step.position} className="border-b align-top last:border-b-0" data-testid="recipe-step">
            <td className="py-3 tabular-nums text-muted-foreground">{formatSeconds(step.startAtS)}</td>
            <td className="py-3 pr-2">
              <span className="font-medium">{step.label}</span>
              {step.note && <p className="mt-1 text-xs text-muted-foreground md:hidden">{step.note}</p>}
            </td>
            <td className="py-3 text-right font-semibold tabular-nums" data-testid="step-cumulative">
              {step.cumulativeWaterG}g
            </td>
            <td className="py-3 text-right tabular-nums text-muted-foreground" data-testid="step-pour">
              {step.pourWaterG > 0 ? `+${step.pourWaterG}g` : "–"}
            </td>
            <td className="hidden py-3 pl-4 text-muted-foreground md:table-cell">{step.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
