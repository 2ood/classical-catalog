import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MovementNav from "./MovementNav";

const placed = [
  { id: "m1", label: "I. Allegro con brio", start: 3 },
  { id: "m2", label: "II. Andante con moto", start: 41 },
  { id: "m3", label: "III. Allegro", start: 63 },
];

describe("MovementNav", () => {
  it("names the movement containing the current page", () => {
    render(<MovementNav movements={placed} at={50} onSelect={vi.fn()} />);
    expect(
      screen.getByRole("combobox", { name: "Movement" }),
    ).toHaveDisplayValue("II. Andante con moto");
  });

  it("selects a movement chosen from the list", () => {
    const onSelect = vi.fn();
    render(<MovementNav movements={placed} at={50} onSelect={onSelect} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Movement" }), {
      target: { value: "m3" },
    });
    expect(onSelect).toHaveBeenCalledWith(placed[2]);
  });

  it("selects the previous and next movement", () => {
    const onSelect = vi.fn();
    render(<MovementNav movements={placed} at={50} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous movement" }));
    fireEvent.click(screen.getByRole("button", { name: "Next movement" }));
    expect(onSelect.mock.calls).toEqual([[placed[1]], [placed[2]]]);
  });

  it("disables previous at the first movement and next in the last", () => {
    const { rerender } = render(
      <MovementNav movements={placed} at={3} onSelect={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: "Previous movement" }),
    ).toBeDisabled();
    rerender(<MovementNav movements={placed} at={70} onSelect={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Next movement" }),
    ).toBeDisabled();
  });

  it("shows a placeholder before the first movement", () => {
    render(<MovementNav movements={placed} at={1} onSelect={vi.fn()} />);
    expect(
      screen.getByRole("combobox", { name: "Movement" }),
    ).toHaveDisplayValue("—");
  });

  it("renders nothing without movements", () => {
    const { container } = render(
      <MovementNav movements={[]} at={1} onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
