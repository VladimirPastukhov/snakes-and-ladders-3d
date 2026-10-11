import { env, exports } from "cloudflare:workers";
import { MATCH_CODE_ALPHABET } from "@sl/shared";
import { describe, expect, it } from "vitest";
import { createMatch } from "../src/matches";
import { ORIGIN, newToken } from "./socket";

function post(body: string): Promise<Response> {
  return exports.default.fetch(`${ORIGIN}/api/matches`, { method: "POST", body });
}

function request(name = "Alex"): Request {
  return new Request(`${ORIGIN}/api/matches`, {
    method: "POST",
    body: JSON.stringify({ token: newToken(), name }),
  });
}

describe("POST /api/matches", () => {
  it("creates a Match and returns its code", async () => {
    const response = await post(JSON.stringify({ token: newToken(), name: "Alex" }));
    expect(response.status).toBe(201);
    const { code } = (await response.json()) as { code: string };
    expect(code).toMatch(new RegExp(`^[${MATCH_CODE_ALPHABET}]{5}$`));
  });

  it.each([
    ["not JSON", "{"],
    ["no name", JSON.stringify({ token: newToken() })],
    ["blank name", JSON.stringify({ token: newToken(), name: "   " })],
    ["21-character name", JSON.stringify({ token: newToken(), name: "x".repeat(21) })],
    ["no token", JSON.stringify({ name: "Alex" })],
  ])("refuses %s with 400", async (_, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
  });

  it("tries another code when the first is taken", async () => {
    expect((await createMatch(request(), env, () => "TAKEN")).status).toBe(201);
    const codes = ["TAKEN", "FREE2"];
    const response = await createMatch(request("Sam"), env, () => codes.shift()!);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ code: "FREE2" });
  });

  it("gives up after five taken codes", async () => {
    expect((await createMatch(request(), env, () => "BUSY2")).status).toBe(201);
    let tries = 0;
    const response = await createMatch(request(), env, () => (tries++, "BUSY2"));
    expect(response.status).toBe(503);
    expect(tries).toBe(5);
  });
});
