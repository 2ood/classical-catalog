import { describe, expect, it } from "vitest";
import { imslpSearchUrl, labelFromFilename, scoreFileName } from "./scores";

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

describe("scoreFileName", () => {
  it("files a score under its composer and work, named after its label", () => {
    expect(
      scoreFileName(
        "brahms",
        "klavierstucke-op-118",
        "IMSLP08450 Brahms Op.118 Sauer",
        new Set(),
      ),
    ).toBe("brahms/klavierstucke-op-118/imslp08450-brahms-op-118-sauer.pdf");
  });

  it("numbers a name the work already has", () => {
    expect(
      scoreFileName(
        "chopin",
        "ballade-no-1-op-23",
        "Urtext",
        new Set(["chopin/ballade-no-1-op-23/urtext.pdf"]),
      ),
    ).toBe("chopin/ballade-no-1-op-23/urtext-2.pdf");
  });

  it("keeps file names short enough for Windows paths, cut at a word", () => {
    const name = scoreFileName(
      "beethoven",
      "piano-sonata-no-14-moonlight-op-27-no-2",
      "IMSLP90660 PMLP01458 Beethoven, Lv, Piano Sonata No.14, Op.27 No.2, EdMoscheles",
      new Set(),
    );
    expect(name).toBe(
      "beethoven/piano-sonata-no-14-moonlight-op-27-no-2/imslp90660-pmlp01458-beethoven-lv-piano.pdf",
    );
  });

  it("names an unlabelled score plainly", () => {
    expect(scoreFileName("ravel", "bolero", "  ", new Set())).toBe(
      "ravel/bolero/score.pdf",
    );
  });
});
