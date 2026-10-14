import { describe, expect, it } from "vitest";

import { brewEndS, brewSegments, getBrewProgress } from "./progress";

// Seed: "V60 기본 1인분" — pours at 0:00, 0:40, 1:10, 1:40; ends at 2:45
const steps = [
  { label: "뜸 들이기", startAtS: 0 },
  { label: "1차 붓기", startAtS: 40 },
  { label: "2차 붓기", startAtS: 70 },
  { label: "3차 붓기", startAtS: 100 },
];
const TOTAL = 165;

describe("getBrewProgress", () => {
  it("starts on the first step", () => {
    const p = getBrewProgress(steps, TOTAL, 0);
    expect(p.currentIndex).toBe(0);
    expect(p.current?.label).toBe("뜸 들이기");
    expect(p.next?.label).toBe("1차 붓기");
    expect(p.stepProgress).toBe(0);
    expect(p.secondsToNext).toBe(40);
    expect(p.isComplete).toBe(false);
  });

  it("reports progress within the current step", () => {
    const p = getBrewProgress(steps, TOTAL, 55); // halfway through 40→70
    expect(p.current?.label).toBe("1차 붓기");
    expect(p.stepProgress).toBeCloseTo(0.5);
    expect(p.secondsToNext).toBe(15);
  });

  it("switches steps exactly at the boundary", () => {
    expect(getBrewProgress(steps, TOTAL, 69.999).current?.label).toBe("1차 붓기");
    expect(getBrewProgress(steps, TOTAL, 70).current?.label).toBe("2차 붓기");
  });

  it("treats the time after the last pour as its own segment up to the end", () => {
    const p = getBrewProgress(steps, TOTAL, 132.5); // halfway 100→165
    expect(p.current?.label).toBe("3차 붓기");
    expect(p.next).toBeNull();
    expect(p.secondsToNext).toBeNull();
    expect(p.stepProgress).toBeCloseTo(0.5);
  });

  it("completes at the total time and clamps afterwards", () => {
    expect(getBrewProgress(steps, TOTAL, 164.9).isComplete).toBe(false);
    const done = getBrewProgress(steps, TOTAL, 200);
    expect(done.isComplete).toBe(true);
    expect(done.overallProgress).toBe(1);
    expect(done.stepProgress).toBe(1);
  });

  it("reports overall progress", () => {
    expect(getBrewProgress(steps, TOTAL, 33).overallProgress).toBeCloseTo(0.2);
  });

  it("is before the first step when it starts later than 0", () => {
    const delayed = [{ startAtS: 10 }, { startAtS: 30 }];
    const p = getBrewProgress(delayed, 60, 5);
    expect(p.currentIndex).toBe(-1);
    expect(p.current).toBeNull();
    expect(p.next).toBe(delayed[0]);
    expect(p.secondsToNext).toBe(5);
  });

  it("lets the later step win when two share a start time", () => {
    const tied = [{ startAtS: 0 }, { startAtS: 30 }, { startAtS: 30 }];
    expect(getBrewProgress(tied, 60, 30).currentIndex).toBe(2);
  });

  it("handles no steps", () => {
    const p = getBrewProgress([], 60, 30);
    expect(p.current).toBeNull();
    expect(p.next).toBeNull();
    expect(p.overallProgress).toBeCloseTo(0.5);
  });

  it("never ends before the last step even if total time is too short", () => {
    expect(brewEndS(steps, 90)).toBe(100);
    expect(getBrewProgress(steps, 90, 95).isComplete).toBe(false);
  });

  it("clamps negative elapsed time", () => {
    expect(getBrewProgress(steps, TOTAL, -5).currentIndex).toBe(0);
  });
});

describe("brewSegments", () => {
  it("splits the brew into one segment per step", () => {
    const segments = brewSegments(steps, TOTAL);
    expect(segments.map((s) => s.index)).toEqual([0, 1, 2, 3]);
    expect(segments[0]).toEqual({ index: 0, from: 0, to: 40 / 165 });
    expect(segments[3].from).toBeCloseTo(100 / 165);
    expect(segments[3].to).toBe(1);
  });

  it("adds a leading wait when the first step starts late", () => {
    expect(brewSegments([{ startAtS: 10 }, { startAtS: 30 }], 40)).toEqual([
      { index: -1, from: 0, to: 0.25 },
      { index: 0, from: 0.25, to: 0.75 },
      { index: 1, from: 0.75, to: 1 },
    ]);
  });

  it("drops zero-length segments for steps sharing a start time", () => {
    const segments = brewSegments([{ startAtS: 0 }, { startAtS: 30 }, { startAtS: 30 }], 60);
    expect(segments.map((s) => s.index)).toEqual([0, 2]);
  });

  it("handles no steps and no time", () => {
    expect(brewSegments([], 60)).toEqual([{ index: -1, from: 0, to: 1 }]);
    expect(brewSegments([], 0)).toEqual([]);
  });
});
