/**
 * Audio/haptic cues for brew mode, decided purely from two consecutive progress snapshots:
 * - "tick" when the countdown to the next step reaches 3, 2 and 1 seconds
 * - "step" when a new step begins
 * - "finish" when the brew completes
 */

import type { BrewProgress, TimedStep } from "./progress";

export const COUNTDOWN_S = 3;

export type Cue = "tick" | "step" | "finish";

export type CueSnapshot = {
  stepIndex: number;
  /** Whole seconds left before the next step while within the countdown window, else null. */
  countdown: number | null;
  complete: boolean;
};

export function cueSnapshot(progress: BrewProgress<TimedStep>): CueSnapshot {
  const { secondsToNext } = progress;
  const inWindow = secondsToNext !== null && secondsToNext > 0 && secondsToNext <= COUNTDOWN_S;
  return {
    stepIndex: progress.currentIndex,
    countdown: inWindow ? Math.ceil(secondsToNext) : null,
    complete: progress.isComplete,
  };
}

/**
 * Cues to play when moving from `prev` to `next`. Pass prev = null on the first running frame
 * (start or resume) so nothing fires for state that was already true before the clock ran.
 */
export function detectCues(prev: CueSnapshot | null, next: CueSnapshot): Cue[] {
  if (prev === null) return [];
  if (next.complete) return prev.complete ? [] : ["finish"];
  const cues: Cue[] = [];
  if (next.stepIndex > prev.stepIndex) cues.push("step");
  if (next.countdown !== null && next.countdown !== prev.countdown) cues.push("tick");
  return cues;
}
