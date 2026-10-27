import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnePlayerAtATime from "./OnePlayerAtATime";
import SpotifyPlaybackProvider, { useSpotifyPlayback } from "./SpotifyPlayback";
import YouTubeDockProvider, { useYouTube } from "./YouTubeDock";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2 };

let players: FakePlayer[];
class FakePlayer {
  events: {
    onReady?: () => void;
    onStateChange?: (event: { data: number }) => void;
  };
  loadVideoById = vi.fn();
  cueVideoById = vi.fn();
  playVideo = vi.fn();
  pauseVideo = vi.fn();
  constructor(_: HTMLElement, options: { events: FakePlayer["events"] }) {
    this.events = options.events;
    players.push(this);
  }
  getCurrentTime = () => 0;
  getPlayerState = () => STATE.UNSTARTED;
  destroy() {}
  emit(state: number) {
    act(() => this.events.onStateChange?.({ data: state }));
  }
}

// What Spotify answers it is doing.
let spotifyPlaying = false;

function Controls() {
  const { load } = useYouTube();
  const { refresh } = useSpotifyPlayback();
  return (
    <>
      <button
        onClick={() =>
          load(
            { recordingId: "r1", videoId: "v1", title: "Video", href: "/" },
            { autoplay: true },
          )
        }
      >
        play video
      </button>
      <button onClick={() => refresh()}>poll spotify</button>
    </>
  );
}

const posts = (path: string) =>
  vi
    .mocked(fetch)
    .mock.calls.filter(
      ([url, init]) => url === path && init?.method === "POST",
    );

async function renderBoth() {
  render(
    <SpotifyPlaybackProvider>
      <YouTubeDockProvider>
        <Controls />
        <OnePlayerAtATime />
      </YouTubeDockProvider>
    </SpotifyPlaybackProvider>,
  );
  fireEvent.click(screen.getByText("play video"));
  await act(async () => {});
  act(() => players[0].events.onReady?.());
  return players[0];
}

async function pollSpotify(playing: boolean) {
  spotifyPlaying = playing;
  await act(async () => {
    fireEvent.click(screen.getByText("poll spotify"));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  players = [];
  spotifyPlaying = false;
  window.YT = {
    Player: FakePlayer,
    PlayerState: STATE,
  } as unknown as typeof window.YT;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/spotify/playback") {
        return Response.json({
          connected: true,
          state: { isPlaying: spotifyPlaying, track: null },
        });
      }
      if (url === "/api/spotify/status") {
        return Response.json({ configured: true, connected: true });
      }
      return new Response(null, { status: 204 });
    }),
  );
});

describe("OnePlayerAtATime", () => {
  it("pauses Spotify when the video starts", async () => {
    const player = await renderBoth();
    await pollSpotify(true);
    expect(posts("/api/spotify/pause")).toHaveLength(0);

    player.emit(STATE.PLAYING);
    expect(posts("/api/spotify/pause")).toHaveLength(1);
  });

  it("pauses the video when Spotify starts", async () => {
    const player = await renderBoth();
    player.emit(STATE.PLAYING);
    await pollSpotify(true);
    expect(player.pauseVideo).toHaveBeenCalled();
  });

  it("never resumes one when the other pauses", async () => {
    const player = await renderBoth();
    await pollSpotify(true);
    player.emit(STATE.PLAYING);
    player.emit(STATE.PAUSED);
    await pollSpotify(false);
    expect(posts("/api/spotify/play")).toHaveLength(0);
    expect(player.playVideo).not.toHaveBeenCalled();
  });
});
