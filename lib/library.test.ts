import { describe, expect, it } from "vitest";
import { mapComposers } from "./library";

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
