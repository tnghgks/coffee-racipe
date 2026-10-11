/**
 * Recipe scaling. Step water is stored as a multiple of the dose (water_ratio = cumulative water ÷ dose),
 * so any dose converts with a single multiplication. All gram values are rounded to 1g.
 */

export type ScalableStep = {
  /** Cumulative water at the end of this step ÷ dose. */
  waterRatio: number;
};

export type ScalableRecipe<S extends ScalableStep = ScalableStep> = {
  /** Total water ÷ dose (16 means 1:16). */
  ratio: number;
  steps: readonly S[];
};

export type ScaledStep<S extends ScalableStep = ScalableStep> = S & {
  /** Scale reading to pour up to by the end of this step (g). */
  cumulativeWaterG: number;
  /** Water added during this step (g). Sums of pours equal the last cumulative value. */
  pourWaterG: number;
};

export type ScaledRecipe<S extends ScalableStep = ScalableStep> = {
  doseG: number;
  ratio: number;
  /** All water in the cup: brew water + ice (dose × ratio). */
  totalWaterG: number;
  /** Hot water poured through the bed; equals totalWaterG when not iced. */
  brewWaterG: number;
  /** Ice placed in the server before brewing; 0 when not iced. */
  iceG: number;
  iceShare: number;
  steps: ScaledStep<S>[];
};

export type ScaleOptions = {
  /** Use a different ratio than the recipe's. Step water is stretched proportionally. */
  ratio?: number;
  /**
   * Iced (Japanese-style) brewing: this share of the total water goes into the server as ice and
   * every step's water shrinks by the same factor, so the cup ends at the recipe's strength.
   */
  iceShare?: number;
};

/** Default ice share for iced brewing: 40% ice, 60% hot water. */
export const DEFAULT_ICE_SHARE = 0.4;

/** Rounds half up to an integer, absorbing float noise such as 15 * 4.1 = 61.49999999999999. */
export function roundGrams(value: number): number {
  return Math.round(Math.round(value * 1e6) / 1e6);
}

function assertNonNegative(name: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number >= 0, got ${value}`);
  }
}

function assertPositive(name: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number > 0, got ${value}`);
  }
}

export function scaleRecipe<S extends ScalableStep>(
  recipe: ScalableRecipe<S>,
  doseG: number,
  options: ScaleOptions = {},
): ScaledRecipe<S> {
  assertNonNegative("doseG", doseG);
  assertPositive("recipe.ratio", recipe.ratio);
  const ratio = options.ratio ?? recipe.ratio;
  assertPositive("ratio", ratio);

  const iceShare = options.iceShare ?? 0;
  if (!Number.isFinite(iceShare) || iceShare < 0 || iceShare >= 1) {
    throw new RangeError(`iceShare must be in [0, 1), got ${iceShare}`);
  }

  const totalWaterG = roundGrams(doseG * ratio);
  const brewWaterG = roundGrams(doseG * ratio * (1 - iceShare));
  const stretch = (ratio / recipe.ratio) * (1 - iceShare);
  let previousG = 0;
  const steps = recipe.steps.map((step) => {
    const cumulativeWaterG = roundGrams(doseG * step.waterRatio * stretch);
    const pourWaterG = cumulativeWaterG - previousG;
    previousG = cumulativeWaterG;
    return { ...step, cumulativeWaterG, pourWaterG };
  });

  return {
    doseG,
    ratio,
    totalWaterG,
    brewWaterG,
    // Derived from the rounded values so brew water + ice always equals the total.
    iceG: totalWaterG - brewWaterG,
    iceShare,
    steps,
  };
}

/** Converts a cumulative gram amount entered in the editor back to a stored water_ratio (3 decimals). */
export function toWaterRatio(cumulativeWaterG: number, doseG: number): number {
  assertNonNegative("cumulativeWaterG", cumulativeWaterG);
  assertPositive("doseG", doseG);
  return Math.round((cumulativeWaterG / doseG) * 1000) / 1000;
}
