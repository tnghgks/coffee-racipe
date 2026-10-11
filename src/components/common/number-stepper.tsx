"use client";

import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";

type NumberStepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** Shown before the input, e.g. "1:" for ratios. */
  prefix?: string;
  /** Shown after the input, e.g. "g". */
  suffix?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundToStep = (value: number, step: number) => Math.round(value / step) * step;
const display = (value: number) => String(Number(value.toFixed(3)));

/** −/+ buttons with a typeable field. Valid typed values apply immediately; invalid ones revert on blur. */
export function NumberStepper({ label, value, onChange, min, max, step, prefix, suffix }: NumberStepperProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? display(value);

  const commit = (next: number) => onChange(clamp(Number(roundToStep(next, step).toFixed(3)), min, max));

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="size-12 shrink-0"
          aria-label={`${label} ${step} 줄이기`}
          disabled={value <= min}
          onClick={() => commit(value - step)}
        >
          <Minus aria-hidden />
        </Button>
        <div className="flex h-12 min-w-0 flex-1 items-center justify-center gap-0.5 rounded-lg border bg-background px-2 text-xl font-semibold tabular-nums focus-within:ring-2 focus-within:ring-ring">
          {prefix && <span className="text-muted-foreground">{prefix}</span>}
          <input
            id={id}
            inputMode="decimal"
            autoComplete="off"
            className="min-w-0 bg-transparent text-center outline-none"
            // Size to the text so prefix/suffix hug the number ("1:16.667", "30g").
            style={{ width: `${Math.max(2, text.length) + 0.5}ch` }}
            value={text}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const text = e.currentTarget.value;
              setDraft(text);
              const parsed = Number(text);
              if (text.trim() !== "" && Number.isFinite(parsed) && parsed >= min && parsed <= max) {
                onChange(parsed);
              }
            }}
            onBlur={() => setDraft(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          {suffix && <span className="text-base text-muted-foreground">{suffix}</span>}
        </div>
        <Button
          type="button"
          variant="outline"
          className="size-12 shrink-0"
          aria-label={`${label} ${step} 늘리기`}
          disabled={value >= max}
          onClick={() => commit(value + step)}
        >
          <Plus aria-hidden />
        </Button>
      </div>
    </div>
  );
}
