/**
 * Brew timer state machine: idle → running ⇄ paused → finished.
 *
 * Elapsed time is never counted by ticks. A session stores the time already banked plus the
 * monotonic instant (performance.now()) it last resumed, so elapsed = accumulated + (now − resumedAt).
 * Background tabs, throttled timers and dropped frames therefore cannot make the clock drift.
 * Every function takes `now` explicitly so tests can drive a fake clock.
 */

export type BrewStatus = "idle" | "running" | "paused" | "finished";

export type BrewSession = {
  status: BrewStatus;
  /** Milliseconds banked from earlier running periods. */
  accumulatedMs: number;
  /** performance.now() at the latest start/resume; null unless running. */
  resumedAt: number | null;
};

export const idleSession: BrewSession = { status: "idle", accumulatedMs: 0, resumedAt: null };

export function elapsedMs(session: BrewSession, now: number): number {
  if (session.status !== "running" || session.resumedAt === null) return session.accumulatedMs;
  return session.accumulatedMs + Math.max(0, now - session.resumedAt);
}

export function startSession(session: BrewSession, now: number): BrewSession {
  if (session.status !== "idle") return session;
  return { status: "running", accumulatedMs: 0, resumedAt: now };
}

export function pauseSession(session: BrewSession, now: number): BrewSession {
  if (session.status !== "running") return session;
  return { status: "paused", accumulatedMs: elapsedMs(session, now), resumedAt: null };
}

export function resumeSession(session: BrewSession, now: number): BrewSession {
  if (session.status !== "paused") return session;
  return { status: "running", accumulatedMs: session.accumulatedMs, resumedAt: now };
}

/** Single tap control: start when idle, otherwise pause/resume. Finished sessions ignore taps. */
export function toggleSession(session: BrewSession, now: number): BrewSession {
  switch (session.status) {
    case "idle":
      return startSession(session, now);
    case "running":
      return pauseSession(session, now);
    case "paused":
      return resumeSession(session, now);
    case "finished":
      return session;
  }
}

/** Ends the brew early (e.g. a "done" button). */
export function finishSession(session: BrewSession, now: number): BrewSession {
  if (session.status !== "running" && session.status !== "paused") return session;
  return { status: "finished", accumulatedMs: elapsedMs(session, now), resumedAt: null };
}

/**
 * Finishes a running session once it reaches the end of the brew, clamping elapsed to exactly
 * `endMs` so the final reading doesn't depend on how late the check ran.
 */
export function completeIfDue(session: BrewSession, now: number, endMs: number): BrewSession {
  if (session.status !== "running" || elapsedMs(session, now) < endMs) return session;
  return { status: "finished", accumulatedMs: endMs, resumedAt: null };
}
