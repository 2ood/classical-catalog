// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// None of these cases reach the database or Spotify.
vi.mock("@/lib/db", () => ({ db: {} }));

const WORK_ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";
const URL_BASE = "http://127.0.0.1:3000/api/spotify/suggestions";

beforeEach(() => {
  vi.stubEnv("SPOTIFY_CLIENT_ID", "client-1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/spotify/suggestions", () => {
  it("rejects a malformed work id", async () => {
    const res = await GET(new Request(`${URL_BASE}?workId=abc`));
    expect(res.status).toBe(400);
  });

  it("says when Spotify is not set up", async () => {
    vi.stubEnv("SPOTIFY_CLIENT_ID", "");
    const res = await GET(new Request(`${URL_BASE}?workId=${WORK_ID}`));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("not-configured");
  });
});
