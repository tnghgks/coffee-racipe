import Link from "next/link";

import { cn } from "@/lib/utils";

import { recipeListHref, type RecipeListParams, type RecipeSort } from "../search-params";
import type { Dripper } from "../types";

const sortLabels: Record<RecipeSort, string> = { latest: "최신순", popular: "인기순" };

const chip = "inline-flex min-h-9 items-center rounded-full border px-3 text-sm transition-colors";
const chipIdle = "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground";
const chipActive = "border-primary bg-primary text-primary-foreground";

export function RecipeFilters({ drippers, params }: { drippers: Dripper[]; params: RecipeListParams }) {
  const options = [{ slug: null, name: "전체" }, ...drippers];

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="드리퍼 필터">
        <ul className="flex flex-wrap gap-2">
          {options.map(({ slug, name }) => {
            const active = params.dripper === slug;
            return (
              <li key={slug ?? "all"}>
                <Link
                  href={recipeListHref({ ...params, dripper: slug })}
                  aria-current={active ? "page" : undefined}
                  className={cn(chip, active ? chipActive : chipIdle)}
                >
                  {name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <nav aria-label="정렬" className="flex gap-1 text-sm">
        {(Object.keys(sortLabels) as RecipeSort[]).map((sort) => {
          const active = params.sort === sort;
          return (
            <Link
              key={sort}
              href={recipeListHref({ ...params, sort })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-2 py-1",
                active ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {sortLabels[sort]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
