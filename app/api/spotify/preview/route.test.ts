// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// None of these cases reach the database or Spotify.
vi.mock("@/lib/db", () => ({ db: {} }));

const WORK_ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";
const ALBUM = "https://open.spotify.com/album/5Z9iiGl2FcIfa3BMiv6OIw";
const get = (query: string) =>
  GET(new Request(`http://127.0.0.1:3000/api/spotify/preview?${query}`));

beforeEach(() => {
  vi.stubEnv("SPOTIFY_CLIENT_ID", "client-1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/spotify/preview", () => {
  it("rejects a malformed work id", async () => {
    const res = await get(`workId=abc&url=${encodeURIComponent(ALBUM)}`);
    expect(res.status).toBe(400);
  });

  it.each([
    ["not a Spotify link", "https://youtu.be/dQw4w9WgXcQ"],
    ["a playlist", "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO"],
  ])("rejects %s", async (_, url) => {
    const res = await get(`workId=${WORK_ID}&url=${encodeURIComponent(url)}`);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/album or track/);
  });

  it("says when Spotify is not set up", async () => {
    vi.stubEnv("SPOTIFY_CLIENT_ID", "");
    const res = await get(`workId=${WORK_ID}&url=${encodeURIComponent(ALBUM)}`);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("not-configured");
  });
});
