import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MatchMessage } from "./MatchMessage";

describe("MatchMessage", () => {
  it.each([
    ["full", "This match is full"],
    ["not_found", "Match not found"],
    ["replaced", "This match is open in another tab"],
  ] as const)("%s shows the message and a way home", (status, text) => {
    const onHome = vi.fn();
    render(<MatchMessage status={status} onHome={onHome} />);
    expect(screen.getByRole("alert")).toHaveTextContent(text);
    fireEvent.click(screen.getByRole("button", { name: "Back to home" }));
    expect(onHome).toHaveBeenCalled();
  });

  it("shows Connecting… while connecting", () => {
    render(<MatchMessage status="connecting" onHome={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Connecting…");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
