import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MovementNav from "./MovementNav";

const fifth = [
  { name: "Allegro con brio", page: 3 },
  { name: "Andante con moto", page: 41 },
  { name: "Allegro", page: 63 },
];

describe("MovementNav", () => {
  it("names the movement containing the current page", () => {
    render(<MovementNav movements={fifth} page={50} onChange={vi.fn()} />);
    expect(
      screen.getByRole("combobox", { name: "Movement" }),
    ).toHaveDisplayValue("II. Andante con moto");
  });

  it("jumps to a movement chosen from the list", () => {
    const onChange = vi.fn();
    render(<MovementNav movements={fifth} page={50} onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Movement" }), {
      target: { value: "2" },
    });
    expect(onChange).toHaveBeenCalledWith(63);
  });

  it("goes to the previous and next movement", () => {
    const onChange = vi.fn();
    render(<MovementNav movements={fifth} page={50} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous movement" }));
    fireEvent.click(screen.getByRole("button", { name: "Next movement" }));
    expect(onChange.mock.calls).toEqual([[41], [63]]);
  });

  it("disables previous at the first movement and next in the last", () => {
    const { rerender } = render(
      <MovementNav movements={fifth} page={3} onChange={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: "Previous movement" }),
    ).toBeDisabled();
    rerender(<MovementNav movements={fifth} page={70} onChange={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Next movement" }),
    ).toBeDisabled();
  });

  it("shows a placeholder before the first movement", () => {
    render(<MovementNav movements={fifth} page={1} onChange={vi.fn()} />);
    expect(
      screen.getByRole("combobox", { name: "Movement" }),
    ).toHaveDisplayValue("—");
  });

  it("renders nothing without movements", () => {
    const { container } = render(
      <MovementNav movements={[]} page={1} onChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
