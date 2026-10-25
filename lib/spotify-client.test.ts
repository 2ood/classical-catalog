// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  createSpotifyClient,
  SpotifyNotConnected,
  type TokenSet,
  type TokenStore,
} from "./spotify-client";

const NOW = 1_800_000_000_000;

function memoryStore(initial: TokenSet | null = null) {
  let tokens = initial;
  const store: TokenStore = {
    load: async () => tokens,
    save: async (t) => void (tokens = t),
    clear: async () => void (tokens = null),
  };
  return { store, current: () => tokens };
}

const tokenResponse = (body: object, status = 200) =>
  Response.json(body, { status });

function client(store: TokenStore, fetch: typeof globalThis.fetch) {
  return createSpotifyClient({
    clientId: "client-1",
    store,
    fetch,
    now: () => NOW,
  });
}

describe("exchangeCode", () => {
  it("trades the code and verifier for tokens and stores them", async () => {
    const { store, current } = memoryStore();
    const fetch = vi.fn().mockResolvedValue(
      tokenResponse({
        access_token: "access-1",
        refresh_token: "refresh-1",
        expires_in: 3600,
      }),
    );
    await client(store, fetch).exchangeCode(
      "code-1",
      "verifier-1",
      "http://cb",
    );

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://accounts.spotify.com/api/token");
    expect(Object.fromEntries(new URLSearchParams(init.body))).toEqual({
      grant_type: "authorization_code",
      code: "code-1",
      redirect_uri: "http://cb",
      client_id: "client-1",
      code_verifier: "verifier-1",
    });
    expect(current()).toEqual({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresAt: new Date(NOW + 3600_000),
    });
  });
});

describe("api", () => {
  const fresh: TokenSet = {
    accessToken: "access-1",
    refreshToken: "refresh-1",
    expiresAt: new Date(NOW + 30 * 60_000),
  };

  it("calls the Web API with the stored token", async () => {
    const { store } = memoryStore(fresh);
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const res = await client(store, fetch).api("/me/player");
    expect(res.status).toBe(204);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.spotify.com/v1/me/player");
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer access-1",
    );
  });

  it("refreshes a token that is about to expire, keeping the refresh token", async () => {
    const { store, current } = memoryStore({
      ...fresh,
      expiresAt: new Date(NOW + 30_000),
    });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        tokenResponse({ access_token: "access-2", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await client(store, fetch).api("/me/player");

    const [refreshUrl, refreshInit] = fetch.mock.calls[0];
    expect(refreshUrl).toBe("https://accounts.spotify.com/api/token");
    expect(Object.fromEntries(new URLSearchParams(refreshInit.body))).toEqual({
      grant_type: "refresh_token",
      refresh_token: "refresh-1",
      client_id: "client-1",
    });
    expect(
      new Headers(fetch.mock.calls[1][1].headers).get("Authorization"),
    ).toBe("Bearer access-2");
    expect(current()).toEqual({
      accessToken: "access-2",
      refreshToken: "refresh-1",
      expiresAt: new Date(NOW + 3600_000),
    });
  });

  it("forgets revoked tokens and reports not connected", async () => {
    const { store, current } = memoryStore({
      ...fresh,
      expiresAt: new Date(NOW - 1),
    });
    const fetch = vi
      .fn()
      .mockResolvedValue(tokenResponse({ error: "invalid_grant" }, 400));
    await expect(client(store, fetch).api("/me/player")).rejects.toBeInstanceOf(
      SpotifyNotConnected,
    );
    expect(current()).toBeNull();
  });

  it("reports not connected without stored tokens", async () => {
    const { store } = memoryStore();
    await expect(
      client(store, vi.fn()).api("/me/player"),
    ).rejects.toBeInstanceOf(SpotifyNotConnected);
  });
});
