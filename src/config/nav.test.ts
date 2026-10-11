import { describe, expect, it } from "vitest";

import { getActiveHref } from "./nav";

describe("getActiveHref", () => {
  it("matches home only on the exact root path", () => {
    expect(getActiveHref("/")).toBe("/");
    expect(getActiveHref("/unknown")).toBeNull();
  });

  it("matches nested routes by segment prefix", () => {
    expect(getActiveHref("/recipes")).toBe("/recipes");
    expect(getActiveHref("/recipes/abc/brew")).toBe("/recipes");
    expect(getActiveHref("/recipes-old")).toBeNull();
  });

  it("prefers the most specific item", () => {
    expect(getActiveHref("/me")).toBe("/me");
    expect(getActiveHref("/me/logs/123")).toBe("/me/logs");
    expect(getActiveHref("/me/recipes")).toBe("/me");
  });
});
