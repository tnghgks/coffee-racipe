/**
 * Browser-side PWA helpers: talking to the service worker, the install prompt, and the brew counter
 * that decides when to suggest installing. Safe to import anywhere; every function no-ops on the server.
 */

import type { WorkerMessage } from "@/lib/pwa/offline";

/** The worker is only registered in production builds (dev reloads chunks constantly). */
export const SERVICE_WORKER_ENABLED = process.env.NODE_ENV === "production";

async function postToWorker(message: WorkerMessage): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || !SERVICE_WORKER_ENABLED) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage(message);
  } catch {
    // no worker: nothing to cache
  }
}

/** Fetch and keep these pages (and their build files) for offline use. */
export function cacheForOffline(urls: string[]): Promise<void> {
  return postToWorker({ type: "CACHE_PAGES", urls });
}

/** Forget cached pages (they may contain the signed-in user's data). */
export function clearOfflinePages(): Promise<void> {
  return postToWorker({ type: "CLEAR_PAGES" });
}

// ---------------------------------------------------------------------------
// Install prompt. Chrome/Android fire `beforeinstallprompt` once, early; we keep it until we want it.
// ---------------------------------------------------------------------------

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: InstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

export function captureInstallPrompt(event: Event) {
  event.preventDefault(); // keep Chrome's own mini-infobar away; we show our banner instead
  deferredPrompt = event as InstallPromptEvent;
  promptListeners.forEach((listener) => listener());
}

export function getInstallPrompt(): InstallPromptEvent | null {
  return deferredPrompt;
}

export function onInstallPromptChange(listener: () => void): () => void {
  promptListeners.add(listener);
  return () => promptListeners.delete(listener);
}

export async function promptInstall(): Promise<boolean> {
  const prompt = deferredPrompt;
  if (!prompt) return false;
  deferredPrompt = null;
  await prompt.prompt();
  return (await prompt.userChoice).outcome === "accepted";
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS has no install prompt; the banner explains "공유 → 홈 화면에 추가" instead. */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// ---------------------------------------------------------------------------
// "Show the install banner once, after brew mode was used twice." Stored per browser.
// ---------------------------------------------------------------------------

const BREW_COUNT_KEY = "pwa:brew-count";
const BANNER_SHOWN_KEY = "pwa:install-banner-shown";
export const BREWS_BEFORE_INSTALL_BANNER = 2;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode or blocked storage: the banner just won't show
  }
}

export function recordBrewStarted() {
  write(BREW_COUNT_KEY, String(Number(read(BREW_COUNT_KEY) ?? 0) + 1));
}

export function shouldOfferInstall(): boolean {
  return Number(read(BREW_COUNT_KEY) ?? 0) >= BREWS_BEFORE_INSTALL_BANNER && read(BANNER_SHOWN_KEY) === null && !isStandalone();
}

export function markInstallOffered() {
  write(BANNER_SHOWN_KEY, new Date().toISOString());
}
