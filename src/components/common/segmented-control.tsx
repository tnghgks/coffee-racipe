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
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/** Pill-shaped single-choice toggle (radio group semantics). */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-full bg-muted p-1", className)}>
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
              "inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              selected
                ? (activeClassName ?? "bg-background text-foreground shadow-sm")
                : "text-muted-foreground hover:text-foreground",
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
