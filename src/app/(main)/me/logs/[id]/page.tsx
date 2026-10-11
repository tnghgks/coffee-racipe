import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireProfile } from "@/features/auth/queries";
import { formatBrewedAt } from "@/features/log/format";
import { DeleteLogButton } from "@/features/log/components/delete-log-button";
import { LogForm } from "@/features/log/components/log-form";
import { getMyLog } from "@/features/log/queries";
import type { LogFormInput } from "@/features/log/schema";
import { formatSeconds } from "@/lib/brew";

export const metadata: Metadata = { title: "기록 수정", robots: { index: false } };

export default async function EditLogPage({ params }: PageProps<"/me/logs/[id]">) {
  const { id } = await params;
  await requireProfile(`/me/logs/${id}`);
  const log = await getMyLog(id); // RLS: someone else's log is simply not found
  if (!log) notFound();

  const defaults: LogFormInput = {
    recipeId: log.recipe?.id ?? null,
    beanName: log.beanName ?? "",
    roaster: log.roaster ?? "",
    roastLevel: log.roastLevel ?? "",
    doseG: log.doseG,
    waterG: log.waterG,
    iced: log.iced,
    grindText: log.grindText ?? "",
    waterTempC: log.waterTempC ?? Number.NaN,
    totalTime: log.totalTimeS ? formatSeconds(log.totalTimeS) : "",
    rating: log.rating,
    acidity: log.acidity ?? 0,
    sweetness: log.sweetness ?? 0,
    body: log.body ?? 0,
    notes: log.notes ?? "",
    nextAdjustment: log.nextAdjustment ?? "",
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">기록 수정</h1>
        <time dateTime={log.brewedAt} className="text-sm text-muted-foreground">
          {formatBrewedAt(log.brewedAt)}
        </time>
      </header>
      <LogForm defaultValues={defaults} logId={log.id} recipe={log.recipe} cancelHref="/me/logs" />
      <div className="border-t pt-4">
        <DeleteLogButton logId={log.id} />
      </div>
    </div>
  );
}
