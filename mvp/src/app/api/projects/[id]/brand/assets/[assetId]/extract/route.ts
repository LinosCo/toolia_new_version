import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { extractBrandAsset } from "@/lib/brand/extractor";

export const maxDuration = 120;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; assetId: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id, assetId } = await params;

    const asset = await prisma.brandAsset.findFirst({ where: { id: assetId, projectId: id, tenantId: user.tenantId }, select: { id: true } });
    if (!asset) return Response.json({ error: "not_found" }, { status: 404 });

    const result = await extractBrandAsset({ assetId: asset.id });
    return Response.json(result, { status: result.status === "FAILED" ? 422 : 200 });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
