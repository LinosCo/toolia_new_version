import { prisma } from "@/lib/db";
import { retrieveContent } from "@/lib/content/retrieval";
import { getCurrentBrandSkill } from "@/lib/brand/skill";
import type { BrandSkillManifest } from "@/lib/brand/manifest";
import type { ContentContext, ContentRequest, TensionContext } from "@/lib/content/brain/types";

export async function assembleContentContext(req: ContentRequest): Promise<ContentContext> {
  const [facts, brand, tensionRow, lensRow, narratorRow, briefRow] = await Promise.all([
    retrieveContent({ tenantId: req.tenantId, projectId: req.projectId, query: req.topic, topK: 8 }),
    getCurrentBrandSkill(req.projectId),
    // NarrativeTension has @unique on projectId — findUnique compiles
    prisma.narrativeTension.findUnique({ where: { projectId: req.projectId } }),
    req.lensId
      ? prisma.editorialLens.findFirst({ where: { id: req.lensId, projectId: req.projectId } })
      : Promise.resolve(null),
    req.narratorId
      ? prisma.narratorProfile.findFirst({ where: { id: req.narratorId, projectId: req.projectId } })
      : Promise.resolve(null),
    // Brief has @unique on projectId — findUnique compiles
    prisma.brief.findUnique({ where: { projectId: req.projectId } }),
  ]);

  const tension: TensionContext = {
    mustTell: (
      (tensionRow?.mustTellJson as { title: string; why: string }[] | undefined) ?? []
    ).map((m) => ({ title: m.title, why: m.why })),
    avoid: (
      (tensionRow?.avoidJson as { topic: string; reason: string }[] | undefined) ?? []
    ).map((a) => ({ topic: a.topic, reason: a.reason })),
    verify: (
      (tensionRow?.verifyJson as { claim: string; status: string }[] | undefined) ?? []
    ).map((v) => ({ claim: v.claim, status: v.status })),
  };

  const briefJson = (briefRow?.contenutoJson as Record<string, unknown> | undefined) ?? null;
  const brief = briefJson
    ? {
        tono: briefJson.tono as string | undefined,
        promessaNarrativa: briefJson.promessaNarrativa as string | undefined,
        mustTell: briefJson.mustTell as string[] | undefined,
        avoid: briefJson.avoid as string[] | undefined,
      }
    : null;

  return {
    facts,
    brand: (brand?.manifest as BrandSkillManifest | undefined) ?? null,
    tension,
    lens: lensRow
      ? { name: lensRow.name, description: lensRow.description, tone: lensRow.tone ?? null }
      : null,
    narrator: narratorRow
      ? { name: narratorRow.name, voiceStyle: narratorRow.voiceStyle, characterBio: narratorRow.characterBio ?? null }
      : null,
    brief,
  };
}
