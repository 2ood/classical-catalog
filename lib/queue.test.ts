import { describe, expect, it } from "vitest";
import { orderForQueue, queueStep, recordingTrackIds } from "./queue";

const rec = (
  id: string,
  composer: [string, string, number],
  work: [string, string | null],
) => ({
  id,
  composer: { slug: composer[0], name: composer[1], born: composer[2] },
  work: { slug: work[0], catalogueNum: work[1], title: work[0] },
});

const queue = orderForQueue([
  rec(
    "r3",
    ["debussy", "Claude Debussy", 1862],
    ["children-s-corner-l-113", "L. 113"],
  ),
  rec(
    "r2",
    ["chopin", "Frédéric Chopin", 1810],
    ["ballade-no-2-op-38", "Op. 38"],
  ),
  rec(
    "r1",
    ["chopin", "Frédéric Chopin", 1810],
    ["ballade-no-1-op-23", "Op. 23"],
  ),
]);

describe("orderForQueue", () => {
  it("runs by composer birth, then catalogue number", () => {
    expect(queue.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
  });
});

describe("queueStep", () => {
  it("finds where the queue is, and links to the works around it", () => {
    expect(
      queueStep(queue, "seong-jin-cho", "1", {
        composer: "chopin",
        work: "ballade-no-2-op-38",
      }),
    ).toEqual({
      recordingId: "r2",
      position: 2,
      total: 3,
      previous: "/composer/chopin/ballade-no-1-op-23?queue=seong-jin-cho&at=0",
      next: "/composer/debussy/children-s-corner-l-113?queue=seong-jin-cho&at=2",
      items: [
        {
          href: "/composer/chopin/ballade-no-1-op-23?queue=seong-jin-cho&at=0",
          composer: "Frédéric Chopin",
          work: "Op. 23 ballade-no-1-op-23",
          current: false,
        },
        {
          href: "/composer/chopin/ballade-no-2-op-38?queue=seong-jin-cho&at=1",
          composer: "Frédéric Chopin",
          work: "Op. 38 ballade-no-2-op-38",
          current: true,
        },
        {
          href: "/composer/debussy/children-s-corner-l-113?queue=seong-jin-cho&at=2",
          composer: "Claude Debussy",
          work: "L. 113 children-s-corner-l-113",
          current: false,
        },
      ],
    });
  });

  it("has no previous at the start and no next at the end", () => {
    const first = queueStep(queue, "x", "0", {
      composer: "chopin",
      work: "ballade-no-1-op-23",
    });
    expect(first?.previous).toBeNull();
    const last = queueStep(queue, "x", "2", {
      composer: "debussy",
      work: "children-s-corner-l-113",
    });
    expect(last?.next).toBeNull();
  });

  it("ignores a position that isn't this work, or isn't a position", () => {
    expect(
      queueStep(queue, "x", "0", {
        composer: "debussy",
        work: "children-s-corner-l-113",
      }),
    ).toBeNull();
    expect(
      queueStep(queue, "x", "nope", {
        composer: "chopin",
        work: "ballade-no-1-op-23",
      }),
    ).toBeNull();
    expect(
      queueStep(queue, "x", "9", {
        composer: "chopin",
        work: "ballade-no-1-op-23",
      }),
    ).toBeNull();
  });
});

describe("recordingTrackIds", () => {
  const T1 = "0eBr9W1GE5nou99gRdy02J";
  const T2 = "3Hfv8h49DVUT4uHd2Tu7Fd";

  it("is the movements' tracks when the recording has them", () => {
    expect(
      recordingTrackIds({
        mediaUrl: "https://open.spotify.com/album/6Pqlj0jyStFJgTidjdLGHC",
        movementStarts: {
          m1: `https://open.spotify.com/track/${T1}`,
          m2: `https://open.spotify.com/track/${T2}`,
        },
      }),
    ).toEqual(new Set([T1, T2]));
  });

  it("is the recording's own track when it is a track", () => {
    expect(
      recordingTrackIds({
        mediaUrl: `https://open.spotify.com/track/${T1}?si=abc`,
        movementStarts: {},
      }),
    ).toEqual(new Set([T1]));
  });

  it("is unknown for a whole album without movement tracks", () => {
    expect(
      recordingTrackIds({
        mediaUrl: "https://open.spotify.com/album/6Pqlj0jyStFJgTidjdLGHC",
        movementStarts: {},
      }),
    ).toBeNull();
  });
});
