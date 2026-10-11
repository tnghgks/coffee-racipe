import type { Cue } from "@/lib/brew";

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * Short tones for brew cues via Web Audio. iOS only lets audio start inside a user gesture,
 * so call `unlock()` from the tap that starts/resumes the timer.
 */
export function createBeeper() {
  let ctx: AudioContext | null = null;

  function unlock() {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
  }

  function tone(frequency: number, durationS: number, delayS = 0) {
    if (!ctx || ctx.state !== "running") return;
    const start = ctx.currentTime + delayS;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    // Short attack/release avoids clicks.
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.25, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationS);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + durationS + 0.02);
  }

  function play(cue: Cue) {
    if (cue === "tick") tone(880, 0.09);
    if (cue === "step") tone(1320, 0.22);
    if (cue === "finish") [880, 1100, 1320].forEach((f, i) => tone(f, 0.18, i * 0.16));
  }

  return { unlock, play };
}

/** Haptics where supported (Android); iOS Safari has no Vibration API, so the beep is the fallback. */
export function vibrate(cue: Cue) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (cue === "step") navigator.vibrate(200);
  if (cue === "finish") navigator.vibrate([200, 100, 200]);
}
