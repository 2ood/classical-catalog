// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { PUT } from "./route";

// These cases are rejected before any query runs.
vi.mock("@/lib/db", () => ({ db: {} }));

const RECORDING_ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";

async function put(id: string, body: unknown) {
  const res = await PUT(
    new Request(`http://localhost/api/recordings/${id}/movements`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
  return [res.status, (await res.json()).error];
}

describe("PUT /api/recordings/[id]/movements", () => {
  it("rejects a malformed recording id", async () => {
    expect(await put("x", { movements: [] })).toEqual([
      400,
      "Invalid recording id",
    ]);
  });

  it("rejects a body without a movements list", async () => {
    expect(await put(RECORDING_ID, { movements: "nope" })).toEqual([
      400,
      "Expected a list of movements",
    ]);
  });
});
