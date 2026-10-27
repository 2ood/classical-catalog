/** Importing a composer from the browser (see POST /api/library/import). */

export type ImportMessage =
  | { type: "imported" }
  | { type: "progress"; done: number; total: number }
  | { type: "error"; error: string }
  | { type: "done"; movements: number | null };

/**
 * Imports a composer, passing on each streamed message (newline-delimited
 * JSON: imported, progress…, then done or error). Resolves to the error if
 * the import couldn't start, else null once it has finished.
 */
export async function runImport(
  openOpusId: number,
  onMessage: (message: ImportMessage) => void,
): Promise<string | null> {
  const res = await fetch("/api/library/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ openOpusId }),
  });
  if (!res.ok || !res.body) {
    return (await res.json().catch(() => null))?.error ?? "Failed to import";
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    for (const line of lines.filter(Boolean)) onMessage(JSON.parse(line));
  }
  return null;
}
