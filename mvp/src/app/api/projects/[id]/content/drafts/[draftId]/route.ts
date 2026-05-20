import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";

async function findDraft(projectId: string, draftId: string, tenantId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, tenantId }, select: { id: true } });
  if (!project) return null;
  return prisma.contentDraft.findFirst({ where: { id: draftId, projectId, tenantId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; draftId: string }> }) {
  try {
    const user = await getSessionUser();
    const { id, draftId } = await params;
    const draft = await findDraft(id, draftId, user.tenantId);
    if (!draft) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ draft });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}

const PatchBody = z.object({
  title: z.string().min(1).optional(),
  body: z.string().optional(),
  channel: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; draftId: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id, draftId } = await params;
    const draft = await findDraft(id, draftId, user.tenantId);
    if (!draft) return Response.json({ error: "not_found" }, { status: 404 });

    const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

    const { scheduledAt, ...rest } = parsed.data;
    const updated = await prisma.contentDraft.update({
      where: { id: draft.id },
      data: { ...rest, ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}) },
    });
    return Response.json({ draft: updated });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
