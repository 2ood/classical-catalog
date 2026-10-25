// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import composersResponse from "./fixtures/openopus-composers.json";
import worksResponse from "./fixtures/openopus-works-145.json";
import { fetchComposers, fetchComposerWorks } from "./openopus";

function respondWith(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchComposers", () => {
  it("lists every composer with years from the dates", async () => {
    const fetchMock = respondWith(composersResponse);
    expect(await fetchComposers()).toEqual([
      {
        openOpusId: 149,
        name: "Adams",
        completeName: "John Adams",
        born: 1947,
        died: null,
        epoch: "21st Century",
      },
      {
        openOpusId: 145,
        name: "Beethoven",
        completeName: "Ludwig van Beethoven",
        born: 1770,
        died: 1827,
        epoch: "Early Romantic",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openopus.org/composer/list/name/all.json",
    );
  });

  it("fails when Open Opus is unreachable", async () => {
    respondWith({}, 503);
    await expect(fetchComposers()).rejects.toThrow(/Open Opus/);
  });
});

describe("fetchComposerWorks", () => {
  it("returns the composer and their works with flags as booleans", async () => {
    const fetchMock = respondWith(worksResponse);
    const { composer, works } = await fetchComposerWorks(145);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openopus.org/work/list/composer/145/genre/all.json",
    );
    expect(composer.completeName).toBe("Ludwig van Beethoven");
    expect(works).toHaveLength(3);
    expect(works[1]).toEqual({
      openOpusId: 16218,
      title: 'Piano Concerto no. 5 in E flat major, op. 73, "Emperor"',
      subtitle: "",
      genre: "Orchestral",
      popular: true,
      recommended: true,
    });
    expect(works[0].popular).toBe(false);
  });

  it("fails with Open Opus' reason for an unknown composer", async () => {
    respondWith({ status: { success: "false", error: "No works found" } });
    await expect(fetchComposerWorks(99999)).rejects.toThrow(/No works found/);
  });
});
