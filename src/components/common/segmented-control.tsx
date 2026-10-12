"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Classes for this option when selected, e.g. a mode-specific color. */
  activeClassName?: string;
};

type SegmentedControlProps<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  /** null selects nothing, e.g. when the current value sits between options. */
  value: T | null;
  onChange: (value: T) => void;
  size?: "md" | "sm";
  /** "chips": separate outlined pills without a track, for lightweight presets. */
  variant?: "track" | "chips";
  className?: string;
};

/** Pill-shaped single-choice toggle (radio group semantics). */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
  variant = "track",
  className,
}: SegmentedControlProps<T>) {
  const chips = variant === "chips";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex", chips ? "flex-wrap gap-1.5" : "rounded-full bg-muted p-1", className)}
    >
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon, activeClassName }) => {
        const selected = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(optionValue)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              size === "md" ? "min-h-9 px-4" : "min-h-8 px-3",
              chips && "border",
              selected
                ? (activeClassName ??
                    (chips ? "border-primary/40 bg-primary/10 text-primary" : "bg-background text-foreground shadow-sm"))
                : cn("text-muted-foreground hover:text-foreground", chips && "bg-background hover:bg-muted"),
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}
