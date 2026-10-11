export type Dripper = {
  slug: string;
  name: string;
  brand: string;
  /** Size the capacity refers to, e.g. "02". */
  sizeLabel: string | null;
  /** Recommended maximum dose (g) for that size; null = unknown. */
  maxDoseG: number | null;
};

export type RecipeSummary = {
  id: string;
  title: string;
  description: string | null;
  doseG: number;
  ratio: number;
  waterTempC: number | null;
  totalTimeS: number;
  isOfficial: boolean;
  likeCount: number;
  createdAt: string;
  dripper: Dripper;
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
  steps: RecipeStep[];
};
