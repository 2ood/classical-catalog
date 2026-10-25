import { describe, expect, it } from "vitest";
import { matchComposer, planImport } from "./import";
import type { OpenOpusComposer, OpenOpusWork } from "./openopus";

const work = (
  openOpusId: number,
  title: string,
  extra: Partial<OpenOpusWork> = {},
): OpenOpusWork => ({
  openOpusId,
  title,
  subtitle: "",
  genre: "Orchestral",
  popular: false,
  recommended: false,
  ...extra,
});

const emperor = work(
  16218,
  'Piano Concerto no. 5 in E flat major, op. 73, "Emperor"',
  {
    popular: true,
    recommended: true,
  },
);
const fugue = work(16260, "Grosse Fuge, op. 133", {
  subtitle: "For string quartet",
  genre: "Chamber",
});

describe("planImport", () => {
  it("adds every work of a new composer, parsed", () => {
    expect(planImport([], [emperor, fugue])).toEqual({
      inserts: [
        {
          openOpusId: 16218,
          title: "Piano Concerto No. 5 “Emperor”",
          slug: "piano-concerto-no-5-emperor-op-73",
          catalogueNum: "Op. 73",
          key: "E-flat major",
          genre: "Piano Concerto",
          popular: true,
          recommended: true,
        },
        {
          openOpusId: 16260,
          title: "Grosse Fuge",
          slug: "grosse-fuge-op-133",
          catalogueNum: "Op. 133",
          key: null,
          genre: "String Quartet", // from the subtitle "For string quartet"
          popular: false,
          recommended: false,
        },
      ],
      links: [],
    });
  });

  it("re-importing adds only works it doesn't have yet", () => {
    const existing = [
      {
        id: "w1",
        catalogueNum: "Op. 73",
        title: "Piano Concerto No. 5",
        slug: "piano-concerto-no-5-op-73",
        openOpusId: 16218,
      },
    ];
    const plan = planImport(existing, [emperor, fugue]);
    expect(plan.inserts.map((w) => w.openOpusId)).toEqual([16260]);
    expect(plan.links).toEqual([]);
  });

  it("links a work entered by hand with the same catalogue number", () => {
    const existing = [
      {
        id: "w1",
        catalogueNum: "Op.73",
        title: "Emperor Concerto",
        slug: "emperor-concerto-op-73",
        openOpusId: null,
      },
    ];
    const plan = planImport(existing, [emperor, fugue]);
    expect(plan.links).toEqual([
      { workId: "w1", openOpusId: 16218, popular: true, recommended: true },
    ]);
    expect(plan.inserts.map((w) => w.openOpusId)).toEqual([16260]);
  });

  it("matches on any catalogue number in the Open Opus title", () => {
    const existing = [
      {
        id: "w1",
        catalogueNum: "Op. 50 No. 6",
        title: "String Quartet “Frog”",
        slug: "string-quartet-frog-op-50-no-6",
        openOpusId: null,
      },
    ];
    const frog = work(
      1,
      "String Quartet in D major, Hob.III:49, op. 50, no. 6",
    );
    expect(planImport(existing, [frog]).links[0]?.workId).toBe("w1");
  });

  it("matches by title when neither has a catalogue number", () => {
    const existing = [
      {
        id: "w1",
        catalogueNum: null,
        title: "Symphony No. 5",
        slug: "symphony-no-5",
        openOpusId: null,
      },
    ];
    const mahler5 = work(2, "Symphony no. 5 in C sharp minor");
    expect(planImport(existing, [mahler5]).links[0]?.workId).toBe("w1");
  });

  it("links a hand-entered work to one Open Opus work only", () => {
    const existing = [
      {
        id: "w1",
        catalogueNum: "BWV 1080",
        title: "Art of Fugue",
        slug: "art-of-fugue-bwv-1080",
        openOpusId: null,
      },
    ];
    const plan = planImport(existing, [
      work(3, "Art of the Fugue, BWV.1080"),
      work(4, "Art of the Fugue (arr. for orchestra), BWV.1080"),
    ]);
    expect(plan.links.map((l) => l.openOpusId)).toEqual([3]);
    expect(plan.inserts.map((w) => w.openOpusId)).toEqual([4]);
  });

  it("numbers a new work's slug when the composer already uses it", () => {
    const existing = [
      {
        id: "w1",
        catalogueNum: "Op. 999",
        title: "Grosse Fuge",
        slug: "grosse-fuge-op-133",
        openOpusId: null,
      },
    ];
    const plan = planImport(existing, [fugue, work(5, "Grosse Fuge, op. 133")]);
    expect(plan.inserts.map((w) => w.slug)).toEqual([
      "grosse-fuge-op-133-2",
      "grosse-fuge-op-133-3",
    ]);
  });
});

describe("matchComposer", () => {
  const beethoven: OpenOpusComposer = {
    openOpusId: 145,
    name: "Beethoven",
    completeName: "Ludwig van Beethoven",
    born: 1770,
    died: 1827,
    epoch: "Early Romantic",
  };

  it("finds a composer imported before by Open Opus id", () => {
    const locals = [{ id: "c1", name: "L. v. Beethoven", openOpusId: 145 }];
    expect(matchComposer(locals, beethoven)).toBe("c1");
  });

  it("finds a composer entered by hand by full name, ignoring case and accents", () => {
    const locals = [
      { id: "c1", name: "Antonin Dvorak", openOpusId: null },
      { id: "c2", name: "ludwig van beethoven", openOpusId: null },
    ];
    expect(matchComposer(locals, beethoven)).toBe("c2");
    expect(
      matchComposer(locals, {
        ...beethoven,
        openOpusId: 189,
        completeName: "Antonín Dvořák",
      }),
    ).toBe("c1");
  });

  it("does not take a hand-entered namesake already linked elsewhere", () => {
    const locals = [
      { id: "c1", name: "Ludwig van Beethoven", openOpusId: 999 },
    ];
    expect(matchComposer(locals, beethoven)).toBeUndefined();
  });
});
