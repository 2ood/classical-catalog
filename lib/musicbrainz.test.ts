// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchArtistWorks,
  findArtist,
  matchMovements,
  movementName,
  parentsFrom,
  type MbWork,
} from "./musicbrainz";

describe("movementName", () => {
  it.each([
    [
      "Symphony no. 9 in D minor, op. 125 “Choral”: II. Molto vivace – Presto – Scherzo",
      "Symphony no. 9 in D minor, op. 125 “Choral”",
      "Molto vivace – Presto – Scherzo",
    ],
    [
      // The part's title can name a different version of the parent.
      "Symphony No. 5 in C Minor, Op. 67 (Arr. for Orchestra by Gustav Mahler): I. Allegro con brio",
      "Symphony No. 5 in C minor, op. 67",
      "Allegro con brio",
    ],
    [
      "6 Klavierstücke, op. 118: Nr. 2. Intermezzo in A-Dur. Andante teneramente",
      "6 Klavierstücke, op. 118",
      "Intermezzo in A-Dur. Andante teneramente",
    ],
    [
      "6 Variations for 2 Pianos in D major on “Ich denke dein”, WoO 74: Thema",
      "6 Variations for 2 Pianos in D major on “Ich denke dein”, WoO 74",
      "Thema",
    ],
    [
      // A colon inside quotes is part of the name.
      'Song for Voice and Piano, op. 48 no. 1 in E major: Feierlich und mit Andacht "Bitten: Gott deine Gute reicht so"',
      "6 Lieder, op. 48",
      "Feierlich und mit Andacht “Bitten: Gott deine Gute reicht so”",
    ],
    [
      '26 Welsh Songs WoO 155, No. 1, "Sion, the Son of Evan"',
      "26 Welsh Songs for one to two Voices, Violin, Violoncello and Piano, WoO 155",
      "Sion, the Son of Evan",
    ],
    [
      "12 Deutsche Tänze WoO 13 No. 1 in D major",
      "12 German Dances for Piano, WoO 13",
      "No. 1 in D major",
    ],
    [
      'Songs of Various Nationalities, WoO 157: No. 1, "God Save the King"',
      "12 Songs of Various Nationalities, WoO 157",
      "God Save the King",
    ],
    [
      "Symphonic Dances, op. 45: no. 1, Non Allegro",
      "Symphonic Dances, op. 45",
      "Non Allegro",
    ],
    [
      "11 Bagatelles, op. 119: No. 1 in G minor: Allegretto",
      "11 Bagatelles, op. 119",
      "No. 1 in G minor: Allegretto",
    ],
  ])("%s", (part, parent, name) => {
    expect(movementName(part, parent)).toBe(name);
  });
});

const part = (title: string, key?: number) => ({
  type: "parts",
  direction: "forward",
  "ordering-key": key,
  work: { id: title, title },
});

const mbWork = (title: string, parts: ReturnType<typeof part>[]): MbWork => ({
  id: title,
  title,
  relations: [
    ...parts,
    // Movements point back at their parent; that is not a part.
    { type: "parts", direction: "backward", work: { id: "x", title: "x" } },
  ],
});

const fifth = (prefix: string) =>
  mbWork(prefix, [
    part(`${prefix}: II. Andante con moto`, 2),
    part(`${prefix}: I. Allegro con brio`, 1),
    part(`${prefix}: III. Scherzo. Allegro`, 3),
    part(`${prefix}: IV. Allegro`, 4),
  ]);

describe("parentsFrom", () => {
  it("keeps works with parts, ordered and named", () => {
    const parents = parentsFrom([
      fifth("Symphony no. 5 in C minor, op. 67"),
      mbWork("Symphony no. 5 in C minor, op. 67: I. Allegro con brio", []),
    ]);
    expect(parents).toEqual([
      {
        title: "Symphony no. 5 in C minor, op. 67",
        movements: [
          "Allegro con brio",
          "Andante con moto",
          "Scherzo. Allegro",
          "Allegro",
        ],
      },
    ]);
  });

  it("puts parts without an ordering key last", () => {
    const [parent] = parentsFrom([
      mbWork("Variations, WoO 74", [
        part("Variations, WoO 74: Coda"),
        part("Variations, WoO 74: Thema", 1),
        part("Variations, WoO 74: Variation 1", 2),
      ]),
    ]);
    expect(parent.movements).toEqual(["Thema", "Variation 1", "Coda"]);
  });

  it("skips arrangements and sections that have parts of their own", () => {
    expect(
      parentsFrom([
        fifth("Symphony no. 5 in C minor, op. 67, arr. for piano"),
        fifth("Symphony no. 5 in C minor, op. 67, S. 464 no. 5"),
        mbWork("Missa solemnis, op. 123: I. Kyrie", [
          part("Kyrie: Kyrie eleison", 1),
          part("Kyrie: Christe eleison", 2),
        ]),
      ]),
    ).toEqual([]);
  });
});

