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
  it("saves under SCORES_DIR (creating it) with a generated name", async () => {
    const name = await saveScoreFile(pdf);
    expect(name).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(fs.readFileSync(scoreFilePath(name))).toEqual(Buffer.from(pdf));
    expect(path.dirname(scoreFilePath(name))).toBe(path.join(dir, "nested"));
  });

  it("deletes a saved file, and ignores one that is already gone", async () => {
    const name = await saveScoreFile(pdf);
    await deleteScoreFile(name);
    expect(fs.existsSync(scoreFilePath(name))).toBe(false);
    await expect(deleteScoreFile(name)).resolves.toBeUndefined();
  });

  it("refuses names that could escape the scores folder", () => {
    for (const name of ["../secret.pdf", "..\\x.pdf", "a/b.pdf", "x.txt"]) {
      expect(() => scoreFilePath(name)).toThrow();
    }
  });
});
