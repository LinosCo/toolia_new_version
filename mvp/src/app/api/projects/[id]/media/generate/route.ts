import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { generateMedia } from "@/lib/media/generate";

export const maxDuration = 300;

const Body = z.object({
  mode: z.enum(["GENERATION", "PRESERVATION_EDIT", "STYLE_TRANSFER", "LAYOUT"]),
  prompt: z.string().optional(),
  sourceUrl: z.string().optional(),
}).refine((b) => b.mode !== "PRESERVATION_EDIT" || !!b.sourceUrl, { message: "sourceUrl required for PRESERVATION_EDIT" });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

    const result = await generateMedia({ tenantId: user.tenantId, projectId: project.id, ...parsed.data });

    const asset = await prisma.mediaAsset.create({
      data: {
        projectId: project.id, tenantId: user.tenantId,
        mode: parsed.data.mode, prompt: parsed.data.prompt, sourceUrl: parsed.data.sourceUrl,
        outputUrl: result.outputUrl, model: result.model, status: result.status,
        identityScore: result.identityScore, identityPassed: result.identityPassed, identityNotes: result.identityNotes,
        error: result.error,
      },
    });
    return Response.json({ asset });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
