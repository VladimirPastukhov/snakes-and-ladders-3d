import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomePanel } from "./HomePanel";

function setup(initialName = "") {
  const onCreate = vi.fn(() => Promise.resolve());
  const onJoin = vi.fn();
  render(<HomePanel initialName={initialName} onCreate={onCreate} onJoin={onJoin} />);
  return { onCreate, onJoin };
}

const nameField = () => screen.getByLabelText("Your name");
const codeField = () => screen.getByLabelText("Match Code");

describe("HomePanel", () => {
  it("offers New Match and a Match Code field with Join", () => {
    setup();
    expect(screen.getByRole("button", { name: "New Match" })).toBeInTheDocument();
    expect(codeField()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join" })).toBeDisabled();
  });

  it("pre-fills the remembered name and keeps it editable", () => {
    setup("Dorothy");
    expect(nameField()).toHaveValue("Dorothy");
    fireEvent.change(nameField(), { target: { value: "Dot" } });
    expect(nameField()).toHaveValue("Dot");
  });

  it("does not accept more than 20 characters", () => {
    setup();
    expect(nameField()).toHaveAttribute("maxLength", "20");
  });

  it("requires a name before creating", () => {
    const { onCreate } = setup();
    fireEvent.change(nameField(), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "New Match" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a name.");
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates with the trimmed name", () => {
    const { onCreate } = setup();
    fireEvent.change(nameField(), { target: { value: "  Dorothy Gale  " } });
    fireEvent.click(screen.getByRole("button", { name: "New Match" }));
    expect(onCreate).toHaveBeenCalledWith("Dorothy Gale");
  });

  it("says so when creating fails", async () => {
    const onCreate = vi.fn(() => Promise.reject(new Error("offline")));
    render(<HomePanel initialName="Alex" onCreate={onCreate} onJoin={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "New Match" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn't create a match"),
    );
    expect(screen.getByRole("button", { name: "New Match" })).toBeEnabled();
  });

  it("upper-cases the Match Code and joins with it", () => {
    const { onJoin } = setup("Sam");
    fireEvent.change(codeField(), { target: { value: "k7qxm" } });
    expect(codeField()).toHaveValue("K7QXM");
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    expect(onJoin).toHaveBeenCalledWith("Sam", "K7QXM");
  });

  it("requires a name before joining", () => {
    const { onJoin } = setup();
    fireEvent.change(codeField(), { target: { value: "K7QXM" } });
    fireEvent.click(screen.getByRole("button", { name: "Join" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a name.");
    expect(onJoin).not.toHaveBeenCalled();
  });
});
