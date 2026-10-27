import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { matchPerformers } from "@/lib/performers";
import { performerAliases, performers } from "@/lib/schema";

/**
 * Known performers like `q` (see matchPerformers), at most 8: name, kind
 * and instrument, to choose one while typing a recording's performers.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const rows = await db
    .select({
      id: performers.id,
      name: performers.name,
      kind: performers.kind,
      instrument: performers.instrument,
      alias: performerAliases.name,
    })
    .from(performers)
    .leftJoin(
      performerAliases,
      eq(performerAliases.performerId, performers.id),
    );
  const byId = new Map<
    string,
    Omit<(typeof rows)[number], "alias"> & { aliases: string[] }
  >();
  for (const { alias, ...p } of rows) {
    const known = byId.get(p.id) ?? { ...p, aliases: [] };
    if (alias && alias !== p.name) known.aliases.push(alias);
    byId.set(p.id, known);
  }
  const found = matchPerformers(query, [...byId.values()]).map(
    ({ name, kind, instrument }) => ({ name, kind, instrument }),
  );
  return NextResponse.json({ performers: found });
}
