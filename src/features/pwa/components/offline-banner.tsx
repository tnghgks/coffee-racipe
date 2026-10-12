"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

/** A thin notice while the device is offline (saved and recently viewed recipes still open). */
export function OfflineBanner() {
  const offline = useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false,
  );
  if (!offline) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-foreground px-4 py-1.5 text-xs text-background"
    >
      <WifiOff className="size-3.5" aria-hidden />
      오프라인이에요 · 저장한 레시피와 최근 본 레시피는 열 수 있어요
    </div>
  );
}
