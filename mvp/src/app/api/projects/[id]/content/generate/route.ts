import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { generateContent } from "@/lib/content/brain/orchestrator";

export const maxDuration = 300;

const Body = z.object({
  format: z.string().min(1),
  topic: z.string().min(1),
  channel: z.string().optional(),
  lensId: z.string().optional(),
  narratorId: z.string().optional(),
  language: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

    const result = await generateContent({ tenantId: user.tenantId, projectId: project.id, ...parsed.data });
    return Response.json(result);
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
