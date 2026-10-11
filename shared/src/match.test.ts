import { describe, expect, it } from "vitest";
import { MATCH_CODE_ALPHABET, displayNameSchema, normaliseMatchCode } from "./match";

describe("Match Codes", () => {
  it("use an alphabet without look-alike characters", () => {
    expect(MATCH_CODE_ALPHABET).toHaveLength(31);
    for (const c of "0O1IL") expect(MATCH_CODE_ALPHABET).not.toContain(c);
  });

  it("are matched case-insensitively", () => {
    expect(normaliseMatchCode("k7qxm")).toBe("K7QXM");
    expect(normaliseMatchCode("  K7QXM ")).toBe("K7QXM");
  });

  it("refuse look-alike characters and wrong lengths", () => {
    expect(normaliseMatchCode("K7QX0")).toBeNull();
    expect(normaliseMatchCode("K7QXO")).toBeNull();
    expect(normaliseMatchCode("k7qx1")).toBeNull();
    expect(normaliseMatchCode("K7QXI")).toBeNull();
    expect(normaliseMatchCode("K7QXl")).toBeNull();
    expect(normaliseMatchCode("K7QX")).toBeNull();
    expect(normaliseMatchCode("K7QXMM")).toBeNull();
    expect(normaliseMatchCode("")).toBeNull();
  });
});

describe("Display names", () => {
  it("are trimmed", () => {
    expect(displayNameSchema.parse("  Dorothy Gale  ")).toBe("Dorothy Gale");
  });

  it("are 1 to 20 characters", () => {
    expect(displayNameSchema.safeParse("   ").success).toBe(false);
    expect(displayNameSchema.safeParse("x".repeat(20)).success).toBe(true);
    expect(displayNameSchema.safeParse("x".repeat(21)).success).toBe(false);
  });
});
