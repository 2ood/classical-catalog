import { eq } from "drizzle-orm";
import { db } from "./db";
import { spotifyTokens } from "./schema";
import {
  createSpotifyClient,
  type SpotifyClient,
  type TokenStore,
} from "./spotify-client";

const ROW = 1;

const store: TokenStore = {
  async load() {
    const [row] = await db
      .select()
      .from(spotifyTokens)
      .where(eq(spotifyTokens.id, ROW));
    return row ?? null;
  },
  async save({ accessToken, refreshToken, expiresAt }) {
    const values = { accessToken, refreshToken, expiresAt };
    await db
      .insert(spotifyTokens)
      .values({ id: ROW, ...values })
      .onConflictDoUpdate({ target: spotifyTokens.id, set: values });
  },
  async clear() {
    await db.delete(spotifyTokens).where(eq(spotifyTokens.id, ROW));
  },
};

/** The Spotify client, or null until SPOTIFY_CLIENT_ID is set. */
export function spotify(): SpotifyClient | null {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  return clientId ? createSpotifyClient({ clientId, store }) : null;
}

/** Must exactly match a redirect URI registered for the Spotify app. */
export function spotifyRedirectUri(): string {
  return (
    process.env.SPOTIFY_REDIRECT_URI ||
    "http://127.0.0.1:3000/api/spotify/callback"
  );
}
