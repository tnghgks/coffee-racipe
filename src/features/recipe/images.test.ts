import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { allRecipeImagePaths, DEFAULT_RECIPE_IMAGE, dripperImageSlugs, recipeImageSrc } from "./images";

const official = "00000000-0000-4000-8000-000000000002";
const userRecipe = "3f1c2b9e-8d7a-4c6b-9e5f-1a2b3c4d5e6f";

describe("recipeImageSrc", () => {
  it("uses an official recipe's own photo", () => {
    expect(recipeImageSrc({ id: official, isOfficial: true, dripper: { slug: "v60" } })).toBe(
      `/images/recipes/${official}.webp`,
    );
  });

  it("falls back to the dripper photo for user recipes", () => {
    expect(recipeImageSrc({ id: userRecipe, isOfficial: false, dripper: { slug: "origami" } })).toBe(
      "/images/drippers/origami.webp",
    );
  });

  it("does not trust an official-looking id on a user recipe", () => {
    expect(recipeImageSrc({ id: official, isOfficial: false, dripper: { slug: "chemex" } })).toBe(
      "/images/drippers/chemex.webp",
    );
  });

  it("uses the generic photo for an official recipe without one and an unknown dripper", () => {
    const id = "00000000-0000-4000-8000-000000000099";
    expect(recipeImageSrc({ id, isOfficial: true, dripper: { slug: "new-dripper" } })).toBe(DEFAULT_RECIPE_IMAGE);
  });
});

describe("image files", () => {
  it("exist in public/ for every path the app can return", () => {
    const missing = allRecipeImagePaths().filter((path) => !existsSync(join("public", path)));
    expect(missing).toEqual([]);
  });

  it("cover every dripper in the seed", () => {
    const seed = readFileSync(join("supabase", "seed.sql"), "utf8");
    const block = seed.match(/insert into public\.drippers[^;]+;/)?.[0] ?? "";
    const slugs = [...block.matchAll(/\(\s*'([a-z0-9-]+)',/g)].map((match) => match[1]);
    expect(slugs.length).toBeGreaterThan(0);
    expect([...dripperImageSlugs].sort()).toEqual(expect.arrayContaining(slugs.sort()));
  });
});
