import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { matchPath, navigate, parseRoute, useRoute } from "./route";

describe("parseRoute", () => {
  it.each([
    ["/", { page: "home" }],
    ["/m/K7QXM", { page: "match", code: "K7QXM" }],
    ["/m/k7qxm/", { page: "match", code: "K7QXM" }],
    ["/m/", { page: "home" }],
    ["/somewhere", { page: "home" }],
  ])("%s", (path, route) => {
    expect(parseRoute(path)).toEqual(route);
  });

  it("builds the Match path", () => {
    expect(matchPath("K7QXM")).toBe("/m/K7QXM");
  });
});

describe("useRoute", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("follows navigate and the Back button", async () => {
    const { result } = renderHook(() => useRoute());
    expect(result.current).toEqual({ page: "home" });

    act(() => navigate("/m/K7QXM"));
    expect(result.current).toEqual({ page: "match", code: "K7QXM" });
    expect(window.location.pathname).toBe("/m/K7QXM");

    await act(async () => {
      window.history.back();
      await new Promise((r) => window.addEventListener("popstate", r, { once: true }));
    });
    expect(result.current).toEqual({ page: "home" });
  });
});
