/// <reference lib="webworker" />
// Service worker. Bundled to public/sw.js by scripts/build-sw.mjs (pnpm build / pnpm sw).
// Type-checked with tsconfig.sw.json (webworker lib), not the app tsconfig.

import {
  CACHES,
  classifyRequest,
  extractAssetPaths,
  extractImagePaths,
  IMAGE_LIMIT,
  imageFallback,
  isCacheablePage,
  isFresh,
  OFFLINE_PATH,
  PAGE_LIMIT,
  SHELL_URLS,
  STATIC_LIMIT,
  type WorkerMessage,
} from "../lib/pwa/offline";

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHES.shell);
      await cache.addAll(SHELL_URLS);
      // The offline page must also run offline: keep the build files it references.
      const offline = await cache.match(OFFLINE_PATH);
      if (offline) await cacheAssets(extractAssetPaths(await offline.text()));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set<string>(Object.values(CACHES));
      for (const name of await caches.keys()) if (!keep.has(name)) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const kind = classifyRequest({
    method: request.method,
    url,
    origin: self.location.origin,
    mode: request.mode,
    isRsc: request.headers.get("RSC") === "1",
  });

  switch (kind) {
    case "static":
      event.respondWith(cacheFirst(request, CACHES.static, STATIC_LIMIT));
      return;
    case "image":
      event.respondWith(cachedImage(request, url));
      return;
    case "shell":
      event.respondWith(cacheFirst(request, CACHES.shell));
      return;
    case "page":
      event.respondWith(networkFirstPage(event, url));
      return;
    case "rsc":
      event.respondWith(rscOrFallback(request));
      return;
    default:
      return; // the browser handles it
  }
});

self.addEventListener("message", (event) => {
  const message = event.data as WorkerMessage | undefined;
  if (message?.type === "CACHE_PAGES") event.waitUntil(cachePages(message.urls));
  if (message?.type === "CLEAR_PAGES") event.waitUntil(caches.delete(CACHES.pages));
});

// ---------------------------------------------------------------------------

async function cacheFirst(request: Request, cacheName: string, limit?: number): Promise<Response> {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    if (limit) await trim(cache, limit);
  }
  return response;
}

/** Recipe photos: the exact width when cached or online; offline, any cached width of the same photo. */
async function cachedImage(request: Request, url: URL): Promise<Response> {
  const cache = await caches.open(CACHES.images);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      await trim(cache, IMAGE_LIMIT);
    }
    return response;
  } catch {
    const keys = await cache.keys();
    const fallback = imageFallback(url, keys.map((key) => new URL(key.url)));
    return (fallback && (await cache.match(fallback.toString()))) ?? Response.error();
  }
}

/** Fresh HTML when online (kept for later); the cached copy, then the offline page, when not. */
async function networkFirstPage(event: FetchEvent, url: URL): Promise<Response> {
  try {
    const response = await fetch(event.request);
    if (response.ok && isCacheablePage(url.pathname) && isHtml(response)) {
      event.waitUntil(storePage(url.pathname, response.clone()));
    }
    return response;
  } catch {
    return (await cachedPage(url.pathname)) ?? (await caches.match(OFFLINE_PATH)) ?? Response.error();
  }
}

/**
 * Client-side navigations fetch RSC payloads, which we don't cache. When they fail, answer with a
 * non-RSC response: Next then falls back to a full page load, which the page handler above serves
 * from the cache. (A rejected fetch would do the same, but logs an error first.)
 */
async function rscOrFallback(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch {
    return new Response("offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

/** Fetches pages (and the build files they reference) so they open offline later. */
async function cachePages(urls: string[]): Promise<void> {
  for (const raw of urls) {
    const url = new URL(raw, self.location.origin);
    if (url.origin !== self.location.origin || !isCacheablePage(url.pathname)) continue;
    const cached = await cachedPage(url.pathname);
    // The saved list changes with every save, so it is always refetched; recipe pages rarely change.
    if (cached && url.pathname !== "/me/saved" && isFresh(cached.headers.get("Date"), Date.now())) continue;
    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok || !isHtml(response)) continue;
      const html = await response.clone().text();
      await storePage(url.pathname, response);
      await cacheAssets(extractAssetPaths(html));
      await cacheImages(extractImagePaths(html, self.location.origin));
    } catch {
      // offline or failed: keep whatever is cached
    }
  }
}

async function cacheAssets(paths: string[]): Promise<void> {
  const cache = await caches.open(CACHES.static);
  await Promise.all(
    paths.map(async (path) => {
      if (await cache.match(path)) return;
      try {
        const response = await fetch(path);
        if (response.ok) await cache.put(path, response);
      } catch {
        // skip; it will be fetched (and cached) on first use online
      }
    }),
  );
  await trim(cache, STATIC_LIMIT);
}

async function cacheImages(paths: string[]): Promise<void> {
  const cache = await caches.open(CACHES.images);
  for (const path of paths) {
    if (await cache.match(path)) continue;
    try {
      const response = await fetch(path);
      if (response.ok) await cache.put(path, response);
    } catch {
      // skip; fetched (and cached) on first use online
    }
  }
  await trim(cache, IMAGE_LIMIT);
}

/** Pages are keyed by path (no query): /recipes/x/brew?dose=20 is served by the cached /recipes/x/brew. */
async function storePage(pathname: string, response: Response): Promise<void> {
  const cache = await caches.open(CACHES.pages);
  await cache.delete(pathname); // re-insert so the most recent stays last
  await cache.put(pathname, response);
  await trim(cache, PAGE_LIMIT);
}

async function cachedPage(pathname: string): Promise<Response | undefined> {
  const cache = await caches.open(CACHES.pages);
  return cache.match(pathname);
}

/** Drops the oldest entries (cache.keys() is in insertion order). */
async function trim(cache: Cache, limit: number): Promise<void> {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(keys.length - limit, 0))) await cache.delete(key);
}

function isHtml(response: Response): boolean {
  return response.headers.get("Content-Type")?.includes("text/html") ?? false;
}
