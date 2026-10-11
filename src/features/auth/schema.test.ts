import { describe, expect, it } from "vitest";

import { profileSchema } from "./schema";

const valid = { username: "drip_lover", displayName: "드립러", bio: "" };

describe("profileSchema", () => {
  it("accepts a valid profile and normalizes the username", () => {
    expect(profileSchema.parse({ ...valid, username: "  Drip_Lover " }).username).toBe("drip_lover");
  });

  it.each(["ab", "a".repeat(21), "has space", "한글이름", "dash-name"])("rejects username %s", (username) => {
    expect(profileSchema.safeParse({ ...valid, username }).success).toBe(false);
  });

  it("requires a display name and limits bio length", () => {
    expect(profileSchema.safeParse({ ...valid, displayName: "  " }).success).toBe(false);
    expect(profileSchema.safeParse({ ...valid, bio: "a".repeat(301) }).success).toBe(false);
  });
});
