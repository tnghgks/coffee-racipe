import type { Metadata } from "next";

import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = { title: "레시피" };

export default function Page() {
  return <ComingSoon title="레시피" phase="Phase 1" />;
}
