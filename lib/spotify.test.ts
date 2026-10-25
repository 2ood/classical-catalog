// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  authorizeUrl,
  createVerifier,
  movementForTrack,
  pkceChallenge,
  playRequest,
  SCOPES,
  spotifyUri,
} from "./spotify";

const ALBUM = "https://open.spotify.com/album/6Pqlj0jyStFJgTidjdLGHC";
const TRACK_I = "https://open.spotify.com/track/0eBr9W1GE5nou99gRdy02J";
const TRACK_II = "https://open.spotify.com/track/3Hfv8h49DVUT4uHd2Tu7Fd";

describe("PKCE", () => {
  it("derives the challenge from the verifier (RFC 7636 appendix B)", async () => {
    expect(
      await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    ).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("creates long, URL-safe, unique verifiers", () => {
    const a = createVerifier();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(createVerifier()).not.toBe(a);
  });
});

describe("authorizeUrl", () => {
  it("asks for a code with PKCE and the playback scopes", () => {
    const url = new URL(
      authorizeUrl({
        clientId: "abc",
        redirectUri: "http://127.0.0.1:3000/api/spotify/callback",
        state: "xyz",
        challenge: "chal",
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://accounts.spotify.com/authorize",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "abc",
      response_type: "code",
      redirect_uri: "http://127.0.0.1:3000/api/spotify/callback",
      state: "xyz",
      code_challenge_method: "S256",
      code_challenge: "chal",
      scope: SCOPES.join(" "),
    });
    expect(SCOPES).toEqual(
      expect.arrayContaining([
        "user-read-playback-state",
        "user-modify-playback-state",
      ]),
    );
  });
});

describe("spotifyUri", () => {
  it("turns open.spotify.com links into spotify: URIs", () => {
    expect(spotifyUri(ALBUM)).toBe("spotify:album:6Pqlj0jyStFJgTidjdLGHC");
    expect(spotifyUri(TRACK_I)).toBe("spotify:track:0eBr9W1GE5nou99gRdy02J");
    expect(spotifyUri("https://example.com")).toBeNull();
  });
});

describe("playRequest", () => {
  const OTHER_ALBUM = "spotify:album:2dqxgHW833vIT73bJXi01h";

  it("plays the movement's track within its own album", () => {
    // The track may come from a different release than the recording's
    // album; Spotify can only start at an offset inside the track's album.
    expect(playRequest(ALBUM, { track: TRACK_II, album: OTHER_ALBUM })).toEqual(
      {
        context_uri: OTHER_ALBUM,
        offset: { uri: "spotify:track:3Hfv8h49DVUT4uHd2Tu7Fd" },
      },
    );
    expect(
      playRequest(TRACK_I, { track: TRACK_II, album: OTHER_ALBUM }),
    ).toEqual({
      context_uri: OTHER_ALBUM,
      offset: { uri: "spotify:track:3Hfv8h49DVUT4uHd2Tu7Fd" },
    });
  });

  it("plays just the movement's track when its album is unknown", () => {
    expect(playRequest(ALBUM, { track: TRACK_II, album: null })).toEqual({
      uris: ["spotify:track:3Hfv8h49DVUT4uHd2Tu7Fd"],
    });
  });

  it("plays the recording from the start without a movement", () => {
    expect(playRequest(ALBUM, null)).toEqual({
      context_uri: "spotify:album:6Pqlj0jyStFJgTidjdLGHC",
    });
    expect(playRequest(TRACK_I, null)).toEqual({
      uris: ["spotify:track:0eBr9W1GE5nou99gRdy02J"],
    });
  });

  it("is null for a link that is not Spotify", () => {
    expect(playRequest("https://example.com", null)).toBeNull();
  });
});

describe("movementForTrack", () => {
  it("finds the movement whose track is playing", () => {
    const starts = { m1: TRACK_I, m2: TRACK_II, m3: 120 };
    expect(movementForTrack(starts, "3Hfv8h49DVUT4uHd2Tu7Fd")).toBe("m2");
    expect(movementForTrack(starts, "somethingElse000000000")).toBeNull();
  });
});
