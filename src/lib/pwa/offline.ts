/**
 * Offline caching rules shared by the service worker (src/sw/sw.ts) and the app. Pure: no DOM or
 * worker globals, so it is unit-tested and bundled into the worker as-is.
 */

export const CACHE_VERSION = "v1";
export const CACHES = {
  /** Hashed build files (/_next/static): immutable, cache-first. */
  static: `static-${CACHE_VERSION}`,
  /** HTML of pages that should open offline. */
  pages: `pages-${CACHE_VERSION}`,
  /** Icons, manifest, the offline page. */
  shell: `shell-${CACHE_VERSION}`,
} as const;

export const OFFLINE_PATH = "/offline";
export const SHELL_URLS = [OFFLINE_PATH, "/manifest.webmanifest", "/icons/icon-192.png"];

/** How many pages and build files to keep (oldest dropped first). */
export const PAGE_LIMIT = 80;
export const STATIC_LIMIT = 400;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const CACHEABLE_PAGES = [
  /^\/$/,
  /^\/recipes$/,
  new RegExp(`^/recipes/${UUID}$`, "i"),
  new RegExp(`^/recipes/${UUID}/brew$`, "i"),
  /^\/me\/saved$/,
  /^\/offline$/,
];

/** Pages worth keeping for offline use. Everything else (forms, logs, admin, auth) stays network-only. */
export function isCacheablePage(pathname: string): boolean {
  return CACHEABLE_PAGES.some((re) => re.test(pathname));
}

export type RequestKind = "static" | "page" | "rsc" | "shell" | "bypass";

type RequestInfo = { method: string; url: URL; origin: string; mode: string; isRsc: boolean };

export function classifyRequest({ method, url, origin, mode, isRsc }: RequestInfo): RequestKind {
  if (method !== "GET" || url.origin !== origin) return "bypass";
  if (url.pathname.startsWith("/_next/static/")) return "static";
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return "bypass";
  // Client-side navigations fetch an RSC payload instead of HTML.
  if (isRsc) return "rsc";
  if (mode === "navigate") return "page";
  if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest" || url.pathname === "/favicon.ico") {
    return "shell";
  }
  return "bypass";
}

/** Pages to keep offline for a recipe: its detail and its brew mode. */
export function recipeOfflineUrls(recipeId: string): string[] {
  return [`/recipes/${recipeId}`, `/recipes/${recipeId}/brew`];
}

/**
 * Build files a page needs, found in its HTML: script/link tags and the chunk paths inside the
 * inlined RSC payload (which may appear as "/_next/static/…" or as "static/chunks/…").
 */
export function extractAssetPaths(html: string): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(/\/_next\/static\/[^"'\s\\)<>]+/g)) found.add(match[0]);
  for (const match of html.matchAll(/(?<![\w/])static\/(?:chunks|css|media)\/[^"'\s\\)<>]+/g)) found.add(`/_next/${match[0]}`);
  return [...found].filter((path) => !path.endsWith(".map"));
}

/** Title of a cached page for the offline list ("V60 울티밋 레시피 · 드립 커뮤니티" → "V60 울티밋 레시피"). */
export function pageTitle(html: string, siteName: string): string | null {
  const raw = html.match(/<title>([^<]*)<\/title>/)?.[1];
  if (!raw) return null;
  const title = raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");
  const suffix = ` · ${siteName}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
}

/** Pages cached this recently aren't fetched again when the app asks to keep them (every recipe view does). */
export const REFRESH_AFTER_MS = 10 * 60 * 1000;

/** Whether a cached response (by its Date header) is recent enough to skip refetching. */
export function isFresh(dateHeader: string | null, now: number): boolean {
  const cachedAt = dateHeader ? Date.parse(dateHeader) : NaN;
  return Number.isFinite(cachedAt) && now - cachedAt < REFRESH_AFTER_MS;
}

/** Messages the app sends to the service worker. */
export type WorkerMessage = { type: "CACHE_PAGES"; urls: string[] } | { type: "CLEAR_PAGES" };
