"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Eye,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { loadMap } from "@/lib/project-store";

type Blocker = {
  id: string;
  severity: "block" | "warn";
  message: string;
  action?: { label: string; href: string };
};

type Metrics = {
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
};

type Checklist = {
  auto: {
    scheda_published: boolean;
    audio_coverage: boolean;
    no_blockers: boolean;
  };
  manual: {
    revisione_contenuti: boolean;
    verifica_fatti: boolean;
    qualita_immagini: boolean;
    approvazione_cliente: boolean;
  };
};

type ReadinessData = {
  projectId: string;
  projectName: string;
  projectStatus: string;
  readiness: "green" | "amber" | "red";
  canPublish: boolean;
  metrics: Metrics;
  blockers: Blocker[];
  checklist: Checklist;
};

const MANUAL_LABELS: Record<keyof Checklist["manual"], string> = {
  revisione_contenuti: "Contenuti riletti e revisionati",
  verifica_fatti: "Fatti verificati dalle fonti",
  qualita_immagini: "Qualità delle immagini approvata",
  approvazione_cliente: "Approvazione del cliente ricevuta",
};

const AUTO_LABELS: Record<keyof Checklist["auto"], string> = {
  scheda_published: "Almeno una scheda pubblicata",
  audio_coverage: "Copertura audio ≥ 80%",
  no_blockers: "Nessun problema bloccante",
};

