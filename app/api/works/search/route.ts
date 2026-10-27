import { cacheLife } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { composersToImport } from "@/lib/library";
import { fetchComposers } from "@/lib/openopus";
import { getImportedComposers, searchWorks } from "@/lib/queries";

/** Every composer Open Opus knows; a failure isn't cached. */
async function catalogue() {
  "use cache";
  cacheLife("days");
  return fetchComposers();
}

/**
 * Works of any composer matching `q` (see searchWords), at most 20, with
 * their movements; and Open Opus composers named in `q` who aren't
 * imported yet, to offer importing.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const [works, all, imported] = await Promise.all([
    searchWorks(query),
    catalogue().catch(() => []),
    getImportedComposers(),
  ]);
  const importedIds = new Set(imported.map((c) => c.openOpusId ?? 0));
  const composers = composersToImport(query, all, importedIds).map((c) => ({
    openOpusId: c.openOpusId,
    name: c.completeName,
  }));
  return NextResponse.json({ works, composers });
}
