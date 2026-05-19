import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let testClient: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!testClient) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL not set");
    testClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  return testClient;
}

export async function resetDb(): Promise<void> {
  const prisma = getTestPrisma();
  await prisma.audioAsset.deleteMany();
  await prisma.scheda.deleteMany();
  await prisma.familyMission.deleteMany();
  await prisma.assistantQA.deleteMany();
  await prisma.path.deleteMany();
  await prisma.narratorProfile.deleteMany();
  await prisma.editorialLens.deleteMany();
  await prisma.driverPersonaWeight.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.projectDriverConfig.deleteMany();
  await prisma.kBFact.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.source.deleteMany();
  await prisma.brief.deleteMany();
  await prisma.mapAnchor.deleteMany();
  await prisma.pOI.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.theme.deleteMany();
  await prisma.job.deleteMany();
  await prisma.project.deleteMany();
  await prisma.clientEntity.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

export async function seedTenantAndUser(): Promise<{ tenantId: string; userId: string }> {
  const prisma = getTestPrisma();
  const tenant = await prisma.tenant.create({
    data: { name: "Test Tenant", settingsJson: {} },
  });
  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      tenantId: tenant.id,
      role: "Admin",
    },
  });
  return { tenantId: tenant.id, userId: user.id };
}
