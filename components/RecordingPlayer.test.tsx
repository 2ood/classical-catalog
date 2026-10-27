import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlayerSync, { usePlayerSync } from "./PlayerSync";
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
  events: {
    onReady?: () => void;
    onStateChange?: (event: { data: number }) => void;
  };
  loadVideoById = vi.fn();
  cueVideoById = vi.fn();
  seekTo = vi.fn();
  playVideo = vi.fn();
  constructor(_: HTMLElement, options: { events: FakePlayer["events"] }) {
    this.events = options.events;
    players.push(this);
  }
  time = 0;
  state = -1;
  getCurrentTime = () => this.time;
  getPlayerState = () => this.state;
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
  mediaUrl: "https://youtu.be/dQw4w9WgXcQ",
  startSeconds: 754,
  endSeconds: null,
  movementStarts: {},
} as unknown as Recording;

/** Chooses the movement, as its avatar or the score does. */
function ChooseMovement() {
  const { select } = usePlayerSync();
  return <button onClick={() => select("m1", "link")}>choose m1</button>;
}

function renderPlayer(
  recording: Recording,
  initialMovement?: string,
  playRequest?: number,
  end?: number | null,
  onEnded?: () => void,
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
            end={end}
            onEnded={onEnded}
          />
          <ChooseMovement />
        </PlayerSync>
      </YouTubeDockProvider>
    </SpotifyPlaybackProvider>,
  );
}

/** The video plays on to `seconds`, seen at the player's next tick. */
async function playTo(player: FakePlayer, seconds: number) {
  player.state = 1;
  player.time = seconds;
  await new Promise((resolve) => setTimeout(resolve, 300));
}

beforeEach(() => {
  localStorage.clear();
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

describe("RecordingPlayer with a span of a YouTube video", () => {
  it("cues the video where the piece starts", async () => {
    renderPlayer(concert);
    expect((await ready()).cueVideoById).toHaveBeenCalledWith({
      videoId: "dQw4w9WgXcQ",
      startSeconds: 754,
    });
  });

  it("stops the video at the span's end", async () => {
    renderPlayer(concert, undefined, undefined, 1290);
    expect((await ready()).cueVideoById).toHaveBeenCalledWith({
      videoId: "dQw4w9WgXcQ",
      startSeconds: 754,
      endSeconds: 1290,
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

describe("RecordingPlayer with a video of one movement", () => {
  it("plays it when the movement is chosen, without marks", async () => {
    renderPlayer({
      ...concert,
      startSeconds: null,
      movementId: "m1",
      movementStarts: {},
    } as Recording);
    const player = await ready();
    fireEvent.click(screen.getByText("choose m1"));
    expect(player.seekTo).toHaveBeenCalledWith(0, true);
    expect(player.playVideo).toHaveBeenCalled();
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

describe("RecordingPlayer looping", () => {
  it("goes back to the movement's start at its end", async () => {
    localStorage.setItem("play-mode", "loop");
    renderPlayer(
      { ...concert, movementStarts: { m1: 800 } },
      undefined,
      undefined,
      1290,
    );
    const player = await ready();
    await playTo(player, 1289.8);
    expect(player.seekTo).not.toHaveBeenCalled();
    await playTo(player, 1290.3);
    expect(player.seekTo).toHaveBeenCalledWith(800, true);
  });

  it("plays along to the next recording at the end", async () => {
    const onEnded = vi.fn();
    renderPlayer(concert, undefined, undefined, 1290, onEnded);
    const player = await ready();
    act(() => player.events.onStateChange?.({ data: 0 }));
    expect(onEnded).toHaveBeenCalled();
  });

  it("stays at the end, off", async () => {
    localStorage.setItem("play-mode", "off");
    const onEnded = vi.fn();
    renderPlayer(concert, undefined, undefined, 1290, onEnded);
    const player = await ready();
    act(() => player.events.onStateChange?.({ data: 0 }));
    expect(onEnded).not.toHaveBeenCalled();
    expect(player.loadVideoById).not.toHaveBeenCalled();
  });

  it("plays along past a movement's end", async () => {
    renderPlayer(
      { ...concert, movementStarts: { m1: 800 } },
      undefined,
      undefined,
      1290,
    );
    const player = await ready();
    await playTo(player, 1289.8);
    await playTo(player, 1290.3);
    expect(player.seekTo).not.toHaveBeenCalled();
  });
});
