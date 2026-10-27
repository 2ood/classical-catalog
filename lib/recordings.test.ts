import { describe, expect, it } from "vitest";
import {
  parseRecordingInput,
  performerInitials,
  recordingSlug,
} from "./recordings";

const valid = {
  workId: "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f",
  performer: "  Karajan / BPO ",
  year: "1962",
  mediaType: "youtube",
  mediaUrl: "https://youtu.be/dQw4w9WgXcQ",
};

describe("parseRecordingInput", () => {
  it("normalizes a valid input", () => {
    expect(parseRecordingInput(valid)).toEqual({
      ok: true,
      value: {
        workId: valid.workId,
        performer: "Karajan / BPO",
        year: 1962,
        mediaType: "youtube",
        mediaUrl: "https://youtu.be/dQw4w9WgXcQ",
        startSeconds: null,
        endSeconds: null,
        movementId: null,
      },
    });
  });

  it("takes a YouTube link's timestamp as the start, keeping the link plain", () => {
    const result = parseRecordingInput({
      ...valid,
      mediaUrl: "https://youtu.be/dQw4w9WgXcQ?si=abc&t=754",
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        mediaUrl: "https://youtu.be/dQw4w9WgXcQ?si=abc",
        startSeconds: 754,
        endSeconds: null,
      },
    });
  });

  it("prefers a start and end given in seconds", () => {
    const result = parseRecordingInput({
      ...valid,
      mediaUrl: "https://youtu.be/dQw4w9WgXcQ?t=754",
      startSeconds: 800,
      endSeconds: 1290,
    });
    expect(result).toMatchObject({
      ok: true,
      value: { startSeconds: 800, endSeconds: 1290 },
    });
  });

  it("clears the link's start when given an empty one", () => {
    const result = parseRecordingInput({
      ...valid,
      mediaUrl: "https://youtu.be/dQw4w9WgXcQ?t=754",
      startSeconds: null,
    });
    expect(result).toMatchObject({ ok: true, value: { startSeconds: null } });
  });

  it("has no start or end for Spotify", () => {
    const result = parseRecordingInput({
      ...valid,
      mediaType: "spotify",
      mediaUrl: "https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3",
      startSeconds: 10,
      endSeconds: 20,
    });
    expect(result).toMatchObject({
      ok: true,
      value: { startSeconds: null, endSeconds: null },
    });
  });

  it("keeps the one movement it is a recording of", () => {
    for (const mediaType of ["youtube", "spotify"]) {
      const result = parseRecordingInput({
        ...valid,
        mediaType,
        mediaUrl:
          mediaType === "spotify"
            ? "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"
            : valid.mediaUrl,
        movementId: "m7",
      });
      expect(result).toMatchObject({ ok: true, value: { movementId: "m7" } });
    }
    expect(parseRecordingInput({ ...valid, movementId: "" })).toMatchObject({
      ok: true,
      value: { movementId: null },
    });
  });

  it("treats a blank year as null", () => {
    const result = parseRecordingInput({ ...valid, year: "" });
    expect(result.ok && result.value.year).toBeNull();
  });

  it.each([
    ["a non-object body", null],
    ["a malformed work id", { ...valid, workId: "abc" }],
    ["a blank performer", { ...valid, performer: "   " }],
    ["a non-numeric year", { ...valid, year: "soon" }],
    ["an unknown media type", { ...valid, mediaType: "vimeo" }],
    [
      "a URL that is not YouTube",
      { ...valid, mediaUrl: "https://example.com" },
    ],
    [
      "a Spotify URL with media type youtube",
      {
        ...valid,
        mediaUrl: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
      },
    ],
    ["a negative start", { ...valid, startSeconds: -5 }],
    ["a fractional start", { ...valid, startSeconds: 1.5 }],
    ["an end before the start", { ...valid, startSeconds: 90, endSeconds: 60 }],
    ["a movement id that isn't text", { ...valid, movementId: 7 }],
    ["an end at the start", { ...valid, startSeconds: 90, endSeconds: 90 }],
  ])("rejects %s", (_, input) => {
    expect(parseRecordingInput(input)).toMatchObject({ ok: false });
  });

  it("accepts a Spotify URL with media type spotify", () => {
    const result = parseRecordingInput({
      ...valid,
      mediaType: "spotify",
      mediaUrl: "https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3",
    });
    expect(result.ok).toBe(true);
  });
});

describe("performerInitials", () => {
  it.each([
    ["Glenn Gould", "GG"],
    ["Karajan / BPO", "KB"],
    ["Karajan/BPO (cycle)", "KB"],
    ["Fischer / Danish National Chamber Orchestra", "FD"],
    ["  böhm  ", "B"],
    ["", "?"],
  ])("%j → %s", (performer, expected) => {
    expect(performerInitials(performer)).toBe(expected);
  });
});

describe("recordingSlug", () => {
  it("is the performer and the year", () => {
    expect(recordingSlug("Vladimir Horowitz", 1987)).toBe(
      "vladimir-horowitz-1987",
    );
    expect(recordingSlug("Karajan / BPO (cycle)", 1962)).toBe(
      "karajan-bpo-1962",
    );
    expect(recordingSlug("Krystian Zimerman", null)).toBe("krystian-zimerman");
    expect(recordingSlug("Jörg Demus", 1956)).toBe("jorg-demus-1956");
  });
});
