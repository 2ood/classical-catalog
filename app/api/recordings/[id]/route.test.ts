// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

// Rejected before any query runs.
vi.mock("@/lib/db", () => ({ db: {} }));

const ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";

describe("DELETE /api/recordings/[id]", () => {
  it("returns 400 for a malformed id", async () => {
    const req = new Request("http://localhost/api/recordings/x", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "x" }) });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/recordings/[id]", () => {
  const patch = (id: string, body: unknown) =>
    PATCH(
      new Request(`http://localhost/api/recordings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id }) },
    );
  const valid = {
    performer: "Seong-Jin Cho",
    year: "2016",
    mediaType: "spotify",
    mediaUrl: "https://open.spotify.com/track/7pLC3L3hscXCEA5iCKY4EN",
  };

  it("returns 400 for a malformed id", async () => {
    expect((await patch("x", valid)).status).toBe(400);
  });

  it.each([
    ["a blank performer", { ...valid, performer: " " }],
    [
      "a link that isn't Spotify",
      { ...valid, mediaUrl: "https://example.com" },
    ],
  ])("rejects %s", async (_, body) => {
    expect((await patch(ID, body)).status).toBe(400);
  });
});
