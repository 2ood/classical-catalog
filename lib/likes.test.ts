import { describe, expect, it } from "vitest";
import { likedList, parseLike } from "./likes";

const REC = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";

describe("parseLike", () => {
  it("takes a movement of a recording, or the recording\x27s piece", () => {
    expect(
      parseLike({ recordingId: REC, movementId: "m2", liked: true }),
    ).toEqual({
      ok: true,
      value: { recordingId: REC, movementId: "m2", liked: true },
    });
    expect(parseLike({ recordingId: REC, liked: false })).toEqual({
      ok: true,
      value: { recordingId: REC, movementId: "", liked: false },
    });
  });

  it.each([
    ["a malformed recording id", { recordingId: "x", liked: true }],
    ["no liked flag", { recordingId: REC }],
    ["no object", null],
  ])("rejects %s", (_, body) => {
    expect(parseLike(body).ok).toBe(false);
  });
});

describe("likedList", () => {
  const fifth = {
    composer: { slug: "beethoven", name: "Ludwig van Beethoven", born: 1770 },
    work: {
      slug: "symphony-no-5-op-67",
      title: "Symphony No. 5",
      catalogueNum: "Op. 67",
      movements: [
        { id: "m1", name: "Allegro con brio" },
        { id: "m2", name: "Andante con moto" },
      ],
    },
  };
  const ballade = {
    composer: { slug: "chopin", name: "Frédéric Chopin", born: 1810 },
    work: {
      slug: "ballade-no-1-op-23",
      title: "Ballade No. 1",
      catalogueNum: "Op. 23",
      movements: [],
    },
  };
  const rec = (id: string, performer: string) => ({
    recording: { id, performer },
  });

  it("groups likes by composer, work and movement order, with their performers", () => {
    expect(
      likedList([
        { ...ballade, ...rec("r9", "Seong-Jin Cho"), movementId: "" },
        {
          ...fifth,
          ...rec("r2", "Sir Simon Rattle / Berliner Philharmoniker"),
          movementId: "m2",
        },
        { ...fifth, ...rec("r1", "Karajan / BPO"), movementId: "m2" },
        { ...fifth, ...rec("r1", "Karajan / BPO"), movementId: "m1" },
      ]),
    ).toEqual([
      {
        composer: "Ludwig van Beethoven",
        items: [
          {
            label: "Op. 67 Symphony No. 5 · I. Allegro con brio",
            performer: "Karajan / BPO",
            href: "/composer/beethoven/symphony-no-5-op-67/i-allegro-con-brio?recording=r1",
          },
          {
            label: "Op. 67 Symphony No. 5 · II. Andante con moto",
            performer: "Karajan / BPO",
            href: "/composer/beethoven/symphony-no-5-op-67/ii-andante-con-moto?recording=r1",
          },
          {
            label: "Op. 67 Symphony No. 5 · II. Andante con moto",
            performer: "Sir Simon Rattle / Berliner Philharmoniker",
            href: "/composer/beethoven/symphony-no-5-op-67/ii-andante-con-moto?recording=r2",
          },
        ],
      },
      {
        composer: "Frédéric Chopin",
        items: [
          {
            label: "Op. 23 Ballade No. 1",
            performer: "Seong-Jin Cho",
            href: "/composer/chopin/ballade-no-1-op-23?recording=r9",
          },
        ],
      },
    ]);
  });

  it("drops likes of movements the work no longer has", () => {
    expect(
      likedList([{ ...fifth, ...rec("r1", "Karajan"), movementId: "gone" }]),
    ).toEqual([]);
  });
});
