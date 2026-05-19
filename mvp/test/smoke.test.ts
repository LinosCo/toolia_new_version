import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "./helpers/prisma";

describe("smoke", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("can seed a tenant and user", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    expect(tenantId).toBeTruthy();
    expect(userId).toBeTruthy();
    const prisma = getTestPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.tenantId).toBe(tenantId);
  });
});
