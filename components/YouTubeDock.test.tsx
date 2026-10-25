import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import YouTubeDockProvider, {
  shouldLoad,
  useYouTube,
  useYouTubeEvents,
  type DockedVideo,
} from "./YouTubeDock";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, CUED: 5 };

// A stand-in for the YouTube IFrame API: one instance per `new YT.Player`.
type Events = {
  onReady?: () => void;
  onStateChange?: (event: { data: number }) => void;
};
let players: FakePlayer[];
class FakePlayer {
  events: Events;
  time = 0;
  state = STATE.UNSTARTED;
  loadVideoById = vi.fn();
  cueVideoById = vi.fn();
  seekTo = vi.fn();
  playVideo = vi.fn();
  stopVideo = vi.fn();
  constructor(
    public element: HTMLElement,
    options: { events: Events },
  ) {
    this.events = options.events;
    players.push(this);
  }
  getCurrentTime = () => this.time;
  getPlayerState = () => this.state;
  destroy() {}
  emit(state: number) {
    this.state = state;
    act(() => this.events.onStateChange?.({ data: state }));
  }
}

const video = (recordingId: string): DockedVideo => ({
  recordingId,

  videoId: `v-${recordingId}`,
  title: `Recording ${recordingId}`,
  href: `/composer/chopin/w1?recording=${recordingId}`,
});

function Controls() {
  const dock = useYouTube();
  return (
    <>
      <p>status: {dock.status}</p>
      <button onClick={() => dock.load(video("r1"), { autoplay: false })}>
        cue r1
      </button>
      <button
        onClick={() => dock.load(video("r2"), { autoplay: true, start: 90 })}
      >
        play r2
      </button>
    </>
  );
}

function Listener({ id, onEnded }: { id: string; onEnded: () => void }) {
  useYouTubeEvents(id, { onEnded });
  return null;
}

beforeEach(() => {
  players = [];
  window.YT = {
    Player: FakePlayer,
    PlayerState: STATE,
  } as unknown as typeof window.YT;
});

async function ready() {
  await act(async () => {});
  act(() => players[0].events.onReady?.());
}

describe("YouTubeDockProvider", () => {
  it("makes one player and loads every video into it", async () => {
    render(
      <YouTubeDockProvider>
        <Controls />
      </YouTubeDockProvider>,
    );
    fireEvent.click(screen.getByText("cue r1"));
    await ready();
    expect(players[0].cueVideoById).toHaveBeenCalledWith({
      videoId: "v-r1",
      startSeconds: 0,
    });

    fireEvent.click(screen.getByText("play r2"));
    expect(players).toHaveLength(1);
    expect(players[0].loadVideoById).toHaveBeenCalledWith({
      videoId: "v-r2",
      startSeconds: 90,
    });
  });

  it("tells only the loaded recording's listeners that it ended", async () => {
    const ended1 = vi.fn();
    const ended2 = vi.fn();
    render(
      <YouTubeDockProvider>
        <Controls />
        <Listener id="r1" onEnded={ended1} />
        <Listener id="r2" onEnded={ended2} />
      </YouTubeDockProvider>,
    );
    fireEvent.click(screen.getByText("play r2"));
    await ready();
    players[0].emit(STATE.ENDED);
    expect(ended2).toHaveBeenCalledOnce();
    expect(ended1).not.toHaveBeenCalled();
    expect(screen.getByText("status: ended")).toBeTruthy();
  });

  it("floats a started video with no page to sit in, linked to its work", async () => {
    render(
      <YouTubeDockProvider>
        <Controls />
      </YouTubeDockProvider>,
    );
    fireEvent.click(screen.getByText("play r2"));
    await ready();
    expect(screen.queryByRole("link")).toBeNull();
    players[0].emit(STATE.PLAYING);
    expect(
      screen.getByRole("link", { name: "Recording r2" }).getAttribute("href"),
    ).toBe("/composer/chopin/w1?recording=r2");

    fireEvent.click(screen.getByRole("button", { name: "Close the video" }));
    expect(players[0].stopVideo).toHaveBeenCalled();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("minimizes the floating video without stopping or moving it", async () => {
    render(
      <YouTubeDockProvider>
        <Controls />
      </YouTubeDockProvider>,
    );
    fireEvent.click(screen.getByText("play r2"));
    await ready();
    players[0].emit(STATE.PLAYING);
    const minimize = screen.getByRole("button", { name: "Minimize the video" });
    expect(minimize.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(minimize);
    expect(
      screen
        .getByRole("button", { name: "Expand the video" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(screen.getByRole("link", { name: "Recording r2" })).toBeTruthy();
    expect(players[0].element.isConnected).toBe(true);
    expect(players[0].stopVideo).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Expand the video" }));
    expect(
      screen.getByRole("button", { name: "Minimize the video" }),
    ).toBeTruthy();
  });

  it("stacks what it is given below the floating video", () => {
    render(
      <YouTubeDockProvider below={<p>spotify</p>}>
        <Controls />
      </YouTubeDockProvider>,
    );
    expect(screen.getByText("spotify")).toBeTruthy();
  });
});

describe("shouldLoad", () => {
  const playing = { recordingId: "r1", status: "playing" as const };

  it("loads into an idle player", () => {
    expect(shouldLoad(null, "r2", false)).toBe(true);
    expect(shouldLoad({ ...playing, status: "paused" }, "r2", false)).toBe(
      true,
    );
    expect(shouldLoad({ ...playing, status: "ended" }, "r2", false)).toBe(true);
  });

  it("leaves another playing video alone unless this one was chosen", () => {
    expect(shouldLoad(playing, "r2", false)).toBe(false);
    expect(shouldLoad(playing, "r2", true)).toBe(true);
  });

  it("never reloads the video already loaded", () => {
    expect(shouldLoad(playing, "r1", true)).toBe(false);
  });
});
