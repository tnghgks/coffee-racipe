/** Full-screen focus mode (brew timer): no header or nav, respects the phone's safe areas. */
export default function FocusLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {children}
    </div>
  );
}
