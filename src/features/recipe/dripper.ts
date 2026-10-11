import type { Dripper } from "./types";

/** "Hario" + "V60" → "Hario V60", but "Clever" + "Clever Dripper" → "Clever Dripper". */
export function dripperLabel({ brand, name }: Pick<Dripper, "brand" | "name">): string {
  return name.toLowerCase().includes(brand.toLowerCase()) ? name : `${brand} ${name}`;
}
