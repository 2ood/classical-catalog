// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { PUT } from "./route";

// These cases are rejected before any query runs.
vi.mock("@/lib/db", () => ({ db: {} }));

const SCORE_ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";

async function put(id: string, body: unknown) {
  const res = await PUT(
    new Request(`http://localhost/api/scores/${id}/movements`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
  return [res.status, (await res.json()).error];
}

describe("PUT /api/scores/[id]/movements", () => {
  it("rejects a malformed score id", async () => {
    expect(await put("x", { movements: [] })).toEqual([
      400,
      "Invalid score id",
    ]);
  });

  it("rejects a blank movement name", async () => {
    expect(
      await put(SCORE_ID, { movements: [{ name: " ", mark: 1 }] }),
    ).toEqual([400, "Names must be 1–200 characters"]);
  });

  it("rejects a bad start page", async () => {
    expect(
      await put(SCORE_ID, { movements: [{ name: "Adagio", mark: 0 }] }),
    ).toEqual([400, "Start pages must be whole numbers from 1"]);
  });

  it("rejects a body without a movements list", async () => {
    const [status] = await put(SCORE_ID, {});
    expect(status).toBe(400);
  });
});
