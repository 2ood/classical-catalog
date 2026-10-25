import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PerformerTiles from "./PerformerTiles";

const recordings = [
  { id: "a", performer: "Glenn Gould", year: 1981 },
  { id: "b", performer: "Karajan / BPO", year: null },
];

function renderTiles(
  props: Partial<Parameters<typeof PerformerTiles>[0]> = {},
) {
  const handlers = { onSelect: vi.fn(), onDelete: vi.fn(), onAdd: vi.fn() };
  render(
    <PerformerTiles
      recordings={recordings}
      selectedId="a"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("PerformerTiles", () => {
  it("shows a tile with initials per recording, labelled with the performer", () => {
    renderTiles();
    const gould = screen.getByRole("button", { name: "Glenn Gould (1981)" });
    expect(gould).toHaveTextContent("GG");
    expect(
      screen.getByRole("button", { name: "Karajan / BPO" }),
    ).toHaveTextContent("KB");
  });

  it("marks the selected tile as pressed", () => {
    renderTiles({ selectedId: "b" });
    expect(
      screen.getByRole("button", { name: "Karajan / BPO" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Glenn Gould (1981)" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("selects a recording on click", () => {
    const { onSelect } = renderTiles();
    fireEvent.click(screen.getByRole("button", { name: "Karajan / BPO" }));
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("offers delete per tile and an add tile", () => {
    const { onDelete, onAdd, onSelect } = renderTiles();
    fireEvent.click(
      screen.getByRole("button", { name: "Delete Karajan / BPO" }),
    );
    expect(onDelete).toHaveBeenCalledWith("b");
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Add recording" }));
    expect(onAdd).toHaveBeenCalled();
  });
});
