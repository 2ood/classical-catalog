import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayerSync, { useMovementRequests, usePlayerSync } from "./PlayerSync";
import WorkMovementNav from "./WorkMovementNav";

const movements = [
  { id: "m1", name: "Intermezzo in a-Moll" },
  { id: "m2", name: "Intermezzo in A-Dur" },
  { id: "m3", name: "Ballade in g-Moll" },
];

/** Stand-in for a pane: records what it is asked to show. */
function Pane({
  source,
  onRequest,
}: {
  source: "score" | "recording";
  onRequest: (id: string) => void;
}) {
  const { report } = usePlayerSync();
  useMovementRequests(source, onRequest);
  return (
    <button type="button" onClick={() => report("m3")}>
      {source} reaches III
    </button>
  );
}

function renderNav(initialMovement?: string) {
  const onScore = vi.fn();
  const onRecording = vi.fn();
  render(
    <PlayerSync movements={movements} initialMovement={initialMovement}>
      <WorkMovementNav />
      <Pane source="score" onRequest={onScore} />
      <Pane source="recording" onRequest={onRecording} />
    </PlayerSync>,
  );
  return { onScore, onRecording };
}

const dropdown = () => screen.getByRole("combobox", { name: "Movement" });

describe("WorkMovementNav", () => {
  it("lists every movement of the work", () => {
    renderNav();
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "—",
      "I. Intermezzo in a-Moll",
      "II. Intermezzo in A-Dur",
      "III. Ballade in g-Moll",
    ]);
  });

  it("sends both panes to the chosen movement", () => {
    const { onScore, onRecording } = renderNav();
    fireEvent.change(dropdown(), { target: { value: "m2" } });
    expect(onScore).toHaveBeenCalledWith("m2");
    expect(onRecording).toHaveBeenCalledWith("m2");
    expect(dropdown()).toHaveValue("m2");
  });

  it("steps to the previous and next movement", () => {
    const { onScore } = renderNav("m2");
    fireEvent.click(screen.getByRole("button", { name: "Next movement" }));
    expect(onScore).toHaveBeenLastCalledWith("m3");
    fireEvent.click(screen.getByRole("button", { name: "Previous movement" }));
    expect(onScore).toHaveBeenLastCalledWith("m2");
  });

  it("follows a pane reaching a movement on its own", () => {
    const { onRecording } = renderNav("m1");
    onRecording.mockClear();
    fireEvent.click(screen.getByText("score reaches III"));
    expect(dropdown()).toHaveValue("m3");
    // A report is not a request: the other pane stays where it is.
    expect(onRecording).not.toHaveBeenCalled();
  });

  it("shows nothing for a work without movements", () => {
    const { container } = render(
      <PlayerSync movements={[]}>
        <WorkMovementNav />
      </PlayerSync>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
