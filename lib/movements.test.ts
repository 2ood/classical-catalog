import { describe, expect, it } from "vitest";
import {
  currentMovementIndex,
  formatTimestamp,
  mergeMovements,
  movementLabel,
  nextMovementStart,
  parseMovementRows,
  parsePage,
  parseSeconds,
  parseTimestamp,
  parseTrackUrl,
  placeMovements,
  previousMovementStart,
  type WorkMovement,
} from "./movements";

const fifth: WorkMovement[] = [
  { id: "m1", name: "Allegro con brio" },
  { id: "m2", name: "Andante con moto" },
  { id: "m3", name: "Allegro" },
  { id: "m4", name: "Allegro" },
];

describe("mark parsers", () => {
  it("parsePage accepts whole pages from 1; blank means unmarked", () => {
    expect(parsePage("41")).toEqual({ ok: true, value: 41 });
    expect(parsePage(null)).toEqual({ ok: true, value: null });
    expect(parsePage("")).toEqual({ ok: true, value: null });
    expect(parsePage(0)).toMatchObject({ ok: false });
    expect(parsePage(2.5)).toMatchObject({ ok: false });
  });

  it("parseSeconds accepts times from 0; blank means unmarked", () => {
    expect(parseSeconds(441)).toEqual({ ok: true, value: 441 });
    expect(parseSeconds(0)).toEqual({ ok: true, value: 0 });
    expect(parseSeconds(null)).toEqual({ ok: true, value: null });
    expect(parseSeconds(-1)).toMatchObject({ ok: false });
    expect(parseSeconds("soon")).toMatchObject({ ok: false });
  });

  it("parseTrackUrl accepts Spotify track links only", () => {
    expect(
      parseTrackUrl(
        " https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x ",
      ),
    ).toEqual({
      ok: true,
      value: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
    });
    expect(parseTrackUrl("")).toEqual({ ok: true, value: null });
    expect(
      parseTrackUrl("https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3"),
    ).toMatchObject({ ok: false });
  });
});

describe("parseMovementRows", () => {
  it("trims names and keeps row order and ids", () => {
    expect(
      parseMovementRows(
        [
          { id: "m1", name: " Allegro con brio ", mark: "3" },
          { name: "Andante con moto", mark: "" },
        ],
        parsePage,
      ),
    ).toEqual({
      ok: true,
      value: [
        { id: "m1", name: "Allegro con brio", mark: 3 },
        { id: undefined, name: "Andante con moto", mark: null },
      ],
    });
  });

  it.each([
    ["a non-array", { name: "I", mark: 1 }],
    ["a blank name", [{ name: "  ", mark: 1 }]],
    ["an overlong name", [{ name: "x".repeat(201), mark: 1 }]],
    ["a bad mark", [{ name: "I", mark: 0 }]],
    ["a non-string id", [{ id: 5, name: "I", mark: 1 }]],
    [
      "more than 100 movements",
      Array.from({ length: 101 }, (_, i) => ({ name: `${i}`, mark: null })),
    ],
  ])("rejects %s", (_, input) => {
    expect(parseMovementRows(input, parsePage)).toMatchObject({ ok: false });
  });
});

describe("mergeMovements", () => {
  let n = 0;
  const newId = () => `new${++n}`;

  it("keeps known ids, gives new rows ids, and drops removed movements", () => {
    n = 0;
    const result = mergeMovements(
      fifth,
      [
        { id: "m1", name: "Allegro con brio", mark: 3 },
        { name: "Scherzo", mark: 30 },
        { id: "m2", name: "Andante", mark: null },
        { id: "gone", name: "Finale", mark: 79 },
      ],
      newId,
    );
    expect(result.movements).toEqual([
      { id: "m1", name: "Allegro con brio" },
      { id: "new1", name: "Scherzo" },
      { id: "m2", name: "Andante" },
      { id: "new2", name: "Finale" },
    ]);
    expect(result.marks).toEqual({ m1: 3, new1: 30, new2: 79 });
  });
});

describe("placeMovements", () => {
  it("lists marked movements by start, numbered by the work's order", () => {
    expect(placeMovements(fifth, { m3: 63, m1: 3, m2: 41 })).toEqual([
      { id: "m1", label: "I. Allegro con brio", start: 3 },
      { id: "m2", label: "II. Andante con moto", start: 41 },
      { id: "m3", label: "III. Allegro", start: 63 },
    ]);
  });

  it("ignores marks for movements the work no longer has", () => {
    expect(placeMovements(fifth, { gone: 5 })).toEqual([]);
  });
});

describe("navigation", () => {
  const placed = placeMovements(fifth, { m1: 3, m2: 41, m3: 63, m4: 79 });

  it("currentMovementIndex is the last movement starting at or before", () => {
    expect(currentMovementIndex(placed, 1)).toBe(-1);
    expect(currentMovementIndex(placed, 40)).toBe(0);
    expect(currentMovementIndex(placed, 41)).toBe(1);
    expect(currentMovementIndex(placed, 98)).toBe(3);
  });

  it("nextMovementStart goes to the next movement", () => {
    expect(nextMovementStart(placed, 1)).toBe(3);
    expect(nextMovementStart(placed, 50)).toBe(63);
    expect(nextMovementStart(placed, 80)).toBeNull();
  });

  it("previousMovementStart restarts the movement, then goes back", () => {
    expect(previousMovementStart(placed, 50)).toBe(41);
    expect(previousMovementStart(placed, 41)).toBe(3);
    expect(previousMovementStart(placed, 3)).toBeNull();
  });
});

describe("timestamps", () => {
  it.each([
    ["7:21", 441],
    ["0:00", 0],
    ["45", 45],
    ["1:02:03", 3723],
    [" 12:05 ", 725],
  ])("parses %j as %i seconds", (text, seconds) => {
    expect(parseTimestamp(text)).toBe(seconds);
  });

  it.each(["", "7:61", "abc", "1:2:3:4", "-5"])("rejects %j", (text) => {
    expect(parseTimestamp(text)).toBeNull();
  });

  it.each([
    [441, "7:21"],
    [0, "0:00"],
    [3723, "1:02:03"],
    [59.9, "0:59"],
  ])("formats %d seconds as %s", (seconds, text) => {
    expect(formatTimestamp(seconds)).toBe(text);
  });
});

describe("movementLabel", () => {
  it("numbers movements with Roman numerals from their position", () => {
    expect(movementLabel(fifth[1], 1)).toBe("II. Andante con moto");
    expect(movementLabel({ id: "x", name: "Coda" }, 13)).toBe("XIV. Coda");
  });
});
