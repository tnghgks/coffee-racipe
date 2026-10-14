"use client";

import { Bookmark, Heart } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { useHydrated } from "@/components/common/hydration-guard";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

import { setReaction } from "../actions";
import { applyReaction, type ReactionKind, type ReactionState } from "../reactions";

const button =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60";
const idle = "bg-background hover:bg-muted";

const kinds = {
  like: { label: "좋아요", icon: Heart, on: "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400" },
  save: { label: "저장", icon: Bookmark, on: "border-primary/40 bg-primary/10 text-primary" },
} as const;

type Props = {
  recipeId: string;
  initial: ReactionState;
  /** Signed-out viewers get links to the login page instead of buttons. */
  loginHref: string | null;
  /** Placeholder while the viewer's state loads: same layout, not clickable. */
  pending?: boolean;
};

/**
 * Like/save with optimistic updates. Each click sends the desired state; only the newest request's
 * answer is applied (Server Actions run one at a time, so the last click is also the last write).
 */
export function ReactionButtons({ recipeId, initial, loginHref, pending = false }: Props) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const current = useRef(initial);
  const confirmed = useRef(initial);
  const latest = useRef(0);
  // Server-rendered buttons do nothing until React attaches; keep them disabled until then.
  const hydrated = useHydrated();

  const show = (next: ReactionState) => {
    current.current = next;
    setState(next);
  };

  async function toggle(kind: ReactionKind) {
    const active = kind === "like" ? !current.current.liked : !current.current.saved;
    show(applyReaction(current.current, kind, active));
    setError(null);

    const request = ++latest.current;
    const result = await setReaction({ recipeId, kind, active }).catch(() => ({
      ok: false as const,
      error: "연결이 불안정해요. 다시 시도해 주세요.",
    }));
    if (result.ok) confirmed.current = result.state;
    if (request !== latest.current) return; // a newer click is in flight; its answer settles the UI
    if (result.ok) {
      show(result.state);
    } else {
      show(confirmed.current);
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        {(Object.keys(kinds) as ReactionKind[]).map((kind) => {
          const { label, icon: Icon, on } = kinds[kind];
          const active = kind === "like" ? state.liked : state.saved;
          const count = kind === "like" ? state.likes : state.saves;
          const content = (
            <>
              <Icon className={cn("size-4", active && "fill-current")} aria-hidden />
              {label}
              <span className="tabular-nums" data-testid={`${kind}-count`}>
                {formatCount(count)}
              </span>
            </>
          );
          return loginHref ? (
            <Link key={kind} href={loginHref} className={cn(button, idle)}>
              {content}
            </Link>
          ) : (
            <button
              key={kind}
              type="button"
              aria-pressed={active}
              disabled={pending || !hydrated}
              onClick={() => toggle(kind)}
              className={cn(button, active ? on : idle)}
            >
              {content}
            </button>
          );
        })}
      </div>
      <p role="status" className="min-h-0 text-sm text-destructive empty:hidden">
        {error}
      </p>
    </div>
  );
}
