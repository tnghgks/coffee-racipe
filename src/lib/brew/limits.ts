export type Limits = { min: number; max: number; step: number };

export const DOSE_LIMITS: Limits = { min: 1, max: 100, step: 0.5 };
export const RATIO_LIMITS: Limits = { min: 10, max: 20, step: 0.5 };

/** Widens a range so a recipe's own value is always allowed (e.g. a 1:8 iced concentrate). */
export function widenLimits(limits: Limits, value: number): Limits {
  return { min: Math.min(limits.min, value), max: Math.max(limits.max, value), step: limits.step };
}
