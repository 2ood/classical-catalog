// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as callback } from "./callback/route";
import { GET as login } from "./login/route";
import { POST as play } from "./play/route";

// None of these cases reach the database or Spotify.
vi.mock("@/lib/db", () => ({ db: {} }));

const REDIRECT = "http://127.0.0.1:3000/api/spotify/callback";

beforeEach(() => {
  vi.stubEnv("SPOTIFY_CLIENT_ID", "client-1");
  vi.stubEnv("SPOTIFY_REDIRECT_URI", REDIRECT);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/spotify/login", () => {
  it("explains what is missing without a client ID", async () => {
    vi.stubEnv("SPOTIFY_CLIENT_ID", "");
    const res = await login(
      new Request("http://127.0.0.1:3000/api/spotify/login"),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/SPOTIFY_CLIENT_ID/);
  });

  it("first moves a localhost visit to the redirect URI's host", async () => {
    const res = await login(
      new Request("http://localhost:3000/api/spotify/login?returnTo=/work/1"),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://127.0.0.1:3000/api/spotify/login?returnTo=%2Fwork%2F1",
    );
  });

  it("trusts the Host header over the internal request URL", async () => {
    const res = await login(
      new Request("http://localhost:3000/api/spotify/login", {
        headers: { host: "127.0.0.1:3000" },
      }),
    );
    expect(new URL(res.headers.get("location")!).host).toBe(
      "accounts.spotify.com",
    );
  });

  it("sends the browser to Spotify with a PKCE challenge and remembers it", async () => {
    const res = await login(
      new Request("http://127.0.0.1:3000/api/spotify/login?returnTo=/work/1"),
    );
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.host).toBe("accounts.spotify.com");
    expect(location.searchParams.get("redirect_uri")).toBe(REDIRECT);
    expect(location.searchParams.get("code_challenge")).toBeTruthy();
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/spotify_login=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });
});

describe("GET /api/spotify/callback", () => {
  it("rejects a callback whose state doesn't match the login", async () => {
    const res = await callback(
      new Request(`${REDIRECT}?code=abc&state=forged`, {
        headers: {
          cookie: `spotify_login=${encodeURIComponent(
            JSON.stringify({ state: "real", verifier: "v", returnTo: "/" }),
          )}`,
        },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns to the page when the owner declines", async () => {
    const res = await callback(
      new Request(`${REDIRECT}?error=access_denied&state=real`, {
        headers: {
          cookie: `spotify_login=${encodeURIComponent(
            JSON.stringify({
              state: "real",
              verifier: "v",
              returnTo: "/work/1",
            }),
          )}`,
        },
      }),
    );
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/work/1");
  });
});

describe("POST /api/spotify/play", () => {
  it("rejects a malformed recording id", async () => {
    const res = await play(
      new Request("http://127.0.0.1:3000/api/spotify/play", {
        method: "POST",
        body: JSON.stringify({ recordingId: "x" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
