import { describe, expect, it } from "vitest";

import {
  decodeCursor,
  encodeCursor,
  exploreHref,
  feedMoment,
  parseExploreParams,
  toRpcFilters,
} from "./explore-params";

describe("parseExploreParams", () => {
  it("defaults to the popular feed without filters", () => {
    expect(parseExploreParams({})).toEqual({ q: null, dripper: null, strength: null, time: null, sort: "popular" });
  });

  it("reads and normalizes filters", () => {
    expect(parseExploreParams({ q: "  4:6 ", dripper: "V60", strength: "light", time: "180", sort: "latest" })).toEqual({
      q: "4:6",
      dripper: "v60",
      strength: "light",
      time: "180",
      sort: "latest",
    });
  });

  it("drops invalid values and caps the query length", () => {
    const params = parseExploreParams({ q: "가".repeat(80), dripper: "v60;--", strength: "x", time: "999", sort: "y" });
    expect(params).toEqual({ q: "가".repeat(50), dripper: null, strength: null, time: null, sort: "popular" });
  });

  it("treats a blank query as none", () => {
    expect(parseExploreParams({ q: "   " }).q).toBeNull();
  });
});

describe("exploreHref", () => {
  it("omits defaults and round-trips", () => {
    expect(exploreHref(parseExploreParams({}))).toBe("/explore");
    const params = parseExploreParams({ q: "4:6 메소드", dripper: "v60", sort: "latest" });
    const href = exploreHref(params);
    expect(href).toBe("/explore?q=4%3A6+%EB%A9%94%EC%86%8C%EB%93%9C&dripper=v60&sort=latest");
    expect(parseExploreParams(Object.fromEntries(new URL(href, "http://x").searchParams))).toEqual(params);
  });
});

describe("toRpcFilters", () => {
  it("maps presets to ranges", () => {
    expect(toRpcFilters(parseExploreParams({ strength: "medium", time: "240" }))).toMatchObject({
      ratio_min: 15,
      ratio_max: 17,
      time_max: 240,
      sort: "popular",
    });
    expect(toRpcFilters(parseExploreParams({ strength: "strong" }))).toMatchObject({
      ratio_min: undefined,
      ratio_max: 15,
    });
  });
});

describe("cursor", () => {
  const cursor = { key: 1_760_140_800_123_456, id: "00000000-0000-4000-8000-000000000001", at: "2026-10-11T00:00:00.000Z" };

  it("round-trips exactly", () => {
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it.each([
    null,
    "",
    "not-base64!",
    btoa('{"key":"1","id":"x","at":"y"}'),
    btoa('{"key":0.5,"id":"00000000-0000-4000-8000-000000000001","at":"2026-10-11T00:00:00Z"}'),
  ])(
    "rejects %s",
    (raw) => {
      expect(decodeCursor(raw)).toBeNull();
    },
  );
});

describe("feedMoment", () => {
  it("rounds down to 10 minutes", () => {
    expect(feedMoment(Date.parse("2026-10-11T08:37:42Z"))).toBe("2026-10-11T08:30:00.000Z");
  });
});
