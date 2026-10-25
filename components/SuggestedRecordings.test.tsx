import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SpotifyPlaybackProvider from "./SpotifyPlayback";
import SuggestedRecordings from "./SuggestedRecordings";

vi.mock("next/navigation", () => ({
  usePathname: () => "/composer/brahms/klavierstucke-op-118",
}));

const WORK_ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";
const QUERY = "Brahms Klavierstücke Op. 118";

const volodos = {
  albumId: "5Z9iiGl2FcIfa3BMiv6OIw",
  name: "Brahms: Piano Pieces",
  performer: "Arcadi Volodos",
  year: 2017,
  url: "https://open.spotify.com/album/5Z9iiGl2FcIfa3BMiv6OIw",
};

/** `get` answers the suggestions search; Spotify's own state is stubbed. */
function serve(get: Response, { connected = false } = {}) {
  vi.mocked(fetch).mockImplementation(async (url, init) => {
    if (init?.method === "POST") return new Response(null, { status: 204 });
    if (url === "/api/spotify/status") {
      return Response.json({ configured: true, connected });
    }
    if (url === "/api/spotify/playback") {
      return Response.json(
        connected ? { connected, state: null } : { connected },
      );
    }
    return get;
  });
}

const searched = () =>
  vi
    .mocked(fetch)
    .mock.calls.some(
      ([url]) => url === `/api/spotify/suggestions?workId=${WORK_ID}`,
    );

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SuggestedRecordings", () => {
  it("lists Spotify albums found for the work", async () => {
    serve(Response.json({ suggestions: [volodos] }));
    render(
      <SpotifyPlaybackProvider>
        <SuggestedRecordings workId={WORK_ID} query={QUERY} onAdd={vi.fn()} />
      </SpotifyPlaybackProvider>,
    );

    expect(await screen.findByText("Brahms: Piano Pieces")).toBeInTheDocument();
    expect(screen.getByText("Arcadi Volodos · 2017")).toBeInTheDocument();
    expect(searched()).toBe(true);
  });

  it("hands a suggestion to the add form", async () => {
    serve(Response.json({ suggestions: [volodos] }));
    const onAdd = vi.fn();
    render(
      <SpotifyPlaybackProvider>
        <SuggestedRecordings workId={WORK_ID} query={QUERY} onAdd={onAdd} />
      </SpotifyPlaybackProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Add Brahms: Piano Pieces" }),
    );
    expect(onAdd).toHaveBeenCalledWith(volodos.url);
    // Nothing is saved until the form is.
    expect(
      vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === "POST"),
    ).toBe(false);
  });

  it("offers to connect Spotify when it isn't", async () => {
    serve(
      Response.json(
        { error: "Connect Spotify first", code: "not-connected" },
        { status: 409 },
      ),
    );
    render(
      <SpotifyPlaybackProvider>
        <SuggestedRecordings workId={WORK_ID} query={QUERY} onAdd={vi.fn()} />
      </SpotifyPlaybackProvider>,
    );
    expect(
      await screen.findByRole("link", { name: "Connect Spotify" }),
    ).toHaveAttribute(
      "href",
      "/api/spotify/login?returnTo=%2Fcomposer%2Fbrahms%2Fklavierstucke-op-118",
    );
  });

  it("always links a YouTube search", () => {
    serve(Response.json({ suggestions: [] }));
    render(
      <SpotifyPlaybackProvider>
        <SuggestedRecordings workId={WORK_ID} query={QUERY} onAdd={vi.fn()} />
      </SpotifyPlaybackProvider>,
    );
    expect(
      screen.getByRole("link", { name: "Find on YouTube ↗" }),
    ).toHaveAttribute(
      "href",
      "https://www.youtube.com/results?search_query=Brahms%20Klavierst%C3%BCcke%20Op.%20118",
    );
  });

  it("says when Spotify finds nothing", async () => {
    serve(Response.json({ suggestions: [] }));
    render(
      <SpotifyPlaybackProvider>
        <SuggestedRecordings workId={WORK_ID} query={QUERY} onAdd={vi.fn()} />
      </SpotifyPlaybackProvider>,
    );
    expect(
      await screen.findByText("Spotify found no albums for this work."),
    ).toBeInTheDocument();
  });

  it("plays a suggestion in the owner's Spotify when connected", async () => {
    serve(Response.json({ suggestions: [volodos] }), { connected: true });
    render(
      <SpotifyPlaybackProvider>
        <SuggestedRecordings workId={WORK_ID} query={QUERY} onAdd={vi.fn()} />
      </SpotifyPlaybackProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Listen to Brahms: Piano Pieces",
      }),
    );
    await vi.waitFor(() => {
      const play = vi
        .mocked(fetch)
        .mock.calls.find(([url]) => url === "/api/spotify/play");
      expect(JSON.parse(play?.[1]?.body as string)).toEqual({
        workId: WORK_ID,
        album: volodos.url,
      });
    });
  });

  it("links to Spotify to listen when not connected", async () => {
    serve(Response.json({ suggestions: [volodos] }));
    render(
      <SpotifyPlaybackProvider>
        <SuggestedRecordings workId={WORK_ID} query={QUERY} onAdd={vi.fn()} />
      </SpotifyPlaybackProvider>,
    );
    expect(
      await screen.findByRole("link", { name: "Listen ↗" }),
    ).toHaveAttribute("href", volodos.url);
  });
});
