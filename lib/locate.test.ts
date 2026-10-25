import { describe, expect, it } from "vitest";
import { pathForTrack } from "./locate";

const T1 = "0eBr9W1GE5nou99gRdy02J";
const T2 = "3Hfv8h49DVUT4uHd2Tu7Fd";
const ALBUM = "6Pqlj0jyStFJgTidjdLGHC";

const fifth = {
  composerSlug: "beethoven",
  workSlug: "symphony-no-5-op-67",
  movements: [
    { id: "m1", name: "Allegro con brio" },
    { id: "m2", name: "Andante con moto" },
  ],
  movementStarts: {
    m1: `https://open.spotify.com/track/${T1}`,
    m2: `https://open.spotify.com/track/${T2}`,
  },
  mediaUrl: `https://open.spotify.com/album/${ALBUM}`,
};

describe("pathForTrack", () => {
  it("opens the work at the movement the track belongs to", () => {
    expect(pathForTrack([fifth], T2, ALBUM)).toBe(
      "/composer/beethoven/symphony-no-5-op-67/ii-andante-con-moto",
    );
  });

  it("opens the work when only its recording's album matches", () => {
    expect(pathForTrack([fifth], "zzzzzzzzzzzzzzzzzzzzzz", ALBUM)).toBe(
      "/composer/beethoven/symphony-no-5-op-67",
    );
  });

  it("prefers a movement match over an album match elsewhere", () => {
    const other = {
      ...fifth,
      workSlug: "symphony-no-7-op-92",
      movementStarts: {},
    };
    expect(pathForTrack([other, fifth], T1, ALBUM)).toBe(
      "/composer/beethoven/symphony-no-5-op-67/i-allegro-con-brio",
    );
  });

  it("is null when nothing matches", () => {
    expect(
      pathForTrack([fifth], "zzzzzzzzzzzzzzzzzzzzzz", "yyyyyyyyyyyyyyyyyyyyyy"),
    ).toBeNull();
  });
});
