"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NumberStepperProps = {
  /** Accessible name; also used in the −/+ button labels. */
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** Shown before the number, e.g. "1:" for ratios. */
  prefix?: string;
  /** Shown after the number, e.g. "g". */
  suffix?: string;
  size?: "md" | "sm";
  className?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundToStep = (value: number, step: number) => Math.round(value / step) * step;
const display = (value: number) => String(Number(value.toFixed(3)));

const sizes = {
  md: { button: "size-11", text: "text-2xl", affix: "text-base" },
  sm: { button: "size-9", text: "text-base", affix: "text-sm" },
} as const;

/** Compact −/value/+ control. Valid typed values apply immediately; invalid ones revert on blur. */
export function NumberStepper({
  label,
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
  size = "md",
  className,
}: NumberStepperProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? display(value);
  const s = sizes[size];

  const commit = (next: number) => onChange(clamp(Number(roundToStep(next, step).toFixed(3)), min, max));

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        className={cn("shrink-0 rounded-full", s.button)}
        aria-label={`${label} ${step} 줄이기`}
        disabled={value <= min}
        onClick={() => commit(value - step)}
      >
        <Minus aria-hidden />
      </Button>
      <span
        className={cn(
          "flex items-baseline justify-center rounded-md px-1 font-semibold tabular-nums focus-within:ring-2 focus-within:ring-ring",
          s.text,
        )}
      >
        {prefix && <span className={cn("font-normal text-muted-foreground", s.affix)}>{prefix}</span>}
        <input
          aria-label={label}
          inputMode="decimal"
          autoComplete="off"
          className="min-w-0 bg-transparent text-center outline-none"
          // Size to the text so prefix/suffix hug the number ("1:16.667", "30g").
          style={{ width: `${Math.max(2, text.length) + 0.25}ch` }}
          value={text}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const next = e.currentTarget.value;
            setDraft(next);
            const parsed = Number(next);
            if (next.trim() !== "" && Number.isFinite(parsed) && parsed >= min && parsed <= max) {
              onChange(parsed);
            }
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        {suffix && <span className={cn("font-normal text-muted-foreground", s.affix)}>{suffix}</span>}
      </span>
      <Button
        type="button"
        variant="outline"
        className={cn("shrink-0 rounded-full", s.button)}
        aria-label={`${label} ${step} 늘리기`}
        disabled={value >= max}
        onClick={() => commit(value + step)}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}
