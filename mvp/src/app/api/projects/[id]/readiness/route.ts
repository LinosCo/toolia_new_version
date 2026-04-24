import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";

type Blocker = {
  id: string;
  severity: "block" | "warn";
  message: string;
  action?: { label: string; href: string };
};

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

    const [schede, pois, narrators, paths] = await Promise.all([
      prisma.scheda.findMany({
        where: { projectId: id },
        select: {
          id: true,
          status: true,
          poiId: true,
          narratorId: true,
          language: true,
          isCore: true,
          audio: { select: { id: true, isStale: true } },
        },
      }),
      prisma.pOI.findMany({
        where: { projectId: id },
        select: { id: true, name: true, imageUrl: true },
      }),
      prisma.narratorProfile.findMany({
        where: { projectId: id },
        select: { id: true, voiceId: true, portraitUrl: true, name: true },
      }),
      prisma.path.findMany({
        where: { projectId: id },
        select: {
          id: true,
          name: true,
          narratorId: true,
          poiOrderJson: true,
        },
      }),
    ]);

    // Metriche principali
    const total = schede.length;
    const published = schede.filter((s) => s.status === "published").length;
    const draft = schede.filter((s) => s.status === "draft").length;
    const inReview = schede.filter((s) => s.status === "in_review").length;
    const clientReview = schede.filter(
      (s) => s.status === "client_review",
    ).length;

    const publishedSchede = schede.filter((s) => s.status === "published");
    const withAudio = publishedSchede.filter(
      (s) => s.audio && !s.audio.isStale,
    ).length;
    const staleAudio = publishedSchede.filter(
      (s) => s.audio && s.audio.isStale,
    ).length;
    const audioCoverage =
      publishedSchede.length > 0 ? withAudio / publishedSchede.length : 0;

    const poisWithImage = pois.filter((p) => !!p.imageUrl).length;
    const imageCoverage = pois.length > 0 ? poisWithImage / pois.length : 0;

    const poisWithScheda = new Set(publishedSchede.map((s) => s.poiId));
    const poiCoverage = pois.length > 0 ? poisWithScheda.size / pois.length : 0;

    const narratorsWithVoice = narrators.filter((n) => !!n.voiceId).length;
    const narratorsWithPortrait = narrators.filter(
      (n) => !!n.portraitUrl,
    ).length;

    // Bloccanti e avvisi
    const blockers: Blocker[] = [];

    if (published === 0) {
      blockers.push({
        id: "no_published",
        severity: "block",
        message:
          "Nessuna scheda pubblicata. Serve almeno una scheda pubblicata per rilasciare il progetto.",
        action: { label: "Vai alle schede", href: `/progetti/${id}/schede` },
      });
    }

    if (pois.length === 0) {
      blockers.push({
        id: "no_pois",
        severity: "block",
        message: "Nessun POI definito.",
        action: { label: "Vai al luogo", href: `/progetti/${id}/luogo` },
      });
    }

    if (narrators.length === 0) {
      blockers.push({
        id: "no_narrators",
        severity: "block",
        message: "Nessun narratore definito.",
        action: { label: "Vai ai percorsi", href: `/progetti/${id}/percorsi` },
      });
    }

    if (paths.length === 0) {
      blockers.push({
        id: "no_paths",
        severity: "block",
        message: "Nessun percorso tematico creato.",
        action: { label: "Vai ai percorsi", href: `/progetti/${id}/percorsi` },
      });
    }

    if (staleAudio > 0) {
      blockers.push({
        id: "stale_audio",
        severity: "block",
        message: `${staleAudio} audio obsoleti (la scheda è stata modificata dopo la generazione audio).`,
        action: { label: "Rigenera audio", href: `/progetti/${id}/schede` },
      });
    }

    if (audioCoverage < 0.8) {
      blockers.push({
        id: "low_audio_coverage",
        severity: "warn",
        message: `Copertura audio ${Math.round(audioCoverage * 100)}% — obiettivo 80%.`,
        action: { label: "Genera audio", href: `/progetti/${id}/schede` },
      });
    }

    if (imageCoverage < 0.5) {
      blockers.push({
        id: "low_image_coverage",
        severity: "warn",
        message: `Copertura immagini ${Math.round(imageCoverage * 100)}% — obiettivo 50%.`,
        action: { label: "Aggiungi foto POI", href: `/progetti/${id}/luogo` },
      });
    }

    if (narratorsWithVoice < narrators.length) {
      blockers.push({
        id: "narrators_no_voice",
        severity: "warn",
        message: `${narrators.length - narratorsWithVoice} narratori senza voce associata.`,
        action: { label: "Vai ai percorsi", href: `/progetti/${id}/percorsi` },
      });
    }

    if (narratorsWithPortrait < narrators.length) {
      blockers.push({
        id: "narrators_no_portrait",
        severity: "warn",
        message: `${narrators.length - narratorsWithPortrait} narratori senza ritratto.`,
        action: { label: "Vai ai percorsi", href: `/progetti/${id}/percorsi` },
      });
    }

    if (poiCoverage < 0.7 && pois.length > 0) {
      blockers.push({
        id: "low_poi_coverage",
        severity: "warn",
        message: `Solo ${Math.round(poiCoverage * 100)}% dei POI ha una scheda pubblicata.`,
        action: { label: "Vai alle schede", href: `/progetti/${id}/schede` },
      });
    }

    const hasBlocker = blockers.some((b) => b.severity === "block");
    const hasWarn = blockers.some((b) => b.severity === "warn");
    const readiness: "green" | "amber" | "red" = hasBlocker
      ? "red"
      : hasWarn
        ? "amber"
        : "green";

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

    // Checklist automatica
    const autoChecklist = {
      scheda_published: published >= 1,
      audio_coverage: audioCoverage >= 0.8,
      no_blockers: !hasBlocker,
    };

    const canPublish =
      !hasBlocker &&
      Object.values(autoChecklist).every(Boolean) &&
      Object.values(manualChecklist).every(Boolean);

    return NextResponse.json({
      projectId: id,
      projectName: project.name,
      projectStatus: project.status,
      readiness,
      canPublish,
      metrics: {
        pois: pois.length,
        schedeTotal: total,
        schedeDraft: draft,
        schedeInReview: inReview,
        schedeClientReview: clientReview,
        schedePublished: published,
        narrators: narrators.length,
        narratorsWithVoice,
        narratorsWithPortrait,
        paths: paths.length,
        audioCoverage,
        audioWithFile: withAudio,
        audioStale: staleAudio,
        imageCoverage,
        poisWithImage,
        poiCoverage,
        poisWithScheda: poisWithScheda.size,
      },
      blockers,
      checklist: {
        auto: autoChecklist,
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
