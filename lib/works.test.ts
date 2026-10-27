import { describe, expect, it } from "vitest";
import { compareCatalogue, groupByGenre, searchWords } from "./works";

describe("compareCatalogue", () => {
  const sorted = (nums: (string | null)[]) => [...nums].sort(compareCatalogue);

  it("compares numbers numerically, not as text", () => {
    expect(sorted(["K. 550", "K. 9", "K. 41"])).toEqual([
      "K. 9",
      "K. 41",
      "K. 550",
    ]);
  });

  it("orders opus sub-numbers within an opus", () => {
    expect(
      sorted(["Op. 11", "Op. 10 No. 12", "Op. 10", "Op. 10 No. 2"]),
    ).toEqual(["Op. 10", "Op. 10 No. 2", "Op. 10 No. 12", "Op. 11"]);
  });

  it("handles letter suffixes and catalogue prefixes", () => {
    expect(sorted(["K. 525", "BWV 1007", "K. 384a", "BWV 988"])).toEqual([
      "BWV 988",
      "BWV 1007",
      "K. 384a",
      "K. 525",
    ]);
  });

  it("ignores case and spacing differences in the prefix", () => {
    expect(compareCatalogue("op. 5", "Op. 5")).toBe(0);
  });

  it("puts works without a catalogue number last", () => {
    expect(sorted([null, "Op. 2", "", "Op. 1"])).toEqual([
      "Op. 1",
      "Op. 2",
      null,
      "",
    ]);
  });
});

describe("groupByGenre", () => {
  const work = (genre: string, catalogueNum: string | null, title = "") => ({
    genre,
    catalogueNum,
    title,
  });

  it("groups by genre alphabetically, sorting each group by catalogue number", () => {
    const groups = groupByGenre([
      work("Symphony", "K. 550"),
      work("Serenade", "K. 525"),
      work("Symphony", "K. 41"),
      work("Symphony", "K. 9"),
    ]);
    expect(groups.map((g) => g.genre)).toEqual(["Serenade", "Symphony"]);
    expect(groups[1].works.map((w) => w.catalogueNum)).toEqual([
      "K. 9",
      "K. 41",
      "K. 550",
    ]);
  });

  it("falls back to title order for works without catalogue numbers", () => {
    const [group] = groupByGenre([
      work("Song", null, "Zueignung"),
      work("Song", null, "Allerseelen"),
    ]);
    expect(group.works.map((w) => w.title)).toEqual([
      "Allerseelen",
      "Zueignung",
    ]);
  });

  it("returns no groups for no works", () => {
    expect(groupByGenre([])).toEqual([]);
  });
});

describe("searchWords", () => {
  it.each([
    ["Klavierstücke Op.118", ["klavierstucke", "op", "118"]],
    ["  k550 ", ["k550"]],
    ["Brahms, Intermezzo", ["brahms", "intermezzo"]],
    ["", []],
  ])("%j → %j", (query, words) => {
    expect(searchWords(query)).toEqual(words);
  });
});
