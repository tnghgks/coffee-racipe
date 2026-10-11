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
const decimalsOf = (value: number) => display(value).split(".")[1]?.length ?? 0;

/**
 * Character width of the widest value the −/+ buttons can produce (e.g. max 100, step 0.5 → "100.5"),
 * or the starting value if that is wider (e.g. 16.667). Keeps the control from resizing as decimals appear.
 */
export function stepperSlotChars(min: number, max: number, step: number, initial: number): number {
  const stepDecimals = decimalsOf(step);
  const integerDigits = Math.max(String(Math.trunc(Math.abs(max))).length, String(Math.trunc(Math.abs(min))).length);
  return Math.max(integerDigits + (stepDecimals > 0 ? stepDecimals + 1 : 0), display(initial).length);
}

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
  // Fixed at mount so stepping never changes the control's width.
  const [slotChars] = useState(() => stepperSlotChars(min, max, step, value));
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
          // Hug the unit: "20.5g" right-aligned before a suffix, "1:16" left-aligned after a prefix.
          className={cn(
            "min-w-0 bg-transparent outline-none",
            suffix ? "text-right" : prefix ? "text-left" : "text-center",
          )}
          style={{ width: `${slotChars + 0.25}ch` }}
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
