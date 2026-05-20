import { prisma } from "@/lib/db";
import { assembleContentContext } from "@/lib/content/brain/context";
import { planContent } from "@/lib/content/brain/planner";
import { produceArtifact, BRAIN_PRODUCE_MODEL } from "@/lib/content/brain/producers";
import { verifyArtifact } from "@/lib/content/brain/verifier";
import type { ContentRequest, VerificationResult } from "@/lib/content/brain/types";

export interface GenerateResult {
  draft: { id: string; title: string; body: string };
  verification: VerificationResult;
}

export async function generateContent(req: ContentRequest): Promise<GenerateResult> {
  const ctx = await assembleContentContext(req);
  const plan = await planContent(ctx, req);

  let artifact = await produceArtifact(plan, ctx, req);
  let verification = verifyArtifact(artifact, ctx);

  // Loop di critica mirato: UNA correzione se la verifica fallisce.
  if (!verification.passed) {
    artifact = await produceArtifact(plan, ctx, req, {
      mustTellMissing: verification.mustTellMissing,
      avoidViolations: verification.avoidViolations,
    });
    verification = verifyArtifact(artifact, ctx);
  }

  const draft = await prisma.contentDraft.create({
    data: {
      projectId: req.projectId, tenantId: req.tenantId,
      format: req.format, channel: req.channel, lensId: req.lensId, narratorId: req.narratorId,
      language: req.language ?? "it",
      title: artifact.title, body: artifact.body,
      status: "draft",
      planJson: plan as never,
      verificationJson: verification as never,
      citationsJson: plan.citations as never,
      model: BRAIN_PRODUCE_MODEL,
    },
  });

  return { draft: { id: draft.id, title: draft.title, body: draft.body }, verification };
}
