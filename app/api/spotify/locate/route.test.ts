// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// None of these cases reach the database.
vi.mock("@/lib/db", () => ({ db: {} }));

const get = (query: string) =>
  GET(new Request(`http://127.0.0.1:3000/api/spotify/locate?${query}`));

describe("GET /api/spotify/locate", () => {
  it.each([["track=nope"], ["track=0eBr9W1GE5nou99gRdy02J&album=x%25"], [""]])(
    "rejects %s",
    async (query) => {
      expect((await get(query)).status).toBe(400);
    },
  );
});
