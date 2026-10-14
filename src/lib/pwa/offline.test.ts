import { describe, expect, it } from "vitest";

import {
  classifyRequest,
  extractAssetPaths,
  extractImagePaths,
  imageFallback,
  isCacheablePage,
  isFresh,
  pageTitle,
  recipeOfflineUrls,
} from "./offline";

const origin = "https://drip.example";
const req = (path: string, overrides: Partial<Parameters<typeof classifyRequest>[0]> = {}) =>
  classifyRequest({ method: "GET", url: new URL(path, origin), origin, mode: "cors", isRsc: false, ...overrides });

const id = "00000000-0000-4000-8000-000000000001";

describe("isCacheablePage", () => {
  it("keeps recipe pages, brew mode, the home page and saved recipes", () => {
    for (const path of ["/", "/recipes", `/recipes/${id}`, `/recipes/${id}/brew`, "/me/saved", "/offline"]) {
      expect(isCacheablePage(path), path).toBe(true);
    }
  });

  it("skips forms, private areas and unknown ids", () => {
    for (const path of ["/login", "/me", "/me/logs", "/recipes/new", `/recipes/${id}/edit`, "/recipes/abc", "/explore"]) {
      expect(isCacheablePage(path), path).toBe(false);
    }
  });
});

describe("classifyRequest", () => {
  it("caches build files and pages, bypasses the rest", () => {
    expect(req("/_next/static/chunks/app.js")).toBe("static");
    expect(req(`/recipes/${id}`, { mode: "navigate" })).toBe("page");
    expect(req(`/recipes/${id}?_rsc=1`, { isRsc: true })).toBe("rsc");
    expect(req("/icons/icon-192.png")).toBe("shell");
    expect(req("/api/explore", { mode: "navigate" })).toBe("bypass");
    expect(req("/auth/callback", { mode: "navigate" })).toBe("bypass");
  });

  it("never touches writes or other origins", () => {
    expect(req(`/recipes/${id}`, { method: "POST", mode: "navigate" })).toBe("bypass");
    expect(
      classifyRequest({ method: "GET", url: new URL("https://xyz.supabase.co/rest/v1/recipes"), origin, mode: "cors", isRsc: false }),
    ).toBe("bypass");
  });
});

describe("extractAssetPaths", () => {
  it("finds script, style, font and RSC chunk references", () => {
    const html = `
      <link rel="stylesheet" href="/_next/static/css/app.css"/>
      <script src="/_next/static/chunks/main-abc.js" async></script>
      <link rel="preload" href="/_next/static/media/font.woff2" as="font"/>
      <script>self.__next_f.push([1,"2:I[123,[\\"static/chunks/page-def.js\\"],\\"BrewScreen\\"]"])</script>
      <script src="/_next/static/chunks/main-abc.js"></script>
      <a href="/recipes/x">not an asset</a>`;
    expect(extractAssetPaths(html).sort()).toEqual([
      "/_next/static/chunks/main-abc.js",
      "/_next/static/chunks/page-def.js",
      "/_next/static/css/app.css",
      "/_next/static/media/font.woff2",
    ]);
  });
});

describe("pageTitle", () => {
  it("strips the site suffix and decodes entities", () => {
    expect(pageTitle("<title>추출 · V60 &amp; 친구들 · 드립 커뮤니티</title>", "드립 커뮤니티")).toBe("추출 · V60 & 친구들");
    expect(pageTitle("<p>no title</p>", "드립 커뮤니티")).toBeNull();
  });
});

describe("isFresh", () => {
  const now = Date.parse("2026-10-12T10:00:00Z");
  it("skips refetching pages cached in the last 10 minutes", () => {
    expect(isFresh("Mon, 12 Oct 2026 09:55:00 GMT", now)).toBe(true);
    expect(isFresh("Mon, 12 Oct 2026 09:45:00 GMT", now)).toBe(false);
    expect(isFresh(null, now)).toBe(false);
    expect(isFresh("garbage", now)).toBe(false);
  });
});

describe("recipeOfflineUrls", () => {
  it("covers the detail page and brew mode", () => {
    expect(recipeOfflineUrls(id)).toEqual([`/recipes/${id}`, `/recipes/${id}/brew`]);
  });
});

describe("recipe images", () => {
  const image = (source: string, w: number) => `/_next/image?url=${encodeURIComponent(source)}&w=${w}&q=75`;
  const v60 = "/images/drippers/v60.webp";
  const official = `/images/recipes/${id}.webp`;

  it("caches optimized recipe photos only", () => {
    expect(req(image(v60, 640))).toBe("image");
    expect(req(image("/icons/icon-192.png", 64))).toBe("bypass");
    expect(req(`/_next/image?url=${encodeURIComponent("https://lh3.googleusercontent.com/a.png")}&w=64&q=75`)).toBe("bypass");
  });

  it("keeps one width per photo from srcset and preload links", () => {
    const srcset = (source: string, widths: number[]) =>
      widths.map((w) => `${image(source, w).replace(/&/g, "&amp;")} ${w}w`).join(", ");
    const html = `
      <link rel="preload" as="image" imageSrcSet="${srcset(official, [640, 750, 1080])}"/>
      <img srcSet="${srcset(official, [640, 750, 1080])}" src="${image(official, 1080).replace(/&/g, "&amp;")}"/>
      <img srcSet="${srcset(v60, [64, 128])}" src="${image(v60, 128).replace(/&/g, "&amp;")}"/>
      <img src="/_next/image?url=%2Ficons%2Fa.png&amp;w=64&amp;q=75"/>`;
    expect(extractImagePaths(html).sort()).toEqual([image(official, 640), image(v60, 128)].sort());
  });

  it("serves the widest cached copy of the same photo offline", () => {
    const at = (path: string) => new URL(path, origin);
    const cached = [at(image(v60, 128)), at(image(official, 640)), at(image(v60, 640))];
    expect(imageFallback(at(image(v60, 828)), cached)?.toString()).toBe(at(image(v60, 640)).toString());
    expect(imageFallback(at(image("/images/drippers/chemex.webp", 640)), cached)).toBeNull();
  });
});
