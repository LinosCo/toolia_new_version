import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { indexProjectKB } from "@/lib/content/indexer";

export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const result = await indexProjectKB({ tenantId: user.tenantId, projectId: project.id });
    return Response.json(result);
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
