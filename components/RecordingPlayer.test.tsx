import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlayerSync from "./PlayerSync";
import RecordingPlayer from "./RecordingPlayer";
import SpotifyPlaybackProvider from "./SpotifyPlayback";
import YouTubeDockProvider from "./YouTubeDock";
import type { Recording } from "@/lib/schema";

vi.mock("next/navigation", () => ({
  usePathname: () => "/composer/chopin/ballade-no-1-op-23",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

// A stand-in for the YouTube IFrame API.
let players: FakePlayer[];
class FakePlayer {
  events: { onReady?: () => void };
  loadVideoById = vi.fn();
  cueVideoById = vi.fn();
  seekTo = vi.fn();
  playVideo = vi.fn();
  constructor(_: HTMLElement, options: { events: FakePlayer["events"] }) {
    this.events = options.events;
    players.push(this);
  }
  getCurrentTime = () => 0;
  getPlayerState = () => -1;
  destroy() {}
}

/** The player became ready; what it was asked for reaches it. */
async function ready() {
  await vi.waitFor(() => expect(players).toHaveLength(1));
  act(() => players[0].events.onReady?.());
  return players[0];
}

// A concert video; the Ballade starts 12:34 in.
const concert = {
  id: "r1",
  performer: "Seong-Jin Cho",
  year: 2015,
  mediaType: "youtube",
  mediaUrl: "https://youtu.be/dQw4w9WgXcQ?t=754",
  movementStarts: {},
} as unknown as Recording;

function renderPlayer(
  recording: Recording,
  initialMovement?: string,
  playRequest?: number,
) {
  render(
    <SpotifyPlaybackProvider>
      <YouTubeDockProvider>
        <PlayerSync
          movements={[{ id: "m1", name: "Andante" }]}
          initialMovement={initialMovement}
        >
          <RecordingPlayer
            recording={recording}
            workTitle="Ballade No. 1"
            playRequest={playRequest}
          />
        </PlayerSync>
      </YouTubeDockProvider>
    </SpotifyPlaybackProvider>,
  );
}

beforeEach(() => {
  players = [];
  window.YT = {
    Player: FakePlayer,
    PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2 },
  } as unknown as typeof window.YT;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ connected: false })),
  );
});

describe("RecordingPlayer with a timestamped YouTube link", () => {
  it("cues the video where the piece starts", async () => {
    renderPlayer(concert);
    expect((await ready()).cueVideoById).toHaveBeenCalledWith({
      videoId: "dQw4w9WgXcQ",
      startSeconds: 754,
    });
  });

  it("goes to a movement's own start when opened there", async () => {
    renderPlayer({ ...concert, movementStarts: { m1: 800 } }, "m1");
    expect((await ready()).cueVideoById).toHaveBeenCalledWith({
      videoId: "dQw4w9WgXcQ",
      startSeconds: 800,
    });
  });
});

describe("RecordingPlayer asked to play the whole recording", () => {
  it("plays a video from where the piece starts", async () => {
    renderPlayer({ ...concert, movementStarts: { m1: 800 } }, "m1", 1);
    expect((await ready()).loadVideoById).toHaveBeenCalledWith({
      videoId: "dQw4w9WgXcQ",
      startSeconds: 754,
    });
  });

  it("plays a Spotify recording in the owner's Spotify when connected", async () => {
    vi.mocked(fetch).mockImplementation(async (url) =>
      url === "/api/spotify/playback"
        ? Response.json({ connected: true, state: null })
        : url === "/api/spotify/status"
          ? Response.json({ configured: true, connected: true })
          : new Response(null, { status: 204 }),
    );
    renderPlayer(
      {
        ...concert,
        mediaType: "spotify",
        mediaUrl: "https://open.spotify.com/album/0jvv6FS3zxUe56530Gjq4d",
      },
      undefined,
      1,
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
