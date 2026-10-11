"use client";

import { QueryClient, QueryClientProvider, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/features/recipe/components/recipe-card";

import { exploreQueryString, type ExploreParams } from "../explore-params";
import type { ExplorePage } from "../explore";

type ExploreFeedProps = {
  params: ExploreParams;
  /** Server-rendered first page; later pages come from /api/explore. */
  initialPage: ExplorePage;
};

export function ExploreFeed(props: ExploreFeedProps) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } }));
  return (
    <QueryClientProvider client={client}>
      <FeedList {...props} />
    </QueryClientProvider>
  );
}

async function fetchPage(params: ExploreParams, cursor: string): Promise<ExplorePage> {
  const res = await fetch(`/api/explore?${exploreQueryString(params, { cursor })}`);
  if (!res.ok) throw new Error(`explore ${res.status}`);
  return res.json();
}

function FeedList({ params, initialPage }: ExploreFeedProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError } = useInfiniteQuery({
    queryKey: ["explore", exploreQueryString(params)],
    queryFn: ({ pageParam }) => (pageParam ? fetchPage(params, pageParam) : Promise.resolve(initialPage)),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    initialData: { pages: [initialPage], pageParams: [null] },
  });

  // Load the next page shortly before the end of the list comes into view.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const recipes = data.pages.flatMap((page) => page.recipes);
  if (recipes.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">조건에 맞는 레시피가 없어요.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="explore-list">
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <RecipeCard recipe={recipe} />
          </li>
        ))}
      </ul>
      <div ref={sentinel} className="flex min-h-12 items-center justify-center">
        {isError ? (
          <Button variant="outline" onClick={() => void fetchNextPage()}>
            다시 시도
          </Button>
        ) : hasNextPage ? (
          <Button variant="ghost" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "불러오는 중…" : "더 보기"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">모두 봤어요</p>
        )}
      </div>
    </div>
  );
}
