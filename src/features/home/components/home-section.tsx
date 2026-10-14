import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useId, type ReactNode } from "react";

/** A home page section: heading, optional "더 보기" link, content. */
export function HomeSection({
  title,
  moreHref,
  children,
}: {
  title: string;
  moreHref?: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        {moreHref && (
          <Link
            href={moreHref}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            aria-label={`${title} 더 보기`}
          >
            더 보기
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Placeholder with the section's rough height while its data streams in. */
export function HomeSectionSkeleton({ variant }: { variant: "carousel" | "rows" }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="h-7 w-44 animate-pulse rounded-md bg-muted" />
      {variant === "carousel" ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 w-64 shrink-0 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}
    </div>
  );
}
