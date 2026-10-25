import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlayerSync from "./PlayerSync";
import RecordingsPane from "./RecordingsPane";
import SpotifyPlaybackProvider from "./SpotifyPlayback";
import type { Recording } from "@/lib/schema";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/composer/chopin/ballade-no-1-op-23",
}));

const recording = (id: string, performer: string) =>
  ({
    id,
    performer,
    year: 2016,
    mediaType: "spotify",
    mediaUrl: "https://open.spotify.com/track/7pLC3L3hscXCEA5iCKY4EN",
    movementStarts: {},
  }) as unknown as Recording;

const cho = recording("r1", "Seong-Jin Cho");
const zimerman = recording("r2", "Krystian Zimerman");

function renderPane() {
  render(
    <SpotifyPlaybackProvider>
      <PlayerSync movements={[]}>
        <RecordingsPane
          workId="w1"
          recordings={[cho, zimerman]}
          workTitle="Ballade No. 1"
          query="Chopin Ballade No. 1 Op. 23"
        />
      </PlayerSync>
    </SpotifyPlaybackProvider>,
  );
}

const editButton = (performer: string) =>
  screen.getByRole("button", { name: `Edit the recording by ${performer}` });
const forms = () => screen.queryAllByRole("button", { name: "Save" });

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ connected: false })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("RecordingsPane editing", () => {
  it("edits the selected recording in one form", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    renderPane();
    fireEvent.click(editButton("Seong-Jin Cho"));
    expect(forms()).toHaveLength(1);
    expect(screen.getByPlaceholderText("Performer")).toHaveValue(
      "Seong-Jin Cho",
    );
    // No duplicate React keys between the form and the player.
    expect(
      errors.mock.calls.some(([m]) => String(m).includes("same key")),
    ).toBe(false);
    errors.mockRestore();
  });

  it("closes the editor when another recording is chosen", () => {
    renderPane();
    fireEvent.click(editButton("Seong-Jin Cho"));
    fireEvent.click(screen.getByRole("button", { name: /^Krystian Zimerman/ }));
    expect(forms()).toHaveLength(0);
  });

  it("closes the editor with Cancel or Escape", () => {
    renderPane();
    fireEvent.click(editButton("Seong-Jin Cho"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(forms()).toHaveLength(0);

    fireEvent.click(editButton("Seong-Jin Cho"));
    fireEvent.keyDown(screen.getByPlaceholderText("Performer"), {
      key: "Escape",
    });
    expect(forms()).toHaveLength(0);
  });

  it("closes the add form with Cancel too", () => {
    renderPane();
    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    expect(screen.getByPlaceholderText("URL")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByPlaceholderText("URL")).toBeNull();
  });
});
