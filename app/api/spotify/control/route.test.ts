// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as liked, PUT as like } from "../library/route";
import { POST as control } from "./route";

// None of these cases reach the database or Spotify.
vi.mock("@/lib/db", () => ({ db: {} }));

const BASE = "http://127.0.0.1:3000/api/spotify";
const TRACK = "1lo4yMsQvwLUCO7q0YL102";

beforeEach(() => {
  vi.stubEnv("SPOTIFY_CLIENT_ID", "client-1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/spotify/control", () => {
  const post = (body: unknown) =>
    control(
      new Request(`${BASE}/control`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );

  it("rejects an unknown action", async () => {
    expect((await post({ action: "shuffle" })).status).toBe(400);
  });

  it("says when Spotify is not set up", async () => {
    vi.stubEnv("SPOTIFY_CLIENT_ID", "");
    const res = await post({ action: "next" });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("not-configured");
  });
});

describe("/api/spotify/library", () => {
  it("rejects a malformed track id", async () => {
    expect(
      (await liked(new Request(`${BASE}/library?track=nope`))).status,
    ).toBe(400);
    const res = await like(
      new Request(`${BASE}/library`, {
        method: "PUT",
        body: JSON.stringify({ track: "nope", liked: true }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("needs to know whether to like or unlike", async () => {
    const res = await like(
      new Request(`${BASE}/library`, {
        method: "PUT",
        body: JSON.stringify({ track: TRACK }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
