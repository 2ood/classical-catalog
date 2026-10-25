/**
 * Recording suggestions for a work that has none: Spotify albums found by
 * search, and turning one into a recording (with movement tracks when the
 * album's tracks line up with the work's movements).
 */
import { plain } from "./import";
import type { MovementMarks, WorkMovement } from "./movements";
import { normalizeCatalogue } from "./work-titles";

type Composer = { name: string; shortName: string };
type WorkInfo = { title: string; catalogueNum: string | null };

/** The bits of Spotify's album object used here. */
export type SpotifyAlbum = {
  id: string;
  name: string;
  release_date: string;
  artists: { name: string }[];
};

export type SpotifyTrack = { id: string; name: string };

export type Suggestion = {
  albumId: string;
  name: string;
  performer: string;
  year: number | null;
  url: string;
};

/** "Brahms Klavierstücke Op. 118" */
export function searchQuery(composer: Composer, work: WorkInfo): string {
  return [composer.shortName, work.title, work.catalogueNum]
    .filter(Boolean)
    .join(" ")
    .replace(/[“”"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Album artists minus the composer, "A / B" like hand-entered performers. */
function performerOf(album: SpotifyAlbum, composer: Composer): string {
  const names = album.artists.map((a) => a.name);
  const isComposer = (n: string) =>
    plain(n) === plain(composer.name) || plain(n) === plain(composer.shortName);
  const performers = names.filter((n) => !isComposer(n));
  return (performers.length ? performers : names).join(" / ");
}

const albumUrl = (id: string) => `https://open.spotify.com/album/${id}`;
const trackUrl = (id: string) => `https://open.spotify.com/track/${id}`;

/** 0–2: does the album's name mention the work's catalogue number, title? */
function mentions(albumName: string, work: WorkInfo): number {
  const compact = normalizeCatalogue(albumName.replace(/\bopus\b/gi, "op"));
  const byNumber =
    !!work.catalogueNum &&
    new RegExp(`${normalizeCatalogue(work.catalogueNum)}(?![0-9])`).test(
      compact,
    );
  const title = plain(work.title.replace(/“[^”]*”/g, ""));
  return Number(byNumber) + Number(plain(albumName).includes(title));
}

/** Albums naming the work first (when `work` is given), else Spotify's order. */
export function toSuggestions(
  albums: SpotifyAlbum[],
  composer: Composer,
  work?: WorkInfo,
): Suggestion[] {
  const ranked = work
    ? albums
        .map((album, i) => ({ album, i, score: mentions(album.name, work) }))
        .sort((a, b) => b.score - a.score || a.i - b.i)
        .map((r) => r.album)
    : albums;
  return ranked.map((album) => ({
    albumId: album.id,
    name: album.name,
    performer: performerOf(album, composer),
    year: Number(album.release_date.slice(0, 4)) || null,
    url: albumUrl(album.id),
  }));
}

/**
 * Track links per movement id: the album's tracks for this work (by
 * catalogue number, or title when it has none), in album order, when there
 * are exactly as many as the work has movements. Otherwise none.
 */
export function tracksForMovements(
  tracks: SpotifyTrack[],
  work: WorkInfo,
  movements: WorkMovement[],
): MovementMarks<string> {
  const belongs = work.catalogueNum
    ? (name: string) =>
        new RegExp(`${normalizeCatalogue(work.catalogueNum!)}(?![0-9])`).test(
          normalizeCatalogue(name),
        )
    : (name: string) => plain(name).includes(plain(work.title));
  const ours = tracks.filter((t) => belongs(t.name));
  if (movements.length === 0 || ours.length !== movements.length) return {};
  return Object.fromEntries(
    movements.map((m, i) => [m.id, trackUrl(ours[i].id)]),
  );
}

/** The recording to save for a suggested album. */
export function albumToRecording(
  album: SpotifyAlbum,
  tracks: SpotifyTrack[],
  composer: Composer,
  work: WorkInfo & { id: string; movements: WorkMovement[] },
) {
  return {
    workId: work.id,
    performer: performerOf(album, composer),
    year: Number(album.release_date.slice(0, 4)) || null,
    mediaType: "spotify" as const,
    mediaUrl: albumUrl(album.id),
    movementStarts: tracksForMovements(tracks, work, work.movements),
  };
}
