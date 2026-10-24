import { sealData, unsealData } from "iron-session";

export const SESSION_COOKIE = "cc_session";
const TTL = 60 * 60 * 24 * 14; // two weeks

export type SessionData = { loggedIn?: boolean };

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TTL,
};

export function sealSession(data: SessionData): Promise<string> {
  return sealData(data, { password: process.env.SESSION_SECRET!, ttl: TTL });
}

export async function readSession(
  sealed: string | undefined,
): Promise<SessionData> {
  if (!sealed) return {};
  try {
    return await unsealData<SessionData>(sealed, {
      password: process.env.SESSION_SECRET!,
      ttl: TTL,
    });
  } catch {
    return {};
  }
}

export async function isSessionValid(
  sealed: string | undefined,
): Promise<boolean> {
  return (await readSession(sealed)).loggedIn === true;
}
