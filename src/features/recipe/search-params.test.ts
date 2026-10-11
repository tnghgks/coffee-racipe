import { describe, expect, it } from "vitest";

import { parseRecipeListParams, recipeListHref } from "./search-params";

describe("parseRecipeListParams", () => {
  it("defaults to all drippers, latest first", () => {
    expect(parseRecipeListParams({})).toEqual({ dripper: null, sort: "latest" });
  });

  it("reads dripper and sort", () => {
    expect(parseRecipeListParams({ dripper: "kalita-wave", sort: "popular" })).toEqual({
      dripper: "kalita-wave",
      sort: "popular",
    });
  });

  it("uses the first value of repeated params and normalizes case", () => {
    expect(parseRecipeListParams({ dripper: ["V60", "chemex"] })).toEqual({ dripper: "v60", sort: "latest" });
  });

  it("ignores invalid values", () => {
    expect(parseRecipeListParams({ dripper: "v60;drop", sort: "random" })).toEqual({
      dripper: null,
      sort: "latest",
    });
  });
});

describe("recipeListHref", () => {
  it("omits defaults", () => {
    expect(recipeListHref({ dripper: null, sort: "latest" })).toBe("/recipes");
  });

  it("keeps both filters", () => {
    expect(recipeListHref({ dripper: "v60", sort: "popular" })).toBe("/recipes?dripper=v60&sort=popular");
  });
});
