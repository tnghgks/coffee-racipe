import { Lightbulb, Snowflake } from "lucide-react";
import Link from "next/link";

import { formatGrams, formatSeconds } from "@/lib/brew";

import { formatBrewedAt } from "../format";
import type { BrewLog } from "../queries";
import { ROAST_LABELS } from "../schema";

import { StarRating } from "./rating-inputs";

const taste = (label: string, value: number | null) => (value ? `${label} ${value}` : null);

export function LogCard({ log, showRecipe = true }: { log: BrewLog; showRecipe?: boolean }) {
  const tastes = [taste("산미", log.acidity), taste("단맛", log.sweetness), taste("바디", log.body)].filter(Boolean);
  const bean = [log.beanName, log.roaster, log.roastLevel && ROAST_LABELS[log.roastLevel]].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/me/logs/${log.id}`}
      className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
      data-testid="log-card"
    >
      <div className="flex items-center justify-between gap-2">
        <time dateTime={log.brewedAt} className="text-xs text-muted-foreground">
          {formatBrewedAt(log.brewedAt)}
        </time>
        <StarRating value={log.rating} />
      </div>
      {showRecipe && <p className="font-semibold">{log.recipe?.title ?? "레시피 없이 내림"}</p>}
      {bean && <p className="text-sm">{bean}</p>}
      <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground tabular-nums">
        <span>원두 {formatGrams(log.doseG)}</span>·<span>물 {log.waterG}g</span>
        {log.totalTimeS && (
          <>
            ·<span>{formatSeconds(log.totalTimeS)}</span>
          </>
        )}
        {log.iced && (
          <span className="inline-flex items-center gap-0.5 text-sky-700">
            <Snowflake className="size-3" aria-hidden />
            아이스
          </span>
        )}
        {tastes.length > 0 && <span>· {tastes.join(" · ")}</span>}
      </p>
      {log.nextAdjustment && (
        <p className="flex gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900">
          <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>다음엔: {log.nextAdjustment}</span>
        </p>
      )}
    </Link>
  );
}
