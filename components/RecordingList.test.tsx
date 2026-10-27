import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlayerSync from "./PlayerSync";
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
    startSeconds: null,
    endSeconds: null,
    movementId: null,
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

function renderList(
  {
    workMovements = movements,
    recordings = [cho, zimerman],
    selectedId = "r1",
    current,
  } = {} as {
    workMovements?: typeof movements;
    recordings?: Recording[];
    selectedId?: string;
    current?: string;
  },
) {
  const onPlay = vi.fn();
  const onDelete = vi.fn();
  const onEdit = vi.fn();
  render(
    <SpotifyPlaybackProvider>
      <PlayerSync movements={workMovements} initialMovement={current}>
        <RecordingList
          recordings={recordings}
          selectedId={selectedId}
          workTitle="Ballade No. 1"
          onPlay={onPlay}
          onDelete={onDelete}
          onEdit={onEdit}
          performers={{
            r1: [{ name: "Seong-Jin Cho", slug: "seong-jin-cho" }],
          }}
          likes={{ r1: ["m2"] }}
        />
      </PlayerSync>
    </SpotifyPlaybackProvider>,
  );
  return { onPlay, onDelete, onEdit };
}

const rows = () =>
  within(screen.getByRole("list", { name: "Recordings by movement" }))
    .getAllByRole("listitem")
    .map((li) => ({
      label: li.querySelector("[data-label]")?.textContent,
      avatars: within(li)
        .queryAllByRole("button", { name: /^Play / })
        .map((b) => b.textContent),
    }));

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

describe("RecordingList", () => {
  it("lists the whole work, then each movement with the recordings that have it", () => {
    renderList();
    expect(rows()).toEqual([
      { label: "Whole work", avatars: ["SC", "KZ"] },
      { label: "I. Allegro maestoso", avatars: ["SC", "KZ"] },
      { label: "II. Romance. Larghetto", avatars: ["SC"] },
      { label: "III. Rondo. Vivace", avatars: [] },
    ]);
  });

  it("shows a recording of one movement only on its row", () => {
    // A video of just that movement: no start, no marks.
    const horowitz = recording({
      id: "r3",
      performer: "Vladimir Horowitz",
      mediaType: "youtube",
      mediaUrl: "https://youtu.be/KCzCqXwGT_g",
      movementId: "m2",
    });
    renderList({ recordings: [cho, zimerman, horowitz] });
    expect(rows()).toEqual([
      { label: "Whole work", avatars: ["SC", "KZ"] },
      { label: "I. Allegro maestoso", avatars: ["SC", "KZ"] },
      { label: "II. Romance. Larghetto", avatars: ["SC", "VH"] },
      { label: "III. Rondo. Vivace", avatars: [] },
    ]);
  });

  it("shows each recording's source as a dot on its avatar", () => {
    renderList();
    const [cho, zimerman] = screen.getAllByRole("button", {
      name: /^Play Whole work/,
    });
    expect(cho).toHaveAccessibleName(
      "Play Whole work by Seong-Jin Cho · 2016 · Spotify",
    );
    expect(within(cho).getByRole("img", { name: "Spotify" })).toHaveClass(
      "bg-spotify",
    );
    expect(within(zimerman).getByRole("img", { name: "YouTube" })).toHaveClass(
      "bg-youtube",
    );
  });

  it("plays a recording's movement, or the whole recording, from its avatar", () => {
    const { onPlay } = renderList();
    fireEvent.click(
      screen.getByRole("button", {
        name: /^Play I\. Allegro maestoso by Krystian Zimerman/,
      }),
    );
    expect(onPlay).toHaveBeenCalledWith("r2", "m1");
    fireEvent.click(
      screen.getByRole("button", { name: /^Play Whole work by Seong-Jin Cho/ }),
    );
    expect(onPlay).toHaveBeenCalledWith("r1", null);
  });

  it("marks the selected recording's avatars", () => {
    renderList({ selectedId: "r2" });
    const avatars = screen.getAllByRole("button", { name: /^Play / });
    expect(
      avatars
        .filter((a) => a.getAttribute("aria-current") === "true")
        .map((a) => a.textContent),
    ).toEqual(["KZ", "KZ"]);
  });

  it("marks the movement playing now", () => {
    renderList({ current: "m2" });
    const playing = screen
      .getByRole("list", { name: "Recordings by movement" })
      .querySelector('li[aria-current="true"]');
    expect(playing).toHaveTextContent("II. Romance. Larghetto");
    expect(playing?.querySelector("[data-label]")).toHaveClass("text-accent");
  });

  it("shows a single piece as one row named after the work", () => {
    renderList({ workMovements: [] });
    expect(rows()).toEqual([{ label: "Ballade No. 1", avatars: ["SC", "KZ"] }]);
  });

  it("names the selected recording, linking its performers", () => {
    renderList();
    expect(
      screen.getByText("Seong-Jin Cho · 2016", { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Seong-Jin Cho" })).toHaveAttribute(
      "href",
      "/performer/seong-jin-cho",
    );
  });

  it("likes and unlikes the selected recording's movements with stars", async () => {
    renderList();
    const second = screen.getByRole("button", {
      name: "Like II. Romance. Larghetto",
    });
    expect(second).toHaveAttribute("aria-pressed", "true");
    const first = screen.getByRole("button", {
      name: "Like I. Allegro maestoso",
    });
    expect(first).toHaveAttribute("aria-pressed", "false");
    // The whole work isn't liked as such.
    expect(
      screen.queryByRole("button", { name: "Like Whole work" }),
    ).toBeNull();

    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-pressed", "true");
    await vi.waitFor(() => {
      const put = vi
        .mocked(fetch)
        .mock.calls.find(([url]) => url === "/api/likes");
      expect(JSON.parse(put?.[1]?.body as string)).toEqual({
        recordingId: "r1",
        movementId: "m1",
        liked: true,
      });
    });
  });

  it("stars the selected recording's movements, only where it has them", () => {
    renderList({ selectedId: "r2" });
    // Zimerman has only I, and hasn't liked it; Cho's ★ on II isn't his.
    expect(
      screen.getByRole("button", { name: "Like I. Allegro maestoso" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.queryByRole("button", { name: "Like II. Romance. Larghetto" }),
    ).toBeNull();
  });

  it("likes a single piece as the work", () => {
    renderList({ workMovements: [] });
    expect(
      screen.getByRole("button", { name: "Like Ballade No. 1" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("opens a YouTube recording's video as a concert", () => {
    renderList({ selectedId: "r2" });
    expect(
      screen.getByRole("link", { name: "Open concert ↗" }),
    ).toHaveAttribute("href", "/concert/dQw4w9WgXcQ");
  });

  it("has no concert for a Spotify recording", () => {
    renderList();
    expect(screen.queryByRole("link", { name: "Open concert ↗" })).toBeNull();
  });

  it("edits and deletes the selected recording", () => {
    const { onEdit, onDelete } = renderList();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Edit the recording by Seong-Jin Cho",
      }),
    );
    expect(onEdit).toHaveBeenCalledWith("r1");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete the recording by Seong-Jin Cho",
      }),
    );
    expect(onDelete).toHaveBeenCalledWith("r1");
  });
});
