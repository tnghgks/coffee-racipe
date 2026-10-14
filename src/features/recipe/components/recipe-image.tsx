import Image from "next/image";

import { cn } from "@/lib/utils";

import { recipeImageSrc, type RecipeImageSource } from "../images";

type RecipeImageProps = {
  recipe: RecipeImageSource;
  /** Rendered width hint for the srcset, e.g. "64px" or "(min-width: 640px) 50vw, 100vw". */
  sizes: string;
  /** Size and shape of the frame (aspect ratio, rounding). The image covers it. */
  className?: string;
  /** Only for the page's largest above-the-fold image (LCP). */
  preload?: boolean;
};

/** A recipe's photo, cropped to fill its frame. Decorative: the title is always shown next to it. */
export function RecipeImage({ recipe, sizes, className, preload }: RecipeImageProps) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-muted", className)}>
      <Image src={recipeImageSrc(recipe)} alt="" fill sizes={sizes} preload={preload} className="object-cover" />
    </div>
  );
}
