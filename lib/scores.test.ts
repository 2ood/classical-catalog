import { describe, expect, it } from "vitest";
import { imslpSearchUrl, labelFromFilename, parseScoreInput } from "./scores";

const valid = {
  workId: "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f",
  blobUrl:
    "https://abc123.public.blob.vercel-storage.com/scores/x/full-score-Xy12.pdf",
  label: "  Full score ",
  source: "",
};

describe("parseScoreInput", () => {
  it("normalizes a valid input", () => {
    expect(parseScoreInput(valid)).toEqual({
      ok: true,
      value: {
        workId: valid.workId,
        blobUrl: valid.blobUrl,
        label: "Full score",
        source: null,
      },
    });
  });

  it.each([
    ["a non-object body", null],
    ["a malformed work id", { ...valid, workId: "x" }],
    [
      "a URL outside Vercel Blob",
      { ...valid, blobUrl: "https://example.com/a.pdf" },
    ],
    [
      "a look-alike host",
      {
        ...valid,
        blobUrl: "https://public.blob.vercel-storage.com.evil.io/a.pdf",
      },
    ],
    [
      "plain http",
      {
        ...valid,
        blobUrl: "http://abc123.public.blob.vercel-storage.com/a.pdf",
      },
    ],
    ["a missing URL", { ...valid, blobUrl: undefined }],
  ])("rejects %s", (_, input) => {
    expect(parseScoreInput(input)).toMatchObject({ ok: false });
  });
});

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
