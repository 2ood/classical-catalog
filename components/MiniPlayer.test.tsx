import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MiniPlayer from "./MiniPlayer";
import SpotifyPlaybackProvider from "./SpotifyPlayback";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const TRACK = "3Hfv8h49DVUT4uHd2Tu7Fd";
const PATH = "/composer/beethoven/symphony-no-5-op-67/ii-andante-con-moto";

const playing = (isPlaying = true, repeat = "off") => ({
  connected: true,
  state: {
    isPlaying,
    progressMs: 0,
    device: "Desktop",
    repeat,
    track: {
      id: TRACK,
      uri: `spotify:track:${TRACK}`,
      name: "Symphony No. 5: II. Andante con moto",
      artists: "Karajan",
      album: {
        id: "6Pqlj0jyStFJgTidjdLGHC",
        name: "Beethoven: Symphony No. 5",
        cover: "https://i.scdn.co/image/small",
      },
    },
  },
});

function serve(
  playback: unknown,
  path: string | null = PATH,
  library: Response = Response.json({ liked: false }),
) {
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.startsWith("/api/spotify/library") && init?.method !== "PUT") {
      return library.clone();
    }
    if (url === "/api/spotify/status") {
      return Response.json({ configured: true, connected: true });
    }
    if (url === "/api/spotify/playback") return Response.json(playback);
    if (url.startsWith("/api/spotify/locate")) return Response.json({ path });
    return new Response(null, { status: 204 });
  });
}

function renderMini() {
  render(
    <SpotifyPlaybackProvider>
      <MiniPlayer />
    </SpotifyPlaybackProvider>,
  );
}

beforeEach(() => {
  pathname = "/";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("MiniPlayer", () => {
  it("stays hidden while nothing plays", async () => {
    serve({ connected: true, state: null });
    renderMini();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("shows the playing track and goes to its movement", async () => {
    serve(playing());
    renderMini();
    const player = await screen.findByRole("complementary", {
      name: "Now playing",
    });
    expect(player).toHaveTextContent("Symphony No. 5: II. Andante con moto");
    expect(
      await screen.findByRole("link", { name: "Go to current track" }),
    ).toHaveAttribute("href", PATH);
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([url]) =>
          String(url).startsWith(
            `/api/spotify/locate?track=${TRACK}&album=6Pqlj0jyStFJgTidjdLGHC`,
          ),
        ),
    ).toBe(true);
  });

  it("has no Go to link on the track's own page, or for an unknown track", async () => {
    pathname = PATH;
    serve(playing());
    renderMini();
    await screen.findByRole("complementary", { name: "Now playing" });
    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(([url]) => String(url).includes("locate")),
      ).toBe(true),
    );
    expect(
      screen.queryByRole("link", { name: "Go to current track" }),
    ).toBeNull();
  });

  it("resumes what is paused", async () => {
    serve(playing(false));
    renderMini();
    fireEvent.click(await screen.findByRole("button", { name: "Play" }));
    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.find(([url]) => url === "/api/spotify/play")?.[1]?.body,
      ).toBe(JSON.stringify({ resume: true })),
    );
  });

  const posts = (path: string) =>
    vi
      .mocked(fetch)
      .mock.calls.filter(
        ([url, init]) => url === path && init?.method === "POST",
      )
      .map(([, init]) => JSON.parse((init?.body as string) ?? "null"));

  it("skips to the previous and next track", async () => {
    serve(playing());
    renderMini();
    fireEvent.click(await screen.findByRole("button", { name: "Next track" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous track" }));
    await waitFor(() =>
      expect(posts("/api/spotify/control")).toEqual([
        { action: "next" },
        { action: "previous" },
      ]),
    );
  });

  it("repeats the track, and stops repeating it", async () => {
    serve(playing(true, "track"));
    renderMini();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Repeat this track",
        pressed: true,
      }),
    );
    await waitFor(() =>
      expect(posts("/api/spotify/control")).toEqual([{ action: "repeat-off" }]),
    );
  });

  it("likes the playing track on Spotify", async () => {
    serve(playing());
    renderMini();
    const like = await screen.findByRole("button", { name: "Like on Spotify" });
    await waitFor(() => expect(like).toBeEnabled());
    fireEvent.click(like);
    expect(like).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      const put = vi
        .mocked(fetch)
        .mock.calls.find(
          ([url, init]) =>
            url === "/api/spotify/library" && init?.method === "PUT",
        );
      expect(JSON.parse(put?.[1]?.body as string)).toEqual({
        track: TRACK,
        liked: true,
      });
    });
  });

  it("offers to connect again when the login can't like yet", async () => {
    serve(
      playing(),
      PATH,
      Response.json(
        { error: "Connect again", code: "needs-reconnect" },
        { status: 409 },
      ),
    );
    renderMini();
    expect(
      await screen.findByRole("link", {
        name: "Connect Spotify again to like",
      }),
    ).toHaveAttribute("href", "/api/spotify/login?returnTo=%2F");
  });

  it("minimizes to the track's name, and expands again", async () => {
    serve(playing());
    renderMini();
    await screen.findByText("Symphony No. 5: II. Andante con moto");
    fireEvent.click(
      screen.getByRole("button", { name: "Minimize the player" }),
    );
    expect(
      screen.getByText("Symphony No. 5: II. Andante con moto"),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Repeat this track" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Expand the player" }));
    expect(
      screen.getByRole("button", { name: "Repeat this track" }),
    ).toBeTruthy();
  });

  it("disconnects Spotify", async () => {
    serve(playing());
    renderMini();
    fireEvent.click(
      await screen.findByRole("button", { name: "Disconnect Spotify" }),
    );
    await waitFor(() =>
      expect(posts("/api/spotify/disconnect")).toHaveLength(1),
    );
  });
});
