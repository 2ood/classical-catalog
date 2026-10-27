import { extractSpotifyId, extractYouTubeId } from "./media";

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RecordingInput = {
  workId: string;
  performer: string;
  year: number | null;
  mediaType: "youtube" | "spotify";
  mediaUrl: string;
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

  return { ok: true, value: { workId, performer, year, mediaType, mediaUrl } };
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
