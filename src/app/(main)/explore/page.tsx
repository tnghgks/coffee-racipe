import type { Metadata } from "next";

import { ExploreFeed } from "@/features/community/components/explore-feed";
import { ExploreFilters } from "@/features/community/components/explore-filters";
import { exploreRecipes } from "@/features/community/explore";
import { exploreQueryString, parseExploreParams } from "@/features/community/explore-params";
import { getDrippers } from "@/features/recipe/queries";

export const metadata: Metadata = {
  title: "탐색",
  description: "다른 사람들이 공개한 핸드드립 레시피를 인기순·최신순으로 둘러보고 검색해요.",
};

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const params = parseExploreParams(await searchParams);
  const [drippers, firstPage] = await Promise.all([getDrippers(), exploreRecipes(params, null)]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">탐색</h1>
        <p className="text-sm text-muted-foreground">
          {params.q ? `"${params.q}" 검색 결과` : "공개된 레시피를 둘러보세요"}
        </p>
      </header>
      <ExploreFilters params={params} drippers={drippers} />
      {/* key: a new filter set starts a fresh feed instead of appending to the old one */}
      <ExploreFeed key={exploreQueryString(params)} params={params} initialPage={firstPage} />
    </div>
  );
}
