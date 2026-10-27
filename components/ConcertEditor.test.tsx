import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConcertEditor from "./ConcertEditor";
import YouTubeDockProvider from "./YouTubeDock";
import type { ConcertPiece } from "@/lib/queries";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => "/concert/KCzCqXwGT_g",
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

let players: FakePlayer[] = [];
class FakePlayer {
  events: { onReady?: () => void };
  time = 0;
  state = -1;
  loadVideoById = vi.fn();
  cueVideoById = vi.fn();
  seekTo = vi.fn();
  playVideo = vi.fn();
  pauseVideo = vi.fn();
  constructor(_: HTMLElement, options: { events: FakePlayer["events"] }) {
    this.events = options.events;
    players.push(this);
  }
  getCurrentTime = () => this.time;
  getPlayerState = () => this.state;
  destroy() {}
}

/** The video plays on to `seconds`, seen at the player's next tick. */
async function playTo(player: FakePlayer, seconds: number) {
  player.state = 1;
  player.time = seconds;
  await new Promise((resolve) => setTimeout(resolve, 300));
}

const piece = (over: Partial<ConcertPiece>): ConcertPiece =>
  ({
    id: "r1",
    workId: "w1",
    performer: "Vladimir Horowitz",
    year: 1987,
    mediaType: "youtube",
    mediaUrl: "https://youtu.be/KCzCqXwGT_g",
    startSeconds: 79,
    endSeconds: null,
    movementId: null,
    movementStarts: {},
    createdAt: new Date(0),
    work: {
      title: "Kinderszenen",
      catalogueNum: "Op. 15",
      slug: "kinderszenen-op-15",
      movements: [],
    },
    composer: { name: "Robert Schumann", slug: "schumann" },
    ...over,
  }) as ConcertPiece;

const pieces = [
  piece({
    id: "r2",
    workId: "w2",
    startSeconds: 468,
    work: {
      title: "Sonata",
      catalogueNum: "K. 330",
      slug: "sonata-k-330",
      movements: [],
    },
    composer: { name: "Wolfgang Amadeus Mozart", slug: "mozart" },
  }),
  piece({}),
];

function renderEditor(concert = pieces) {
  render(
    <YouTubeDockProvider>
      <ConcertEditor
        videoId="KCzCqXwGT_g"
        title="Horowitz in Moscow"
        pieces={concert}
      />
    </YouTubeDockProvider>,
  );
}

const kinderszenen = {
  id: "w3",
  title: "Kinderszenen",
  catalogueNum: "Op. 15",
  key: null,
  movements: [
    { id: "m1", name: "Von fremden Ländern und Menschen" },
    { id: "m7", name: "Träumerei" },
  ],
  composer: "Robert Schumann",
};

// The work search: Schumann is imported; Chopin is offered for import.
function search(url: string) {
  const q = new URL(url, "http://localhost").searchParams.get("q");
  return q === "chopin"
    ? { works: [], composers: [{ openOpusId: 5, name: "Frédéric Chopin" }] }
    : { works: [kinderszenen], composers: [] };
}

const rows = () => screen.getAllByRole("listitem");
const call = (method: string) =>
  vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === method);

