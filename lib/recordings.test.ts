import { describe, expect, it } from "vitest";
import { parseRecordingInput, performerInitials } from "./recordings";

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
      },
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
