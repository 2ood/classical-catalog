import "server-only";
import { cacheLife } from "next/cache";

/**
 * A video's title, from YouTube's oEmbed (no API key needed). Throws when
 * YouTube doesn't answer, so a failure isn't cached; callers fall back.
 */
export async function videoTitle(videoId: string): Promise<string> {
  "use cache";
  cacheLife("max");
  const watch = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`,
  );
  const body = res.ok ? await res.json() : null;
  if (typeof body?.title !== "string") {
    throw new Error(`No title for video ${videoId}`);
  }
  return body.title;
}
