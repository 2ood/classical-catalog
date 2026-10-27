import { describe, expect, it } from "vitest";
import { trackJump, type Track } from "./playback";

// A concert: Kinderszenen (with applause after it), then a sonata.
const tracks: Track[] = [
  { id: "a", start: 79, end: 400, stop: true },
  { id: "b", start: 468, end: 1200, stop: false },
  { id: "c", start: 1200, end: null, stop: false },
];

describe("trackJump", () => {
  it("follows what is playing", () => {
    expect(trackJump(tracks, null, 100, "along")).toEqual({
      current: "a",
      jump: null,
    });
    expect(trackJump(tracks, "a", 500, "along")).toEqual({
      current: "b",
      jump: null,
    });
  });

  it("playing along, skips the applause after a track with its own end", () => {
    expect(trackJump(tracks, "a", 400.5, "along")).toEqual({
      current: "b",
      jump: 468,
    });
  });

  it("playing along, plays on from one track into the next", () => {
    expect(trackJump(tracks, "b", 1200.3, "along")).toEqual({
      current: "c",
      jump: null,
    });
  });

  it("playing along, pauses after the last track's own end", () => {
    const last: Track[] = [{ id: "a", start: 79, end: 400, stop: true }];
    expect(trackJump(last, "a", 400.2, "along")).toEqual({
      current: null,
      jump: "pause",
    });
    // Played on by hand: no pause again.
    expect(trackJump(last, null, 400.5, "along")).toEqual({
      current: null,
      jump: null,
    });
  });

  it("looping, goes back to the track's start at its end", () => {
    expect(trackJump(tracks, "a", 400.5, "loop")).toEqual({
      current: "a",
      jump: 79,
    });
    expect(trackJump(tracks, "b", 1200.3, "loop")).toEqual({
      current: "b",
      jump: 468,
    });
  });

  it("off, never jumps: no skipping, looping or pausing", () => {
    expect(trackJump(tracks, "a", 400.5, "off")).toEqual({
      current: "a",
      jump: null,
    });
    const last: Track[] = [{ id: "a", start: 79, end: 400, stop: true }];
    expect(trackJump(last, "a", 400.2, "off").jump).toBeNull();
  });

  it("leaves a jump made by hand alone", () => {
    expect(trackJump(tracks, "a", 1300, "loop")).toEqual({
      current: "c",
      jump: null,
    });
  });
});
