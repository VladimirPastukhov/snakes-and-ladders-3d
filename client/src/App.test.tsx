import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GAME_TITLE } from "@sl/shared";
import { App } from "./App";
import { Identity } from "./identity";

describe("App", () => {
  it("shows the game title and build version", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: GAME_TITLE })).toBeInTheDocument();
    expect(screen.getByText("Version: dev")).toBeInTheDocument();
  });

  it("explains that 3D graphics are needed when WebGL is unavailable", () => {
    // jsdom has no WebGL, so the App takes the fallback path here.
    render(<App />);
    expect(screen.getByRole("alert")).toHaveTextContent("This game needs 3D graphics (WebGL)");
  });

  it("opens on the home screen", () => {
    render(<App identity={new Identity(null)} />);
    expect(screen.getByRole("button", { name: "New Match" })).toBeInTheDocument();
  });

  describe("on a Match link", () => {
    afterEach(() => window.history.replaceState(null, "", "/"));

    it("asks a new visitor for their name before joining", () => {
      window.history.replaceState(null, "", "/m/k7qxm");
      render(<App identity={new Identity(null)} />);
      expect(screen.getByRole("heading", { name: "Join match K7QXM" })).toBeInTheDocument();
    });
  });
});
