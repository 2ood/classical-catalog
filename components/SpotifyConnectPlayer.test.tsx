import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlayerSync, { usePlayerSync } from "./PlayerSync";
import SpotifyConnectPlayer from "./SpotifyConnectPlayer";
import SpotifyPlaybackProvider, { useSpotifyPlayback } from "./SpotifyPlayback";
import type { Recording } from "@/lib/schema";

vi.mock("next/navigation", () => ({
  usePathname: () => "/composer/beethoven/symphony-no-5-op-67",
}));

const TRACK_I = "https://open.spotify.com/track/0eBr9W1GE5nou99gRdy02J";
const TRACK_II = "https://open.spotify.com/track/3Hfv8h49DVUT4uHd2Tu7Fd";

const recording = {
  id: "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f",
  performer: "Karajan / BPO",
  mediaType: "spotify",
  mediaUrl: "https://open.spotify.com/album/6Pqlj0jyStFJgTidjdLGHC",
  movementStarts: { m1: TRACK_I, m2: TRACK_II },
} as unknown as Recording;

const movements = [
  { id: "m1", name: "Allegro con brio" },
  { id: "m2", name: "Andante con moto" },
];

/** Stand-in for the score pane: shows what it was asked to show. */
function ScoreSide() {
  const { request, select } = usePlayerSync();
  return (
    <>
      <output aria-label="score request">
        {request?.source === "recording" ? request.movementId : ""}
      </output>
      <button type="button" onClick={() => select("m2", "score")}>
        score chooses II
      </button>
    </>
  );
}

/** Asks for playback again, so a test can step through Spotify's answers. */
function Refresh() {
  const { refresh } = useSpotifyPlayback();
  return (
    <button type="button" onClick={() => refresh()}>
      poll
    </button>
  );
}

function renderPlayer(
  initialMovement?: string,
  queued?: { autoplay: boolean; onEnded: () => void },
) {
  render(
    <SpotifyPlaybackProvider>
      <PlayerSync movements={movements} initialMovement={initialMovement}>
        <ScoreSide />
        <Refresh />
        <SpotifyConnectPlayer recording={recording} {...queued} />
      </PlayerSync>
    </SpotifyPlaybackProvider>,
  );
}

function serve(routes: Record<string, unknown>) {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = String(input);
    const body = routes[url] ?? routes[url.split("?")[0]];
    return body === undefined
      ? new Response(null, { status: 204 })
      : Response.json(body);
  });
}

const playing = (
  trackUrl: string,
  name: string,
  repeat: "off" | "track" = "off",
) => {
  const id = trackUrl.split("/").pop();
  return {
    connected: true,
    state: {
      isPlaying: true,
      progressMs: 1000,
      device: "Desktop",
      repeat,
      track: {
        id,
        uri: `spotify:track:${id}`,
        name,
        artists: "Karajan, Berliner Philharmoniker",
        album: {
          id: "6Pqlj0jyStFJgTidjdLGHC",
          name: "Beethoven: Symphony No. 5",
          cover: "https://i.scdn.co/image/mid",
        },
      },
    },
  };
};

