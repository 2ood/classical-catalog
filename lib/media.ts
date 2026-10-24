export type SpotifyType = "track" | "album" | "playlist";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const SPOTIFY_TYPES: readonly string[] = ["track", "album", "playlist"];

function parseUrl(input: string): URL | null {
  try {
    return new URL(input.trim());
  } catch {
    return null;
  }
}

export function extractYouTubeId(input: string): string | null {
  const url = parseUrl(input);
  if (!url) return null;

  const host = url.hostname.replace(/^(www|m|music)\./, "");
  const segments = url.pathname.split("/").filter(Boolean);
  let id: string | null | undefined;

  if (host === "youtu.be") {
    id = segments[0];
  } else if (host === "youtube.com") {
    if (segments[0] === "watch") id = url.searchParams.get("v");
    else if (["embed", "shorts", "live"].includes(segments[0]))
      id = segments[1];
  }

  return id && YOUTUBE_ID.test(id) ? id : null;
}

export function extractSpotifyId(
  input: string,
): { type: SpotifyType; id: string } | null {
  const trimmed = input.trim();
  let type: string | undefined;
  let id: string | undefined;

  if (trimmed.startsWith("spotify:")) {
    [, type, id] = trimmed.split(":");
  } else {
    const url = parseUrl(trimmed);
    if (!url || url.hostname !== "open.spotify.com") return null;
    const segments = url.pathname
      .split("/")
      .filter((s) => s && s !== "embed" && !s.startsWith("intl-"));
    [type, id] = segments;
  }

  if (!type || !id || !SPOTIFY_TYPES.includes(type) || !SPOTIFY_ID.test(id)) {
    return null;
  }
  return { type: type as SpotifyType, id };
}
