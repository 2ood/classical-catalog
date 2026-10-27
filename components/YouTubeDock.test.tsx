import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import YouTubeDockProvider, {
  nearestCorner,
  PlayModeToggle,
  rubberBand,
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
  pauseVideo = vi.fn();
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
    // It is never closed, only minimized.
    expect(screen.queryByRole("button", { name: /Close/ })).toBeNull();
  });

  it("is tinted while playing, not while paused", async () => {
    render(
      <YouTubeDockProvider>
        <Controls />
      </YouTubeDockProvider>,
    );
    fireEvent.click(screen.getByText("play r2"));
    await ready();
    players[0].emit(STATE.PLAYING);
    const floating = () =>
      screen.getByRole("button", { name: "Minimize the video" }).parentElement!
        .parentElement!;
    expect(floating()).toHaveClass("bg-accent-tint");
    players[0].emit(STATE.PAUSED);
    expect(floating()).not.toHaveClass("bg-accent-tint");
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
    // An underscore, not a glyph.
    expect(minimize.querySelector("svg")).not.toBeNull();

    fireEvent.click(minimize);
    // The video folds away, animated.
    expect(players[0].element.parentElement).toHaveClass(
      "h-0",
      "transition-[height]",
    );
    expect(screen.getByText("Recording r2")).toBeTruthy();
    expect(players[0].element.isConnected).toBe(true);
    expect(players[0].stopVideo).not.toHaveBeenCalled();

    // ⏯ on the left pauses, and leaves it minimized.
    fireEvent.click(screen.getByRole("button", { name: "Pause the video" }));
    expect(players[0].pauseVideo).toHaveBeenCalled();
    players[0].emit(STATE.PAUSED);
    fireEvent.click(screen.getByRole("button", { name: "Play the video" }));
    expect(players[0].playVideo).toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Minimize the video" }),
    ).toBeNull();

    // A click anywhere else expands it.
    fireEvent.click(screen.getByText("Recording r2"));
    expect(
      screen.getByRole("button", { name: "Minimize the video" }),
    ).toBeTruthy();
  });

  it("isn't expanded by the click ending a drag", async () => {
    localStorage.clear();
    render(
      <YouTubeDockProvider>
        <Controls />
      </YouTubeDockProvider>,
    );
    fireEvent.click(screen.getByText("play r2"));
    await ready();
    players[0].emit(STATE.PLAYING);
    fireEvent.click(screen.getByRole("button", { name: "Minimize the video" }));
    const stack = screen.getByRole("region", { name: "Players" });
    const title = screen.getByText("Recording r2");
    fireEvent.pointerDown(title, { clientX: 1000, clientY: 740 });
    fireEvent.pointerMove(stack, { clientX: 960, clientY: 700 });
    fireEvent.pointerUp(stack);
    fireEvent.click(title);
    expect(
      screen.queryByRole("button", { name: "Minimize the video" }),
    ).toBeNull();
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

describe("moving the floating players", () => {
  it("drags the stack to the corner nearest the pointer, and keeps it there", () => {
    localStorage.clear();
    const { unmount } = render(
      <YouTubeDockProvider below={<p>spotify</p>}>
        <Controls />
      </YouTubeDockProvider>,
    );
    const stack = screen.getByRole("region", { name: "Players" });
    expect(stack).toHaveClass("bottom-4", "right-4");

    fireEvent.pointerDown(screen.getByText("spotify"), {
      clientX: 1000,
      clientY: 740,
    });
    // Stretched toward the pointer, not yet moved.
    fireEvent.pointerMove(stack, { clientX: 700, clientY: 500 });
    expect(stack).toHaveClass("bottom-4", "right-4");
    expect(screen.getByText("spotify").parentElement!.style.translate).toMatch(
      /^-\d+(\.\d+)?px -\d+(\.\d+)?px$/,
    );
    // Over another corner: moved there before being let go…
    fireEvent.pointerMove(stack, { clientX: 40, clientY: 60 });
    expect(stack).toHaveClass("top-16", "left-4");
    // …and not stretched there: only in the corner the drag began.
    const stretch = () => screen.getByText("spotify").parentElement!.style;
    fireEvent.pointerMove(stack, { clientX: 20, clientY: 30 });
    expect(stretch().translate).toMatch(/^(0px( 0px)?)?$/);
    // Back over the first corner: stretched toward the pointer again.
    fireEvent.pointerMove(stack, { clientX: 900, clientY: 600 });
    expect(stack).toHaveClass("bottom-4", "right-4");
    expect(stretch().translate).toMatch(/^-\d/);
    fireEvent.pointerMove(stack, { clientX: 40, clientY: 60 });
    fireEvent.pointerUp(stack, { clientX: 40, clientY: 60 });
    expect(stack).toHaveClass("top-16", "left-4");

    // Still there on the next visit.
    unmount();
    render(
      <YouTubeDockProvider below={<p>spotify</p>}>
        <Controls />
      </YouTubeDockProvider>,
    );
    expect(screen.getByRole("region", { name: "Players" })).toHaveClass(
      "top-16",
      "left-4",
    );
  });

  it("springs back when not pulled into another corner", () => {
    localStorage.clear();
    render(
      <YouTubeDockProvider below={<p>spotify</p>}>
        <Controls />
      </YouTubeDockProvider>,
    );
    const stack = screen.getByRole("region", { name: "Players" });
    fireEvent.pointerDown(screen.getByText("spotify"), {
      clientX: 1000,
      clientY: 740,
    });
    fireEvent.pointerMove(stack, { clientX: 900, clientY: 600 });
    fireEvent.pointerUp(stack, { clientX: 900, clientY: 600 });
    expect(stack).toHaveClass("bottom-4", "right-4");
    expect(screen.getByText("spotify").parentElement!.style.translate).toBe("");
  });

  it("doesn't drag from the players' buttons", () => {
    localStorage.clear();
    render(
      <YouTubeDockProvider below={<button>pause</button>}>
        <Controls />
      </YouTubeDockProvider>,
    );
    const stack = screen.getByRole("region", { name: "Players" });
    fireEvent.pointerDown(screen.getByText("pause"), {
      clientX: 1000,
      clientY: 740,
    });
    fireEvent.pointerMove(stack, { clientX: 40, clientY: 60 });
    expect(stack).toHaveClass("bottom-4", "right-4");
  });
});

describe("PlayModeToggle", () => {
  it("cycles playing along, looping and off, for every player", async () => {
    localStorage.clear();
    render(
      <YouTubeDockProvider>
        <Controls />
        <PlayModeToggle />
      </YouTubeDockProvider>,
    );
    fireEvent.click(screen.getByText("play r2"));
    await ready();
    players[0].emit(STATE.PLAYING);
    // One on the page, one on the floating video: they agree.
    const toggles = () => screen.getAllByRole("button", { name: /^Play mode/ });
    expect(toggles()).toHaveLength(2);
    expect(toggles()[0]).toHaveAccessibleName("Play mode: play along");
    expect(toggles()[0]).toHaveClass("text-accent");

    fireEvent.click(toggles()[0]);
    for (const t of toggles()) {
      expect(t).toHaveAccessibleName("Play mode: loop the track");
    }
    expect(localStorage.getItem("play-mode")).toBe("loop");

    fireEvent.click(toggles()[1]);
    for (const t of toggles()) {
      expect(t).toHaveAccessibleName("Play mode: off");
      expect(t).toHaveClass("text-muted");
    }
    expect(localStorage.getItem("play-mode")).toBe("off");

    fireEvent.click(toggles()[0]);
    expect(toggles()[0]).toHaveAccessibleName("Play mode: play along");
  });
});

describe("nearestCorner", () => {
  it.each([
    [10, 10, "top-left"],
    [900, 10, "top-right"],
    [10, 700, "bottom-left"],
    [900, 700, "bottom-right"],
  ])("(%i, %i) in 1024×768 → %s", (x, y, corner) => {
    expect(nearestCorner(x, y, 1024, 768)).toBe(corner);
  });
});

describe("rubberBand", () => {
  it("gives a little, and resists a longer pull more and more", () => {
    expect(rubberBand(0)).toBe(0);
    expect(rubberBand(20)).toBeGreaterThan(3);
    expect(rubberBand(100)).toBeLessThan(25);
    expect(rubberBand(-20)).toBe(-rubberBand(20));
    expect(rubberBand(400) - rubberBand(200)).toBeLessThan(
      rubberBand(200) - rubberBand(0),
    );
    expect(rubberBand(5000)).toBeLessThan(50);
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
