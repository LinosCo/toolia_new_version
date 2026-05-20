import { z } from "zod";
import type { RetrievalHit } from "@/lib/content/retrieval";
import type { BrandSkillManifest } from "@/lib/brand/manifest";

export interface ContentRequest {
  projectId: string;
  tenantId: string;
  format: string;
  channel?: string;
  topic: string;
  lensId?: string;
  narratorId?: string;
  language?: string;
}

export interface TensionContext {
  mustTell: { title: string; why: string }[];
  avoid: { topic: string; reason: string }[];
  verify: { claim: string; status: string }[];
}

export interface ContentContext {
  facts: RetrievalHit[];
  brand: BrandSkillManifest | null;
  tension: TensionContext;
  lens: { name: string; description: string; tone: string | null } | null;
  narrator: { name: string; voiceStyle: string; characterBio: string | null } | null;
  brief: { tono?: string; promessaNarrativa?: string; mustTell?: string[]; avoid?: string[] } | null;
  // HOOK pluggabili (input BT non ancora disponibili in Toolia): tip?, performance?, signals?, craft?
}

export const contentPlanSchema = z.object({
  coreMessage: z.string().min(1),
  angle: z.string().default(""),
  structure: z.array(z.string()).default([]),
  mustCover: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
  successCriterion: z.string().default(""),
  citations: z.array(z.string()).default([]),
});
export type ContentPlan = z.infer<typeof contentPlanSchema>;

export interface GeneratedArtifact { title: string; body: string }

export interface VerificationResult {
  passed: boolean;
  mustTellCovered: string[];
  mustTellMissing: string[];
  avoidViolations: string[];
}
