// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteScoreFile,
  isPdf,
  saveScoreFile,
  scoreFilePath,
} from "./storage";

let dir: string;
const pdf = new TextEncoder().encode("%PDF-1.7\n...");

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "scores-"));
  vi.stubEnv("SCORES_DIR", path.join(dir, "nested"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("isPdf", () => {
  it("recognizes the PDF signature", () => {
    expect(isPdf(pdf)).toBe(true);
  });

  it("rejects other content, even with a .pdf name", () => {
    expect(isPdf(new TextEncoder().encode("<html>"))).toBe(false);
    expect(isPdf(new Uint8Array())).toBe(false);
  });
});

describe("score files", () => {
  const NAME = "brahms/klavierstucke-op-118/imslp08450-brahms-op-118-sauer.pdf";

  it("saves under SCORES_DIR in the composer's and work's folders", async () => {
    await saveScoreFile(pdf, NAME);
    const file = scoreFilePath(NAME);
    expect(fs.readFileSync(file)).toEqual(Buffer.from(pdf));
    expect(file).toBe(
      path.join(
        dir,
        "nested",
        "brahms",
        "klavierstucke-op-118",
        "imslp08450-brahms-op-118-sauer.pdf",
      ),
    );
  });

  it("still finds files stored under the old generated names", () => {
    const old = "35806e83-000d-4215-a5e4-f6cc4b083533.pdf";
    expect(scoreFilePath(old)).toBe(path.join(dir, "nested", old));
  });

  it("deletes a saved file, and ignores one that is already gone", async () => {
    await saveScoreFile(pdf, NAME);
    await deleteScoreFile(NAME);
    expect(fs.existsSync(scoreFilePath(NAME))).toBe(false);
    await expect(deleteScoreFile(NAME)).resolves.toBeUndefined();
  });

  it("refuses names that could escape the scores folder", () => {
    for (const name of [
      "../secret.pdf",
      "..\\x.pdf",
      "a/b.pdf",
      "a/../b/c.pdf",
      "a/b/../../../c.pdf",
      "A/b/c.pdf",
      "a/b/c.txt",
      "/a/b/c.pdf",
    ]) {
      expect(() => scoreFilePath(name)).toThrow();
    }
  });
});
