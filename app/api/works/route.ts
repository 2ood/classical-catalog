import { NextResponse, type NextRequest } from "next/server";
import { getWorksForComposer } from "@/lib/queries";
import { UUID } from "@/lib/recordings";

export async function GET(request: NextRequest) {
  const composerId = request.nextUrl.searchParams.get("composer_id") ?? "";
  if (!UUID.test(composerId)) {
    return NextResponse.json(
      { error: "composer_id must be a UUID" },
      { status: 400 },
    );
  }
  return NextResponse.json(await getWorksForComposer(composerId));
}
