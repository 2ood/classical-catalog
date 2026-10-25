// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { POST as merge } from "./merge/route";
import { PATCH } from "./route";

// Rejected before any query runs.
vi.mock("@/lib/db", () => ({ db: {} }));

const ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";
const OTHER = "00000000-0000-4000-8000-000000000002";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) =>
  new Request("http://localhost/api/performers/x", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("PATCH /api/performers/[id]", () => {
  it("rejects a malformed id", async () => {
    expect((await PATCH(req({ kind: "choir" }), ctx("x"))).status).toBe(400);
  });

  it("rejects an invalid edit", async () => {
    expect((await PATCH(req({ kind: "band" }), ctx(ID))).status).toBe(400);
  });
});

describe("POST /api/performers/[id]/merge", () => {
  it.each([
    ["a malformed id", "x", { into: OTHER }],
    ["a malformed target", ID, { into: "y" }],
    ["merging into itself", ID, { into: ID }],
  ])("rejects %s", async (_, id, body) => {
    expect((await merge(req(body), ctx(id))).status).toBe(400);
  });
});
