import type { Metadata } from "next";

import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = { title: "내 정보" };

export default function Page() {
  return <ComingSoon title="내 정보" phase="Phase 3" />;
}
