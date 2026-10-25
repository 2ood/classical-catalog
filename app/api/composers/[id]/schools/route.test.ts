// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { PUT } from "./route";

// None of these cases reach the database.
vi.mock("@/lib/db", () => ({ db: {} }));

const put = (id: string, body: unknown) =>
  PUT(
    new Request(`http://127.0.0.1:3000/api/composers/${id}/schools`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );

describe("PUT /api/composers/[id]/schools", () => {
  it("rejects a malformed composer id", async () => {
    expect((await put("abc", { schools: [] })).status).toBe(400);
  });

  it("rejects a body that isn't a list of names", async () => {
    const res = await put("3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f", {
      schools: "Impressionism",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/list/);
  });
});
