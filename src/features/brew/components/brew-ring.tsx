import type { ReactNode } from "react";

import type { BrewSegment } from "@/lib/brew";
import { cn } from "@/lib/utils";

type BrewRingProps = {
  segments: BrewSegment[];
  /** Index of the step in progress (BrewProgress.currentIndex). */
  currentIndex: number;
  /** 0–1 through the whole brew. */
  progress: number;
  paused: boolean;
  /** Draws attention to the head, e.g. in the last seconds before the next pour. */
  pulse: boolean;
  children: ReactNode;
};

// SVG units: a 100×100 box with the ring centred on it.
const CENTER = 50;
const RADIUS = 45;
const STROKE = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Arc length left empty between segments. */
const GAP = 1.6;

/** Stroke props drawing the arc from `from` to `to` (0–1, clockwise from 12 o'clock). */
function arc(from: number, to: number) {
  const length = Math.max(0, (to - from) * CIRCUMFERENCE);
  return {
    strokeDasharray: `${length} ${CIRCUMFERENCE}`,
    strokeDashoffset: -from * CIRCUMFERENCE,
  };
}

/** Trims the gap off both ends unless the segment is too short to have one. */
function inset(segment: BrewSegment) {
  const half = GAP / CIRCUMFERENCE / 2;
  return segment.to - segment.from > half * 4
    ? { from: segment.from + half, to: segment.to - half }
    : { from: segment.from, to: segment.to };
}

/**
 * The whole brew as a ring split into one arc per step: finished steps filled, the current one filling
 * up to the head, later ones as a faint track. `children` sits in the middle.
 */
export function BrewRing({ segments, currentIndex, progress, paused, pulse, children }: BrewRingProps) {
  const angle = 2 * Math.PI * progress - Math.PI / 2;
  const head = { x: CENTER + RADIUS * Math.cos(angle), y: CENTER + RADIUS * Math.sin(angle) };

  return (
    <span className="relative block aspect-square w-full max-w-[min(82vw,22rem)]">
      <svg
        viewBox="0 0 100 100"
        className={cn("absolute inset-0 size-full overflow-visible transition-opacity", paused && "opacity-40")}
        aria-hidden
      >
        <g transform={`rotate(-90 ${CENTER} ${CENTER})`} fill="none" strokeWidth={STROKE}>
          {segments.map((segment) => {
            const { from, to } = inset(segment);
            const done = segment.index < currentIndex;
            const current = segment.index === currentIndex;
            return (
              <g key={segment.index}>
                <circle cx={CENTER} cy={CENTER} r={RADIUS} className="stroke-muted" {...arc(from, to)} />
                {(done || current) && (
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    className={cn(done ? "stroke-primary/55" : "stroke-primary")}
                    {...arc(from, done ? to : Math.min(to, Math.max(from, progress)))}
                  />
                )}
              </g>
            );
          })}
        </g>

        {pulse && (
          <circle
            cx={head.x}
            cy={head.y}
            r={STROKE * 0.75}
            className="origin-center animate-ping fill-primary/40 [transform-box:fill-box]"
          />
        )}
        <circle cx={head.x} cy={head.y} r={STROKE * 0.6} className="fill-primary stroke-background" strokeWidth={1.5} />
      </svg>

      <span className="absolute inset-[14%] flex flex-col items-center justify-center gap-1 text-center">
        {children}
      </span>
    </span>
  );
}
