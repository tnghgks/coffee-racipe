import { BookOpen, Compass, House, NotebookPen, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { href: "/", label: "홈", icon: House },
  { href: "/recipes", label: "레시피", icon: BookOpen },
  { href: "/explore", label: "탐색", icon: Compass },
  { href: "/me/logs", label: "기록", icon: NotebookPen },
  { href: "/me", label: "내 정보", icon: UserRound },
];

/** Picks the nav item whose href is the longest prefix of the pathname. */
export function getActiveHref(pathname: string, items: NavItem[] = mainNav): string | null {
  let active: string | null = null;
  for (const { href } of items) {
    const matches = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
    if (matches && (active === null || href.length > active.length)) {
      active = href;
    }
  }
  return active;
}
