export type Dripper = {
  slug: string;
  name: string;
  brand: string;
  /** Size the capacity refers to, e.g. "02". */
  sizeLabel: string | null;
  /** Recommended maximum dose (g) for that size; null = unknown. */
  maxDoseG: number | null;
};

export type RecipeVisibility = "private" | "unlisted" | "public";

export type RecipeAuthor = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type RecipeSummary = {
  id: string;
  /** null for official recipes. */
  authorId: string | null;
  visibility: RecipeVisibility;
  title: string;
  description: string | null;
  doseG: number;
  ratio: number;
  waterTempC: number | null;
  totalTimeS: number;
  isOfficial: boolean;
  likeCount: number;
  saveCount: number;
  createdAt: string;
  dripper: Dripper;
  /** null for official recipes. */
  author: RecipeAuthor | null;
};

export type RecipeStep = {
  position: number;
  label: string;
  startAtS: number;
  waterRatio: number;
  note: string | null;
};

export type RecipeDetail = RecipeSummary & {
  grindText: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceNote: string | null;
  /** The recipe this one was duplicated from, if any. */
  forkedFrom: string | null;
  /** How many recipes were duplicated from this one (any visibility). */
  forkCount: number;
  steps: RecipeStep[];
};
