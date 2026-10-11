import type { Dripper } from "./types";

/** "Hario" + "V60" → "Hario V60", but "Clever" + "Clever Dripper" → "Clever Dripper". */
export function dripperLabel({ brand, name }: Pick<Dripper, "brand" | "name">): string {
  return name.toLowerCase().includes(brand.toLowerCase()) ? name : `${brand} ${name}`;
}

/** True when the dose is above the dripper's recommended maximum. Unknown capacity never warns. */
export function exceedsCapacity(doseG: number, { maxDoseG }: Pick<Dripper, "maxDoseG">): boolean {
  return maxDoseG !== null && doseG > maxDoseG;
}
