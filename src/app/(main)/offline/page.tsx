import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

import { OfflineRecipeList } from "@/features/pwa/components/offline-recipe-list";

export const metadata: Metadata = { title: "오프라인", robots: { index: false } };

/** Served by the service worker when a page isn't cached and the network is down. Fully static. */
export default function OfflinePage() {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header className="flex flex-col items-center gap-3 pt-6 text-center">
        <WifiOff className="size-10 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-bold tracking-tight">오프라인이에요</h1>
        <p className="text-sm text-muted-foreground">
          이 페이지는 아직 저장되지 않았어요. 저장한 레시피와 최근 본 레시피는 네트워크 없이도 열고 추출할 수 있어요.
        </p>
      </header>
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">오프라인에서 열 수 있는 레시피</h2>
        <OfflineRecipeList />
      </div>
    </section>
  );
}
