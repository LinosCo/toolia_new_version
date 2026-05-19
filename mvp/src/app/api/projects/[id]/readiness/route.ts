import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { computeReadiness } from "@/lib/readiness";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();

    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        settingsJson: true,
        _count: {
          select: {
            pois: true,
            schede: true,
            narrators: true,
            paths: true,
            drivers: true,
            personas: true,
          },
        },
      },
    });
    if (!project)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    const computation = await computeReadiness(id);

    // Checklist manuale (persistita in settingsJson.qualityChecklist)
    const settings = (project.settingsJson as Record<string, unknown>) ?? {};
    const stored =
      (settings.qualityChecklist as Record<string, boolean> | undefined) ?? {};
    const manualChecklist = {
      revisione_contenuti: !!stored.revisione_contenuti,
      verifica_fatti: !!stored.verifica_fatti,
      qualita_immagini: !!stored.qualita_immagini,
      approvazione_cliente: !!stored.approvazione_cliente,
    };

    const canPublish =
      computation.canPublish &&
      Object.values(manualChecklist).every(Boolean);

    return NextResponse.json({
      projectId: id,
      projectName: project.name,
      projectStatus: project.status,
      readiness: computation.readiness,
      canPublish,
      metrics: computation.metrics,
      blockers: computation.blockers,
      checklist: {
        auto: computation.autoChecklist,
        manual: manualChecklist,
      },
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api readiness]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
