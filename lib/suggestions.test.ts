import { describe, expect, it } from "vitest";
import {
  recordingPreview,
  searchQuery,
  toSuggestions,
  tracksForMovements,
  workTrack,
  type SpotifyAlbum,
} from "./suggestions";

const composer = { name: "Johannes Brahms", shortName: "Brahms" };

describe("searchQuery", () => {
  it("names the composer, the work and its catalogue number", () => {
    expect(
      searchQuery(composer, {
        title: "Klavierstücke",
        catalogueNum: "Op. 118",
      }),
    ).toBe("Brahms Klavierstücke Op. 118");
  });

  it("drops quote marks around nicknames", () => {
    expect(
      searchQuery(
        { name: "Ludwig van Beethoven", shortName: "Beethoven" },
        {
          title: "Piano Sonata No. 14 “Moonlight”",
          catalogueNum: "Op. 27 No. 2",
        },
      ),
    ).toBe("Beethoven Piano Sonata No. 14 Moonlight Op. 27 No. 2");
  });
});

const album = (over: Partial<SpotifyAlbum> = {}): SpotifyAlbum => ({
  id: "5Z9iiGl2FcIfa3BMiv6OIw",
  name: "Brahms: Piano Pieces",
  release_date: "2017-03-24",
  artists: [{ name: "Johannes Brahms" }, { name: "Arcadi Volodos" }],
  ...over,
});

describe("toSuggestions", () => {
  it("lists albums with their performers, year and link", () => {
    expect(toSuggestions([album()], composer)).toEqual([
      {
        albumId: "5Z9iiGl2FcIfa3BMiv6OIw",
        name: "Brahms: Piano Pieces",
        performer: "Arcadi Volodos",
        year: 2017,
        url: "https://open.spotify.com/album/5Z9iiGl2FcIfa3BMiv6OIw",
      },
    ]);
  });

  it("joins several performers like hand-entered ones", () => {
    const [s] = toSuggestions(
      [
        album({
          artists: [
            { name: "Ludwig van Beethoven" },
            { name: "Herbert von Karajan" },
            { name: "Berliner Philharmoniker" },
          ],
        }),
      ],
      { name: "Ludwig van Beethoven", shortName: "Beethoven" },
    );
    expect(s.performer).toBe("Herbert von Karajan / Berliner Philharmoniker");
  });

  it("keeps the composer when they are the only artist", () => {
    const [s] = toSuggestions(
      [album({ artists: [{ name: "Johannes Brahms" }] })],
      composer,
    );
    expect(s.performer).toBe("Johannes Brahms");
  });

  it("puts albums that name the work first", () => {
    const names = toSuggestions(
      [
        album({ id: "a", name: "Rachmaninoff: Piano Concerto No. 3 (Live)" }),
        album({ id: "b", name: "Rachmaninov: Piano Concertos Nos. 1 & 2" }),
        album({ id: "c", name: "Piano Concerto No.2 In C Minor Opus 18" }),
      ],
      composer,
      { title: "Piano Concerto No. 2", catalogueNum: "Op. 18" },
    ).map((s) => s.albumId);
    expect(names).toEqual(["c", "a", "b"]);
  });

  it("reads the year from partial release dates", () => {
    const [s] = toSuggestions([album({ release_date: "1963" })], composer);
    expect(s.year).toBe(1963);
  });
});

const track = (n: number, name: string) => ({
  id: `t${n}`,
  name,
});

