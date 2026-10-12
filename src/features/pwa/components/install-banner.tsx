"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  getInstallPrompt,
  isIos,
  markInstallOffered,
  onInstallPromptChange,
  promptInstall,
  shouldOfferInstall,
} from "../client";

type Offer = "prompt" | "ios" | null;

/**
 * Suggests installing the app once, after brew mode has been used twice (see client.ts). Chrome/Android
 * get the native prompt; iOS gets the "공유 → 홈 화면에 추가" hint since it has no prompt.
 */
export function InstallBanner() {
  const [offer, setOffer] = useState<Offer>(null);

  useEffect(() => {
    const decide = () => {
      if (!shouldOfferInstall()) return;
      const next: Offer = getInstallPrompt() ? "prompt" : isIos() ? "ios" : null;
      if (next) {
        markInstallOffered(); // once, even if ignored
        setOffer(next);
      }
    };
    decide();
    return onInstallPromptChange(decide);
  }, []);

  if (!offer) return null;

  return (
    <div
      role="region"
      aria-label="앱 설치 안내"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-card p-3 shadow-lg md:bottom-6"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
      <img src="/icons/icon-192.png" alt="" className="size-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">홈 화면에 추가하기</p>
        {offer === "ios" ? (
          <p className="text-muted-foreground">
            <Share className="mb-0.5 inline size-3.5" aria-hidden /> 공유 → &ldquo;홈 화면에 추가&rdquo;
          </p>
        ) : (
          <p className="text-muted-foreground">저장한 레시피는 오프라인에서도 추출할 수 있어요</p>
        )}
      </div>
      {offer === "prompt" && (
        <Button
          className="h-9 shrink-0"
          onClick={async () => {
            await promptInstall();
            setOffer(null);
          }}
        >
          <Download aria-hidden />
          설치
        </Button>
      )}
      <Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label="닫기" onClick={() => setOffer(null)}>
        <X aria-hidden />
      </Button>
    </div>
  );
}
