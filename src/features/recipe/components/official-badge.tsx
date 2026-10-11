import { BadgeCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function OfficialBadge() {
  return (
    <Badge variant="secondary" className="gap-1">
      <BadgeCheck aria-hidden />
      공식
    </Badge>
  );
}
