import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { isSessionValid, SESSION_COOKIE } from "./session";

export async function checkCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USERNAME;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUser || !hash || username !== expectedUser) return false;
  return bcrypt.compare(password, hash);
}

/** Request-time read: call only inside a <Suspense> boundary. */
export async function isLoggedIn(): Promise<boolean> {
  // Private cache: unsealing checks the session TTL against Date.now(),
  // which Cache Components only allows inside a cache scope.
  "use cache: private";
  return isSessionValid((await cookies()).get(SESSION_COOKIE)?.value);
}
