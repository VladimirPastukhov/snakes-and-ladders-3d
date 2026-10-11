import { describe, expect, it } from "vitest";
import { Identity, checkName } from "./identity";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

const brokenStorage = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

describe("checkName", () => {
  it("trims spaces", () => {
    expect(checkName("  Dorothy Gale  ")).toEqual({ ok: true, name: "Dorothy Gale" });
  });

  it("requires a name", () => {
    expect(checkName("   ")).toEqual({ ok: false, error: "Please enter a name." });
  });

  it("allows 20 characters but not 21", () => {
    expect(checkName("x".repeat(20)).ok).toBe(true);
    expect(checkName("x".repeat(21)).ok).toBe(false);
  });
});

describe("Identity", () => {
  it("remembers the name in storage", () => {
    const storage = memoryStorage();
    new Identity(storage).setName("Dorothy");
    expect(new Identity(storage).name).toBe("Dorothy");
  });

  it("has no name on a first visit", () => {
    expect(new Identity(memoryStorage()).name).toBe("");
  });

  it("creates one random token and keeps it", () => {
    const storage = memoryStorage();
    const token = new Identity(storage).token;
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(new Identity(storage).token).toBe(token);
    expect(new Identity(memoryStorage()).token).not.toBe(token);
  });

  it("falls back to memory when storage throws", () => {
    const identity = new Identity(brokenStorage);
    identity.setName("Sam");
    expect(identity.name).toBe("Sam");
    expect(identity.token).toBe(identity.token);
  });

  it("works with no storage at all", () => {
    const identity = new Identity(null);
    identity.setName("Sam");
    expect(identity.name).toBe("Sam");
  });

  it("remembers the Matches it holds a seat in, newest 20 only", () => {
    const storage = memoryStorage();
    const identity = new Identity(storage);
    expect(identity.knowsMatch("K7QXM")).toBe(false);
    identity.rememberMatch("K7QXM");
    expect(new Identity(storage).knowsMatch("K7QXM")).toBe(true);
    for (let i = 0; i < 20; i++) identity.rememberMatch(`CODE${i}`);
    expect(identity.knowsMatch("K7QXM")).toBe(false);
    expect(identity.knowsMatch("CODE19")).toBe(true);
  });
});
