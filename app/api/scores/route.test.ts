// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sealSession, SESSION_COOKIE } from "@/lib/session";
import { POST } from "./route";
import { DELETE } from "./[id]/route";

// These cases are rejected before any query or Blob call runs.
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/blob", () => ({ deleteBlob: vi.fn() }));

async function cookie(loggedIn: boolean) {
  return loggedIn
    ? `${SESSION_COOKIE}=${await sealSession({ loggedIn: true })}`
    : "";
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "x".repeat(32));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/scores", () => {
  const post = async (body: unknown, loggedIn: boolean) =>
    POST(
      new NextRequest("http://localhost/api/scores", {
        method: "POST",
        headers: { cookie: await cookie(loggedIn) },
        body: JSON.stringify(body),
      }),
    );

  it("returns 401 without a session", async () => {
    expect((await post({}, false)).status).toBe(401);
  });

  it("returns 400 for invalid input", async () => {
    const res = await post(
      { workId: "x", blobUrl: "https://example.com" },
      true,
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/scores/[id]", () => {
  const del = async (id: string, loggedIn: boolean) =>
    DELETE(
      new NextRequest(`http://localhost/api/scores/${id}`, {
        method: "DELETE",
        headers: { cookie: await cookie(loggedIn) },
      }),
      { params: Promise.resolve({ id }) },
    );

  it("returns 401 without a session", async () => {
    expect(
      (await del("00000000-0000-4000-8000-000000000001", false)).status,
    ).toBe(401);
  });

  it("returns 400 for a malformed id", async () => {
    expect((await del("nope", true)).status).toBe(400);
  });
});
