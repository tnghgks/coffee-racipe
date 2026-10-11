"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

const VALUES = [1, 2, 3, 4, 5] as const;

/** Five 48px star buttons (radio semantics). 0 = not rated yet. */
export function StarRatingInput({
  value,
  onChange,
  label,
  invalid,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  invalid?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} aria-invalid={invalid} className="flex gap-1">
      {VALUES.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n}점`}
          onClick={() => onChange(n)}
          className="flex size-12 items-center justify-center rounded-full transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-90"
        >
          <Star
            className={cn("size-8", n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

/** 1–5 scale for acidity/sweetness/body. Tapping the selected value again clears it (0). */
export function ScaleInput({
  value,
  onChange,
  label,
  lowLabel,
  highLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {lowLabel} ← → {highLabel}
        </span>
      </div>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
        {VALUES.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(value === n ? 0 : n)}
            className={cn(
              "h-11 rounded-lg border text-sm font-medium tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              value === n ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Read-only stars for lists. */
export function StarRating({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`평점 ${value}점`} role="img">
      {VALUES.map((n) => (
        <Star
          key={n}
          className={cn("size-4", n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
          aria-hidden
        />
      ))}
    </span>
  );
}
