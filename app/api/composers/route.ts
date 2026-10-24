import { NextResponse } from "next/server";
import { getComposersWithCounts } from "@/lib/queries";

export async function GET() {
  return NextResponse.json(await getComposersWithCounts());
}
