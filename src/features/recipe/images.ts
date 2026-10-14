// Recipe photos are static files generated ahead of time (docs/recipe-images.md):
// official recipes have their own, everything else uses its dripper's photo.

/** Official seed recipes with a photo: ids 00000000-0000-4000-8000-000000000001 … 022. */
const OFFICIAL_IMAGE_COUNT = 22;
const officialImageIds = new Set(
  Array.from({ length: OFFICIAL_IMAGE_COUNT }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`),
);

/** Dripper slugs with a photo; must cover every dripper in supabase/seed.sql (checked by a test). */
export const dripperImageSlugs = ["v60", "kalita-wave", "origami", "chemex", "melitta", "clever"] as const;
const dripperImages = new Set<string>(dripperImageSlugs);

export const DEFAULT_RECIPE_IMAGE = "/images/drippers/default.webp";

export type RecipeImageSource = { id: string; isOfficial: boolean; dripper: { slug: string } };

/** Public path of a recipe's photo: its own (official), its dripper's, or the generic one. */
export function recipeImageSrc({ id, isOfficial, dripper }: RecipeImageSource): string {
  if (isOfficial && officialImageIds.has(id)) return `/images/recipes/${id}.webp`;
  if (dripperImages.has(dripper.slug)) return `/images/drippers/${dripper.slug}.webp`;
  return DEFAULT_RECIPE_IMAGE;
}

/** Every image path the app can return, for the file-exists test. */
export function allRecipeImagePaths(): string[] {
  return [
    ...[...officialImageIds].map((id) => `/images/recipes/${id}.webp`),
    ...dripperImageSlugs.map((slug) => `/images/drippers/${slug}.webp`),
    DEFAULT_RECIPE_IMAGE,
  ];
}
