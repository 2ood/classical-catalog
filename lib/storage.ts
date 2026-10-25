import fs from "node:fs/promises";
import path from "node:path";

// "<composer>/<work>/<label>.pdf" in slug characters only (see scoreFileName),
// or a generated name from before scores were filed by slug.
const FILE_NAME = /^(?:[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+|[0-9a-f-]{36})\.pdf$/;
const PDF_SIGNATURE = "%PDF-";

// Scores are runtime data, not code: keep Turbopack from tracing the folder
// (and every PDF in it) into the server build.
function scoresDir(): string {
  return path.resolve(
    /*turbopackIgnore: true*/ process.env.SCORES_DIR || "storage/scores",
  );
}

export function isPdf(bytes: Uint8Array): boolean {
  return (
    new TextDecoder().decode(bytes.subarray(0, PDF_SIGNATURE.length)) ===
    PDF_SIGNATURE
  );
}

/** Absolute path of a stored score; only accepts names we make. */
export function scoreFilePath(name: string): string {
  if (!FILE_NAME.test(name))
    throw new Error(`Invalid score file name: ${name}`);
  return path.join(/*turbopackIgnore: true*/ scoresDir(), ...name.split("/"));
}

/** Writes the PDF under SCORES_DIR as `name` (see scoreFileName). */
export async function saveScoreFile(
  bytes: Uint8Array,
  name: string,
): Promise<void> {
  const file = scoreFilePath(name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
}

export async function deleteScoreFile(name: string): Promise<void> {
  await fs.rm(scoreFilePath(name), { force: true });
}
