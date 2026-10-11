import { NotebookPen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireProfile } from "@/features/auth/queries";
import { LogCard } from "@/features/log/components/log-card";
import { getMyLogFilterOptions, listMyLogs } from "@/features/log/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "브루 로그", robots: { index: false } };

const chip = "inline-flex min-h-9 items-center rounded-full border px-3 text-sm transition-colors";
const chipIdle = "bg-background text-muted-foreground hover:bg-accent";
const chipActive = "border-primary bg-primary text-primary-foreground";

function href(filters: { bean: string | null; recipe: string | null }) {
  const query = new URLSearchParams();
  if (filters.bean) query.set("bean", filters.bean);
  if (filters.recipe) query.set("recipe", filters.recipe);
  const qs = query.toString();
  return qs ? `/me/logs?${qs}` : "/me/logs";
}

export default async function LogsPage({ searchParams }: PageProps<"/me/logs">) {
  await requireProfile("/me/logs");
  const query = await searchParams;
  const bean = typeof query.bean === "string" ? query.bean : null;
  const recipe = typeof query.recipe === "string" ? query.recipe : null;
  const [logs, options] = await Promise.all([listMyLogs({ bean, recipeId: recipe }), getMyLogFilterOptions()]);
  const filtered = !!(bean || recipe);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">브루 로그</h1>
          <p className="text-sm text-muted-foreground">기록 {logs.length}개</p>
        </div>
        <Link href="/me/logs/new" className={cn(buttonVariants({ variant: "outline" }), "h-10")}>
          직접 기록
        </Link>
      </header>

      {(options.beans.length > 0 || options.recipes.length > 0) && (
        <div className="flex flex-col gap-2">
          {options.beans.length > 0 && (
            <nav aria-label="원두 필터" className="flex flex-wrap gap-2">
              <Link href={href({ bean: null, recipe })} className={cn(chip, !bean ? chipActive : chipIdle)}>
                모든 원두
              </Link>
              {options.beans.map((name) => (
                <Link
                  key={name}
                  href={href({ bean: name, recipe })}
                  aria-current={bean === name ? "page" : undefined}
                  className={cn(chip, bean === name ? chipActive : chipIdle)}
                >
                  {name}
                </Link>
              ))}
            </nav>
          )}
          {options.recipes.length > 0 && (
            <nav aria-label="레시피 필터" className="flex flex-wrap gap-2">
              <Link href={href({ bean, recipe: null })} className={cn(chip, !recipe ? chipActive : chipIdle)}>
                모든 레시피
              </Link>
              {options.recipes.map((r) => (
                <Link
                  key={r.id}
                  href={href({ bean, recipe: r.id })}
                  aria-current={recipe === r.id ? "page" : undefined}
                  className={cn(chip, recipe === r.id ? chipActive : chipIdle)}
                >
                  {r.title}
                </Link>
              ))}
            </nav>
          )}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <NotebookPen className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">{filtered ? "조건에 맞는 기록이 없어요" : "아직 기록이 없어요"}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            레시피로 추출을 마치면 &ldquo;기록 남기기&rdquo;로 바로 남길 수 있어요.
          </p>
          <Link href="/recipes" className={cn(buttonVariants({ variant: "outline" }), "mt-2 h-10")}>
            레시피 고르기
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="log-list">
          {logs.map((log) => (
            <li key={log.id}>
              <LogCard log={log} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
