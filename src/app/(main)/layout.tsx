import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteHeader } from "@/components/layout/site-header";

/** Regular pages: header, content column and the mobile bottom nav. Focus screens (brew mode) live in (focus). */
export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 md:pb-10">{children}</main>
      <BottomNav />
    </>
  );
}
