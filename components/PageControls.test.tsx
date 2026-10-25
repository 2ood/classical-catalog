import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PageControls from "./PageControls";

describe("PageControls", () => {
  it("shows the current page and total", () => {
    render(<PageControls page={3} total={12} onChange={vi.fn()} />);
    expect(screen.getByText("3 / 12")).toBeInTheDocument();
  });

  it("moves to the previous and next page", () => {
    const onChange = vi.fn();
    render(<PageControls page={3} total={12} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onChange.mock.calls).toEqual([[2], [4]]);
  });

  it("disables previous on the first page and next on the last", () => {
    const { rerender } = render(
      <PageControls page={1} total={2} onChange={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    rerender(<PageControls page={2} total={2} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
});
