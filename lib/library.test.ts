import { describe, expect, it } from "vitest";
import { composersToImport, mapComposers } from "./library";

const oo = (
  openOpusId: number,
  name: string,
  completeName: string,
  epoch: string,
  born: number,
  died: number | null,
) => ({ openOpusId, name, completeName, epoch, born, died });

const catalogue = [
  oo(80, "Brahms", "Johannes Brahms", "Romantic", 1833, 1897),
  oo(105, "Debussy", "Claude Debussy", "Late Romantic", 1862, 1918),
  oo(57, "Ravel", "Maurice Ravel", "Late Romantic", 1875, 1937),
];

const locals = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    openOpusId: 80,
    slug: "brahms",
    era: "Romantic",
    born: 1833,
    died: 1897,
    recordedWorks: 3,
    schools: [],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    openOpusId: 105,
    slug: "debussy",
    era: "Impressionist", // typed by hand: kept
    born: 1862,
    died: 1918,
    recordedWorks: 0,
    schools: ["Impressionism", "Symbolism"],
  },
];

describe("mapComposers", () => {
  const mapped = mapComposers(catalogue, locals);
  const get = (name: string) => mapped.find((c) => c.shortName === name)!;

  it("links imported composers to their page, with their own details", () => {
    expect(get("Debussy")).toMatchObject({
      id: "00000000-0000-4000-8000-000000000002",
      href: "/composer/debussy",
      muted: false,
      era: "Impressionist",
      recordedWorks: 0,
      schools: ["Impressionism", "Symbolism"],
    });
  });

  it("fades composers not imported yet and sends them to their Import button", () => {
    expect(get("Ravel")).toMatchObject({
      id: "openopus-57",
      href: "/library?q=Maurice%20Ravel",
      muted: true,
      era: "Late Romantic",
      born: 1875,
      recordedWorks: 0,
    });
  });

  it("gives composers not imported yet their built-in schools", () => {
    expect(get("Ravel").schools).toEqual(["Impressionism"]);
  });
});

describe("composersToImport", () => {
  const catalogue = [
    oo(1, "Chopin", "Frédéric Chopin", "Romantic", 1810, 1849),
    oo(2, "Schumann", "Robert Schumann", "Romantic", 1810, 1856),
    oo(3, "C. Schumann", "Clara Schumann", "Romantic", 1819, 1896),
  ];

  it("offers composers named in the search that aren't imported yet", () => {
    expect(
      composersToImport("chopin nocturne", catalogue, new Set()).map(
        (c) => c.name,
      ),
    ).toEqual(["Chopin"]);
    expect(
      composersToImport("frederic", catalogue, new Set()).map((c) => c.name),
    ).toEqual(["Chopin"]);
  });

  it("leaves out those already imported", () => {
    expect(
      composersToImport("schumann", catalogue, new Set([2])).map((c) => c.name),
    ).toEqual(["C. Schumann"]);
  });

  it("needs three letters of a name", () => {
    expect(composersToImport("ch op 15", catalogue, new Set())).toEqual([]);
  });
});
