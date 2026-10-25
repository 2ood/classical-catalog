// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { PUT } from "./route";

// Rejected before any query runs.
vi.mock("@/lib/db", () => ({ db: {} }));

describe("PUT /api/likes", () => {
  it.each([
    [{ recordingId: "x", liked: true }],
    [{ recordingId: "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f" }],
  ])("rejects %j", async (body) => {
    const res = await PUT(
      new Request("http://localhost/api/likes", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    );
    expect(res.status).toBe(400);
  });
});
