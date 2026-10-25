import { UUID } from "./recordings";

const BLOB_HOST = /^[a-z0-9]+\.public\.blob\.vercel-storage\.com$/i;

export type ScoreInput = {
  workId: string;
  blobUrl: string;
  label: string | null;
  source: string | null;
};

type Result = { ok: true; value: ScoreInput } | { ok: false; error: string };

function isBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && BLOB_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

const optional = (v: unknown) => String(v ?? "").trim() || null;

export function parseScoreInput(body: unknown): Result {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Expected a JSON object" };
  }
  const input = body as Record<string, unknown>;

  const workId = String(input.workId ?? "");
  if (!UUID.test(workId)) return { ok: false, error: "Invalid work id" };

  const blobUrl = String(input.blobUrl ?? "");
  if (!isBlobUrl(blobUrl)) {
    return { ok: false, error: "blobUrl must be a Vercel Blob URL" };
  }

  return {
    ok: true,
    value: {
      workId,
      blobUrl,
      label: optional(input.label),
      source: optional(input.source),
    },
  };
}

/** "Mozart_K550_full-score.pdf" → "Mozart K550 full score" */
export function labelFromFilename(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Google search restricted to imslp.org; IMSLP's own search is unreliable. */
export function imslpSearchUrl(work: {
  catalogueNum: string | null;
  title: string;
  key: string | null;
  composer: string;
}): string {
  const title = work.key ? `${work.title}, ${work.key}` : work.title;
  const query = ["site:imslp.org", work.catalogueNum, title, work.composer]
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
