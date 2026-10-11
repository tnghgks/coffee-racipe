import { NextResponse, type NextRequest } from "next/server";

import { exploreRecipes } from "@/features/community/explore";
import { decodeCursor, parseExploreParams } from "@/features/community/explore-params";

/** Next pages of the explore feed for infinite scroll. Public data only. */
export async function GET(request: NextRequest) {
  const query = Object.fromEntries(request.nextUrl.searchParams);
  const cursor = decodeCursor(query.cursor);
  if (query.cursor && !cursor) return NextResponse.json({ error: "invalid cursor" }, { status: 400 });

  const page = await exploreRecipes(parseExploreParams(query), cursor);
  return NextResponse.json(page);
}
