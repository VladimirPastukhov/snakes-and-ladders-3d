import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("GET /api/health", () => {
  it("reports ok and the dev version", async () => {
    const response = await exports.default.fetch("http://example.com/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", version: "dev" });
  });
});

describe("unknown API path", () => {
  it("returns a JSON 404", async () => {
    const response = await exports.default.fetch("http://example.com/api/nope");
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
