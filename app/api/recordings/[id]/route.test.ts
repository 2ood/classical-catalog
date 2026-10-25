// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";

// Rejected before any query runs.
vi.mock("@/lib/db", () => ({ db: {} }));

describe("DELETE /api/recordings/[id]", () => {
  it("returns 400 for a malformed id", async () => {
    const req = new Request("http://localhost/api/recordings/x", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "x" }) });
    expect(res.status).toBe(400);
  });
});