beforeEach(() => {
  localStorage.clear();
  players = [];
  window.YT = {
    Player: FakePlayer,
    PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2 },
  } as unknown as typeof window.YT;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.startsWith("/api/works/search")
        ? Response.json(search(url))
        : url === "/api/library/import"
          ? new Response(
              '{"type":"imported"}\n{"type":"done","movements":21}\n',
            )
          : new Response("{}", { status: 200 }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ConcertEditor", () => {
  it("lists the pieces in the order they are played, each ending at the next", () => {
    renderEditor();
    expect(rows().map((r) => within(r).getByLabelText("Start"))).toHaveLength(
      2,
    );
    const [first, second] = rows();
    expect(first).toHaveTextContent("Robert Schumann · Op. 15 Kinderszenen");
    expect(within(first).getByLabelText("Start")).toHaveValue("1:19");
    // No end of its own: until the next piece.
    expect(within(first).getByLabelText("End")).toHaveAttribute(
      "placeholder",
      "7:48",
    );
    expect(second).toHaveTextContent("Wolfgang Amadeus Mozart · K. 330 Sonata");
  });

  it("adds a piece, its performer and year taken from the last one", async () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "+ Add piece" }));
    const added = rows()[2];
    expect(within(added).getByPlaceholderText("Performer")).toHaveValue(
      "Vladimir Horowitz",
    );
    fireEvent.change(within(added).getByLabelText("Start"), {
      target: { value: "20:05" },
    });
    fireEvent.change(within(added).getByPlaceholderText("Search works"), {
      target: { value: "kinderszenen" },
    });
    fireEvent.click(
      await within(added).findByRole("button", {
        name: "Robert Schumann · Op. 15 Kinderszenen",
      }),
    );
    fireEvent.click(within(added).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [url, init] = call("POST")!;
    expect(url).toBe("/api/recordings");
    expect(JSON.parse(init!.body as string)).toEqual({
      workId: "w3",
      performer: "Vladimir Horowitz",
      year: "1987",
      mediaType: "youtube",
      mediaUrl: "https://youtu.be/KCzCqXwGT_g",
      startSeconds: 1205,
      endSeconds: null,
    });
  });

  it("adds one movement of a work as a piece", async () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "+ Add piece" }));
    const added = rows()[2];
    fireEvent.change(within(added).getByLabelText("Start"), {
      target: { value: "20:05" },
    });
    fireEvent.change(within(added).getByPlaceholderText("Search works"), {
      target: { value: "kinderszenen" },
    });
    fireEvent.click(
      await within(added).findByRole("button", {
        name: "Robert Schumann · Op. 15 Kinderszenen — II. Träumerei",
      }),
    );
    expect(added).toHaveTextContent("Kinderszenen — II. Träumerei");
    fireEvent.click(within(added).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(JSON.parse(call("POST")![1]!.body as string)).toMatchObject({
      workId: "w3",
      startSeconds: 1205,
      movementId: "m7",
      movementStarts: { m7: 1205 },
    });
  });

  it("names a movement piece, and moves the movement with its start", async () => {
    renderEditor([
      piece({
        startSeconds: 1205,
        movementId: "m7",
        movementStarts: { m7: 1205 },
        work: {
          title: "Kinderszenen",
          catalogueNum: "Op. 15",
          slug: "kinderszenen-op-15",
          movements: kinderszenen.movements,
        },
      }),
    ]);
    const [row] = rows();
    expect(row).toHaveTextContent(
      "Robert Schumann · Op. 15 Kinderszenen — II. Träumerei",
    );
    fireEvent.change(within(row).getByLabelText("Start"), {
      target: { value: "20:03" },
    });
    fireEvent.click(within(row).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(JSON.parse(call("PATCH")![1]!.body as string)).toMatchObject({
      startSeconds: 1203,
      movementStarts: { m7: 1203 },
    });
  });

  it("offers to import a composer the library doesn't have yet", async () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "+ Add piece" }));
    const added = rows()[2];
    fireEvent.change(within(added).getByPlaceholderText("Search works"), {
      target: { value: "chopin" },
    });
    fireEvent.click(
      await within(added).findByRole("button", {
        name: "Import Frédéric Chopin",
      }),
    );
    await waitFor(() => expect(call("POST")?.[0]).toBe("/api/library/import"));
    expect(JSON.parse(call("POST")![1]!.body as string)).toEqual({
      openOpusId: 5,
    });
    // Searched again once imported.
    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.filter(([u]) => String(u).includes("q=chopin")),
      ).toHaveLength(2),
    );
  });

  it("saves a piece's changed start and end", async () => {
    renderEditor();
    const first = rows()[0];
    fireEvent.change(within(first).getByLabelText("End"), {
      target: { value: "7:30" },
    });
    fireEvent.click(within(first).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [url, init] = call("PATCH")!;
    expect(url).toBe("/api/recordings/r1");
    expect(JSON.parse(init!.body as string)).toMatchObject({
      startSeconds: 79,
      endSeconds: 450,
    });
  });

  it("deletes a piece after asking", async () => {
    vi.stubGlobal("confirm", () => true);
    renderEditor();
    fireEvent.click(
      within(rows()[0]).getByRole("button", { name: "Delete this piece" }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(call("DELETE")?.[0]).toBe("/api/recordings/r1");
  });
});

describe("ConcertEditor playing", () => {
  // Schumann ends (applause follows) before Mozart starts.
  const withApplause = [pieces[0], { ...pieces[1], endSeconds: 400 }];

  async function ready() {
    await vi.waitFor(() => expect(players).toHaveLength(1));
    act(() => players[0].events.onReady?.());
    return players[0];
  }

  it("skips the applause, playing along", async () => {
    renderEditor(withApplause);
    const player = await ready();
    await playTo(player, 399.8);
    await playTo(player, 400.3);
    expect(player.seekTo).toHaveBeenCalledWith(468, true);
  });

  it("plays on through the applause, off", async () => {
    localStorage.setItem("play-mode", "off");
    renderEditor(withApplause);
    const player = await ready();
    await playTo(player, 399.8);
    await playTo(player, 400.3);
    expect(player.seekTo).not.toHaveBeenCalled();
  });

  it("goes back to the piece's start, looping", async () => {
    localStorage.setItem("play-mode", "loop");
    renderEditor(withApplause);
    const player = await ready();
    await playTo(player, 399.8);
    await playTo(player, 400.3);
    expect(player.seekTo).toHaveBeenCalledWith(79, true);
  });
});
