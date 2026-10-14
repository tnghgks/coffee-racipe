/** Where a brew is at a given moment, derived purely from the step schedule and elapsed time. */

export type TimedStep = {
  /** Seconds from the start of the brew when this step begins. */
  startAtS: number;
};

export type BrewProgress<S extends TimedStep> = {
  /** Index of the step in progress; -1 before the first step starts (or when there are no steps). */
  currentIndex: number;
  current: S | null;
  next: S | null;
  /** 0–1 through the current segment (current step start → next step start, or → end of brew). */
  stepProgress: number;
  /** Seconds until the next step begins; null after the last step. */
  secondsToNext: number | null;
  /** 0–1 through the whole brew. */
  overallProgress: number;
  /** When the brew ends: total time, or the last step's start if the data says otherwise. */
  endS: number;
  isComplete: boolean;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** End of the brew in seconds; never earlier than the last step so every step gets shown. */
export function brewEndS(steps: readonly TimedStep[], totalTimeS: number): number {
  return Math.max(totalTimeS, steps.at(-1)?.startAtS ?? 0);
}

/** Steps must be sorted by startAtS (as stored). When steps share a start time, the later one wins. */
export function getBrewProgress<S extends TimedStep>(
  steps: readonly S[],
  totalTimeS: number,
  elapsedS: number,
): BrewProgress<S> {
  const endS = brewEndS(steps, totalTimeS);
  const elapsed = Math.max(0, elapsedS);

  let currentIndex = -1;
  for (let i = 0; i < steps.length && steps[i].startAtS <= elapsed; i++) currentIndex = i;

  const current = steps[currentIndex] ?? null;
  const next = steps[currentIndex + 1] ?? null;
  const segmentStart = current?.startAtS ?? 0;
  const segmentEnd = next?.startAtS ?? endS;

  return {
    currentIndex,
    current,
    next,
    stepProgress: segmentEnd > segmentStart ? clamp01((elapsed - segmentStart) / (segmentEnd - segmentStart)) : 1,
    secondsToNext: next ? next.startAtS - elapsed : null,
    overallProgress: endS > 0 ? clamp01(elapsed / endS) : 1,
    endS,
    isComplete: elapsed >= endS,
  };
}

export type BrewSegment = {
  /** Index of the step this segment belongs to; -1 for the wait before a first step that starts late. */
  index: number;
  /** 0–1 positions on the whole brew (start → end). */
  from: number;
  to: number;
};

/**
 * The brew split into one segment per step (step start → next step start, last one → end), as
 * fractions of the whole brew. Zero-length segments (steps sharing a start time) are left out.
 */
export function brewSegments(steps: readonly TimedStep[], totalTimeS: number): BrewSegment[] {
  const endS = brewEndS(steps, totalTimeS);
  if (endS <= 0) return [];
  const at = (s: number) => Math.min(1, Math.max(0, s / endS));

  const segments: BrewSegment[] = [];
  const firstStart = steps[0]?.startAtS ?? endS;
  if (firstStart > 0) segments.push({ index: -1, from: 0, to: at(firstStart) });
  steps.forEach((step, i) => {
    const from = at(step.startAtS);
    const to = at(steps[i + 1]?.startAtS ?? endS);
    if (to > from) segments.push({ index: i, from, to });
  });
  return segments;
}
