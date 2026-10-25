import { NextResponse } from "next/server";
import { importComposer, importMovements } from "@/lib/import-store";
import { fetchComposerWorks } from "@/lib/openopus";

/**
 * Imports a composer's works, then streams newline-delimited JSON while
 * movements come in from MusicBrainz (about a page of 100 works a second):
 * `imported`, any number of `progress`, then `done` or `error`.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const openOpusId = body?.openOpusId;
  if (!Number.isInteger(openOpusId) || openOpusId < 1) {
    return NextResponse.json(
      { error: "openOpusId must be a positive whole number" },
      { status: 400 },
    );
  }

  let fetched;
  try {
    fetched = await fetchComposerWorks(openOpusId);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 502 },
    );
  }
  const imported = await importComposer(fetched);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Keeps going if the browser leaves; there is just no one to tell.
      const send = (message: object) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(message)}\n`));
        } catch {}
      };
      send({ type: "imported", ...imported });
      try {
        const movements = await importMovements(
          fetched.composer,
          imported.composerId,
          (done, total) => send({ type: "progress", done, total }),
        );
        send({ type: "done", ...imported, movements });
      } catch (error) {
        send({ type: "error", error: (error as Error).message });
      }
      try {
        controller.close();
      } catch {}
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
