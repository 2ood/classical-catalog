import { describe, expect, it } from "vitest";
import { byVideo, isConcert, spanEnds } from "./concerts";

const span = (id: string, start: number | null, end: number | null = null) => ({
  id,
  startSeconds: start,
  endSeconds: end,
});

describe("spanEnds", () => {
  it("ends each span at the next one's start, the last at the video's end", () => {
    expect(spanEnds([span("b", 468), span("a", 79), span("c", 1200)])).toEqual({
      a: 468,
      b: 1200,
      c: null,
    });
  });

  it("keeps a span's own end, e.g. before the applause", () => {
    expect(spanEnds([span("a", 79, 400), span("b", 468)])).toEqual({
      a: 400,
      b: null,
    });
  });

  it("starts a span without a start at the beginning", () => {
    expect(spanEnds([span("a", null), span("b", 300)])).toEqual({
      a: 300,
      b: null,
    });
  });

  it("doesn't end a span at another starting at the same time", () => {
    expect(spanEnds([span("a", 60), span("b", 60)])).toEqual({
      a: null,
      b: null,
    });
  });
});

describe("byVideo", () => {
  it("groups YouTube recordings by video, however the link is written", () => {
    const groups = byVideo([
      {
        id: "a",
        mediaType: "youtube",
        mediaUrl: "https://youtu.be/KCzCqXwGT_g",
      },
      {
        id: "b",
        mediaType: "youtube",
        mediaUrl: "https://www.youtube.com/watch?v=KCzCqXwGT_g&si=x",
      },
      {
        id: "c",
        mediaType: "youtube",
        mediaUrl: "https://youtu.be/dQw4w9WgXcQ",
      },
      {
        id: "d",
        mediaType: "spotify",
        mediaUrl: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
      },
    ]);
    expect(
      Object.fromEntries(
        [...groups].map(([v, rs]) => [v, rs.map((r) => r.id)]),
      ),
    ).toEqual({ KCzCqXwGT_g: ["a", "b"], dQw4w9WgXcQ: ["c"] });
  });
});

describe("isConcert", () => {
  it("is a video with several pieces, or one piece within it", () => {
    expect(isConcert([span("a", null), span("b", null)])).toBe(true);
    expect(isConcert([span("a", 79)])).toBe(true);
    expect(isConcert([span("a", null, 300)])).toBe(true);
    expect(isConcert([span("a", null)])).toBe(false);
  });
});
