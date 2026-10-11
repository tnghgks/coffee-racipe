import { describe, expect, it } from "vitest";

import { cueSnapshot, detectCues, type Cue } from "./cues";
import { getBrewProgress } from "./progress";

const steps = [{ startAtS: 0 }, { startAtS: 40 }, { startAtS: 70 }];
const TOTAL = 120;
const snap = (elapsedS: number) => cueSnapshot(getBrewProgress(steps, TOTAL, elapsedS));

/** Simulates frames every `frameS` seconds and collects the cues with the time they fired. */
function run(fromS: number, toS: number, frameS = 0.1) {
  const fired: [number, Cue][] = [];
  let prev = snap(fromS);
  for (let t = fromS + frameS; t <= toS + 1e-9; t = Math.round((t + frameS) * 1000) / 1000) {
    const next = snap(t);
    for (const cue of detectCues(prev, next)) fired.push([Math.round(t * 10) / 10, cue]);
    prev = next;
  }
  return fired;
}

describe("brew cues", () => {
  it("ticks at 3, 2, 1 seconds before a step and signals the step change", () => {
    expect(run(30, 41)).toEqual([
      [37, "tick"], // exactly 3s left
      [38, "tick"], // 2s left
      [39, "tick"], // 1s left
      [40, "step"],
    ]);
  });

  it("fires each cue once even when frames are sparse (e.g. throttled tab)", () => {
    expect(run(35, 45, 2.5).map(([, cue]) => cue)).toEqual(["tick", "step"]);
  });

  it("signals finish once at the end, without a countdown after the last pour", () => {
    const fired = run(100, 125);
    expect(fired).toEqual([[120, "finish"]]);
  });

  it("fires nothing on the first frame after start or resume", () => {
    expect(detectCues(null, snap(38))).toEqual([]);
  });

  it("does not repeat finish", () => {
    expect(detectCues(snap(121), snap(122))).toEqual([]);
  });
});
