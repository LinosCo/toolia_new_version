import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";

const CreateBody = z.object({
  kind: z.enum(["UPLOAD_IMAGE", "UPLOAD_TEXT", "URL_PAGE"]),
  category: z.enum(["LOGO", "COLOR_PALETTE", "TYPOGRAPHY", "BRAND_BOOK", "PAST_CONTENT", "MOODBOARD", "PRODUCT_PHOTO", "OTHER"]).optional(),
  label: z.string().max(200).optional(),
  content: z.string().optional(),
  mimeType: z.string().optional(),
  sourceUrl: z.string().url().optional(),
});

async function assertProject(id: string, tenantId: string) {
  return prisma.project.findFirst({ where: { id, tenantId }, select: { id: true } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id } = await params;
    const project = await assertProject(id, user.tenantId);
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

    const asset = await prisma.brandAsset.create({
      data: { projectId: project.id, tenantId: user.tenantId, kind: parsed.data.kind, category: parsed.data.category ?? "OTHER", label: parsed.data.label, content: parsed.data.content, mimeType: parsed.data.mimeType, sourceUrl: parsed.data.sourceUrl },
    });
    return Response.json({ asset }, { status: 201 });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const project = await assertProject(id, user.tenantId);
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const assets = await prisma.brandAsset.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { evidence: true } } },
    });
    return Response.json({ assets });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
