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
  totalWaterG: number;
  steps: ScaledStep<S>[];
};

export type ScaleOptions = {
  /** Use a different ratio than the recipe's. Step water is stretched proportionally. */
  ratio?: number;
};

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

  const stretch = ratio / recipe.ratio;
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
    totalWaterG: roundGrams(doseG * ratio),
    steps,
  };
}

/** Converts a cumulative gram amount entered in the editor back to a stored water_ratio (3 decimals). */
export function toWaterRatio(cumulativeWaterG: number, doseG: number): number {
  assertNonNegative("cumulativeWaterG", cumulativeWaterG);
  assertPositive("doseG", doseG);
  return Math.round((cumulativeWaterG / doseG) * 1000) / 1000;
}
