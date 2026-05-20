import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { getCurrentBrandSkill } from "@/lib/brand/skill";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const skill = await getCurrentBrandSkill(project.id);
    return Response.json({ skill });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
