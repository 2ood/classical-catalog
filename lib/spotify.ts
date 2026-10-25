import { extractSpotifyId } from "./media";
import type { MovementMarks } from "./movements";

/** Read what's playing on which device, and start / pause playback. */
export const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  // Liking tracks: PUT /me/library, GET /me/library/contains.
  "user-library-read",
  "user-library-modify",
];

const base64url = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("base64url");

/** A random PKCE code verifier (43 URL-safe characters). */
export function createVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

/** The S256 code challenge for a verifier (RFC 7636). */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64url(new Uint8Array(digest));
}

export function authorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const query = new URLSearchParams({
    client_id: params.clientId,
    response_type: "code",
    redirect_uri: params.redirectUri,
    state: params.state,
    code_challenge_method: "S256",
    code_challenge: params.challenge,
    scope: SCOPES.join(" "),
  });
  return `https://accounts.spotify.com/authorize?${query}`;
}

/** "https://open.spotify.com/album/ID" → "spotify:album:ID". */
export function spotifyUri(url: string): string | null {
  const spotify = extractSpotifyId(url);
  return spotify && `spotify:${spotify.type}:${spotify.id}`;
}

export type PlaybackState = {
  isPlaying: boolean;
  progressMs: number;
  device: string | null;
  repeat: "off" | "track" | "context";
  track: {
    id: string;
    uri: string;
    name: string;
    artists: string;
    album: { id: string; name: string; cover: string | null };
  } | null;
};

/** GET /api/spotify/playback: what the owner's Spotify is playing. */
export type Playback =
  | { connected: false }
  /** `state` is null when nothing is playing or paused on any device. */
  | { connected: true; state: PlaybackState | null };

type SpotifyImage = { url: string; width: number | null };

/** Spotify's GET /me/player body, trimmed to what the players show. */
export function toPlayback(body: {
  is_playing?: boolean;
  progress_ms?: number | null;
  repeat_state?: string;
  device?: { name?: string } | null;
  item?: {
    id: string;
    uri: string;
    name: string;
    artists?: { name: string }[];
    album: { id: string; name: string; images?: SpotifyImage[] };
  } | null;
}): PlaybackState {
  const item = body.item;
  // The 300px cover where there is one; else the smallest.
  const images = [...(item?.album.images ?? [])].sort(
    (a, b) => (a.width ?? 0) - (b.width ?? 0),
  );
  const cover = images.find((i) => (i.width ?? 0) >= 200) ?? images.at(-1);
  const repeat = body.repeat_state;
  return {
    isPlaying: Boolean(body.is_playing),
    progressMs: body.progress_ms ?? 0,
    device: body.device?.name ?? null,
    repeat: repeat === "track" || repeat === "context" ? repeat : "off",
    track: item
      ? {
          id: item.id,
          uri: item.uri,
          name: item.name,
          artists: (item.artists ?? []).map((a) => a.name).join(", "),
          album: {
            id: item.album.id,
            name: item.album.name,
            cover: cover?.url ?? null,
          },
        }
      : null,
  };
}

/** Body for PUT /me/player/play. */
export type PlayBody =
  { context_uri: string; offset?: { uri: string } } | { uris: string[] };

/**
 * What to play for a recording, or for one of its movements. A movement's
 * track plays inside its own album (`album`, a spotify: URI), so the later
 * movements follow on; the recording's album may be a different release
 * that doesn't contain that track.
 */
export function playRequest(
  recordingUrl: string,
  movement: { track: string; album: string | null } | null,
): PlayBody | null {
  if (movement) {
    const track = spotifyUri(movement.track);
    if (!track) return null;
    return movement.album
      ? { context_uri: movement.album, offset: { uri: track } }
      : { uris: [track] };
  }
  const recording = spotifyUri(recordingUrl);
  if (!recording) return null;
  return recording.startsWith("spotify:track:")
    ? { uris: [recording] }
    : { context_uri: recording };
}

/** The movement whose track link points at `trackId`, if any. */
export function movementForTrack(
  starts: MovementMarks<number | string>,
  trackId: string,
): string | null {
  for (const [movementId, start] of Object.entries(starts)) {
    if (typeof start === "string" && extractSpotifyId(start)?.id === trackId) {
      return movementId;
    }
  }
  return null;
}

type ApiRequest = { method: "GET" | "PUT" | "POST" | "DELETE"; path: string };

/** The Spotify call behind a player button, or null for an unknown one. */
export function controlRequest(action: string): ApiRequest | null {
  switch (action) {
    case "previous":
      return { method: "POST", path: "/me/player/previous" };
    case "next":
      return { method: "POST", path: "/me/player/next" };
    case "repeat-track":
      return { method: "PUT", path: "/me/player/repeat?state=track" };
    case "repeat-off":
      return { method: "PUT", path: "/me/player/repeat?state=off" };
    default:
      return null;
  }
}

const TRACK_ID = /^[A-Za-z0-9]{22}$/;

/**
 * Liking a track (`liked` true), unliking it (false), or asking whether
 * it is liked (null), through Spotify's library endpoints.
 */
export function libraryRequest(
  trackId: string,
  liked: boolean | null,
): ApiRequest | null {
  if (!TRACK_ID.test(trackId)) return null;
  const uris = `uris=${encodeURIComponent(`spotify:track:${trackId}`)}`;
  if (liked === null)
    return { method: "GET", path: `/me/library/contains?${uris}` };
  return { method: liked ? "PUT" : "DELETE", path: `/me/library?${uris}` };
}

/**
 * Is the track Spotify has loaded part of this recording — its own track
 * or album, or one of its movement tracks? (Else it is something else left
 * paused, and Play should start the recording instead of resuming it.)
 */
export function trackInRecording(
  recording: {
    mediaUrl: string;
    movementStarts: MovementMarks<number | string>;
  },
  track: { id: string; albumId: string },
): boolean {
  const own = extractSpotifyId(recording.mediaUrl)?.id;
  return (
    own === track.id ||
    own === track.albumId ||
    movementForTrack(recording.movementStarts, track.id) !== null
  );
}
