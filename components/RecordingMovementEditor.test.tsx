import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecordingMovementEditor from "./RecordingMovementEditor";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const REC_ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";
const movements = [
  { id: "m1", name: "Allegro con brio" },
  { id: "m2", name: "Andante con moto" },
];

const sent = () =>
  JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)).movements;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("RecordingMovementEditor (YouTube)", () => {
  function renderYouTube(currentTime = 441.6) {
    const onClose = vi.fn();
    render(
      <RecordingMovementEditor
        recordingId={REC_ID}
        mediaType="youtube"
        movements={movements}
        starts={{ m1: 0 }}
        currentTime={() => currentTime}
        onClose={onClose}
      />,
    );
    return { onClose };
  }

  it("shows start times as m:ss", () => {
    renderYouTube();
    expect(screen.getByText("Starts at")).toBeInTheDocument();
    expect(screen.getByLabelText("Movement I start time")).toHaveValue("0:00");
    expect(screen.getByLabelText("Movement II start time")).toHaveValue("");
  });

  it("fills a row with the video's current time", () => {
    renderYouTube(441.6);
    fireEvent.click(
      screen.getByRole("button", { name: "Use current time for movement II" }),
    );
    expect(screen.getByLabelText("Movement II start time")).toHaveValue("7:21");
  });

  it("adds a movement at the current time after earlier ones", () => {
    renderYouTube(100);
    fireEvent.click(screen.getByRole("button", { name: "Add at 1:40" }));
    // Movement II has no time yet, so the new one goes after it.
    expect(screen.getByLabelText("Movement III start time")).toHaveValue(
      "1:40",
    );
    expect(screen.getByLabelText("Movement III name")).toHaveFocus();
  });

  it("saves times in seconds", async () => {
    const { onClose } = renderYouTube();
    fireEvent.change(screen.getByLabelText("Movement II start time"), {
      target: { value: "7:21" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
      `/api/recordings/${REC_ID}/movements`,
    );
    expect(sent()).toEqual([
      { id: "m1", name: "Allegro con brio", mark: 0 },
      { id: "m2", name: "Andante con moto", mark: 441 },
    ]);
  });

  it("refuses a time it cannot read, without saving", async () => {
    renderYouTube();
    fireEvent.change(screen.getByLabelText("Movement II start time"), {
      target: { value: "7:99" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("Movement II: write the time as m:ss, e.g. 7:21"),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("RecordingMovementEditor (Spotify)", () => {
  it("edits and saves a track link per movement", async () => {
    const onClose = vi.fn();
    render(
      <RecordingMovementEditor
        recordingId={REC_ID}
        mediaType="spotify"
        movements={movements}
        starts={{ m1: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" }}
        currentTime={() => null}
        onClose={onClose}
      />,
    );
    expect(screen.getByText("Track link")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Movement II track link"), {
      target: {
        value: "https://open.spotify.com/track/3Hfv8h49DVUT4uHd2Tu7Fd",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sent()).toEqual([
      {
        id: "m1",
        name: "Allegro con brio",
        mark: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
      },
      {
        id: "m2",
        name: "Andante con moto",
        mark: "https://open.spotify.com/track/3Hfv8h49DVUT4uHd2Tu7Fd",
      },
    ]);
  });
});
