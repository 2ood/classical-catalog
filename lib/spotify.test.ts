// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  authorizeUrl,
  controlRequest,
  createVerifier,
  libraryRequest,
  movementForTrack,
  pkceChallenge,
  playRequest,
  SCOPES,
  spotifyUri,
  toPlayback,
  trackInRecording,
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
        // Liking tracks (PUT /me/library, GET /me/library/contains).
        "user-library-read",
        "user-library-modify",
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

describe("toPlayback", () => {
  // Trimmed from a live GET /me/player response.
  const live = {
    device: { name: "Desktop" },
    repeat_state: "track",
    is_playing: true,
    progress_ms: 61000,
    item: {
      id: "1lo4yMsQvwLUCO7q0YL102",
      uri: "spotify:track:1lo4yMsQvwLUCO7q0YL102",
      name: "6 Piano Pieces, Op. 118: No. 2, Intermezzo in A Major",
      artists: [{ name: "Johannes Brahms" }, { name: "Stephen Kovacevich" }],
      album: {
        id: "2MHT5GNYOAMOWZnntI70z2",
        name: "Brahms: Waltzes, Op. 39; Rhapsodies, Op. 79; Klavierstücke, Op. 118",
        images: [
          { height: 640, width: 640, url: "https://i.scdn.co/image/big" },
          { height: 300, width: 300, url: "https://i.scdn.co/image/mid" },
          { height: 64, width: 64, url: "https://i.scdn.co/image/small" },
        ],
      },
    },
  };

  it("keeps what the players show", () => {
    expect(toPlayback(live)).toEqual({
      isPlaying: true,
      progressMs: 61000,
      device: "Desktop",
      repeat: "track",
      track: {
        id: "1lo4yMsQvwLUCO7q0YL102",
        uri: "spotify:track:1lo4yMsQvwLUCO7q0YL102",
        name: "6 Piano Pieces, Op. 118: No. 2, Intermezzo in A Major",
        artists: "Johannes Brahms, Stephen Kovacevich",
        album: {
          id: "2MHT5GNYOAMOWZnntI70z2",
          name: "Brahms: Waltzes, Op. 39; Rhapsodies, Op. 79; Klavierstücke, Op. 118",
          cover: "https://i.scdn.co/image/mid",
        },
      },
    });
  });

  it("copes with no track, no device and no covers", () => {
    expect(
      toPlayback({ is_playing: false, item: null, repeat_state: "off" }),
    ).toEqual({
      isPlaying: false,
      progressMs: 0,
      device: null,
      repeat: "off",
      track: null,
    });
    const noCover = toPlayback({
      ...live,
      item: { ...live.item, album: { ...live.item.album, images: [] } },
    });
    expect(noCover.track?.album.cover).toBeNull();
  });
});

describe("controlRequest", () => {
  it.each([
    ["previous", { method: "POST", path: "/me/player/previous" }],
    ["next", { method: "POST", path: "/me/player/next" }],
    ["repeat-track", { method: "PUT", path: "/me/player/repeat?state=track" }],
    ["repeat-off", { method: "PUT", path: "/me/player/repeat?state=off" }],
  ])("%s", (action, request) => {
    expect(controlRequest(action)).toEqual(request);
  });

  it("knows nothing else", () => {
    expect(controlRequest("shuffle")).toBeNull();
  });
});

describe("libraryRequest", () => {
  const ID = "1lo4yMsQvwLUCO7q0YL102";
  const uris = "uris=spotify%3Atrack%3A1lo4yMsQvwLUCO7q0YL102";

  it("likes, unlikes and asks about a track by URI", () => {
    expect(libraryRequest(ID, true)).toEqual({
      method: "PUT",
      path: `/me/library?${uris}`,
    });
    expect(libraryRequest(ID, false)).toEqual({
      method: "DELETE",
      path: `/me/library?${uris}`,
    });
    expect(libraryRequest(ID, null)).toEqual({
      method: "GET",
      path: `/me/library/contains?${uris}`,
    });
  });

  it("only takes Spotify track ids", () => {
    expect(libraryRequest("x/../me", true)).toBeNull();
  });
});

describe("trackInRecording", () => {
  const album = {
    mediaUrl: ALBUM,
    movementStarts: { m1: TRACK_I },
  };
  const single = {
    mediaUrl: `${TRACK_II}?si=0a7d551317cf4936`,
    movementStarts: {},
  };

  it("knows a track of the recording's album or movements", () => {
    expect(
      trackInRecording(album, {
        id: "zzzzzzzzzzzzzzzzzzzzzz",
        albumId: "6Pqlj0jyStFJgTidjdLGHC",
      }),
    ).toBe(true);
    expect(
      trackInRecording(album, {
        id: "0eBr9W1GE5nou99gRdy02J",
        albumId: "other00000000000000000",
      }),
    ).toBe(true);
    expect(
      trackInRecording(single, { id: "3Hfv8h49DVUT4uHd2Tu7Fd", albumId: "x" }),
    ).toBe(true);
  });

  it("doesn't take another piece left paused for this recording", () => {
    expect(
      trackInRecording(single, {
        id: "0eBr9W1GE5nou99gRdy02J",
        albumId: "6Pqlj0jyStFJgTidjdLGHC",
      }),
    ).toBe(false);
  });
});
