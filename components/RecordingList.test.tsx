import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlayerSync, { useMovementRequests } from "./PlayerSync";
import RecordingList from "./RecordingList";
import SpotifyPlaybackProvider from "./SpotifyPlayback";
import type { Recording } from "@/lib/schema";

const T1 = "https://open.spotify.com/track/0eBr9W1GE5nou99gRdy02J";
const T2 = "https://open.spotify.com/track/3Hfv8h49DVUT4uHd2Tu7Fd";

const recording = (over: Partial<Recording>) =>
  ({
    id: "r1",
    performer: "Seong-Jin Cho",
    year: 2016,
    mediaType: "spotify",
    mediaUrl: "https://open.spotify.com/album/0jvv6FS3zxUe56530Gjq4d",
    movementStarts: {},
    ...over,
  }) as Recording;

const cho = recording({ movementStarts: { m1: T1, m2: T2 } });
const zimerman = recording({
  id: "r2",
  performer: "Krystian Zimerman",
  year: 1988,
  mediaType: "youtube",
  mediaUrl: "https://youtu.be/dQw4w9WgXcQ",
  movementStarts: { m1: 0 },
});

const movements = [
  { id: "m1", name: "Allegro maestoso" },
  { id: "m2", name: "Romance. Larghetto" },
  { id: "m3", name: "Rondo. Vivace" },
];

/** Stand-in for the player: records what it is asked to play. */
function Player({ onRequest }: { onRequest: (id: string) => void }) {
  useMovementRequests("recording", onRequest);
  return null;
}

function renderList(
  {
    workMovements = movements,
    recordings = [cho, zimerman],
    selectedId = "r1",
    onSelect = vi.fn(),
    onDelete = vi.fn(),
    onEdit = vi.fn(),
    current,
  } = {} as {
    workMovements?: typeof movements;
    recordings?: Recording[];
    selectedId?: string;
    onSelect?: (id: string) => void;
    onDelete?: (id: string) => void;
    onEdit?: (id: string) => void;
    current?: string;
  },
) {
  const onRequest = vi.fn();
  render(
    <SpotifyPlaybackProvider>
      <PlayerSync movements={workMovements} initialMovement={current}>
        <RecordingList
          recordings={recordings}
          selectedId={selectedId}
          workTitle="Ballade No. 1"
          onSelect={onSelect}
          onDelete={onDelete}
          onEdit={onEdit}
          performers={{
            r1: [{ name: "Seong-Jin Cho", slug: "seong-jin-cho" }],
          }}
        />
        <Player onRequest={onRequest} />
      </PlayerSync>
    </SpotifyPlaybackProvider>,
  );
  return { onRequest, onSelect, onDelete, onEdit };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ connected: false })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("RecordingList", () => {
  it("lists recordings by performer, year and source", () => {
    renderList();
    const rows = screen.getAllByRole("button", { name: /·/ });
    expect(rows.map((r) => r.textContent)).toEqual([
      "Seong-Jin Cho · 2016Spotify",
      "Krystian Zimerman · 1988YouTube",
    ]);
    expect(rows[0]).toHaveAttribute("aria-expanded", "true");
    expect(rows[1]).toHaveAttribute("aria-expanded", "false");
  });

  it("selects another recording", () => {
    const { onSelect } = renderList();
    fireEvent.click(screen.getByRole("button", { name: /^Krystian Zimerman/ }));
    expect(onSelect).toHaveBeenCalledWith("r2");
  });

  it("shows the selected recording's movements, each with its own play", () => {
    const { onRequest } = renderList();
    const tracks = screen.getByRole("list", { name: "Tracks" });
    expect(
      within(tracks)
        .getAllByRole("listitem")
        .map((li) => li.textContent?.replace(/[▶·]/g, "").trim()),
    ).toEqual([
      "I. Allegro maestoso",
      "II. Romance. Larghetto",
      "III. Rondo. Vivace",
    ]);
    fireEvent.click(
      screen.getByRole("button", { name: "Play II. Romance. Larghetto" }),
    );
    expect(onRequest).toHaveBeenCalledWith("m2");
    // No track or time for III yet: nothing to play.
    expect(
      screen.queryByRole("button", { name: "Play III. Rondo. Vivace" }),
    ).toBeNull();
  });

  it("marks the movement playing now", () => {
    renderList({ current: "m2" });
    const playing = screen
      .getByRole("list", { name: "Tracks" })
      .querySelector('[aria-current="true"]');
    expect(playing).toHaveTextContent("II. Romance. Larghetto");
    // Its title and ▶ take the accent color; no other marker.
    expect(playing).toHaveClass("text-accent");
    expect(screen.queryByText("♪")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Play I. Allegro maestoso" })
        .parentElement,
    ).not.toHaveClass("text-accent");
  });

  it("shows a single piece as one track named after the work", () => {
    renderList({ workMovements: [] });
    expect(
      within(screen.getByRole("list", { name: "Tracks" })).getByRole(
        "listitem",
      ),
    ).toHaveTextContent("Ballade No. 1");
  });

  it("links the selected recording's performers to their pages", () => {
    renderList();
    expect(screen.getByRole("link", { name: "Seong-Jin Cho" })).toHaveAttribute(
      "href",
      "/performer/seong-jin-cho",
    );
  });

  it("edits a recording", () => {
    const { onEdit } = renderList();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Edit the recording by Seong-Jin Cho",
      }),
    );
    expect(onEdit).toHaveBeenCalledWith("r1");
  });

  it("deletes a recording", () => {
    const { onDelete } = renderList();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete the recording by Seong-Jin Cho",
      }),
    );
    expect(onDelete).toHaveBeenCalledWith("r1");
  });

  it("plays a single piece in the owner's Spotify when connected", async () => {
    vi.mocked(fetch).mockImplementation(async (url) =>
      url === "/api/spotify/playback"
        ? Response.json({ connected: true, state: null })
        : url === "/api/spotify/status"
          ? Response.json({ configured: true, connected: true })
          : new Response(null, { status: 204 }),
    );
    renderList({ workMovements: [] });
    fireEvent.click(
      await screen.findByRole("button", { name: "Play Ballade No. 1" }),
    );
    await vi.waitFor(() => {
      const play = vi
        .mocked(fetch)
        .mock.calls.find(([url]) => url === "/api/spotify/play");
      expect(JSON.parse(play?.[1]?.body as string)).toEqual({
        recordingId: "r1",
      });
    });
  });
});