export default function PubblicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}/readiness`, {
        cache: "no-store",
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleManual = async (key: keyof Checklist["manual"]) => {
    if (!data) return;
    setSaving(key);
    const next = !data.checklist.manual[key];
    try {
      const res = await fetch(`/api/projects/${id}/checklist`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (res.ok) await load();
    } finally {
      setSaving(null);
    }
  };

  const publish = async () => {
    if (!data?.canPublish) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/projects/${id}/checklist`, {
        method: "POST",
      });
      if (res.ok) await load();
    } finally {
      setPublishing(false);
    }
  };

  // Auto-sync: al primo caricamento, se trova foto nel browser ancora non
  // arrivate al DB (per via del body limit del PUT bulk), le manda via PATCH
  // singolo POI. Senza UI, silenzioso.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const localMap = await loadMap(id);
        if (!localMap?.pois?.length) return;
        const localImages = new Map<string, string>();
        for (const p of localMap.pois)
          if (p.image) localImages.set(p.id, p.image);
        if (localImages.size === 0) return;

        const mapRes = await fetch(`/api/projects/${id}/map`, {
          cache: "no-store",
        });
        if (!mapRes.ok) return;
        const mapJson = (await mapRes.json()) as {
          map?: { pois?: Array<{ id: string; image?: string }> };
        };
        const dbWithImage = new Set(
          (mapJson.map?.pois ?? []).filter((p) => !!p.image).map((p) => p.id),
        );
        const toSync = Array.from(localImages.entries()).filter(
          ([pid]) => !dbWithImage.has(pid),
        );
        if (toSync.length === 0) return;

        let changed = false;
        for (const [pid, img] of toSync) {
          if (!alive) return;
          const r = await fetch(`/api/projects/${id}/pois/${pid}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ imageUrl: img }),
          }).catch(() => null);
          if (r?.ok) changed = true;
        }
        if (alive && changed) await load();
      } catch {
        // silent
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="text-sm text-muted-foreground">
          Impossibile caricare lo stato del progetto.
        </p>
      </div>
    );
  }

  const toneByLevel: Record<
    ReadinessData["readiness"],
    {
      bg: string;
      ring: string;
      dot: string;
      label: string;
      subtitle: string;
    }
  > = {
    green: {
      bg: "bg-emerald-50/70",
      ring: "ring-emerald-300/60",
      dot: "bg-emerald-500",
      label: "Pronto al lancio",
      subtitle: "Tutti i controlli sono verdi. Puoi pubblicare il progetto.",
    },
    amber: {
      bg: "bg-amber-50/70",
      ring: "ring-amber-300/60",
      dot: "bg-amber-500",
      label: "Pronto con avvisi",
      subtitle: "Nessun problema bloccante, ma ci sono avvisi da considerare.",
    },
    red: {
      bg: "bg-rose-50/70",
      ring: "ring-rose-300/60",
      dot: "bg-rose-500",
      label: "Non pronto",
      subtitle: "Ci sono problemi bloccanti da risolvere prima di pubblicare.",
    },
  };
  const tone = toneByLevel[data.readiness];
  const blockers = data.blockers.filter((b) => b.severity === "block");
  const warnings = data.blockers.filter((b) => b.severity === "warn");
  const isPublished = data.projectStatus === "published";

  return (
    <div className="min-h-screen bg-paper pb-24">
      {/* Hero */}
      <section className="px-6 md:px-12 pt-10 md:pt-14 pb-8 border-b border-border/60">
        <div className="max-w-5xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-3">
            Step 07 · Pubblica
          </p>
          <h1 className="font-heading italic text-4xl md:text-5xl lg:text-6xl leading-[0.98] tracking-tight mb-4">
            Verifica e consegna
          </h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground max-w-2xl">
            Un'ultima lettura prima di accendere l'esperienza. Controllo
            automatico di quello che serve, checklist editoriale e anteprima di
            come il visitatore vedrà il luogo.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={`/progetti/${id}/preview`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 h-11 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              <Eye className="h-4 w-4" strokeWidth={1.8} />
              Apri anteprima app visitatore
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.8}
              />
            </a>
            {!isPublished && (
              <button
                onClick={publish}
                disabled={!data.canPublish || publishing}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                )}
                Pubblica progetto
              </button>
            )}
            {isPublished && (
              <span className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-emerald-100 text-emerald-900 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
                Progetto pubblicato
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Readiness status card */}
      <section className="px-6 md:px-12 pt-10">
        <div className="max-w-5xl">
          <div
            className={`relative rounded-3xl ${tone.bg} ring-1 ${tone.ring} p-8 md:p-10`}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`relative h-3 w-3 rounded-full ${tone.dot}`}>
                    <span
                      className={`absolute inset-0 rounded-full ${tone.dot} opacity-40 animate-ping`}
                    />
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    Stato di lancio
                  </span>
                </div>
                <h2 className="font-heading italic text-3xl md:text-4xl tracking-tight">
                  {tone.label}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  {tone.subtitle}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 md:gap-6">
                <StatBig
                  label="POI coperti"
                  value={`${Math.round(data.metrics.poiCoverage * 100)}%`}
                  small={`${data.metrics.poisWithScheda}/${data.metrics.pois}`}
                />
                <StatBig
                  label="Audio pronti"
                  value={`${Math.round(data.metrics.audioCoverage * 100)}%`}
                  small={`${data.metrics.audioWithFile}/${data.metrics.schedePublished}`}
                />
                <StatBig
                  label="Foto POI"
                  value={`${Math.round(data.metrics.imageCoverage * 100)}%`}
                  small={`${data.metrics.poisWithImage}/${data.metrics.pois}`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics grid */}
      <section className="px-6 md:px-12 pt-10">
        <div className="max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricTile
            label="Schede pubblicate"
            value={data.metrics.schedePublished}
            sub={`${data.metrics.schedeTotal} totali`}
          />
          <MetricTile
            label="Narratori"
            value={data.metrics.narrators}
            sub={`${data.metrics.narratorsWithVoice} con voce`}
          />
          <MetricTile
            label="Percorsi"
            value={data.metrics.paths}
            sub="itinerari tematici"
          />
          <MetricTile
            label="In revisione"
            value={
              data.metrics.schedeInReview + data.metrics.schedeClientReview
            }
            sub={`${data.metrics.schedeDraft} bozze`}
          />
        </div>
      </section>

      {/* Blockers */}
      {(blockers.length > 0 || warnings.length > 0) && (
        <section className="px-6 md:px-12 pt-10">
          <div className="max-w-5xl">
            <h3 className="font-heading italic text-2xl mb-4">
              Problemi e avvisi
            </h3>
            <div className="space-y-2">
              {blockers.map((b) => (
                <BlockerRow key={b.id} item={b} />
              ))}
              {warnings.map((b) => (
                <BlockerRow key={b.id} item={b} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Checklist */}
      <section className="px-6 md:px-12 pt-12">
        <div className="max-w-5xl grid md:grid-cols-2 gap-6">
          <ChecklistCard
            title="Verifiche automatiche"
            subtitle="Calcolate dallo Studio sui dati in archivio."
            items={(
              Object.keys(AUTO_LABELS) as (keyof Checklist["auto"])[]
            ).map((k) => ({
              key: k,
              label: AUTO_LABELS[k],
              done: data.checklist.auto[k],
            }))}
          />
          <ChecklistCard
            title="Verifiche editoriali"
            subtitle="Spunta quando hai fatto il controllo. Tutte bloccanti."
            items={(
              Object.keys(MANUAL_LABELS) as (keyof Checklist["manual"])[]
            ).map((k) => ({
              key: k,
              label: MANUAL_LABELS[k],
              done: data.checklist.manual[k],
              onToggle: () => toggleManual(k),
              saving: saving === k,
            }))}
          />
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 md:px-12 pt-14">
        <div className="max-w-5xl rounded-3xl border border-border/70 bg-card p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-2">
              Anteprima
            </p>
            <h3 className="font-heading italic text-2xl md:text-3xl mb-1">
              Guarda il luogo con gli occhi del visitatore
            </h3>
            <p className="text-sm text-muted-foreground max-w-xl">
              Apri l'app visitatore con i contenuti già generati: entrambe le
              modalità (compositore AI e percorsi tematici), schede, audio,
              assistente.
            </p>
          </div>
          <a
            href={`/progetti/${id}/preview`}
            target="_blank"
            rel="noopener noreferrer"
            className="group shrink-0 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            Apri anteprima
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={1.8}
            />
          </a>
        </div>
      </section>
    </div>
  );
}

function StatBig({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {label}
      </p>
      <p className="font-heading italic text-3xl md:text-4xl tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
        {small}
      </p>
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
        {label}
      </p>
      <p className="font-heading italic text-3xl tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-2">{sub}</p>
    </div>
  );
}

function BlockerRow({ item }: { item: Blocker }) {
  const block = item.severity === "block";
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border ${
        block
          ? "border-rose-200 bg-rose-50/40"
          : "border-amber-200 bg-amber-50/40"
      }`}
    >
      {block ? (
        <XCircle
          className="h-5 w-5 text-rose-600 shrink-0 mt-0.5"
          strokeWidth={1.8}
        />
      ) : (
        <AlertTriangle
          className="h-5 w-5 text-amber-600 shrink-0 mt-0.5"
          strokeWidth={1.8}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{item.message}</p>
      </div>
      {item.action && (
        <Link
          href={item.action.href}
          className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline underline-offset-4"
        >
          {item.action.label}
          <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
        </Link>
      )}
    </div>
  );
}

function ChecklistCard({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{
    key: string;
    label: string;
    done: boolean;
    onToggle?: () => void;
    saving?: boolean;
  }>;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 md:p-7">
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-1">
        {title}
      </p>
      <p className="text-xs text-muted-foreground mb-5">{subtitle}</p>
      <ul className="space-y-2">
        {items.map((it) => {
          const Interactive = it.onToggle ? "button" : "div";
          return (
            <li key={it.key}>
              <Interactive
                onClick={it.onToggle}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-colors ${
                  it.onToggle
                    ? "hover:bg-accent cursor-pointer"
                    : "cursor-default"
                }`}
                disabled={it.saving}
              >
                {it.saving ? (
                  <Loader2 className="h-4 w-4 mt-0.5 animate-spin text-muted-foreground shrink-0" />
                ) : it.done ? (
                  <CheckCircle2
                    className="h-4 w-4 mt-0.5 text-brand shrink-0"
                    strokeWidth={2}
                  />
                ) : (
                  <Circle
                    className="h-4 w-4 mt-0.5 text-muted-foreground/60 shrink-0"
                    strokeWidth={1.6}
                  />
                )}
                <span
                  className={`text-sm leading-relaxed ${
                    it.done ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {it.label}
                </span>
              </Interactive>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
