import { prisma } from "@/lib/db";

export type ReadinessBlocker = {
  id: string;
  severity: "block" | "warn";
  message: string;
  action?: { label: string; href: string };
};

export interface ReadinessMetrics {
  pois: number;
  schedeTotal: number;
  schedeDraft: number;
  schedeInReview: number;
  schedeClientReview: number;
  schedePublished: number;
  narrators: number;
  narratorsWithVoice: number;
  narratorsWithPortrait: number;
  paths: number;
  audioCoverage: number;
  audioWithFile: number;
  audioStale: number;
  imageCoverage: number;
  poisWithImage: number;
  poiCoverage: number;
  poisWithScheda: number;
}

export interface ReadinessComputation {
  blockers: ReadinessBlocker[];
  metrics: ReadinessMetrics;
  hasBlocker: boolean;
  hasWarn: boolean;
  readiness: "green" | "amber" | "red";
  canPublish: boolean;
  autoChecklist: {
    scheda_published: boolean;
    audio_coverage: boolean;
    no_blockers: boolean;
  };
}

export async function computeReadiness(
  projectId: string,
): Promise<ReadinessComputation> {
  const [schede, pois, narrators, paths, tension] = await Promise.all([
    prisma.scheda.findMany({
      where: { projectId },
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
      where: { projectId },
      select: { id: true, name: true, imageUrl: true },
    }),
    prisma.narratorProfile.findMany({
      where: { projectId, archived: false },
      select: { id: true, voiceId: true, portraitUrl: true, name: true },
    }),
    prisma.path.findMany({
      where: { projectId, archived: false },
      select: {
        id: true,
        name: true,
        narratorId: true,
        poiOrderJson: true,
      },
    }),
    prisma.narrativeTension.findUnique({
      where: { projectId },
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
  const blockers: ReadinessBlocker[] = [];

  if (published === 0) {
    blockers.push({
      id: "no_published",
      severity: "block",
      message:
        "Nessuna scheda pubblicata. Serve almeno una scheda pubblicata per rilasciare il progetto.",
      action: { label: "Vai alle schede", href: `/progetti/${projectId}/schede` },
    });
  }

  if (pois.length === 0) {
    blockers.push({
      id: "no_pois",
      severity: "block",
      message: "Nessun POI definito.",
      action: { label: "Vai al luogo", href: `/progetti/${projectId}/luogo` },
    });
  }

  if (narrators.length === 0) {
    blockers.push({
      id: "no_narrators",
      severity: "block",
      message: "Nessun narratore definito.",
      action: { label: "Vai ai percorsi", href: `/progetti/${projectId}/percorsi` },
    });
  }

  if (paths.length === 0) {
    blockers.push({
      id: "no_paths",
      severity: "block",
      message: "Nessun percorso tematico creato.",
      action: { label: "Vai ai percorsi", href: `/progetti/${projectId}/percorsi` },
    });
  }

  if (staleAudio > 0) {
    blockers.push({
      id: "stale_audio",
      severity: "block",
      message: `${staleAudio} audio obsoleti (la scheda è stata modificata dopo la generazione audio).`,
      action: { label: "Rigenera audio", href: `/progetti/${projectId}/schede` },
    });
  }

  if (audioCoverage < 0.8) {
    blockers.push({
      id: "low_audio_coverage",
      severity: "warn",
      message: `Copertura audio ${Math.round(audioCoverage * 100)}% — obiettivo 80%.`,
      action: { label: "Genera audio", href: `/progetti/${projectId}/schede` },
    });
  }

  if (imageCoverage < 0.5) {
    blockers.push({
      id: "low_image_coverage",
      severity: "warn",
      message: `Copertura immagini ${Math.round(imageCoverage * 100)}% — obiettivo 50%.`,
      action: { label: "Aggiungi foto POI", href: `/progetti/${projectId}/luogo` },
    });
  }

  if (narratorsWithVoice < narrators.length) {
    blockers.push({
      id: "narrators_no_voice",
      severity: "warn",
      message: `${narrators.length - narratorsWithVoice} narratori senza voce associata.`,
      action: { label: "Vai ai percorsi", href: `/progetti/${projectId}/percorsi` },
    });
  }

  if (narratorsWithPortrait < narrators.length) {
    blockers.push({
      id: "narrators_no_portrait",
      severity: "warn",
      message: `${narrators.length - narratorsWithPortrait} narratori senza ritratto.`,
      action: { label: "Vai ai percorsi", href: `/progetti/${projectId}/percorsi` },
    });
  }

  if (poiCoverage < 0.7 && pois.length > 0) {
    blockers.push({
      id: "low_poi_coverage",
      severity: "warn",
      message: `Solo ${Math.round(poiCoverage * 100)}% dei POI ha una scheda pubblicata.`,
      action: { label: "Vai alle schede", href: `/progetti/${projectId}/schede` },
    });
  }

  if (tension) {
    const verifyItems = (tension.verifyJson as Array<{ status?: string }>) ?? [];
    const pendingVerify = verifyItems.filter((v) => v.status === "pending");
    if (pendingVerify.length > 0) {
      blockers.push({
        id: "pending_verify",
        severity: "warn",
        message: `${pendingVerify.length} claim ancora da verificare.`,
        action: { label: "Vai alla Narrative Tension Map", href: `/progetti/${projectId}/brief` },
      });
    }
  }

  const hasBlocker = blockers.some((b) => b.severity === "block");
  const hasWarn = blockers.some((b) => b.severity === "warn");
  const readiness: "green" | "amber" | "red" = hasBlocker
    ? "red"
    : hasWarn
      ? "amber"
      : "green";

  const autoChecklist = {
    scheda_published: published >= 1,
    audio_coverage: audioCoverage >= 0.8,
    no_blockers: !hasBlocker,
  };

  const canPublish =
    !hasBlocker &&
    Object.values(autoChecklist).every(Boolean);

  return {
    blockers,
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
    hasBlocker,
    hasWarn,
    readiness,
    canPublish,
    autoChecklist,
  };
}
