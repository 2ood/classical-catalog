const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_URL = "https://api.spotify.com/v1";
// Refresh a little early so a request never goes out with a dying token.
const REFRESH_MARGIN_MS = 60_000;

export type TokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export type TokenStore = {
  load: () => Promise<TokenSet | null>;
  save: (tokens: TokenSet) => Promise<void>;
  clear: () => Promise<void>;
};

/** No usable Spotify login: never connected, disconnected, or revoked. */
export class SpotifyNotConnected extends Error {
  constructor() {
    super("Spotify is not connected");
  }
}

/** Spotify Web API access for a PKCE client (no secret) with stored tokens. */
export function createSpotifyClient({
  clientId,
  store,
  fetch = globalThis.fetch,
  now = Date.now,
}: {
  clientId: string;
  store: TokenStore;
  fetch?: typeof globalThis.fetch;
  now?: () => number;
}) {
  async function requestTokens(
    params: Record<string, string>,
    previous?: TokenSet,
  ): Promise<TokenSet | null> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...params, client_id: clientId }).toString(),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const tokens: TokenSet = {
      accessToken: body.access_token,
      // Spotify may or may not rotate the refresh token.
      refreshToken: body.refresh_token ?? previous?.refreshToken,
      expiresAt: new Date(now() + body.expires_in * 1000),
    };
    await store.save(tokens);
    return tokens;
  }

  async function refresh(tokens: TokenSet): Promise<TokenSet> {
    const next = await requestTokens(
      { grant_type: "refresh_token", refresh_token: tokens.refreshToken },
      tokens,
    );
    if (!next) {
      await store.clear();
      throw new SpotifyNotConnected();
    }
    return next;
  }

  async function validTokens(): Promise<TokenSet> {
    const tokens = await store.load();
    if (!tokens) throw new SpotifyNotConnected();
    return tokens.expiresAt.getTime() - now() < REFRESH_MARGIN_MS
      ? refresh(tokens)
      : tokens;
  }

  return {
    async exchangeCode(code: string, verifier: string, redirectUri: string) {
      const tokens = await requestTokens({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });
      if (!tokens) throw new Error("Spotify refused the login code");
    },

    /** Calls the Web API (`path` like "/me/player"), refreshing on 401 once. */
    async api(path: string, init: RequestInit = {}): Promise<Response> {
      const call = (tokens: TokenSet) => {
        const headers = new Headers(init.headers);
        headers.set("Authorization", `Bearer ${tokens.accessToken}`);
        return fetch(API_URL + path, { ...init, headers });
      };
      const tokens = await validTokens();
      const res = await call(tokens);
      return res.status === 401 ? call(await refresh(tokens)) : res;
    },

    async isConnected() {
      return (await store.load()) !== null;
    },

    disconnect: () => store.clear(),
  };
}

export type SpotifyClient = ReturnType<typeof createSpotifyClient>;
