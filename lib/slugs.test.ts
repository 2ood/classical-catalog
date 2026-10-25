import { describe, expect, it } from "vitest";
import {
  movementSlug,
  movementSlugs,
  slugify,
  uniqueSlug,
  workSlug,
} from "./slugs";

describe("slugify", () => {
  it.each([
    ["Brahms", "brahms"],
    ["Dvořák", "dvorak"],
    ["Klavierstücke", "klavierstucke"],
    ["Die schöne Müllerin – Weiß", "die-schone-mullerin-weiss"],
    ["Piano Sonata No. 14 “Moonlight”", "piano-sonata-no-14-moonlight"],
    ["  C.P.E. Bach ", "c-p-e-bach"],
  ])("%s → %s", (text, slug) => {
    expect(slugify(text)).toBe(slug);
  });

  it("cuts long slugs at a word break", () => {
    const slug = slugify(
      "Presto allegro assai – Allegro molto – Andante maestoso – Allegro energico, sempre ben marcato",
    );
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug).toBe(
      "presto-allegro-assai-allegro-molto-andante-maestoso-allegro-energico-sempre-ben",
    );
  });
});

describe("workSlug", () => {
  it("puts the catalogue number after the title", () => {
    expect(workSlug({ title: "Symphony No. 5", catalogueNum: "Op. 67" })).toBe(
      "symphony-no-5-op-67",
    );
    expect(workSlug({ title: "Klavierstücke", catalogueNum: "Op. 118" })).toBe(
      "klavierstucke-op-118",
    );
    expect(workSlug({ title: "Boléro", catalogueNum: null })).toBe("bolero");
  });
});

describe("uniqueSlug", () => {
  it("numbers a slug that is taken", () => {
    expect(uniqueSlug("mazurka", new Set())).toBe("mazurka");
    expect(uniqueSlug("mazurka", new Set(["mazurka", "mazurka-2"]))).toBe(
      "mazurka-3",
    );
  });
});

describe("movementSlug", () => {
  const movements = [
    { id: "m1", name: "Allegro con brio" },
    { id: "m2", name: "Andante con moto" },
    { id: "m3", name: "Allegro" },
    { id: "m4", name: "Allegro" },
  ];

  it("starts with the movement's numeral, so repeated names stay apart", () => {
    expect(movementSlug(movements[1], 1)).toBe("ii-andante-con-moto");
    expect(movementSlugs(movements)).toEqual([
      "i-allegro-con-brio",
      "ii-andante-con-moto",
      "iii-allegro",
      "iv-allegro",
    ]);
  });
});
