import { connection, NextResponse } from "next/server";
import { spotify } from "@/lib/spotify-server";

export async function GET() {
  // Depends on the stored login and env, never on the build: always run.
  await connection();
  const client = spotify();
  return NextResponse.json({
    configured: client !== null,
    connected: client ? await client.isConnected() : false,
  });
}
