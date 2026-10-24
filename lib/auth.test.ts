// @vitest-environment node
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkCredentials } from "./auth";

beforeEach(() => {
  vi.stubEnv("ADMIN_USERNAME", "owner");
  vi.stubEnv("ADMIN_PASSWORD_HASH", bcrypt.hashSync("s3cret", 4));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("checkCredentials", () => {
  it("accepts the configured username and password", async () => {
    expect(await checkCredentials("owner", "s3cret")).toBe(true);
  });

  it("rejects a wrong password", async () => {
    expect(await checkCredentials("owner", "wrong")).toBe(false);
  });

  it("rejects a wrong username", async () => {
    expect(await checkCredentials("someone", "s3cret")).toBe(false);
  });

  it("rejects everything when credentials are not configured", async () => {
    vi.stubEnv("ADMIN_USERNAME", "");
    vi.stubEnv("ADMIN_PASSWORD_HASH", "");
    expect(await checkCredentials("", "")).toBe(false);
  });
});
