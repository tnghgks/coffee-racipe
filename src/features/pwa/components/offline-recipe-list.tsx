"use client";

import { useEffect, useState } from "react";

import { siteConfig } from "@/config/site";
import { CACHES, pageTitle } from "@/lib/pwa/offline";

type CachedRecipe = { href: string; title: string };

const RECIPE_PATH = /^\/recipes\/[0-9a-f-]{36}$/i;

/** Recipes whose pages the service worker has kept, read straight from the cache. */
export function OfflineRecipeList() {
  const [recipes, setRecipes] = useState<CachedRecipe[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found: CachedRecipe[] = [];
      try {
        const cache = await caches.open(CACHES.pages);
        for (const request of [...(await cache.keys())].reverse()) {
          const { pathname } = new URL(request.url);
          if (!RECIPE_PATH.test(pathname)) continue;
          const html = await (await cache.match(request))?.text();
          found.push({ href: pathname, title: (html && pageTitle(html, siteConfig.name)) || "레시피" });
        }
      } catch {
        // no Cache Storage (old browser, private mode)
      }
      if (!cancelled) setRecipes(found);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (recipes === null) return null;
  if (recipes.length === 0) {
    return <p className="text-sm text-muted-foreground">아직 오프라인에 저장된 레시피가 없어요.</p>;
  }
  return (
    <ul className="flex flex-col overflow-hidden rounded-xl border bg-card" data-testid="offline-recipes">
      {recipes.map((recipe) => (
        <li key={recipe.href} className="border-b last:border-b-0">
          {/* a plain <a>: a full page load is what the service worker can answer from the cache */}
          <a href={recipe.href} className="flex min-h-12 items-center px-4 font-medium hover:bg-accent/40">
            {recipe.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
