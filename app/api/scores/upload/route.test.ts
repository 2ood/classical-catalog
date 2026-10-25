// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { DELETE } from "../[id]/route";
import { GET } from "../[id]/file/route";

// These cases are rejected before any query or file write runs.
vi.mock("@/lib/db", () => ({ db: {} }));

const WORK_ID = "3f2b8c1e-6a7d-4c1b-9e2f-0a1b2c3d4e5f";

function upload(fields: Record<string, string | File>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return POST(
    new Request("http://localhost/api/scores/upload", { method: "POST", body }),
  );
}

const error = async (res: Response) => [res.status, (await res.json()).error];

describe("POST /api/scores/upload", () => {
  const pdf = new File(["%PDF-1.7"], "score.pdf", { type: "application/pdf" });

  it("rejects a malformed work id", async () => {
    expect(await error(await upload({ workId: "x", file: pdf }))).toEqual([
      400,
      "Invalid work id",
    ]);
  });

  it("rejects a request without a file", async () => {
    expect(await error(await upload({ workId: WORK_ID }))).toEqual([
      400,
      "A PDF file is required",
    ]);
  });

  it("rejects a file that is not really a PDF", async () => {
    const fake = new File(["<html>"], "score.pdf", { type: "application/pdf" });
    expect(await error(await upload({ workId: WORK_ID, file: fake }))).toEqual([
      400,
      "The file is not a PDF",
    ]);
  });
});

describe("/api/scores/[id]", () => {
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

  it("DELETE rejects a malformed id", async () => {
    const req = new Request("http://localhost/api/scores/x", {
      method: "DELETE",
    });
    expect((await DELETE(req, ctx("x"))).status).toBe(400);
  });

  it("GET file rejects a malformed id", async () => {
    const req = new Request("http://localhost/api/scores/x/file");
    expect((await GET(req, ctx("x"))).status).toBe(400);
  });
});