describe("tracksForMovements", () => {
  const movements = [
    { id: "m1", name: "Intermezzo in a-Moll" },
    { id: "m2", name: "Intermezzo in A-Dur" },
    { id: "m3", name: "Ballade in g-Moll" },
  ];
  const work = { title: "Klavierstücke", catalogueNum: "Op. 118" };

  it("gives each movement its track, in order, when the counts agree", () => {
    const tracks = [
      track(1, "8 Klavierstücke, Op. 76: No. 1 Capriccio"),
      track(2, "6 Klavierstücke, Op. 118: No. 1, Intermezzo in A Minor"),
      track(3, "6 Klavierstücke, Op. 118: No. 2, Intermezzo in A Major"),
      track(4, "6 Klavierstücke, Op.118: No. 3, Ballade in G Minor"),
      track(5, "Op. 1180 does not exist"),
    ];
    expect(tracksForMovements(tracks, work, movements)).toEqual({
      m1: "https://open.spotify.com/track/t2",
      m2: "https://open.spotify.com/track/t3",
      m3: "https://open.spotify.com/track/t4",
    });
  });

  it("gives nothing when the album's tracks don't line up", () => {
    const tracks = [
      track(1, "6 Klavierstücke, Op. 118: No. 1"),
      track(2, "6 Klavierstücke, Op. 118: No. 2"),
    ];
    expect(tracksForMovements(tracks, work, movements)).toEqual({});
  });

  it("matches by title when the work has no catalogue number", () => {
    const tracks = [
      track(1, "Symphony No. 10: I. Andante"),
      track(2, "Symphony No. 10: II. Scherzo"),
    ];
    expect(
      tracksForMovements(
        tracks,
        { title: "Symphony No. 10", catalogueNum: null },
        movements.slice(0, 2),
      ),
    ).toEqual({
      m1: "https://open.spotify.com/track/t1",
      m2: "https://open.spotify.com/track/t2",
    });
  });
});

describe("recordingPreview", () => {
  const work = {
    title: "Klavierstücke",
    catalogueNum: "Op. 118",
    movements: [
      { id: "m1", name: "Intermezzo" },
      { id: "m2", name: "Intermezzo" },
    ],
  };
  const tracks = [
    track(1, "Waltzes, Op. 39: No. 1"),
    track(2, "Klavierstücke, Op. 118: I"),
    track(3, "Klavierstücke, Op. 118: II"),
  ];

  it("reads performers and year and matches tracks to movements", () => {
    const preview = recordingPreview(album(), tracks, composer, work);
    expect(preview).toMatchObject({
      performer: "Arcadi Volodos",
      year: 2017,
      mediaUrl: "https://open.spotify.com/album/5Z9iiGl2FcIfa3BMiv6OIw",
      movementStarts: {
        m1: "https://open.spotify.com/track/t2",
        m2: "https://open.spotify.com/track/t3",
      },
    });
  });

  it("lists the work's own tracks first, then the rest of the album", () => {
    const preview = recordingPreview(album(), tracks, composer, work);
    expect(preview.tracks.map((t) => t.name)).toEqual([
      "Klavierstücke, Op. 118: I",
      "Klavierstücke, Op. 118: II",
      "Waltzes, Op. 39: No. 1",
    ]);
    expect(preview.tracks[0].url).toBe("https://open.spotify.com/track/t2");
  });
});

describe("single pieces (works without movements)", () => {
  const bolero = { title: "Boléro", catalogueNum: null, movements: [] };
  const ballade = {
    title: "Ballade No. 2",
    catalogueNum: "Op. 38",
    movements: [],
  };

  it("finds the work's one track in an album", () => {
    expect(
      workTrack(
        [track(1, "Rapsodie espagnole"), track(2, "Boléro, M. 81")],
        bolero,
      ),
    ).toBe("https://open.spotify.com/track/t2");
  });

  it("gives up when the album has several tracks for it, or none", () => {
    const tracks = [
      track(1, "Ballade No. 2, Op. 38"),
      track(2, "Op. 38 (alternative take)"),
    ];
    expect(workTrack(tracks, ballade)).toBeNull();
    expect(
      workTrack([track(3, "Piano Concerto No. 1, Op. 11")], ballade),
    ).toBeNull();
  });

  it("previews an album as the work's own track", () => {
    const preview = recordingPreview(
      album(),
      [
        track(1, "Piano Concerto No. 1, Op. 11: I."),
        track(2, "Ballade No. 2 in F Major, Op. 38"),
      ],
      composer,
      ballade,
    );
    expect(preview.mediaUrl).toBe("https://open.spotify.com/track/t2");
    expect(preview.movementStarts).toEqual({});
    // Still listed, to pick another by hand.
    expect(preview.tracks.map((t) => t.url)[0]).toBe(
      "https://open.spotify.com/track/t2",
    );
  });

  it("keeps the album link when it can't tell which track is the work", () => {
    const preview = recordingPreview(
      album(),
      [track(1, "Etudes, Op. 10")],
      composer,
      ballade,
    );
    expect(preview.mediaUrl).toBe(
      "https://open.spotify.com/album/5Z9iiGl2FcIfa3BMiv6OIw",
    );
  });
});
