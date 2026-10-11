import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { checkSupabaseHealth } from "@/lib/supabase/health";

export const metadata: Metadata = { title: "상태", robots: { index: false } };

export default function StatusPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">서비스 상태</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Supabase 연결 확인 중…</p>}>
        <SupabaseStatus />
      </Suspense>
    </section>
  );
}

async function SupabaseStatus() {
  await connection();
  const health = await checkSupabaseHealth();

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border bg-card p-4 text-sm">
      <dt className="text-muted-foreground">Supabase</dt>
      <dd data-testid="supabase-status" className={health.ok ? "font-medium text-green-700" : "font-medium text-destructive"}>
        {health.ok ? "연결됨" : "연결 실패"}
      </dd>
      <dt className="text-muted-foreground">URL</dt>
      <dd className="font-mono break-all">{health.url ?? "-"}</dd>
      <dt className="text-muted-foreground">{health.ok ? "응답 시간" : "오류"}</dt>
      <dd className="break-all">{health.ok ? `${health.latencyMs}ms` : health.error}</dd>
    </dl>
  );
}
