"use client";

import { useEffect } from "react";

import { captureInstallPrompt, SERVICE_WORKER_ENABLED } from "../client";

/** Registers /sw.js (production only) and keeps Chrome's install prompt for the install banner. */
export function ServiceWorker() {
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    if (SERVICE_WORKER_ENABLED && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // unsupported or blocked (e.g. private mode): the app works online as before
      });
    }
    return () => window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
  }, []);
  return null;
}
