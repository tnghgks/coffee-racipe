"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** false during SSR and hydration, true once React has taken over in the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * Disables every control inside until the form has hydrated. Server-rendered inputs are visible before
 * React attaches; typing then gets overwritten when react-hook-form registers its default values, and an
 * early submit would fall back to a native GET (form values in the URL). `display: contents` keeps layout.
 */
export function HydrationFieldset({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  return (
    <fieldset disabled={!hydrated} className="contents" data-hydrated={hydrated || undefined}>
      {children}
    </fieldset>
  );
}
