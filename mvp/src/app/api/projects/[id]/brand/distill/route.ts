import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { distillBrandSkill } from "@/lib/brand/distiller";

export const maxDuration = 120;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const result = await distillBrandSkill({ projectId: project.id, tenantId: user.tenantId });
    return Response.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
