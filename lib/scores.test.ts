import { describe, expect, it } from "vitest";
import { imslpSearchUrl, labelFromFilename } from "./scores";

describe("labelFromFilename", () => {
  it.each([
    ["Mozart_K550_full-score.pdf", "Mozart K550 full score"],
    ["Piano Reduction.PDF", "Piano Reduction"],
    ["score", "score"],
  ])("%s → %s", (name, label) => {
    expect(labelFromFilename(name)).toBe(label);
  });
});

describe("imslpSearchUrl", () => {
  const query = (url: string) => new URL(url).searchParams.get("q");

  it("searches Google within imslp.org for the full work description", () => {
    const url = imslpSearchUrl({
      catalogueNum: "Op. 67",
      title: "Symphony No. 5",
      key: "C minor",
      composer: "Ludwig van Beethoven",
    });
    expect(url.startsWith("https://www.google.com/search?q=")).toBe(true);
    expect(query(url)).toBe(
      "site:imslp.org Op. 67 Symphony No. 5, C minor Ludwig van Beethoven",
    );
  });

  it("leaves out a missing catalogue number and key", () => {
    const url = imslpSearchUrl({
      catalogueNum: null,
      title: "Cello Suite No. 1",
      key: null,
      composer: "Johann Sebastian Bach",
    });
    expect(query(url)).toBe(
      "site:imslp.org Cello Suite No. 1 Johann Sebastian Bach",
    );
  });
});
