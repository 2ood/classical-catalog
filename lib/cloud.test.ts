import { describe, expect, it } from "vitest";
import {
  CLOUD_WIDTH,
  estimateBox,
  fontSize,
  layoutCloud,
  MIN_CLOUD_HEIGHT,
  seededRandom,
  type PlacedWord,
} from "./cloud";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

function overlaps(a: PlacedWord, b: PlacedWord) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

describe("seededRandom", () => {
  it("returns the same sequence for the same seed", () => {
    const a = seededRandom(uuid(1));
    const b = seededRandom(uuid(1));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("returns different sequences for different seeds", () => {
    expect(seededRandom(uuid(1))()).not.toBe(seededRandom(uuid(2))());
  });

  it("stays within [0, 1)", () => {
    const rand = seededRandom(uuid(3));
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("fontSize", () => {
  it("maps zero to the minimum and the max count to the maximum", () => {
    expect(fontSize(0, 10)).toBe(16);
    expect(fontSize(10, 10)).toBe(42);
  });

  it("scales linearly in between", () => {
    expect(fontSize(5, 10)).toBe(29);
  });

  it("uses the minimum when nobody has recordings", () => {
    expect(fontSize(0, 0)).toBe(16);
  });
});

describe("estimateBox", () => {
  it("grows with text length and font size", () => {
    const short = estimateBox("Bach", 16);
    expect(estimateBox("Beethoven", 16).width).toBeGreaterThan(short.width);
    expect(estimateBox("Bach", 32).width).toBeGreaterThan(short.width);
    expect(estimateBox("Bach", 32).height).toBeGreaterThan(short.height);
  });
});

describe("layoutCloud", () => {
  const names = [
    "Bach",
    "Mozart",
    "Beethoven",
    "Brahms",
    "Debussy",
    "Ravel",
    "Chopin",
    "Schubert",
    "Haydn",
    "Handel",
    "Vivaldi",
    "Mahler",
    "Bruckner",
    "Liszt",
    "Schumann",
    "Stravinsky",
    "Prokofiev",
    "Shostakovich",
    "Tchaikovsky",
    "Dvořák",
  ];
  const words = (offset: number) =>
    names.map((name, i) => ({
      id: uuid(offset + i),
      text: name,
      size: 16 + ((i * 7 + offset) % 27),
    }));

  it("is deterministic for the same input", () => {
    expect(layoutCloud(words(0))).toEqual(layoutCloud(words(0)));
  });

  it("does not depend on input order", () => {
    const input = words(0);
    const byId = (a: PlacedWord, b: PlacedWord) => a.id.localeCompare(b.id);
    expect(layoutCloud([...input].reverse()).words.sort(byId)).toEqual(
      layoutCloud(input).words.sort(byId),
    );
  });

  it("keeps the minimum height for a small catalogue", () => {
    expect(layoutCloud(words(0).slice(0, 5)).height).toBe(MIN_CLOUD_HEIGHT);
  });

  it("takes a smaller minimum height for small clusters", () => {
    expect(layoutCloud(words(0).slice(0, 2), 120).height).toBe(120);
  });

  it("grows taller for a large catalogue", () => {
    const many = [...words(0), ...words(100), ...words(200)];
    expect(layoutCloud(many).height).toBeGreaterThan(MIN_CLOUD_HEIGHT);
  });

  it("keeps every box inside the container", () => {
    const { words: placed, height } = layoutCloud(words(0));
    for (const w of placed) {
      expect(w.x).toBeGreaterThanOrEqual(0);
      expect(w.y).toBeGreaterThanOrEqual(0);
      expect(w.x + w.width).toBeLessThanOrEqual(CLOUD_WIDTH);
      expect(w.y + w.height).toBeLessThanOrEqual(height);
    }
  });

  it("produces no overlapping boxes across many seed sets", () => {
    for (let offset = 0; offset < 2000; offset += 40) {
      const placed = layoutCloud(words(offset)).words;
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          expect(
            overlaps(placed[i], placed[j]),
            `${placed[i].text} overlaps ${placed[j].text} (offset ${offset})`,
          ).toBe(false);
        }
      }
    }
  });
});
