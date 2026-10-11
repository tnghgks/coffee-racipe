import { describe, expect, it } from "vitest";

import { applyReaction, type ReactionState } from "./reactions";

const base: ReactionState = { likes: 3, saves: 1, liked: false, saved: false };

describe("applyReaction", () => {
  it("likes and unlikes", () => {
    const liked = applyReaction(base, "like", true);
    expect(liked).toEqual({ ...base, likes: 4, liked: true });
    expect(applyReaction(liked, "like", false)).toEqual(base);
  });

  it("saves independently of likes", () => {
    expect(applyReaction(base, "save", true)).toEqual({ ...base, saves: 2, saved: true });
  });

  it("is a no-op when the state already matches", () => {
    expect(applyReaction(base, "like", false)).toBe(base);
    expect(applyReaction({ ...base, saved: true }, "save", true)).toEqual({ ...base, saved: true });
  });

  it("never goes below zero", () => {
    expect(applyReaction({ likes: 0, saves: 0, liked: true, saved: true }, "like", false).likes).toBe(0);
    expect(applyReaction({ likes: 0, saves: 0, liked: true, saved: true }, "save", false).saves).toBe(0);
  });
});
