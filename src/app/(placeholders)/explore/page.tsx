import type { Metadata } from "next";

import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = { title: "탐색" };

export default function Page() {
  return <ComingSoon title="탐색" phase="Phase 5" />;
}