const posts = (path: string) =>
  vi
    .mocked(fetch)
    .mock.calls.filter(([url, init]) => url === path && init?.method === "POST")
    .map(([, init]) => JSON.parse((init?.body as string) ?? "null"));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SpotifyConnectPlayer", () => {
  it("offers to connect, keeping the embed, when not connected", async () => {
    serve({
      "/api/spotify/status": { configured: true, connected: false },
      "/api/spotify/playback": { connected: false },
    });
    renderPlayer();
    const connect = await screen.findByRole("link", {
      name: "Connect Spotify",
    });
    expect(connect).toHaveAttribute(
      "href",
      "/api/spotify/login?returnTo=%2Fcomposer%2Fbeethoven%2Fsymphony-no-5-op-67",
    );
    expect(screen.getByTitle("Karajan / BPO")).toHaveAttribute(
      "src",
      expect.stringContaining("open.spotify.com/embed/album/"),
    );
  });

  it("explains the setup when Spotify is not configured", async () => {
    serve({
      "/api/spotify/status": { configured: false, connected: false },
      "/api/spotify/playback": { connected: false },
    });
    renderPlayer();
    expect(await screen.findByText(/SPOTIFY_CLIENT_ID/)).toBeInTheDocument();
  });

  it("turns the score when the playing track belongs to a movement", async () => {
    serve({
      "/api/spotify/status": { configured: true, connected: true },
      "/api/spotify/playback": playing(TRACK_II, "II. Andante con moto"),
    });
    renderPlayer();
    await waitFor(() =>
      expect(screen.getByLabelText("score request")).toHaveTextContent("m2"),
    );
  });

  it("draws nothing once connected: the mini player shows what plays", async () => {
    serve({
      "/api/spotify/status": { configured: true, connected: true },
      "/api/spotify/playback": playing(TRACK_I, "I. Allegro con brio"),
    });
    renderPlayer();
    await waitFor(() =>
      expect(screen.getByLabelText("score request")).toHaveTextContent("m1"),
    );
    expect(screen.queryByRole("link", { name: "Connect Spotify" })).toBeNull();
    expect(screen.queryByTitle("Karajan / BPO")).toBeNull();
    expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
  });

  it("plays the movement chosen in the score", async () => {
    serve({
      "/api/spotify/status": { configured: true, connected: true },
      "/api/spotify/playback": { connected: true, state: null },
    });
    renderPlayer();
    // Connected once the first playback answer lands.
    await waitFor(() =>
      expect(
        screen.queryByRole("link", { name: "Connect Spotify" }),
      ).toBeNull(),
    );
    fireEvent.click(screen.getByText("score chooses II"));
    await waitFor(() =>
      expect(posts("/api/spotify/play")).toEqual([
        { recordingId: recording.id, movementId: "m2" },
      ]),
    );
  });

  describe("playing through a performer", () => {
    it("starts the recording on arrival, once", async () => {
      serve({
        "/api/spotify/status": { configured: true, connected: true },
        "/api/spotify/playback": { connected: true, state: null },
      });
      renderPlayer(undefined, { autoplay: true, onEnded: vi.fn() });
      await waitFor(() =>
        expect(posts("/api/spotify/play")).toEqual([
          { recordingId: recording.id },
        ]),
      );
      fireEvent.click(screen.getByText("poll"));
      await new Promise((r) => setTimeout(r, 50));
      expect(posts("/api/spotify/play")).toHaveLength(1);
    });

    it("moves on once Spotify leaves the recording's tracks", async () => {
      const answers = [
        playing(
          "https://open.spotify.com/track/7pLC3L3hscXCEA5iCKY4EN",
          "Something earlier",
        ),
        playing(TRACK_I, "I. Allegro con brio"),
        playing(TRACK_II, "II. Andante con moto"),
        playing(
          "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
          "The album goes on",
        ),
      ];
      let polled = 0;
      vi.mocked(fetch).mockImplementation(async (input) => {
        const url = String(input);
        if (url === "/api/spotify/status") {
          return Response.json({ configured: true, connected: true });
        }
        if (url === "/api/spotify/playback") {
          return Response.json(answers[Math.min(polled++, answers.length - 1)]);
        }
        return new Response(null, { status: 204 });
      });
      const onEnded = vi.fn();
      renderPlayer(undefined, { autoplay: true, onEnded });
      // Something else playing before ours starts doesn't count.
      await waitFor(() => expect(polled).toBeGreaterThan(0));
      expect(onEnded).not.toHaveBeenCalled();
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByText("poll"));
        await waitFor(() => expect(polled).toBeGreaterThan(i + 1));
      }
      await waitFor(() => expect(onEnded).toHaveBeenCalledTimes(1));
    });
  });
});
