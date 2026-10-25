import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const FILE_NAME = /^[0-9a-f-]{36}\.pdf$/;
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

/** Absolute path of a stored score; only accepts names we generated. */
export function scoreFilePath(name: string): string {
  if (!FILE_NAME.test(name))
    throw new Error(`Invalid score file name: ${name}`);
  return path.join(/*turbopackIgnore: true*/ scoresDir(), name);
}

/** Writes the PDF under SCORES_DIR and returns its generated file name. */
export async function saveScoreFile(bytes: Uint8Array): Promise<string> {
  const name = `${randomUUID()}.pdf`;
  await fs.mkdir(scoresDir(), { recursive: true });
  await fs.writeFile(scoreFilePath(name), bytes);
  return name;
}

export async function deleteScoreFile(name: string): Promise<void> {
  await fs.rm(scoreFilePath(name), { force: true });
}
