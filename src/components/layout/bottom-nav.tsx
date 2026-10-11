import { Suspense } from "react";

import { NavLinkList, NavLinks } from "./nav-links";

export function BottomNav() {
  return (
    <nav
      aria-label="하단 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <Suspense fallback={<NavLinkList variant="bottom" />}>
        <NavLinks variant="bottom" />
      </Suspense>
    </nav>
  );
}
