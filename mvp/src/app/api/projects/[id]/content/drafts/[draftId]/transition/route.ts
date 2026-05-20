import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { canTransition, type DraftStatus, type Role } from "@/lib/content/workflow";

const Body = z.object({ to: z.enum(["draft", "in_review", "client_review", "published", "archived"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string; draftId: string }> }) {
  try {
    const user = await getSessionUser();
    const { id, draftId } = await params;

    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });
    const draft = await prisma.contentDraft.findFirst({ where: { id: draftId, projectId: id, tenantId: user.tenantId }, select: { id: true, status: true } });
    if (!draft) return Response.json({ error: "not_found" }, { status: 404 });

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "invalid_target" }, { status: 400 });

    if (!canTransition(user.role as Role, draft.status as DraftStatus, parsed.data.to)) {
      return Response.json({ error: "transition_forbidden", from: draft.status, to: parsed.data.to }, { status: 403 });
    }

    const updated = await prisma.contentDraft.update({ where: { id: draft.id }, data: { status: parsed.data.to } });
    return Response.json({ draft: { id: updated.id, status: updated.status } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
