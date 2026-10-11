import { Search, X } from "lucide-react";
import Link from "next/link";

import { DripperIcon } from "@/features/recipe/components/dripper-icon";
import type { Dripper } from "@/features/recipe/types";
import { cn } from "@/lib/utils";

import {
  exploreHref,
  MAX_QUERY_LENGTH,
  strengthPresets,
  timePresets,
  type ExploreParams,
  type ExploreSort,
  type Strength,
  type TimeLimit,
} from "../explore-params";

const chip = "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors";
const chipIdle = "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground";
const chipActive = "border-primary bg-primary text-primary-foreground";
/** One swipeable row on phones (bleeds to the screen edge), wrapping on wider screens. */
const chipRow =
  "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden";
const sortLabels: Record<ExploreSort, string> = { popular: "인기", latest: "최신" };

/** Links + a GET search form, so filtering works before (and without) JavaScript. */
export function ExploreFilters({ params, drippers }: { params: ExploreParams; drippers: Dripper[] }) {
  const toggle = <K extends keyof ExploreParams>(key: K, value: ExploreParams[K]) =>
    exploreHref({ ...params, [key]: params[key] === value ? null : value });
  const hasFilters = !!(params.dripper || params.strength || params.time || params.q);

  return (
    <div className="flex flex-col gap-3">
      <form action="/explore" method="get" role="search" className="relative">
        {/* keep the other filters when searching */}
        {params.dripper && <input type="hidden" name="dripper" value={params.dripper} />}
        {params.strength && <input type="hidden" name="strength" value={params.strength} />}
        {params.time && <input type="hidden" name="time" value={params.time} />}
        {params.sort !== "popular" && <input type="hidden" name="sort" value={params.sort} />}
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="레시피 검색 (예: 4:6, 케멕스, 산미)"
          aria-label="레시피 검색"
          className="h-11 w-full rounded-full border bg-background pr-4 pl-9 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      <nav aria-label="정렬" className="flex gap-1 text-sm">
        {(Object.keys(sortLabels) as ExploreSort[]).map((sort) => (
          <Link
            key={sort}
            href={exploreHref({ ...params, sort })}
            aria-current={params.sort === sort ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5",
              params.sort === sort ? "bg-foreground font-semibold text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {sortLabels[sort]}
          </Link>
        ))}
      </nav>

      <nav aria-label="드리퍼 필터">
        <ul className={chipRow}>
          {/* The active dripper goes first so it's visible in the swipeable row. */}
          {[...drippers].sort((a, b) => Number(b.slug === params.dripper) - Number(a.slug === params.dripper)).map((d) => (
            <li key={d.slug} className="shrink-0">
              <Link
                href={toggle("dripper", d.slug)}
                aria-current={params.dripper === d.slug ? "page" : undefined}
                className={cn(chip, "pl-2.5", params.dripper === d.slug ? chipActive : chipIdle)}
              >
                <DripperIcon slug={d.slug} strokeWidth={4.5} className="size-[18px] shrink-0" />
                {d.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className={chipRow}>
        <nav aria-label="농도 필터" className="contents">
          {(Object.keys(strengthPresets) as Strength[]).map((key) => (
            <Link
              key={key}
              href={toggle("strength", key)}
              aria-current={params.strength === key ? "page" : undefined}
              title={strengthPresets[key].hint}
              className={cn(chip, "shrink-0", params.strength === key ? chipActive : chipIdle)}
            >
              {strengthPresets[key].label}
            </Link>
          ))}
        </nav>
        <nav aria-label="시간 필터" className="contents">
          {(Object.keys(timePresets) as TimeLimit[]).map((key) => (
            <Link
              key={key}
              href={toggle("time", key)}
              aria-current={params.time === key ? "page" : undefined}
              className={cn(chip, "shrink-0", params.time === key ? chipActive : chipIdle)}
            >
              {timePresets[key].label}
            </Link>
          ))}
        </nav>
        {hasFilters && (
          <Link href={exploreHref({ q: null, dripper: null, strength: null, time: null, sort: params.sort })} className={cn(chip, "shrink-0", chipIdle)}>
            <X className="size-3.5" aria-hidden />
            초기화
          </Link>
        )}
      </div>
    </div>
  );
}
