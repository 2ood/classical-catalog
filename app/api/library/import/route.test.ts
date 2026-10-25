// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// None of these cases reach the database.
vi.mock("@/lib/db", () => ({ db: {} }));

const post = (body: unknown) =>
  POST(
    new Request("http://127.0.0.1:3000/api/library/import", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/library/import", () => {
  it.each([
    [{}],
    [{ openOpusId: "abc" }],
    [{ openOpusId: 1.5 }],
    [{ openOpusId: 0 }],
  ])("rejects %j", async (body) => {
    expect((await post(body)).status).toBe(400);
  });

  it("reports Open Opus failures as a bad gateway", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: { success: "false", error: "No works found" },
        }),
      ),
    );
    const res = await post({ openOpusId: 99999 });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/No works found/);
  });
});
