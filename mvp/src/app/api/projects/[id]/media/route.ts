import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });
    const assets = await prisma.mediaAsset.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, mode: true, prompt: true, outputUrl: true, status: true, identityPassed: true, identityScore: true, identityNotes: true, createdAt: true },
    });
    return Response.json({ assets });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
