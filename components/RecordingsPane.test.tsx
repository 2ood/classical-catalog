import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PlayerSync, { useMovementRequests } from "./PlayerSync";
import RecordingsPane from "./RecordingsPane";
import SpotifyPlaybackProvider from "./SpotifyPlayback";
import YouTubeDockProvider from "./YouTubeDock";
import type { Queue } from "./QueueBar";
import type { Recording } from "@/lib/schema";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/composer/chopin/ballade-no-1-op-23",
}));

const recording = (id: string, performer: string) =>
  ({
    id,
    performer,
    year: 2016,
    mediaType: "spotify",
    mediaUrl: "https://open.spotify.com/track/7pLC3L3hscXCEA5iCKY4EN",
    movementStarts: {},
  }) as unknown as Recording;

const cho = recording("r1", "Seong-Jin Cho");
const zimerman = recording("r2", "Krystian Zimerman");

function renderPane(queue: Queue | null = null, initialRecordingId?: string) {
  render(
    <SpotifyPlaybackProvider>
      <YouTubeDockProvider>
        <PlayerSync movements={[]}>
          <RecordingsPane
            workId="w1"
            recordings={[cho, zimerman]}
            workTitle="Ballade No. 1"
            query="Chopin Ballade No. 1 Op. 23"
            queue={queue}
            initialRecordingId={initialRecordingId}
          />
        </PlayerSync>
      </YouTubeDockProvider>
    </SpotifyPlaybackProvider>,
  );
}

const editButton = (performer: string) =>
  screen.getByRole("button", { name: `Edit the recording by ${performer}` });
const avatar = (performer: string) =>
  screen.getByRole("button", {
    name: new RegExp(`^Play Ballade No. 1 by ${performer}`),
  });
const forms = () => screen.queryAllByRole("button", { name: "Save" });

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ connected: false })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("RecordingsPane editing", () => {
  it("edits the selected recording in one form", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    renderPane();
    fireEvent.click(editButton("Seong-Jin Cho"));
    expect(forms()).toHaveLength(1);
    expect(screen.getByPlaceholderText("Performer")).toHaveValue(
      "Seong-Jin Cho",
    );
    // No duplicate React keys between the form and the player.
    expect(
      errors.mock.calls.some(([m]) => String(m).includes("same key")),
    ).toBe(false);
    errors.mockRestore();
  });

  it("closes the editor when another recording is chosen", () => {
    renderPane();
    fireEvent.click(editButton("Seong-Jin Cho"));
    fireEvent.click(avatar("Krystian Zimerman"));
    expect(forms()).toHaveLength(0);
  });

  it("closes the editor with Cancel or Escape", () => {
    renderPane();
    fireEvent.click(editButton("Seong-Jin Cho"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(forms()).toHaveLength(0);

    fireEvent.click(editButton("Seong-Jin Cho"));
    fireEvent.keyDown(screen.getByPlaceholderText("Performer"), {
      key: "Escape",
    });
    expect(forms()).toHaveLength(0);
  });

  it("closes the add form with Cancel too", () => {
    renderPane();
    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    expect(screen.getByPlaceholderText("URL")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByPlaceholderText("URL")).toBeNull();
  });
});

/** Stand-in for the score pane: records the movements it is sent to. */
function Score({ onRequest }: { onRequest: (id: string) => void }) {
  useMovementRequests("score", onRequest);
  return null;
}

describe("RecordingsPane playing a movement", () => {
  it("switches to another recording's movement, and both panes go there", async () => {
    const onRequest = vi.fn();
    const withMovement = (r: Recording) => ({
      ...r,
      movementStarts: {
        m1: "https://open.spotify.com/track/0eBr9W1GE5nou99gRdy02J",
      },
    });
    render(
      <SpotifyPlaybackProvider>
        <YouTubeDockProvider>
          <PlayerSync movements={[{ id: "m1", name: "Andante spianato" }]}>
            <RecordingsPane
              workId="w1"
              recordings={[withMovement(cho), withMovement(zimerman)]}
              workTitle="Grande Polonaise"
              query="Chopin Op. 22"
            />
            <Score onRequest={onRequest} />
          </PlayerSync>
        </YouTubeDockProvider>
      </SpotifyPlaybackProvider>,
    );
    const zimermanM1 = screen.getByRole("button", {
      name: /^Play I\. Andante spianato by Krystian Zimerman/,
    });
    fireEvent.click(zimermanM1);
    expect(zimermanM1).toHaveAttribute("aria-current", "true");
    await vi.waitFor(() => expect(onRequest).toHaveBeenCalledWith("m1"));
  });
});

describe("RecordingsPane opened at a recording", () => {
  it("shows that recording first (e.g. from the Liked page)", () => {
    renderPane(null, "r2");
    expect(avatar("Krystian Zimerman")).toHaveAttribute("aria-current", "true");
  });
});

describe("RecordingsPane playing through a performer", () => {
  const queue: Queue = {
    recordingId: "r2",
    position: 2,
    total: 4,
    previous:
      "/composer/chopin/ballade-no-1-op-23?queue=krystian-zimerman&at=0",
    next: "/composer/chopin/ballade-no-3-op-47?queue=krystian-zimerman&at=2",
    performer: { name: "Krystian Zimerman", slug: "krystian-zimerman" },
    exit: "/composer/chopin/ballade-no-2-op-38",
    items: [
      {
        href: "/q0",
        composer: "Frédéric Chopin",
        work: "Op. 23 Ballade No. 1",
        current: false,
      },
      {
        href: "/q1",
        composer: "Frédéric Chopin",
        work: "Op. 38 Ballade No. 2",
        current: true,
      },
      {
        href: "/q2",
        composer: "Frédéric Chopin",
        work: "Op. 47 Ballade No. 3",
        current: false,
      },
      {
        href: "/q3",
        composer: "Frédéric Chopin",
        work: "Op. 52 Ballade No. 4",
        current: false,
      },
    ],
  };

  it("picks the performer's recording and shows where the queue is", () => {
    renderPane(queue);
    expect(avatar("Krystian Zimerman")).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("· 2 / 4", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous work" })).toHaveAttribute(
      "href",
      queue.previous,
    );
    expect(screen.getByRole("link", { name: "Next work" })).toHaveAttribute(
      "href",
      queue.next,
    );
    expect(
      screen.getByRole("link", { name: "Stop playing through" }),
    ).toHaveAttribute("href", queue.exit);
  });

  it("lists the whole queue, the current work highlighted", () => {
    renderPane(queue);
    const list = screen.getByRole("list", { name: "Queue" });
    const items = within(list).getAllByRole("link");
    expect(items.map((a) => a.textContent)).toEqual([
      "1. Frédéric Chopin · Op. 23 Ballade No. 1",
      "2. Frédéric Chopin · Op. 38 Ballade No. 2",
      "3. Frédéric Chopin · Op. 47 Ballade No. 3",
      "4. Frédéric Chopin · Op. 52 Ballade No. 4",
    ]);
    expect(items[2]).toHaveAttribute("href", "/q2");
    expect(items[1]).toHaveAttribute("aria-current", "true");
    expect(items[1]).toHaveClass("text-accent");
  });

  it("has no queue bar otherwise", () => {
    renderPane();
    expect(screen.queryByRole("link", { name: "Next work" })).toBeNull();
  });
});
