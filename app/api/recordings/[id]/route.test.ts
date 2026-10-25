// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sealSession, SESSION_COOKIE } from "@/lib/session";
import { DELETE } from "./route";

// These cases are rejected before any query runs.
vi.mock("@/lib/db", () => ({ db: {} }));

async function del(id: string, loggedIn: boolean) {
  const cookie = loggedIn
    ? `${SESSION_COOKIE}=${await sealSession({ loggedIn: true })}`
    : "";
  const req = new NextRequest(`http://localhost/api/recordings/${id}`, {
    method: "DELETE",
    headers: { cookie },
  });
  return DELETE(req, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "x".repeat(32));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("DELETE /api/recordings/[id]", () => {
  it("returns 401 without a session", async () => {
    const res = await del("00000000-0000-4000-8000-000000000001", false);
    expect(res.status).toBe(401);
  });

  it("returns 400 for a malformed id", async () => {
    const res = await del("not-a-uuid", true);
    expect(res.status).toBe(400);
  });
});
