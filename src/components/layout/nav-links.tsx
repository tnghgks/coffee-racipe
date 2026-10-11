"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getActiveHref, mainNav } from "@/config/nav";
import { cn } from "@/lib/utils";

type NavVariant = "top" | "bottom";

export function NavLinks({ variant }: { variant: NavVariant }) {
  const activeHref = getActiveHref(usePathname());
  return <NavLinkList variant={variant} activeHref={activeHref} />;
}

/** Rendered as the Suspense fallback while the pathname is unknown during prerendering. */
export function NavLinkList({ variant, activeHref = null }: { variant: NavVariant; activeHref?: string | null }) {
  return (
    <ul className={cn(variant === "top" ? "flex items-center gap-1" : "grid grid-cols-5")}>
      {mainNav.map(({ href, label, icon: Icon }) => {
        const active = href === activeHref;
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "transition-colors",
                variant === "top"
                  ? "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  : "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground",
                active && (variant === "top" ? "bg-accent text-accent-foreground" : "font-semibold text-primary"),
              )}
            >
              {variant === "bottom" && <Icon className="size-5" aria-hidden />}
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
