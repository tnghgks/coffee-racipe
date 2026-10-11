import { ChevronRight, Lightbulb } from "lucide-react";
import Link from "next/link";

import { formatBrewedAt } from "../format";
import { getLastAdjustment, listMyLogsForRecipe } from "../queries";

import { LogCard } from "./log-card";

// Recipe page sections built from the viewer's own logs. Both read the session: render inside <Suspense>.
// Signed-out visitors (and users without logs for this recipe) see nothing.

/** The last "next time" note, shown above the calculator so it's seen before brewing again. */
export async function LastAdjustmentNote({ recipeId }: { recipeId: string }) {
  const last = await getLastAdjustment(recipeId);
  if (!last) return null;
  return (
    <aside
      aria-label="지난번 메모"
      className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950"
      data-testid="last-adjustment"
    >
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
      <div className="flex flex-col gap-0.5">
        <p className="text-xs text-amber-800">지난번 메모 · {formatBrewedAt(last.brewedAt)}</p>
        <p className="font-medium">{last.text}</p>
      </div>
    </aside>
  );
}

export async function MyRecipeLogs({ recipeId }: { recipeId: string }) {
  const logs = await listMyLogsForRecipe(recipeId);
  if (logs.length === 0) return null;
  return (
    <section aria-labelledby="my-logs-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="my-logs-heading" className="text-lg font-semibold">
          이 레시피로 내린 내 기록
        </h2>
        <Link
          href={`/me/logs?recipe=${recipeId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          전체 보기
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {logs.map((log) => (
          <li key={log.id}>
            <LogCard log={log} showRecipe={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
