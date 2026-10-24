// @vitest-environment node
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { POST } from "./route";

function login(username: string, password: string) {
  const body = new FormData();
  body.set("username", username);
  body.set("password", password);
  return POST(
    new Request("http://localhost/api/auth/login", { method: "POST", body }),
  );
}

function sessionCookie(res: Response) {
  const header = res.headers.get("set-cookie") ?? "";
  const match = header.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match?.[1];
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "x".repeat(32));
  vi.stubEnv("ADMIN_USERNAME", "owner");
  vi.stubEnv("ADMIN_PASSWORD_HASH", bcrypt.hashSync("s3cret", 4));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth/login", () => {
  it("sets a logged-in session cookie and redirects home on success", async () => {
    const res = await login("owner", "s3cret");

    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
    expect(await readSession(sessionCookie(res))).toEqual({ loggedIn: true });
  });

  it("redirects back to /login with an error and no cookie on failure", async () => {
    const res = await login("owner", "wrong");

    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("1");
    expect(sessionCookie(res)).toBeUndefined();
  });
});
