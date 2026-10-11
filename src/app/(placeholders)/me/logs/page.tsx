import type { Metadata } from "next";

import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = { title: "브루 로그" };

export default function Page() {
  return <ComingSoon title="브루 로그" phase="Phase 4" />;
}
