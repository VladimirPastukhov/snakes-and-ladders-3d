import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NamePrompt } from "./NamePrompt";

describe("NamePrompt", () => {
  it("asks for a name before joining from a link", () => {
    const onContinue = vi.fn();
    render(<NamePrompt code="K7QXM" initialName="" onContinue={onContinue} onHome={vi.fn()} />);
    expect(screen.getByRole("heading")).toHaveTextContent("Join match K7QXM");
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a name.");
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: " Sam " } });
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    expect(onContinue).toHaveBeenCalledWith("Sam");
  });

  it("pre-fills the remembered name and offers a way home", () => {
    const onHome = vi.fn();
    render(<NamePrompt code="K7QXM" initialName="Sam" onContinue={vi.fn()} onHome={onHome} />);
    expect(screen.getByLabelText("Your name")).toHaveValue("Sam");
    expect(screen.getByLabelText("Your name")).toHaveAttribute("maxLength", "20");
    fireEvent.click(screen.getByRole("button", { name: "Back to home" }));
    expect(onHome).toHaveBeenCalled();
  });
});
