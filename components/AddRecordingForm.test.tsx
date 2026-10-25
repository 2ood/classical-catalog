import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AddRecordingForm from "./AddRecordingForm";
import PlayerSync from "./PlayerSync";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => "/composer/brahms/klavierstucke-op-118",
}));

const WORK_ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";
const ALBUM = "https://open.spotify.com/album/5Z9iiGl2FcIfa3BMiv6OIw";
const T = (n: number) => `https://open.spotify.com/track/${"t".repeat(21)}${n}`;

const movements = [
  { id: "m1", name: "Intermezzo in a-Moll" },
  { id: "m2", name: "Intermezzo in A-Dur" },
];

const preview = {
  performer: "Arcadi Volodos",
  year: 2017,
  mediaUrl: ALBUM,
  tracks: [
    { url: T(1), name: "Op. 118: No. 1, Intermezzo in A Minor" },
    { url: T(2), name: "Op. 118: No. 2, Intermezzo in A Major" },
    { url: T(3), name: "Op. 39: No. 15, Waltz" },
  ],
  movementStarts: { m1: T(1), m2: T(2) },
};

function renderForm(initialUrl?: string) {
  render(
    <PlayerSync movements={movements}>
      <AddRecordingForm workId={WORK_ID} initialUrl={initialUrl} />
    </PlayerSync>,
  );
}

function serve(previewResponse: Response) {
  vi.mocked(fetch).mockImplementation(async (url) =>
    String(url).startsWith("/api/spotify/preview")
      ? previewResponse
      : new Response("{}", { status: 201 }),
  );
}

const posted = () => {
  const call = vi
    .mocked(fetch)
    .mock.calls.find(([url]) => url === "/api/recordings");
  return JSON.parse(call?.[1]?.body as string);
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("AddRecordingForm", () => {
  it("adds a YouTube recording as before", async () => {
    serve(Response.json(preview));
    renderForm();
    fireEvent.change(screen.getByPlaceholderText("Performer"), {
      target: { value: "Zimerman" },
    });
    fireEvent.change(screen.getByPlaceholderText("Year"), {
      target: { value: "1990" },
    });
    fireEvent.change(screen.getByPlaceholderText("URL"), {
      target: { value: "https://youtu.be/dQw4w9WgXcQ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(posted()).toEqual({
      workId: WORK_ID,
      performer: "Zimerman",
      year: "1990",
      mediaType: "youtube",
      mediaUrl: "https://youtu.be/dQw4w9WgXcQ",
      movementStarts: {},
    });
    expect(
      vi.mocked(fetch).mock.calls.some(([u]) => String(u).includes("preview")),
    ).toBe(false);
  });

  it("fills in a pasted Spotify album and matches its tracks to movements", async () => {
    serve(Response.json(preview));
    renderForm();
    fireEvent.change(screen.getByPlaceholderText("URL"), {
      target: { value: ALBUM },
    });

    const first = await screen.findByRole("combobox", {
      name: "Track for I. Intermezzo in a-Moll",
    });
    expect(first).toHaveValue(T(1));
    expect(screen.getByPlaceholderText("Performer")).toHaveValue(
      "Arcadi Volodos",
    );
    expect(screen.getByPlaceholderText("Year")).toHaveValue("2017");
    expect(screen.getByRole("combobox", { name: "Media type" })).toHaveValue(
      "spotify",
    );
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      `/api/spotify/preview?workId=${WORK_ID}&url=${encodeURIComponent(ALBUM)}`,
    );
  });

  it("saves the matches as changed by hand", async () => {
    serve(Response.json(preview));
    renderForm();
    fireEvent.change(screen.getByPlaceholderText("URL"), {
      target: { value: ALBUM },
    });
    const second = await screen.findByRole("combobox", {
      name: "Track for II. Intermezzo in A-Dur",
    });
    fireEvent.change(second, { target: { value: "" } });
    fireEvent.change(
      screen.getByRole("combobox", {
        name: "Track for I. Intermezzo in a-Moll",
      }),
      { target: { value: T(3) } },
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(posted()).toMatchObject({
      performer: "Arcadi Volodos",
      mediaType: "spotify",
      mediaUrl: ALBUM,
      movementStarts: { m1: T(3) },
    });
  });

  it("starts from a suggested album", async () => {
    serve(Response.json(preview));
    renderForm(ALBUM);
    expect(
      await screen.findByRole("combobox", {
        name: "Track for I. Intermezzo in a-Moll",
      }),
    ).toHaveValue(T(1));
  });

  it("asks to connect Spotify for matching, and still adds by hand", async () => {
    serve(
      Response.json(
        { error: "Connect Spotify first", code: "not-connected" },
        { status: 409 },
      ),
    );
    renderForm();
    fireEvent.change(screen.getByPlaceholderText("URL"), {
      target: { value: ALBUM },
    });
    expect(
      await screen.findByRole("link", { name: "Connect Spotify" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Performer"), {
      target: { value: "Volodos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(posted()).toMatchObject({ mediaUrl: ALBUM, movementStarts: {} });
  });
});
