import { Link2, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import type { RecipeVisibility } from "../types";

/** Marks recipes that are not in the public feed. Public recipes get no badge. */
export function VisibilityBadge({ visibility }: { visibility: RecipeVisibility }) {
  if (visibility === "public") return null;
  return (
    <Badge variant="outline" className="gap-1">
      {visibility === "private" ? <Lock aria-hidden /> : <Link2 aria-hidden />}
      {visibility === "private" ? "나만 보기" : "링크 공개"}
    </Badge>
  );
}
