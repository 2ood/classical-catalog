import { NextResponse } from "next/server";
import { spotify } from "@/lib/spotify-server";

/** Forgets the stored Spotify login. */
export async function POST() {
  await spotify()?.disconnect();
  return new NextResponse(null, { status: 204 });
}
