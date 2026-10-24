// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";
import { sealSession, SESSION_COOKIE } from "./lib/session";

function request(path: string, method = "GET", cookie?: string) {
  const headers = cookie
    ? { cookie: `${SESSION_COOKIE}=${cookie}` }
    : undefined;
  return new NextRequest(`http://localhost${path}`, { method, headers });
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "x".repeat(32));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy", () => {
  it("redirects anonymous /admin visits to /login", async () => {
    const res = await proxy(request("/admin/work/1"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("returns 401 for anonymous mutating API calls", async () => {
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const res = await proxy(request("/api/recordings", method));
      expect(res.status).toBe(401);
    }
  });

  it("lets anonymous GET API calls through", async () => {
    const res = await proxy(request("/api/composers"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("lets anonymous calls to the auth routes through", async () => {
    const res = await proxy(request("/api/auth/login", "POST"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("lets logged-in requests through", async () => {
    const cookie = await sealSession({ loggedIn: true });
    const admin = await proxy(request("/admin", "GET", cookie));
    const api = await proxy(request("/api/recordings", "POST", cookie));
    expect(admin.headers.get("x-middleware-next")).toBe("1");
    expect(api.headers.get("x-middleware-next")).toBe("1");
  });

  it("treats a tampered cookie as anonymous", async () => {
    const res = await proxy(request("/api/recordings", "POST", "garbage"));
    expect(res.status).toBe(401);
  });
});
