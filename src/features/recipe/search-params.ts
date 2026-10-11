export const recipeSorts = ["latest", "popular"] as const;
export type RecipeSort = (typeof recipeSorts)[number];

export type RecipeListParams = {
  dripper: string | null;
  sort: RecipeSort;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Normalizes /recipes query params; unknown values fall back to defaults instead of erroring. */
export function parseRecipeListParams(searchParams: RawSearchParams): RecipeListParams {
  const dripper = first(searchParams.dripper)?.trim().toLowerCase();
  const sort = first(searchParams.sort);
  return {
    dripper: dripper && /^[a-z0-9-]{1,50}$/.test(dripper) ? dripper : null,
    sort: recipeSorts.includes(sort as RecipeSort) ? (sort as RecipeSort) : "latest",
  };
}

/** Builds a /recipes href, omitting defaults so the canonical URL stays clean. */
export function recipeListHref({ dripper, sort }: RecipeListParams): string {
  const query = new URLSearchParams();
  if (dripper) query.set("dripper", dripper);
  if (sort !== "latest") query.set("sort", sort);
  const qs = query.toString();
  return qs ? `/recipes?${qs}` : "/recipes";
}
