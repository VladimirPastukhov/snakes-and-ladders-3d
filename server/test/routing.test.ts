import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../src/index";

const GAME_PAGE = "<!doctype html><title>game</title>";

// Stands in for the static assets: only "/" (the game page) exists.
const fakeAssets = {
  async fetch(input: RequestInfo | URL) {
    const { pathname } = new URL(input instanceof Request ? input.url : input);
    return pathname === "/"
      ? new Response(GAME_PAGE, { headers: { "content-type": "text/html" } })
      : new Response("missing", { status: 404 });
  },
} as unknown as Fetcher;

async function get(path: string): Promise<Response> {
  return worker.fetch(new Request(`http://example.com${path}`), { ...env, ASSETS: fakeAssets });
}

describe("routing of requests that are not existing files", () => {
  it("serves the game page for a Match-style deep link", async () => {
    const response = await get("/m/K7QX");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(GAME_PAGE);
  });

  it("returns 404 for a missing static file", async () => {
    const response = await get("/assets/missing.js");
    expect(response.status).toBe(404);
    expect(await response.text()).not.toBe(GAME_PAGE);
  });
});
