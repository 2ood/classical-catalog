import { describe, expect, it } from "vitest";
import { byMovement, byPeriod } from "./clusters";

const c = (
  id: string,
  era: string | null,
  born: number | null,
  schools: string[] = [],
) => ({ id, era, born, schools });

describe("byPeriod", () => {
  it("groups composers by era in chronological order, unknown eras last", () => {
    const groups = byPeriod([
      c("brahms", "Romantic", 1833),
      c("bach", "Baroque", 1685),
      c("handel", "Baroque", 1685),
      c("someone", null, null),
      c("glass", "Post-War", 1937),
    ]);
    expect(groups.map((g) => [g.name, g.composers.map((x) => x.id)])).toEqual([
      ["Baroque", ["bach", "handel"]],
      ["Romantic", ["brahms"]],
      ["Post-War", ["glass"]],
      ["Other", ["someone"]],
    ]);
  });

  it("keeps eras typed by hand that Open Opus doesn't use, before Other", () => {
    const groups = byPeriod([c("x", "Galant", 1720), c("y", null, null)]);
    expect(groups.map((g) => g.name)).toEqual(["Galant", "Other"]);
  });
});

describe("byMovement", () => {
  const composers = [
    c("debussy", "Late Romantic", 1862, ["Impressionism"]),
    c("ravel", "20th Century", 1875, ["Impressionism", "Neoclassicism"]),
    c("stravinsky", "20th Century", 1882, ["Neoclassicism"]),
    c("mussorgsky", "Romantic", 1839, ["The Five"]),
    c("brahms", "Romantic", 1833),
    c("bach", "Baroque", 1685),
  ];
  const groups = byMovement(composers);
  const names = groups.map((g) => g.name);

  it("puts a composer in each of their movements", () => {
    const members = (name: string) =>
      groups.find((g) => g.name === name)!.composers.map((x) => x.id);
    expect(members("Impressionism")).toEqual(["debussy", "ravel"]);
    expect(members("Neoclassicism")).toEqual(["ravel", "stravinsky"]);
  });

  it("puts untagged composers under their period", () => {
    const romantic = groups.find((g) => g.name === "Romantic")!;
    expect(romantic.kind).toBe("period");
    expect(romantic.composers.map((x) => x.id)).toEqual(["brahms"]);
    expect(groups.find((g) => g.name === "The Five")!.kind).toBe("movement");
  });

  it("orders groups by their members' average birth year", () => {
    expect(names).toEqual([
      "Baroque",
      "Romantic",
      "The Five",
      "Impressionism",
      "Neoclassicism",
    ]);
  });
});
