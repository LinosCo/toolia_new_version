import { prisma } from "@/lib/db";

export type TenantApiProvider = "openai" | "anthropic" | "kimi" | "elevenlabs" | "googleMaps";

interface TenantSettings {
  apiKeys?: Partial<Record<TenantApiProvider, string>>;
}

export async function getTenantApiKey(
  tenantId: string,
  provider: TenantApiProvider,
): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });
  if (!tenant) return null;
  const settings = tenant.settingsJson as TenantSettings;
  return settings?.apiKeys?.[provider] ?? null;
}

export async function setTenantApiKey(
  tenantId: string,
  provider: TenantApiProvider,
  value: string,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });
  if (!tenant) throw new Error("Tenant not found");
  const settings = (tenant.settingsJson as TenantSettings) ?? {};
  settings.apiKeys = { ...(settings.apiKeys ?? {}), [provider]: value };
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { settingsJson: settings as object },
  });
}

export async function deleteTenantApiKey(
  tenantId: string,
  provider: TenantApiProvider,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });
  if (!tenant) return;
  const settings = (tenant.settingsJson as TenantSettings) ?? {};
  if (settings.apiKeys) {
    delete settings.apiKeys[provider];
  }
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { settingsJson: settings as object },
  });
}

export async function listTenantApiKeys(
  tenantId: string,
): Promise<Array<{ provider: TenantApiProvider; configured: boolean }>> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });
  const settings = (tenant?.settingsJson as TenantSettings) ?? {};
  const providers: TenantApiProvider[] = ["openai", "anthropic", "kimi", "elevenlabs", "googleMaps"];
  return providers.map((p) => ({
    provider: p,
    configured: !!settings?.apiKeys?.[p],
  }));
}
