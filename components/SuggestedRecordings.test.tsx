import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

function serve(get: Response, post?: Response) {
  vi.mocked(fetch).mockImplementation(async (_url, init) =>
    init?.method === "POST" ? (post ?? new Response("{}")) : get,
  );
}

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
      <SuggestedRecordings workId={WORK_ID} query={QUERY} onAdd={vi.fn()} />,
    );

    expect(await screen.findByText("Brahms: Piano Pieces")).toBeInTheDocument();
    expect(screen.getByText("Arcadi Volodos · 2017")).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      `/api/spotify/suggestions?workId=${WORK_ID}`,
    );
  });

  it("hands a suggestion to the add form", async () => {
    serve(Response.json({ suggestions: [volodos] }));
    const onAdd = vi.fn();
    render(
      <SuggestedRecordings workId={WORK_ID} query={QUERY} onAdd={onAdd} />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Add Brahms: Piano Pieces" }),
    );
    expect(onAdd).toHaveBeenCalledWith(volodos.url);
    // Nothing is saved until the form is.
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("offers to connect Spotify when it isn't", async () => {
    serve(
      Response.json(
        { error: "Connect Spotify first", code: "not-connected" },
        { status: 409 },
      ),
    );
    render(
      <SuggestedRecordings workId={WORK_ID} query={QUERY} onAdd={vi.fn()} />,
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
      <SuggestedRecordings workId={WORK_ID} query={QUERY} onAdd={vi.fn()} />,
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
      <SuggestedRecordings workId={WORK_ID} query={QUERY} onAdd={vi.fn()} />,
    );
    expect(
      await screen.findByText("Spotify found no albums for this work."),
    ).toBeInTheDocument();
  });
});
