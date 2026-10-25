import { describe, expect, it } from "vitest";
import { builtInSchools, cleanSchool, parseSchools } from "./schools";

describe("builtInSchools", () => {
  it.each([
    ["Arnold Schoenberg", ["Second Viennese School"]],
    ["Modest Mussorgsky", ["The Five"]],
    ["Francis Poulenc", ["Les Six"]],
    ["Claude Debussy", ["Impressionism"]],
    ["Antonín Dvořák", ["Nationalism"]],
    ["Wolfgang Amadeus Mozart", ["First Viennese School"]],
    ["Josquin Des Prez", ["Franco-Flemish School"]],
    ["Frédéric Chopin", []],
  ])("%s → %j", (name, schools) => {
    expect(builtInSchools(name)).toEqual(schools);
  });

  it("ignores accents and case in names", () => {
    expect(builtInSchools("antonin dvorak")).toEqual(["Nationalism"]);
  });
});

describe("cleanSchool", () => {
  it.each([
    ["impressionism in music", "Impressionism"],
    ["minimal music", "Minimalism"],
    ["Symbolism", "Symbolism"],
    ["neoclassicism", "Neoclassicism"],
    ["expressionism", "Expressionism"],
    ["musical nationalism", "Nationalism"],
    ["Second Viennese School", "Second Viennese School"],
    ["verismo", "Verismo"],
  ])("%s → %s", (label, school) => {
    expect(cleanSchool(label)).toBe(school);
  });

  it.each([
    "Romantic music",
    "Baroque music",
    "Classical period",
    "Renaissance music",
    "contemporary classical music",
    "20th-century classical music",
    "modernism",
  ])("drops the period-like %s", (label) => {
    expect(cleanSchool(label)).toBeNull();
  });
});

describe("parseSchools", () => {
  it("trims, drops blanks and repeats, keeping the first spelling", () => {
    expect(
      parseSchools({
        schools: [" Impressionism ", "", "impressionism", "Les Six"],
      }),
    ).toEqual({ ok: true, value: ["Impressionism", "Les Six"] });
  });

  it.each([
    ["a non-list", { schools: "Impressionism" }],
    ["too long a name", { schools: ["x".repeat(61)] }],
    ["too many", { schools: Array.from({ length: 21 }, (_, i) => `S${i}`) }],
  ])("rejects %s", (_, body) => {
    expect(parseSchools(body).ok).toBe(false);
  });
});
