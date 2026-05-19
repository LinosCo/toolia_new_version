import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";
import { getTenantApiKey, setTenantApiKey, listTenantApiKeys } from "@/lib/tenant-keys";

describe("tenant-keys", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns null when key not set", async () => {
    const { tenantId } = await seedTenantAndUser();
    const k = await getTenantApiKey(tenantId, "openai");
    expect(k).toBeNull();
  });

  it("stores and retrieves a key", async () => {
    const { tenantId } = await seedTenantAndUser();
    await setTenantApiKey(tenantId, "openai", "sk-test-123");
    const k = await getTenantApiKey(tenantId, "openai");
    expect(k).toBe("sk-test-123");
  });

  it("listTenantApiKeys returns providers configured, no values", async () => {
    const { tenantId } = await seedTenantAndUser();
    await setTenantApiKey(tenantId, "openai", "sk-1");
    await setTenantApiKey(tenantId, "elevenlabs", "el-1");
    const list = await listTenantApiKeys(tenantId);
    expect(list).toEqual(expect.arrayContaining([
      { provider: "openai", configured: true },
      { provider: "elevenlabs", configured: true },
    ]));
    expect(JSON.stringify(list)).not.toContain("sk-1");
  });
});
