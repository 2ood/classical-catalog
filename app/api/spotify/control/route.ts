import { NextResponse } from "next/server";
import { controlRequest } from "@/lib/spotify";
import { fail, withSpotify } from "@/lib/spotify-routes";

/** Body `{ action }`: previous, next, repeat-track or repeat-off. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const call = controlRequest(String(body?.action ?? ""));
  if (!call) return fail("Unknown player action", 400);

  return withSpotify(async (client) => {
    const res = await client.api(call.path, { method: call.method });
    if (!res.ok) {
      const message = (await res.json().catch(() => null))?.error?.message;
      return fail(message ?? `Spotify answered ${res.status}`, 502);
    }
    return new NextResponse(null, { status: 204 });
  });
}
