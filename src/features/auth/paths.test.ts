import { describe, expect, it } from "vitest";

import { isProtectedPath, loginHref, safeNextPath } from "./paths";

describe("isProtectedPath", () => {
  it.each([
    ["/me", true],
    ["/me/setup", true],
    ["/me/logs", true],
    ["/meow", false],
    ["/recipes/new", true],
    ["/recipes/abc/edit", true],
    ["/recipes/abc", false],
    ["/recipes/abc/brew", false],
    ["/recipes/newest", false],
    ["/recipes", false],
    ["/", false],
  ])("%s → %s", (path, expected) => {
    expect(isProtectedPath(path)).toBe(expected);
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/me", "/me"],
    ["/recipes/abc?dose=20", "/recipes/abc?dose=20"],
    ["/me/../recipes", "/recipes"],
  ])("keeps in-app path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([null, undefined, "", "me", "//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)"])(
    "rejects %s",
    (input) => {
      expect(safeNextPath(input)).toBe("/");
    },
  );

  it("uses the given fallback", () => {
    expect(safeNextPath("//evil.com", "/me")).toBe("/me");
  });
});

describe("loginHref", () => {
  it("carries a safe next path", () => {
    expect(loginHref("/me/setup")).toBe("/login?next=%2Fme%2Fsetup");
  });

  it("drops unsafe or trivial next paths", () => {
    expect(loginHref("//evil.com")).toBe("/login");
    expect(loginHref("/")).toBe("/login");
    expect(loginHref()).toBe("/login");
  });
});
