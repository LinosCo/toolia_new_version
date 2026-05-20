import { prisma } from "@/lib/db";
import type { BrandSkillManifest } from "@/lib/brand/manifest";

export interface CurrentBrandSkill { id: string; version: number; manifest: BrandSkillManifest }

/** Ritorna lo BrandSkill CURRENT del progetto, o null. */
export async function getCurrentBrandSkill(projectId: string): Promise<CurrentBrandSkill | null> {
  const skill = await prisma.brandSkill.findFirst({
    where: { projectId, status: "CURRENT" },
    orderBy: { version: "desc" },
  });
  if (!skill) return null;
  return { id: skill.id, version: skill.version, manifest: skill.manifest as BrandSkillManifest };
}
