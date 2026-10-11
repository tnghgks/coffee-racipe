/** 16 → "1:16", 16.667 → "1:16.7" */
export function formatRatio(ratio: number): string {
  return `1:${Number(ratio.toFixed(1))}`;
}

/** 15 → "15g", 15.5 → "15.5g" */
export function formatGrams(grams: number): string {
  return `${Number(grams.toFixed(1))}g`;
}
