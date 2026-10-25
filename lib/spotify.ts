import { extractSpotifyId } from "./media";
import type { MovementMarks } from "./movements";

/** Read what's playing on which device, and start / pause playback. */
export const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
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

/** GET /api/spotify/playback: what the owner's Spotify is playing. */
export type Playback =
  | { connected: false }
  | {
      connected: true;
      /** Null when nothing is playing or paused on any device. */
      state: {
        isPlaying: boolean;
        progressMs: number;
        device: string | null;
        track: { id: string; name: string; artists: string } | null;
      } | null;
    };

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
