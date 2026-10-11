import { Coffee } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { siteConfig } from "@/config/site";

import { NavLinkList, NavLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Coffee className="size-5 text-primary" aria-hidden />
          {siteConfig.name}
        </Link>
        <nav aria-label="주 메뉴" className="hidden md:block">
          <Suspense fallback={<NavLinkList variant="top" />}>
            <NavLinks variant="top" />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
