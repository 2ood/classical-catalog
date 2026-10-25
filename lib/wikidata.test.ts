// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { wikidataIdOf } from "./musicbrainz";
import { wikidataSchools } from "./wikidata";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("wikidataIdOf", () => {
  it("reads the Wikidata link of a MusicBrainz artist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          relations: [
            { type: "official homepage", url: { resource: "https://x.org" } },
            {
              type: "wikidata",
              url: { resource: "https://www.wikidata.org/wiki/Q4700" },
            },
          ],
        }),
      ),
    );
    expect(await wikidataIdOf("a1", async () => {})).toBe("Q4700");
  });

  it("is null without one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ relations: [] })),
    );
    expect(await wikidataIdOf("a1", async () => {})).toBeNull();
  });
});

describe("wikidataSchools", () => {
  it("keeps the movements more specific than the period", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        results: {
          bindings: [
            { mLabel: { value: "impressionism in music" } },
            { mLabel: { value: "Symbolism" } },
            { mLabel: { value: "Romantic music" } },
          ],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await wikidataSchools("Q4700")).toEqual([
      "Impressionism",
      "Symbolism",
    ]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(decodeURIComponent(url)).toContain("wd:Q4700 wdt:P135");
    expect(new Headers(init.headers).get("user-agent")).toMatch(
      /classical-catalog/,
    );
  });

  it("rejects ids that aren't Wikidata items", async () => {
    await expect(wikidataSchools("Q1 } DROP")).rejects.toThrow();
  });
});
