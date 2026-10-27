import {
  extractSpotifyId,
  extractYouTubeId,
  withoutYouTubeStart,
  youTubeStart,
} from "./media";
import { slugify } from "./slugs";

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RecordingInput = {
  workId: string;
  performer: string;
  year: number | null;
  mediaType: "youtube" | "spotify";
  mediaUrl: string;
  /** Where the piece starts and ends in a YouTube video (seconds). */
  startSeconds: number | null;
  endSeconds: number | null;
  /** The one movement it is a recording of (null: the whole work). */
  movementId: string | null;
};

type Result =
  { ok: true; value: RecordingInput } | { ok: false; error: string };

export function parseRecordingInput(body: unknown): Result {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Expected a JSON object" };
  }
  const input = body as Record<string, unknown>;

  const workId = String(input.workId ?? "");
  if (!UUID.test(workId)) return { ok: false, error: "Invalid work id" };

  const performer = String(input.performer ?? "").trim();
  if (!performer) return { ok: false, error: "Performer is required" };

  const rawYear = String(input.year ?? "").trim();
  const year = rawYear === "" ? null : Number(rawYear);
  if (year !== null && !Number.isInteger(year)) {
    return { ok: false, error: "Year must be a whole number" };
  }

  const mediaType = input.mediaType;
  if (mediaType !== "youtube" && mediaType !== "spotify") {
    return { ok: false, error: "Media type must be youtube or spotify" };
  }

  const mediaUrl = String(input.mediaUrl ?? "").trim();
  const recognized =
    mediaType === "youtube"
      ? extractYouTubeId(mediaUrl) !== null
      : extractSpotifyId(mediaUrl) !== null;
  if (!recognized) {
    return { ok: false, error: `Not a recognized ${mediaType} URL` };
  }

  const rawMovement = input.movementId ?? null;
  if (rawMovement !== null && typeof rawMovement !== "string") {
    return { ok: false, error: "Invalid movement id" };
  }
  const movementId = rawMovement || null;

  if (mediaType === "spotify") {
    return {
      ok: true,
      value: {
        workId,
        performer,
        year,
        mediaType,
        mediaUrl,
        startSeconds: null,
        endSeconds: null,
        movementId,
      },
    };
  }

  // A start given (even an empty one) wins over the link's own `t=`.
  const startSeconds =
    input.startSeconds === undefined
      ? youTubeStart(mediaUrl)
      : seconds(input.startSeconds);
  const endSeconds = seconds(input.endSeconds ?? null);
  if (startSeconds === undefined || endSeconds === undefined) {
    return { ok: false, error: "Start and end must be whole seconds" };
  }
  if (endSeconds !== null && endSeconds <= (startSeconds ?? 0)) {
    return { ok: false, error: "The end must come after the start" };
  }

  return {
    ok: true,
    value: {
      workId,
      performer,
      year,
      mediaType,
      mediaUrl: withoutYouTubeStart(mediaUrl),
      startSeconds,
      endSeconds,
      movementId,
    },
  };
}

/** Whole seconds, null for none; undefined if not a time. */
function seconds(value: unknown): number | null | undefined {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

/** "Karajan / BPO" → "KB": first letters of the first two words. */
export function performerInitials(performer: string): string {
  const letters = performer
    .split(/[\s/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0].toUpperCase());
  return letters.join("") || "?";
}

/** "Karajan / BPO (cycle)", 1962 → "karajan-bpo-1962": in links to it. */
export function recordingSlug(performer: string, year: number | null): string {
  const name = performer.replace(/\([^)]*\)/g, " ");
  return slugify(`${name} ${year ?? ""}`) || "recording";
}
