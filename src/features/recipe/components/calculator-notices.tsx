import { Snowflake, TriangleAlert } from "lucide-react";

import { dripperLabel, exceedsCapacity } from "../dripper";
import type { Dripper } from "../types";

/** Live region that stays mounted so screen readers announce the warning when it appears. */
export function CapacityNotice({ dripper, doseG }: { dripper: Dripper; doseG: number }) {
  return (
    <div role="status" aria-live="polite" className="empty:hidden">
      {exceedsCapacity(doseG, dripper) && (
        <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {dripperLabel(dripper)}
            {dripper.sizeLabel && ` ${dripper.sizeLabel} 사이즈`}는 원두 {dripper.maxDoseG}g까지 권장해요. 넘칠 수 있으니
            큰 사이즈를 쓰거나 두 번에 나눠 내리세요.
          </span>
        </p>
      )}
    </div>
  );
}

export function IcedGuide({ iceG }: { iceG: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
      <p className="flex items-center justify-between gap-2 font-medium">
        <span className="inline-flex items-center gap-1.5">
          <Snowflake className="size-4" aria-hidden />
          서버에 얼음
        </span>
        <span className="tabular-nums" data-testid="ice-water">
          {iceG}g
        </span>
      </p>
      <p className="text-xs text-sky-800/80">
        얼음 담은 서버를 저울에 올리고 영점을 맞춘 뒤 내리세요. 아래 물량은 뜨거운 물 기준이고, 분쇄도는 한 단계 가늘게
        하면 좋아요.
      </p>
    </div>
  );
}
