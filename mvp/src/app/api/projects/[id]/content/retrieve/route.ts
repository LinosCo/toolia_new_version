import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { retrieveContent } from "@/lib/content/retrieval";

export const maxDuration = 60;

const Body = z.object({ query: z.string().min(1), topK: z.number().int().min(1).max(50).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

    const hits = await retrieveContent({
      tenantId: user.tenantId, projectId: project.id,
      query: parsed.data.query, topK: parsed.data.topK,
    });
    return Response.json({ hits });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
