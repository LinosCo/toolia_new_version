import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";

const STATUSES = new Set(["draft", "in_review", "client_review", "published", "archived"]);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const format = url.searchParams.get("format");

    const drafts = await prisma.contentDraft.findMany({
      where: {
        projectId: project.id,
        ...(status && STATUSES.has(status) ? { status: status as never } : {}),
        ...(format ? { format } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, format: true, channel: true, status: true, scheduledAt: true, verificationJson: true, updatedAt: true },
    });
    return Response.json({ drafts });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
