import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("DEV_BYPASS_AUTH guards", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBypass = process.env.DEV_BYPASS_AUTH;

  afterEach(() => {
    if (originalNodeEnv) process.env.NODE_ENV = originalNodeEnv;
    if (originalBypass !== undefined) process.env.DEV_BYPASS_AUTH = originalBypass;
    else delete process.env.DEV_BYPASS_AUTH;
    vi.resetModules();
  });

  it("authConfig.authorized returns true in dev with bypass", async () => {
    process.env.NODE_ENV = "development";
    process.env.DEV_BYPASS_AUTH = "true";
    const { authConfig } = await import("@/auth.config");
    const result = authConfig.callbacks!.authorized!({
      auth: null,
      request: { nextUrl: new URL("http://x/progetti") } as any,
    } as any);
    expect(result).toBe(true);
  });

  it("authConfig.authorized IGNORES bypass in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.DEV_BYPASS_AUTH = "true";
    vi.resetModules();
    const { authConfig } = await import("@/auth.config");
    const result = authConfig.callbacks!.authorized!({
      auth: null,
      request: { nextUrl: new URL("http://x/progetti") } as any,
    } as any);
    expect(result).toBe(false);
  });
});
