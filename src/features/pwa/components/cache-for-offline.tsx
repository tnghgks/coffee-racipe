"use client";

import { useEffect } from "react";

import { cacheForOffline } from "../client";

/** Asks the service worker to keep these pages for offline use once the page has loaded. */
export function CacheForOffline({ urls }: { urls: string[] }) {
  const key = urls.join("\n");
  useEffect(() => {
    if (key) void cacheForOffline(key.split("\n"));
  }, [key]);
  return null;
}
