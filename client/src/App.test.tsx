import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GAME_TITLE } from "@sl/shared";
import { App } from "./App";

describe("App", () => {
  it("shows the game title and build version", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: GAME_TITLE })).toBeInTheDocument();
    expect(screen.getByText("Version: dev")).toBeInTheDocument();
  });
});
