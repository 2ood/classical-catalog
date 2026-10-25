import { describe, expect, it } from "vitest";
import {
  currentMovementIndex,
  movementLabel,
  nextMovementPage,
  parseMovements,
  previousMovementPage,
} from "./movements";

const fifth = [
  { name: "Allegro con brio", page: 3 },
  { name: "Andante con moto", page: 41 },
  { name: "Allegro", page: 63 },
  { name: "Allegro", page: 79 },
];

describe("parseMovements", () => {
  it("trims names and sorts by start page", () => {
    expect(
      parseMovements([
        { name: " Andante con moto ", page: 41 },
        { name: "Allegro con brio", page: "3" },
      ]),
    ).toEqual({
      ok: true,
      value: [
        { name: "Allegro con brio", page: 3 },
        { name: "Andante con moto", page: 41 },
      ],
    });
  });

  it("accepts an empty list", () => {
    expect(parseMovements([])).toEqual({ ok: true, value: [] });
  });

  it.each([
    ["a non-array", { name: "I", page: 1 }],
    ["a blank name", [{ name: "  ", page: 1 }]],
    ["a page below 1", [{ name: "I", page: 0 }]],
    ["a fractional page", [{ name: "I", page: 2.5 }]],
    ["a non-numeric page", [{ name: "I", page: "three" }]],
    ["an overlong name", [{ name: "x".repeat(201), page: 1 }]],
    [
      "more than 100 movements",
      Array.from({ length: 101 }, (_, i) => ({ name: `${i}`, page: i + 1 })),
    ],
  ])("rejects %s", (_, input) => {
    expect(parseMovements(input)).toMatchObject({ ok: false });
  });
});

describe("currentMovementIndex", () => {
  it("is the last movement starting on or before the page", () => {
    expect(currentMovementIndex(fifth, 3)).toBe(0);
    expect(currentMovementIndex(fifth, 40)).toBe(0);
    expect(currentMovementIndex(fifth, 41)).toBe(1);
    expect(currentMovementIndex(fifth, 98)).toBe(3);
  });

  it("is -1 before the first movement or with none", () => {
    expect(currentMovementIndex(fifth, 1)).toBe(-1);
    expect(currentMovementIndex([], 5)).toBe(-1);
  });
});

describe("nextMovementPage", () => {
  it("goes to the next movement's start", () => {
    expect(nextMovementPage(fifth, 1)).toBe(3);
    expect(nextMovementPage(fifth, 3)).toBe(41);
    expect(nextMovementPage(fifth, 50)).toBe(63);
  });

  it("is null in the last movement", () => {
    expect(nextMovementPage(fifth, 80)).toBeNull();
  });
});

describe("previousMovementPage", () => {
  it("goes back to the current movement's start when inside it", () => {
    expect(previousMovementPage(fifth, 50)).toBe(41);
  });

  it("goes to the previous movement when already at a movement's start", () => {
    expect(previousMovementPage(fifth, 41)).toBe(3);
  });

  it("is null at or before the first movement's start", () => {
    expect(previousMovementPage(fifth, 3)).toBeNull();
    expect(previousMovementPage(fifth, 1)).toBeNull();
  });
});

describe("movementLabel", () => {
  it("numbers movements with Roman numerals from their position", () => {
    expect(movementLabel(fifth[0], 0)).toBe("I. Allegro con brio");
    expect(movementLabel(fifth[1], 1)).toBe("II. Andante con moto");
    expect(movementLabel({ name: "Finale", page: 90 }, 8)).toBe("IX. Finale");
    expect(movementLabel({ name: "Coda", page: 99 }, 13)).toBe("XIV. Coda");
  });
});