describe("matchMovements", () => {
  const parents = [
    {
      title: "Symphony no. 5 in C minor, op. 67",
      movements: [
        "Allegro con brio",
        "Andante con moto",
        "Scherzo. Allegro",
        "Allegro",
      ],
    },
    {
      title: "Symphony No. 5 in C minor, op. 67",
      movements: [
        "Allegro con brio",
        "Andante con moto",
        "Scherzo. Allegro",
        "Allegro",
      ],
    },
    {
      title: "Symphony no. 5 in C minor, op. 67 (fragment)",
      movements: ["Allegro con brio", "Andante con moto"],
    },
    {
      title: "Symphony no. 10 in E-flat major",
      movements: ["Andante", "Allegro"],
    },
    {
      title: "6 Klavierstücke, op. 118",
      movements: [
        "Intermezzo",
        "Intermezzo",
        "Ballade",
        "Intermezzo",
        "Romanze",
        "Intermezzo",
      ],
    },
  ];

  it("matches by catalogue number, taking the most common movement list", () => {
    const works = [
      { id: "w1", title: "Symphony No. 5", catalogueNum: "Op. 67" },
    ];
    expect(matchMovements(works, parents).get("w1")).toEqual(
      parents[0].movements,
    );
  });

  it("matches a collection's pieces the same way", () => {
    const works = [
      { id: "w2", title: "6 Klavierstücke", catalogueNum: "Op. 118" },
    ];
    expect(matchMovements(works, parents).get("w2")).toHaveLength(6);
  });

  it("matches by title when the work has no catalogue number", () => {
    const works = [{ id: "w3", title: "Symphony No. 10", catalogueNum: null }];
    expect(matchMovements(works, parents).get("w3")).toEqual([
      "Andante",
      "Allegro",
    ]);
  });

  it("leaves works MusicBrainz has no parts for", () => {
    const works = [{ id: "w4", title: "Grosse Fuge", catalogueNum: "Op. 133" }];
    expect(matchMovements(works, parents).has("w4")).toBe(false);
  });
});

describe("MusicBrainz requests", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("finds the composer with matching name and birth year", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        artists: [
          { id: "a1", name: "Franz Schubert", "life-span": {} },
          {
            id: "a2",
            name: "Franz Schubert",
            "life-span": { begin: "1797-01-31" },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await findArtist("Franz Schubert", 1797)).toBe("a2");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain("musicbrainz.org/ws/2/artist");
    expect(new Headers(init.headers).get("user-agent")).toMatch(
      /classical-catalog/,
    );
  });

  it("finds a composer whose main name is in another script", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        artists: [
          {
            id: "rach",
            name: "Сергей Васильевич Рахманинов",
            "sort-name": "Rachmaninoff, Sergei Vasilievich",
            "life-span": { begin: "1873-04-01" },
            aliases: [{ name: "Sergei Rachmaninoff" }],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await findArtist("Sergei Rachmaninoff", 1873)).toBe("rach");
    // Searches every name field, not only the main name.
    const [[url]] = fetchMock.mock.calls as unknown as [[string]];
    expect(decodeURIComponent(url)).not.toContain('artist:"');
  });

  it("matches the sort name in any word order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          artists: [
            {
              id: "a1",
              name: "Пётр Ильич Чайковский",
              "sort-name": "Tchaikovsky, Pyotr Ilyich",
              "life-span": { begin: "1840-05-07" },
            },
          ],
        }),
      ),
    );
    expect(await findArtist("Pyotr Ilyich Tchaikovsky", 1840)).toBe("a1");
  });

  it("tells namesakes apart by birth year", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          artists: [
            { id: "i", name: "Johann Strauss", "life-span": { begin: "1804" } },
            {
              id: "ii",
              name: "Johann Strauss II",
              "life-span": { begin: "1825-10-25" },
            },
          ],
        }),
      ),
    );
    expect(await findArtist("Johann Strauss II", 1825)).toBe("ii");
    expect(await findArtist("Johann Strauss", 1804)).toBe("i");
  });

  it("trusts the only composer of that name when birth years disagree", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          artists: [
            {
              id: "a1",
              name: "Alessandro Marcello",
              "life-span": { begin: "1673-02-01" },
            },
          ],
        }),
      ),
    );
    // Open Opus has 1684; early dates often differ between sources.
    expect(await findArtist("Alessandro Marcello", 1684)).toBe("a1");
  });

  it("returns null when no composer matches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ artists: [] })),
    );
    expect(await findArtist("Nobody", 1900)).toBeNull();
  });

  it("pages through an artist's works, reporting progress and retrying failures", async () => {
    const page = (offset: number) =>
      Response.json({
        "work-count": 150,
        works: Array.from({ length: offset ? 50 : 100 }, (_, i) => ({
          id: `w${offset + i}`,
          title: `Work ${offset + i}`,
        })),
      });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(page(0))
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(page(100));
    vi.stubGlobal("fetch", fetchMock);
    const progress: [number, number][] = [];

    const works = await fetchArtistWorks(
      "a1",
      (done, total) => progress.push([done, total]),
      async () => {},
    );
    expect(works).toHaveLength(150);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toContain("offset=100");
    expect(progress).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});
