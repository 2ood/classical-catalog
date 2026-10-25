import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayerSync, { useMovementRequests, usePlayerSync } from "./PlayerSync";

function Pane({
  source,
  onRequest,
}: {
  source: "score" | "recording";
  onRequest: (id: string) => void;
}) {
  const { select } = usePlayerSync();
  useMovementRequests(source, onRequest);
  return (
    <button type="button" onClick={() => select("m2", source)}>
      {source} chooses II
    </button>
  );
}

describe("PlayerSync", () => {
  it("tells the other pane, not the chooser, which movement was chosen", () => {
    const onScore = vi.fn();
    const onRecording = vi.fn();
    render(
      <PlayerSync movements={[]}>
        <Pane source="score" onRequest={onScore} />
        <Pane source="recording" onRequest={onRecording} />
      </PlayerSync>,
    );

    fireEvent.click(screen.getByText("score chooses II"));
    expect(onRecording).toHaveBeenCalledWith("m2");
    expect(onScore).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("recording chooses II"));
    expect(onScore).toHaveBeenCalledWith("m2");
  });

  it("repeats a request for the same movement", () => {
    const onRecording = vi.fn();
    render(
      <PlayerSync movements={[]}>
        <Pane source="score" onRequest={vi.fn()} />
        <Pane source="recording" onRequest={onRecording} />
      </PlayerSync>,
    );
    fireEvent.click(screen.getByText("score chooses II"));
    fireEvent.click(screen.getByText("score chooses II"));
    expect(onRecording).toHaveBeenCalledTimes(2);
  });
});
