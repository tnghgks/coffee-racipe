"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/** Calls `onFrame` on every animation frame while `active`. */
export function useAnimationFrame(onFrame: (now: number) => void, active: boolean) {
  const callback = useRef(onFrame);
  useEffect(() => {
    callback.current = onFrame;
  });

  useEffect(() => {
    if (!active) return;
    let id = requestAnimationFrame(function loop(now) {
      callback.current(now);
      id = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  }, [active]);
}

const noopSubscribe = () => () => {};

const searchListeners = new Set<() => void>();
function subscribeToSearch(listener: () => void) {
  searchListeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    searchListeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}
const readSearch = () => window.location.search;

/**
 * The page's query string, null during SSR/hydration. `replaceSearch` rewrites it in place (no history
 * entry, no navigation) and re-renders every reader.
 */
export function useLocationSearch(): [search: string | null, replaceSearch: (search: string) => void] {
  const search = useSyncExternalStore(subscribeToSearch, readSearch, () => null);
  const replaceSearch = (next: string) => {
    window.history.replaceState(null, "", `${window.location.pathname}${next}`);
    for (const listener of searchListeners) listener();
  };
  return [search, replaceSearch];
}

/** null during SSR/hydration, then whether the Screen Wake Lock API exists. */
export function useWakeLockSupported(): boolean | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => "wakeLock" in navigator,
    () => null,
  );
}

/**
 * Keeps the screen on while `active`. Browsers release the lock when the tab is hidden,
 * so it is re-acquired whenever the page becomes visible again.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) void lock.release();
        else sentinel = lock;
      } catch {
        // Denied (e.g. low battery mode); the screen may dim, nothing else to do.
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release();
    };
  }, [active]);
}
