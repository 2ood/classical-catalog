import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlayerSync, { usePlayerSync } from "./PlayerSync";
import SpotifyConnectPlayer from "./SpotifyConnectPlayer";
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

function renderPlayer(initialMovement?: string) {
  render(
    <PlayerSync movements={movements} initialMovement={initialMovement}>
      <ScoreSide />
      <SpotifyConnectPlayer recording={recording} />
    </PlayerSync>,
  );
}

function serve(routes: Record<string, unknown>) {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = String(input);
    const body = routes[url];
    return body === undefined
      ? new Response(null, { status: 204 })
      : Response.json(body);
  });
}

const playing = (trackUrl: string, name: string) => ({
  connected: true,
  state: {
    isPlaying: true,
    progressMs: 1000,
    device: "Desktop",
    track: { id: trackUrl.split("/").pop(), name, artists: "Karajan" },
  },
});

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

  it("shows what is playing and where", async () => {
    serve({
      "/api/spotify/status": { configured: true, connected: true },
      "/api/spotify/playback": playing(TRACK_I, "I. Allegro con brio"),
    });
    renderPlayer();
    expect(
      await screen.findByText("I. Allegro con brio — Karajan"),
    ).toBeInTheDocument();
    expect(screen.getByText(/on Desktop/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
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

  it("plays the movement chosen in the score", async () => {
    serve({
      "/api/spotify/status": { configured: true, connected: true },
      "/api/spotify/playback": { connected: true, state: null },
    });
    renderPlayer();
    await screen.findByRole("button", { name: "Play" });
    fireEvent.click(screen.getByText("score chooses II"));
    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/spotify/play",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ recordingId: recording.id, movementId: "m2" }),
        }),
      ),
    );
  });

  it("plays a movement opened from the works list once Play is pressed", async () => {
    serve({
      "/api/spotify/status": { configured: true, connected: true },
      "/api/spotify/playback": { connected: true, state: null },
    });
    renderPlayer("m2");
    const play = await screen.findByRole("button", { name: "Play" });
    // Nothing plays in the owner's Spotify app before they ask.
    expect(fetch).not.toHaveBeenCalledWith(
      "/api/spotify/play",
      expect.anything(),
    );

    fireEvent.click(play);
    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/spotify/play",
        expect.objectContaining({
          body: JSON.stringify({ recordingId: recording.id, movementId: "m2" }),
        }),
      ),
    );
  });
});
