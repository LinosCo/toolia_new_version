"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  FileText,
  Sparkles,
  Trash2,
  Replace,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  File,
  Pencil,
  Mic,
  RefreshCw,
  Plus,
  ChevronUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loadSources,
  saveSources,
  loadProgress,
  saveProgress,
  newSourceId,
  loadProject,
  loadKB,
  saveKB,
  ProjectSources,
  UploadedDocument,
  PlanimetriaSource,
  SpatialHint,
  Importance,
  Reliability,
  WebsiteSource,
  InterviewSource,
  InterviewQA,
  InterviewMode,
  RespondentRole,
  kbFactsBySourceLabel,
  sourcesSignature,
  KBFact,
  KBCategory,
  KBSourceKind,
  ProjectKB,
} from "@/lib/project-store";
import { loadApiKeys } from "@/lib/api-keys";
import { cn } from "@/lib/utils";

type SubStep = 0 | 1 | 2 | 3 | 4 | 5;
const TOTAL_SUBSTEPS = 5; // 0..4 editable + 5 recap

const SUB_LABELS = [
  "Planimetria",
  "Sito web",
  "Documenti",
  "Intervista",
  "Knowledge Base",
  "Riepilogo",
];

const SUB_TITLES = [
  "La planimetria",
  "Il sito web",
  "I documenti",
  "L'intervista al gestore",
  "La Knowledge Base",
  "Fonti pronte",
];

export default function FontiStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const [step, setStepState] = useState<SubStep>(0);
  const [sources, setSources] = useState<ProjectSources>({
    images: [],
    documents: [],
  });
  const [kb, setKb] = useState<ProjectKB>({ facts: [] });
  const [quotaError, setQuotaError] = useState(false);

  const hydratedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    hydratedRef.current = false;
    const progress = loadProgress(projectId);
    const resume = Math.max(
      0,
      Math.min(TOTAL_SUBSTEPS, progress.fontiSubStep),
    ) as SubStep;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStepState(resume);
    saveProgress(projectId, { currentStep: "fonti" });
    loadSources(projectId).then((loaded) => {
      if (!alive) return;
      setSources(loaded);
    });
    loadKB(projectId).then((loaded) => {
      if (!alive) return;
      setKb(loaded);
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const persistKb = (next: ProjectKB) => {
    setKb(next);
    saveKB(projectId, next);
  };

  const setStep = (next: SubStep) => {
    setStepState(next);
    saveProgress(projectId, { fontiSubStep: next });
  };

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    const h = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("toolia:sources-updated"));
    });
    return () => cancelAnimationFrame(h);
  }, [sources]);

  const persist = (next: ProjectSources) => {
    setSources(next);
    saveSources(projectId, next).then((result) => {
      setQuotaError(!result.ok && result.reason === "quota");
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="shrink-0 px-6 md:px-10 pt-8 pb-4">
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
            Step 1 · Fonti
          </p>
          <h1 className="font-heading text-3xl md:text-4xl italic leading-tight tracking-tight">
            {SUB_TITLES[step]}
          </h1>
        </div>

        <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
          {SUB_LABELS.map((label, i) => {
            const filled = isSubFilled(sources, kb, i);
            const current = step === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i as SubStep)}
                aria-label={`Vai a ${label}`}
                aria-current={current ? "step" : undefined}
                className="group flex-1 min-w-[88px] flex flex-col items-start gap-1.5 py-1"
              >
                <span
                  className={cn(
                    "h-[3px] w-full rounded-full transition-all duration-300",
                    current
                      ? "bg-brand"
                      : filled
                        ? "bg-foreground group-hover:bg-foreground/80"
                        : "bg-foreground/15 group-hover:bg-foreground/30",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-[0.12em] transition-colors",
                    current
                      ? "text-foreground font-medium"
                      : filled
                        ? "text-muted-foreground group-hover:text-foreground"
                        : "text-muted-foreground/60 group-hover:text-foreground/70",
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {quotaError && (
          <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/[0.04] p-4 flex items-start gap-3">
            <AlertCircle
              className="h-4 w-4 text-destructive shrink-0 mt-0.5"
              strokeWidth={1.8}
            />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                Spazio locale esaurito
              </p>
              <p>
                Le fonti caricate superano lo spazio del browser. Rimuovi
                qualche immagine o documento pesante e riprova.
              </p>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 px-6 md:px-10 py-10 max-w-[820px] w-full mx-auto">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <Shell
              key="0"
              kicker="Passo 1 di 5"
              subtitle="Pianta o mappa del luogo. L'AI estrae una descrizione ricca e gli spunti spaziali — i punti di interesse veri si costruiscono dopo, incrociando tutte le fonti."
            >
              <PlanimetriaUploader
                value={sources.planimetria}
                onChange={(planimetria) =>
                  setSources((prev) => {
                    const next: ProjectSources = { ...prev, planimetria };
                    saveSources(projectId, next).then((result) => {
                      setQuotaError(!result.ok && result.reason === "quota");
                    });
                    return next;
                  })
                }
              />
            </Shell>
          )}

          {step === 1 && (
            <Shell
              key="1"
              kicker="Passo 2 di 5"
              subtitle="L'URL del sito ufficiale. Estraiamo il testo e potrai correggerlo prima che l'AI lo usi."
            >
              <WebsiteSection
                website={sources.website}
                onChange={(website) => persist({ ...sources, website })}
              />
            </Shell>
          )}

          {step === 2 && (
            <Shell
              key="2"
              kicker="Passo 3 di 5"
              subtitle="Brochure, guide, schede storiche. Per ogni documento indica quanto conta e quanto è affidabile."
            >
              <DocumentsSection
                documents={sources.documents}
                onChange={(documents) => persist({ ...sources, documents })}
              />
            </Shell>
          )}

          {step === 3 && (
            <Shell
              key="3"
              kicker="Passo 4 di 5"
              subtitle="La fonte più autorevole: il racconto di chi vive il luogo. L'AI prepara le domande, tu raccogli le risposte."
            >
              <InterviewSection
                projectId={projectId}
                interview={sources.interview}
                sources={sources}
                onChange={(interview) => persist({ ...sources, interview })}
              />
            </Shell>
          )}

          {step === 4 && (
            <Shell
              key="4"
              kicker="Passo 5 di 5"
              subtitle="L'AI trasforma le fonti in una lista di fatti atomici classificati. Questi fatti sono l'unico materiale che il Brief e le schede useranno."
            >
              <KnowledgeBaseSection
                projectId={projectId}
                sources={sources}
                kb={kb}
                onChange={persistKb}
              />
            </Shell>
          )}

          {step === 5 && (
            <Shell
              key="5"
              kicker="Tutto pronto"
              subtitle="Questa è la vista d'insieme. Ogni fonte ha il suo peso, l'AI la userà di conseguenza nei prossimi step."
            >
              <Recap sources={sources} kb={kb} projectId={projectId} />
            </Shell>
          )}
        </AnimatePresence>
      </main>

      <footer className="shrink-0 border-t border-border/60 bg-paper">
        <div className="max-w-[820px] mx-auto px-6 py-5 flex items-center justify-between gap-4">
          {step === 0 ? (
            <Link
              href={`/progetti/${projectId}`}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
              Progetto
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStep(Math.max(0, step - 1) as SubStep)}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
              Indietro
            </button>
          )}

          {step < TOTAL_SUBSTEPS ? (
            <button
              type="button"
              onClick={() =>
                setStep(Math.min(TOTAL_SUBSTEPS, step + 1) as SubStep)
              }
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              {step === TOTAL_SUBSTEPS - 1 ? "Rivedi riepilogo" : "Avanti"}
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </button>
          ) : (
            <Link
              href={`/progetti/${projectId}/brief`}
              onClick={() => saveProgress(projectId, { currentStep: "brief" })}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm font-medium bg-brand text-white hover:bg-brand/90 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
            >
              Vai al prossimo step
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}

function isSubFilled(s: ProjectSources, kb: ProjectKB, i: number): boolean {
  switch (i) {
    case 0:
      return !!s.planimetria?.image;
    case 1:
      return !!s.website?.text && s.website.text.length > 30;
    case 2:
      return s.documents.length > 0;
    case 3:
      return (
        !!s.interview &&
        ((s.interview.mode === "trascrizione" &&
          (s.interview.transcriptText?.length ?? 0) > 100) ||
          (s.interview.mode !== "trascrizione" &&
            s.interview.qa.some((q) => q.answer.trim().length > 0)))
      );
    case 4:
      return kb.facts.some((f) => f.approved);
    case 5:
      // Riepilogo: "done" quando KB ha ≥1 fatto approvato (endpoint reale delle Fonti)
      return kb.facts.some((f) => f.approved);
    default:
      return false;
  }
}

function Shell({
  kicker,
  subtitle,
  children,
}: {
  kicker: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {kicker}
        </p>
        <p className="text-base text-muted-foreground max-w-xl">{subtitle}</p>
      </div>
      <div>{children}</div>
    </motion.section>
  );
}
/* ============================================================= */
/* ======================== PLANIMETRIA ======================== */
/* ============================================================= */

function PlanimetriaUploader({
  value,
  onChange,
}: {
  value?: PlanimetriaSource;
  onChange: (v: PlanimetriaSource | undefined) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [newHint, setNewHint] = useState("");

  const hasOpenAiKey =
    typeof window !== "undefined" && loadApiKeys().llm.openai.length > 0;

  const patch = (changes: Partial<PlanimetriaSource>) => {
    if (!value) return;
    onChange({ ...value, ...changes });
  };

  const handleFile = async (f: File) => {
    if (!f.type.startsWith("image/")) return;
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      onChange({
        image: dataUrl,
        description: value?.description ?? "",
        spatialHints: value?.spatialHints ?? [],
        importance: value?.importance ?? "primaria",
        reliability: value?.reliability ?? "alta",
        analyzedAt: undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const analyze = async () => {
    if (!value?.image) return;
    setAnalyzing(true);
    setAiError(null);
    try {
      const apiKey = loadApiKeys().llm.openai;
      const res = await fetch("/api/ai/analyze-planimetria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: value.image, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.message || "Errore durante l'analisi.");
        return;
      }
      const description =
        typeof data.description === "string" ? data.description : "";
      const spatialHints: SpatialHint[] = Array.isArray(data.spatialHints)
        ? data.spatialHints
            .map((h: unknown): SpatialHint | null => {
              if (typeof h === "string") {
                const name = h.trim();
                return name ? { name, description: "" } : null;
              }
              if (h && typeof h === "object") {
                const o = h as { name?: unknown; description?: unknown };
                const name = typeof o.name === "string" ? o.name.trim() : "";
                if (!name) return null;
                const desc =
                  typeof o.description === "string" ? o.description.trim() : "";
                return { name, description: desc };
              }
              return null;
            })
            .filter((h: SpatialHint | null): h is SpatialHint => h !== null)
        : [];
      if (!description && spatialHints.length === 0) {
        setAiError(
          "L'AI non ha letto nulla dalla planimetria. Prova un'immagine più nitida.",
        );
        return;
      }
      patch({
        description,
        spatialHints,
        analyzedAt: new Date().toISOString(),
      });
    } catch {
      setAiError("Errore di rete.");
    } finally {
      setAnalyzing(false);
    }
  };

  const addHint = () => {
    const v = newHint.trim();
    if (!v || !value) return;
    if (
      value.spatialHints.some((h) => h.name.toLowerCase() === v.toLowerCase())
    ) {
      setNewHint("");
      return;
    }
    patch({
      spatialHints: [...value.spatialHints, { name: v, description: "" }],
    });
    setNewHint("");
  };

  const removeHint = (idx: number) => {
    if (!value) return;
    patch({
      spatialHints: value.spatialHints.filter((_, i) => i !== idx),
    });
  };

  const updateHint = (idx: number, patchHint: Partial<SpatialHint>) => {
    if (!value) return;
    patch({
      spatialHints: value.spatialHints.map((h, i) =>
        i === idx ? { ...h, ...patchHint } : h,
      ),
    });
  };

  const wordsDescription = value?.description
    ? value.description.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div>
      {value?.image ? (
        <div className="space-y-5">
          <div className="relative rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-4 bg-muted/40 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-brand" />
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                  Planimetria caricata
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-foreground text-background text-xs font-medium hover:bg-foreground/90 transition-colors"
                >
                  <Replace className="h-3 w-3" strokeWidth={1.8} />
                  Cambia
                </button>
                <button
                  type="button"
                  onClick={() => onChange(undefined)}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-muted text-destructive hover:bg-destructive hover:text-white transition-colors"
                  aria-label="Rimuovi"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.8} />
                </button>
              </div>
            </div>
            <div className="bg-[#F5F1EA] flex items-center justify-center min-h-[280px] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value.image}
                alt="Planimetria"
                className="max-h-[480px] max-w-full object-contain block"
              />
            </div>
            <div className="p-4 border-t border-border/60 flex items-center justify-between gap-4 bg-card">
              <div className="flex items-start gap-3 min-w-0">
                <Sparkles
                  className="h-4 w-4 text-brand shrink-0 mt-0.5"
                  strokeWidth={1.8}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {value.analyzedAt
                      ? "Descrizione estratta"
                      : "Analisi automatica"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {value.analyzedAt
                      ? `${wordsDescription} parole · ${value.spatialHints.length} spunti osservati`
                      : hasOpenAiKey
                        ? "L'AI legge la planimetria e produce una descrizione testuale dettagliata + elenco di ambienti osservati."
                        : "Configura la chiave OpenAI in Impostazioni per usare l'AI."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={analyze}
                disabled={!hasOpenAiKey || analyzing}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-medium transition-colors",
                  !hasOpenAiKey
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : analyzing
                      ? "bg-muted text-muted-foreground cursor-wait"
                      : value.analyzedAt
                        ? "border border-border text-foreground hover:bg-muted"
                        : "bg-foreground text-background hover:bg-foreground/90",
                )}
              >
                {analyzing ? (
                  <>
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      strokeWidth={1.8}
                    />
                    Analizzo…
                  </>
                ) : value.analyzedAt ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Rianalizza
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Analizza con AI
                  </>
                )}
              </button>
            </div>
            {aiError && (
              <div className="px-4 pb-4 bg-card">
                <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-3 flex items-start gap-2">
                  <AlertCircle
                    className="h-4 w-4 text-destructive shrink-0 mt-0.5"
                    strokeWidth={1.8}
                  />
                  <p className="text-xs text-muted-foreground">{aiError}</p>
                </div>
              </div>
            )}
          </div>

          {/* Tag importanza/affidabilità */}
          <SourceTaggingRow
            importance={value.importance}
            reliability={value.reliability}
            onImportance={(importance) => patch({ importance })}
            onReliability={(reliability) => patch({ reliability })}
          />

          {/* Descrizione editabile */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                Descrizione
              </p>
              <p className="text-[11px] text-muted-foreground">
                {wordsDescription} parole
              </p>
            </div>
            <textarea
              value={value.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="La descrizione ricca della planimetria comparirà qui dopo l'analisi AI. Puoi editarla liberamente."
              rows={8}
              className="w-full px-4 py-3 text-sm text-foreground bg-transparent resize-y focus:outline-none"
            />
          </div>

          {/* Spunti spaziali — nome + descrizione (no coords) */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="px-4 py-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                  Spunti osservati · {value.spatialHints.length}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Nome e descrizione di ciò che l&apos;AI ha letto accanto a ogni
                punto del disegno. Non sono punti di interesse definitivi:
                serviranno nello step Luogo, incrociati con il resto delle
                fonti.
              </p>
            </div>
            <div className="p-4 space-y-3">
              {value.spatialHints.length > 0 && (
                <ul className="space-y-2">
                  {value.spatialHints.map((h, idx) => (
                    <li
                      key={idx}
                      className="rounded-xl border border-border bg-muted/30 p-3 flex items-start gap-3"
                    >
                      <span className="shrink-0 h-6 w-6 rounded-full bg-violet-500/15 text-violet-700 text-[11px] font-bold flex items-center justify-center tabular-nums mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <Input
                          value={h.name}
                          onChange={(e) =>
                            updateHint(idx, { name: e.target.value })
                          }
                          placeholder="Nome dello spunto"
                          className="h-8 text-sm font-medium bg-card"
                        />
                        <textarea
                          value={h.description}
                          onChange={(e) =>
                            updateHint(idx, { description: e.target.value })
                          }
                          placeholder="Descrizione letta accanto al punto (opzionale)"
                          rows={2}
                          className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeHint(idx)}
                        className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label={`Rimuovi ${h.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={newHint}
                  onChange={(e) => setNewHint(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addHint();
                    }
                  }}
                  placeholder="Aggiungi uno spunto (es. Sala delle Armi)"
                  className="h-9 text-sm"
                />
                <button
                  type="button"
                  onClick={addHint}
                  disabled={!newHint.trim()}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-full text-xs font-medium transition-colors",
                    newHint.trim()
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          disabled={busy}
          className={cn(
            "w-full rounded-2xl border-2 border-dashed transition-all py-14 flex flex-col items-center justify-center gap-3",
            dragOver
              ? "border-foreground bg-card"
              : "border-border hover:border-foreground/40 hover:bg-card/60",
          )}
        >
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <svg
              className="h-6 w-6 text-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 3v18" />
            </svg>
          </div>
          <p className="text-sm font-medium">
            {busy ? "Caricamento…" : "Carica la planimetria"}
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG o PDF convertito in immagine
          </p>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <p className="mt-3 text-xs text-muted-foreground">
        Opzionale. Se il sito è all&apos;aperto puoi saltare: la planimetria
        aiuta ma non è obbligatoria.
      </p>
    </div>
  );
}

function SourceTaggingRow({
  importance,
  reliability,
  onImportance,
  onReliability,
}: {
  importance: Importance;
  reliability: Reliability;
  onImportance: (v: Importance) => void;
  onReliability: (v: Reliability) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium mb-2">
          Importanza
        </p>
        <div className="flex gap-2">
          {IMPORTANCE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onImportance(o.value)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                importance === o.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium mb-2">
          Affidabilità
        </p>
        <div className="flex gap-2">
          {RELIABILITY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onReliability(o.value)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                reliability === o.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================= */
/* ========================== SITO WEB ========================= */
/* ============================================================= */

const IMPORTANCE_OPTIONS: { value: Importance; label: string; hint: string }[] =
  [
    { value: "primaria", label: "Primaria", hint: "Guida principale" },
    { value: "secondaria", label: "Secondaria", hint: "Arricchimento" },
    { value: "contesto", label: "Contesto", hint: "Sfondo, non citata" },
  ];

const RELIABILITY_OPTIONS: {
  value: Reliability;
  label: string;
  hint: string;
}[] = [
  { value: "alta", label: "Alta", hint: "Fonte verificata" },
  { value: "media", label: "Media", hint: "Attendibile, da controllare" },
  { value: "bassa", label: "Bassa", hint: "Tradizione o non verificata" },
];

function WebsiteSection({
  website,
  onChange,
}: {
  website?: WebsiteSource;
  onChange: (v: WebsiteSource | undefined) => void;
}) {
  const [url, setUrl] = useState(website?.url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        setError("Non riesco a leggere il sito. Controlla l'URL.");
        return;
      }
      const data = await res.json();
      onChange({
        url: url.trim(),
        scrapedAt: new Date().toISOString(),
        title: data.title,
        text: data.text ?? "",
        importance: website?.importance ?? "secondaria",
        reliability: website?.reliability ?? "media",
      });
    } catch {
      setError("Errore di rete.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    onChange(undefined);
    setUrl("");
    setError(null);
  };

  const words = website?.text
    ? website.text.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          URL del sito
        </Label>
        <div className="relative">
          <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://fortemontetesoro.it"
            className="h-12 text-base pl-10 pr-28"
            disabled={busy}
          />
          <button
            type="button"
            onClick={scan}
            disabled={busy || !url.trim()}
            className={cn(
              "absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5",
              busy || !url.trim()
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-foreground text-background hover:bg-foreground/90",
            )}
          >
            {busy ? (
              <>
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  strokeWidth={1.8}
                />
                Scansiono
              </>
            ) : website ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
                Riscansiona
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
                Scansiona
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-4 flex items-start gap-3">
          <AlertCircle
            className="h-4 w-4 text-destructive shrink-0 mt-0.5"
            strokeWidth={1.8}
          />
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      )}

      {website && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-4 bg-muted/30 border-b border-border/60 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-brand/15 text-brand flex items-center justify-center shrink-0">
                <Check className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {website.title ?? website.url}
                </p>
                <a
                  href={website.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 truncate"
                >
                  {website.url.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              Rimuovi
            </button>
          </div>

          <div className="p-4 space-y-4">
            <TagBlock
              importance={website.importance}
              reliability={website.reliability}
              onImportance={(importance) =>
                onChange({ ...website, importance })
              }
              onReliability={(reliability) =>
                onChange({ ...website, reliability })
              }
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Testo estratto
                </Label>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {words.toLocaleString("it-IT")} parole
                </span>
              </div>
              <textarea
                value={website.text}
                onChange={(e) => onChange({ ...website, text: e.target.value })}
                rows={14}
                className="w-full rounded-lg border border-border bg-paper px-3 py-3 text-[13px] leading-relaxed text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30 font-normal"
              />
              <p className="text-[11px] text-muted-foreground mt-2">
                Modifica liberamente: togli cookie o privacy policy residui,
                aggiungi contesto utile, correggi errori di estrazione.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================= */
/* ========================= DOCUMENTI ========================= */
/* ============================================================= */

function DocumentsSection({
  documents,
  onChange,
}: {
  documents: UploadedDocument[];
  onChange: (v: UploadedDocument[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const addFiles = async (files: FileList | File[]) => {
    setBusy(true);
    setError(null);
    try {
      const arr = Array.from(files);
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

      const newDocs: UploadedDocument[] = [];
      for (const f of arr) {
        if (f.type === "application/pdf") {
          const buf = await f.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: buf }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
              .map((it: unknown) => (it as { str?: string }).str ?? "")
              .join(" ");
            fullText += pageText + "\n\n";
          }
          newDocs.push({
            id: newSourceId("d"),
            name: f.name,
            title: stripFileExt(f.name),
            size: f.size,
            pages: pdf.numPages,
            text: cleanText(fullText),
            addedAt: new Date().toISOString(),
            importance: "primaria",
            reliability: "alta",
          });
        } else if (f.type.startsWith("text/")) {
          const text = await f.text();
          newDocs.push({
            id: newSourceId("d"),
            name: f.name,
            title: stripFileExt(f.name),
            size: f.size,
            pages: 1,
            text: cleanText(text),
            addedAt: new Date().toISOString(),
            importance: "primaria",
            reliability: "alta",
          });
        }
      }
      onChange([...documents, ...newDocs]);
    } catch {
      setError("Errore durante la lettura del file.");
    } finally {
      setBusy(false);
    }
  };

  const updateDoc = (id: string, patch: Partial<UploadedDocument>) => {
    onChange(documents.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };
  const remove = (id: string) => onChange(documents.filter((d) => d.id !== id));

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        disabled={busy}
        className="w-full rounded-2xl border-2 border-dashed border-border hover:border-foreground/40 hover:bg-card/60 transition-colors py-10 flex flex-col items-center justify-center gap-2"
      >
        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
          <FileText className="h-6 w-6 text-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-medium">
          {busy ? "Elaborazione…" : "Aggiungi documenti"}
        </p>
        <p className="text-xs text-muted-foreground">PDF o TXT</p>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,text/plain,.pdf,.txt"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-4 flex items-start gap-3">
          <AlertCircle
            className="h-4 w-4 text-destructive shrink-0 mt-0.5"
            strokeWidth={1.8}
          />
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      )}

      {documents.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-3">
            {documents.length} document{documents.length === 1 ? "o" : "i"}
          </p>
          <ul className="space-y-3">
            {documents.map((d) => {
              const isOpen = openId === d.id;
              const words = d.text.split(/\s+/).filter(Boolean).length;
              return (
                <li
                  key={d.id}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <div className="flex items-start gap-3 p-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <File
                        className="h-4 w-4 text-foreground"
                        strokeWidth={1.8}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        value={d.title ?? ""}
                        onChange={(e) =>
                          updateDoc(d.id, { title: e.target.value })
                        }
                        placeholder={stripFileExt(d.name) || "Titolo"}
                        className="w-full text-sm font-medium bg-transparent focus:outline-none focus:bg-muted/40 rounded px-1 -mx-1"
                      />
                      <p className="text-xs text-muted-foreground truncate">
                        {d.name} · {d.pages} pagin
                        {d.pages === 1 ? "a" : "e"} ·{" "}
                        {words.toLocaleString("it-IT")} parole ·{" "}
                        {(d.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : d.id)}
                      className="h-8 px-3 inline-flex items-center gap-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      {isOpen ? (
                        <>
                          <ChevronUp
                            className="h-3.5 w-3.5"
                            strokeWidth={1.8}
                          />
                          Chiudi
                        </>
                      ) : (
                        <>
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                          Apri
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(d.id)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="Rimuovi documento"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  </div>
                  <div className="border-t border-border/60 p-4 space-y-4 bg-muted/20">
                    <TagBlock
                      importance={d.importance}
                      reliability={d.reliability}
                      onImportance={(importance) =>
                        updateDoc(d.id, { importance })
                      }
                      onReliability={(reliability) =>
                        updateDoc(d.id, { reliability })
                      }
                    />
                  </div>
                  {isOpen && (
                    <div className="border-t border-border/60 p-4 bg-paper">
                      <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2 block">
                        Testo estratto · modificabile
                      </Label>
                      <textarea
                        value={d.text}
                        onChange={(e) =>
                          updateDoc(d.id, { text: e.target.value })
                        }
                        rows={16}
                        className="w-full rounded-lg border border-border bg-card px-3 py-3 text-[13px] leading-relaxed text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function stripFileExt(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

function cleanText(raw: string): string {
  const junkKeywords = [
    "cookie",
    "privacy policy",
    "informativa",
    "gdpr",
    "trattamento dei dati",
    "consenso",
  ];
  return raw
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 25 || /[.!?]$/.test(l))
    .filter((l) => {
      const lower = l.toLowerCase();
      return !junkKeywords.some((k) => lower.includes(k) && l.length < 200);
    })
    .join("\n");
}

/* ============================================================= */
/* ========================= INTERVISTA ======================== */
/* ============================================================= */

const RESPONDENT_ROLES: { value: RespondentRole; label: string }[] = [
  { value: "gestore", label: "Gestore" },
  { value: "curatore", label: "Curatore" },
  { value: "direttore", label: "Direttore" },
  { value: "guida", label: "Guida" },
  { value: "proprietario", label: "Proprietario" },
  { value: "altro", label: "Altro" },
];

function InterviewSection({
  projectId,
  interview,
  sources,
  onChange,
}: {
  projectId: string;
  interview?: InterviewSource;
  sources: ProjectSources;
  onChange: (v: InterviewSource | undefined) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasOpenAiKey =
    typeof window !== "undefined" && loadApiKeys().llm.openai.length > 0;

  const startInterview = (mode: InterviewMode = "qa") => {
    if (interview) return;
    onChange({
      mode,
      respondent: { name: "", role: "gestore" },
      qa: [],
      importance: "primaria",
      reliability: "alta",
    });
  };

  const uploadTranscript = async (file: File) => {
    setError(null);
    try {
      let text = "";
      if (file.type === "application/pdf") {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
        const buf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text +=
            content.items
              .map((it: unknown) => (it as { str?: string }).str ?? "")
              .join(" ") + "\n\n";
        }
      } else if (file.type.startsWith("text/")) {
        text = await file.text();
      } else {
        setError("Formato non supportato. Usa PDF o TXT.");
        return;
      }
      if (!interview) {
        onChange({
          mode: "trascrizione",
          respondent: { name: "", role: "gestore" },
          qa: [],
          transcriptText: text.trim(),
          transcriptFileName: file.name,
          importance: "primaria",
          reliability: "alta",
        });
      } else {
        onChange({
          ...interview,
          mode: "trascrizione",
          transcriptText: text.trim(),
          transcriptFileName: file.name,
        });
      }
    } catch {
      setError("Errore durante la lettura del file.");
    }
  };

  const update = (patch: Partial<InterviewSource>) => {
    if (!interview) return;
    onChange({ ...interview, ...patch });
  };

  const updateQA = (id: string, patch: Partial<InterviewQA>) => {
    if (!interview) return;
    onChange({
      ...interview,
      qa: interview.qa.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    });
  };
  const addQA = () => {
    if (!interview) return;
    onChange({
      ...interview,
      qa: [...interview.qa, { id: newSourceId("q"), question: "", answer: "" }],
    });
  };
  const removeQA = (id: string) => {
    if (!interview) return;
    onChange({
      ...interview,
      qa: interview.qa.filter((q) => q.id !== id),
    });
  };

  const generateQuestions = async () => {
    if (!interview) return;
    setGenerating(true);
    setError(null);
    try {
      const apiKey = loadApiKeys().llm.openai;
      if (!apiKey) {
        setError("Configura la chiave OpenAI in Impostazioni.");
        setGenerating(false);
        return;
      }
      const project = loadProject(projectId);
      const documentsText = sources.documents
        .map((d) => `${d.name}:\n${d.text.slice(0, 1500)}`)
        .join("\n\n---\n\n");
      const res = await fetch("/api/ai/interview-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          projectName: project?.name,
          type: project?.type,
          city: project?.city,
          respondentRole: interview.respondent.role,
          websiteText: sources.website?.text?.slice(0, 3000),
          documentsText: documentsText.slice(0, 6000),
          planimetriaDescription: sources.planimetria?.description,
          spatialHints: sources.planimetria?.spatialHints.map((h) => h.name),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Errore nella generazione delle domande.");
        setGenerating(false);
        return;
      }
      const newQA: InterviewQA[] = (data.questions as string[]).map((q) => ({
        id: newSourceId("q"),
        question: q,
        answer: "",
      }));
      onChange({
        ...interview,
        qa: [...newQA, ...interview.qa.filter((q) => q.answer.trim())],
        questionsGeneratedAt: new Date().toISOString(),
      });
    } catch {
      setError("Errore di rete.");
    } finally {
      setGenerating(false);
    }
  };

  if (!interview) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-brand/10 mx-auto flex items-center justify-center">
          <Mic className="h-6 w-6 text-brand" strokeWidth={1.6} />
        </div>
        <div>
          <p className="font-heading text-xl italic mb-1">
            Nessuna intervista ancora
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            L&apos;intervista al gestore o al curatore è la fonte più
            autorevole: racconta cose che nei documenti non ci sono.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => startInterview("qa")}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            <Sparkles className="h-4 w-4" strokeWidth={1.8} />
            Guidata con AI
          </button>
          <label className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-border text-foreground text-sm font-medium hover:bg-muted cursor-pointer transition-colors">
            <FileText className="h-4 w-4" strokeWidth={1.8} />
            Carica trascrizione
            <input
              type="file"
              accept="application/pdf,text/plain,.pdf,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadTranscript(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Guidata: l&apos;AI pone le domande, tu scrivi le risposte.
          Trascrizione: carichi un&apos;intervista già fatta (PDF/TXT),
          l&apos;AI la legge come fonte.
        </p>
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-3 flex items-start gap-2 text-left">
            <AlertCircle
              className="h-4 w-4 text-destructive shrink-0 mt-0.5"
              strokeWidth={1.8}
            />
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* RESPONDENT */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
          Chi risponde
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5 block">
              Nome e cognome
            </Label>
            <Input
              value={interview.respondent.name}
              onChange={(e) =>
                update({
                  respondent: { ...interview.respondent, name: e.target.value },
                })
              }
              placeholder="Es. Marco Rossi"
              className="h-10"
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5 block">
              Ruolo
            </Label>
            <select
              value={interview.respondent.role}
              onChange={(e) =>
                update({
                  respondent: {
                    ...interview.respondent,
                    role: e.target.value as RespondentRole,
                  },
                })
              }
              className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
            >
              {RESPONDENT_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {interview.respondent.role === "altro" && (
          <Input
            value={interview.respondent.roleLabel ?? ""}
            onChange={(e) =>
              update({
                respondent: {
                  ...interview.respondent,
                  roleLabel: e.target.value,
                },
              })
            }
            placeholder="Specifica il ruolo"
            className="h-10"
          />
        )}
        <TagBlock
          importance={interview.importance}
          reliability={interview.reliability}
          onImportance={(importance) => update({ importance })}
          onReliability={(reliability) => update({ reliability })}
        />
      </div>

      {/* MODE TOGGLE */}
      <div className="flex items-center gap-1 bg-muted rounded-full p-1 w-fit">
        {(
          [
            { k: "qa", l: "Guidata con AI" },
            { k: "trascrizione", l: "Trascrizione caricata" },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => update({ mode: t.k })}
            className={cn(
              "h-7 px-3 rounded-full text-[11px] font-medium transition-colors",
              interview.mode === t.k
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* TRASCRIZIONE MODE */}
      {interview.mode === "trascrizione" && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <FileText
                className="h-4 w-4 text-brand shrink-0 mt-0.5"
                strokeWidth={1.8}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {interview.transcriptFileName ?? "Trascrizione libera"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(
                    interview.transcriptText?.split(/\s+/).filter(Boolean)
                      .length ?? 0
                  ).toLocaleString("it-IT")}{" "}
                  parole
                </p>
              </div>
            </div>
            <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border text-foreground text-xs font-medium hover:bg-muted cursor-pointer transition-colors shrink-0">
              <Replace className="h-3.5 w-3.5" strokeWidth={1.8} />
              Cambia file
              <input
                type="file"
                accept="application/pdf,text/plain,.pdf,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadTranscript(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <textarea
            value={interview.transcriptText ?? ""}
            onChange={(e) => update({ transcriptText: e.target.value })}
            rows={18}
            placeholder="Incolla o scrivi qui la trascrizione dell'intervista…"
            className="w-full rounded-lg border border-border bg-paper px-3 py-3 text-[13px] leading-relaxed text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
          />
          <p className="text-[11px] text-muted-foreground">
            Modifica liberamente. Rimuovi parti irrilevanti, correggi refusi.
            L&apos;AI legge questo testo come una fonte ad alta autorevolezza
            (peso{" "}
            {(
              ({ primaria: 3, secondaria: 2, contesto: 1 } as const)[
                interview.importance
              ] *
              ({ alta: 3, media: 2, bassa: 1 } as const)[interview.reliability]
            ).toString()}
            /9).
          </p>
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-3 flex items-start gap-2">
              <AlertCircle
                className="h-4 w-4 text-destructive shrink-0 mt-0.5"
                strokeWidth={1.8}
              />
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* QUESTIONS + ANSWERS — only in qa mode */}
      {interview.mode === "qa" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
              Domande e risposte · {interview.qa.length}
            </p>
            <button
              type="button"
              onClick={generateQuestions}
              disabled={!hasOpenAiKey || generating}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors",
                !hasOpenAiKey || generating
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : interview.qa.length
                    ? "border border-border text-foreground hover:bg-muted"
                    : "bg-foreground text-background hover:bg-foreground/90",
              )}
            >
              {generating ? (
                <>
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    strokeWidth={1.8}
                  />
                  Genero…
                </>
              ) : interview.qa.length ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Rigenera domande
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Genera domande con AI
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-3 flex items-start gap-2">
              <AlertCircle
                className="h-4 w-4 text-destructive shrink-0 mt-0.5"
                strokeWidth={1.8}
              />
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          )}

          {interview.qa.length === 0 && !generating && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Clicca &quot;Genera domande con AI&quot; per iniziare, oppure
                aggiungi manualmente.
              </p>
            </div>
          )}

          <ul className="space-y-3">
            {interview.qa.map((q, i) => (
              <li
                key={q.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 h-7 w-7 rounded-full bg-brand/15 text-brand text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <textarea
                    value={q.question}
                    onChange={(e) =>
                      updateQA(q.id, { question: e.target.value })
                    }
                    rows={2}
                    placeholder="Domanda"
                    className="flex-1 text-sm font-medium bg-transparent resize-none focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeQA(q.id)}
                    aria-label="Rimuovi"
                    className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
                <textarea
                  value={q.answer}
                  onChange={(e) => updateQA(q.id, { answer: e.target.value })}
                  rows={3}
                  placeholder="Risposta dell'intervistato"
                  className="w-full rounded-md border border-border bg-paper px-3 py-2 text-sm text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={addQA}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Aggiungi domanda manuale
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================= */
/* ========================== TAG BLOCK ======================== */
/* ============================================================= */

function TagBlock({
  importance,
  reliability,
  onImportance,
  onReliability,
}: {
  importance: Importance;
  reliability: Reliability;
  onImportance: (v: Importance) => void;
  onReliability: (v: Reliability) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5 block">
          Importanza
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {IMPORTANCE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onImportance(o.value)}
              title={o.hint}
              className={cn(
                "inline-flex items-center h-7 px-3 rounded-full text-[11px] font-medium transition-colors",
                importance === o.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5 block">
          Affidabilità
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {RELIABILITY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onReliability(o.value)}
              title={o.hint}
              className={cn(
                "inline-flex items-center h-7 px-3 rounded-full text-[11px] font-medium transition-colors",
                reliability === o.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================= */
/* ============================ RECAP ========================== */
/* ============================================================= */

function Recap({
  sources,
  kb,
  projectId,
}: {
  sources: ProjectSources;
  kb: ProjectKB;
  projectId: string;
}) {
  const planimetriaWords = sources.planimetria?.description
    ? sources.planimetria.description.split(/\s+/).filter(Boolean).length
    : 0;
  const siteWords = sources.website?.text
    ? sources.website.text.split(/\s+/).filter(Boolean).length
    : 0;
  const docsWords = sources.documents.reduce(
    (acc, d) => acc + d.text.split(/\s+/).filter(Boolean).length,
    0,
  );
  const interviewWords =
    sources.interview?.mode === "trascrizione"
      ? (sources.interview.transcriptText?.split(/\s+/).filter(Boolean)
          .length ?? 0)
      : (sources.interview?.qa.reduce(
          (acc, q) => acc + q.answer.split(/\s+/).filter(Boolean).length,
          0,
        ) ?? 0);
  const totalWords = planimetriaWords + siteWords + docsWords + interviewWords;

  const primariaCount =
    (sources.planimetria?.importance === "primaria" ? 1 : 0) +
    (sources.website?.importance === "primaria" ? 1 : 0) +
    sources.documents.filter((d) => d.importance === "primaria").length +
    (sources.interview?.importance === "primaria" ? 1 : 0);

  const approvedFacts = kb.facts.filter((f) => f.approved);
  const spatialHints = sources.planimetria?.spatialHints ?? [];

  // Diversità fonti caricate (max 4: planimetria, sito, documenti, intervista)
  const sourcesLoaded =
    (sources.planimetria?.image ? 1 : 0) +
    (sources.website?.text && sources.website.text.length > 30 ? 1 : 0) +
    (sources.documents.length > 0 ? 1 : 0) +
    (sources.interview &&
    ((sources.interview.mode === "qa" &&
      sources.interview.qa.some((q) => q.answer.trim())) ||
      (sources.interview.mode === "trascrizione" &&
        (sources.interview.transcriptText?.length ?? 0) > 100))
      ? 1
      : 0);

  // Salute materiale: rich / minimum / scarce
  const healthLevel: "rich" | "minimum" | "scarce" =
    totalWords > 10000 && approvedFacts.length >= 40 && sourcesLoaded >= 3
      ? "rich"
      : totalWords > 3000 && approvedFacts.length >= 15 && sourcesLoaded >= 2
        ? "minimum"
        : "scarce";
  const healthLabel = {
    rich: "Materiale ricco",
    minimum: "Materiale sufficiente",
    scarce: "Materiale scarso",
  }[healthLevel];
  const healthColor = {
    rich: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    minimum: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    scarce: "bg-destructive/15 text-destructive border-destructive/30",
  }[healthLevel];

  // Mix fonti (% parole per tipo)
  const mix =
    totalWords > 0
      ? {
          planimetria: Math.round((planimetriaWords / totalWords) * 100),
          sito: Math.round((siteWords / totalWords) * 100),
          documenti: Math.round((docsWords / totalWords) * 100),
          intervista: Math.round((interviewWords / totalWords) * 100),
        }
      : { planimetria: 0, sito: 0, documenti: 0, intervista: 0 };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <RecapRow label="Planimetria">
          <span className="text-sm text-right">
            {sources.planimetria?.image ? (
              <>
                <span className="font-medium inline-flex items-center gap-1.5 text-brand">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Caricata
                </span>
                <br />
                <span className="text-xs text-muted-foreground">
                  {sources.planimetria.importance} ·{" "}
                  {sources.planimetria.reliability}
                  {sources.planimetria.analyzedAt &&
                    ` · ${planimetriaWords} parole · ${spatialHints.length} spunti`}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Non caricata</span>
            )}
          </span>
        </RecapRow>
        <Divider />
        <RecapRow label="Sito web">
          <span className="text-sm text-right">
            {sources.website?.text ? (
              <>
                <span className="font-medium">
                  {sources.website.title ?? sources.website.url}
                </span>
                <br />
                <span className="text-xs text-muted-foreground">
                  {sources.website.importance} · {sources.website.reliability}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Non scansionato</span>
            )}
          </span>
        </RecapRow>
        <Divider />
        <RecapRow label="Documenti">
          <span className="text-sm">
            {sources.documents.length}{" "}
            {sources.documents.length === 1 ? "documento" : "documenti"}
          </span>
        </RecapRow>
        <Divider />
        <RecapRow label="Intervista">
          <span className="text-sm text-right">
            {sources.interview ? (
              <>
                <span className="font-medium">
                  {sources.interview.respondent.name || "—"}
                </span>
                <br />
                <span className="text-xs text-muted-foreground">
                  {sources.interview.mode === "trascrizione"
                    ? `Trascrizione · ${(sources.interview.transcriptText?.split(/\s+/).filter(Boolean).length ?? 0).toLocaleString("it-IT")} parole`
                    : `${sources.interview.qa.filter((q) => q.answer.trim()).length} risposte di ${sources.interview.qa.length}`}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Nessuna</span>
            )}
          </span>
        </RecapRow>
        <Divider />
        <RecapRow label="Knowledge Base">
          <span className="text-sm text-right">
            {kb.facts.length > 0 ? (
              <>
                <span className="font-medium">
                  {kb.facts.length} {kb.facts.length === 1 ? "fatto" : "fatti"}
                </span>
                <br />
                <span className="text-xs text-muted-foreground">
                  {kb.facts.filter((f) => f.approved).length} approvati
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Non estratta</span>
            )}
          </span>
        </RecapRow>
      </div>

      {/* Salute materiale */}
      <div
        className={cn(
          "rounded-2xl border p-5 flex items-center gap-4",
          healthColor,
        )}
      >
        <div
          className={cn(
            "h-3 w-3 rounded-full shrink-0",
            healthLevel === "rich"
              ? "bg-emerald-600"
              : healthLevel === "minimum"
                ? "bg-amber-600"
                : "bg-destructive",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{healthLabel}</p>
          <p className="text-xs opacity-80 mt-0.5 leading-relaxed">
            {healthLevel === "rich" &&
              "Materiale sufficiente per schede ricche su tutti i POI."}
            {healthLevel === "minimum" &&
              "Materiale minimo accettabile. Più fonti = schede più dettagliate."}
            {healthLevel === "scarce" &&
              "Materiale insufficiente. Il risultato sarà generico — aggiungi fonti."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Totale parole
          </p>
          <p className="font-heading text-3xl italic tabular-nums mt-1">
            {totalWords.toLocaleString("it-IT")}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Fonti primarie
          </p>
          <p className="font-heading text-3xl italic tabular-nums mt-1">
            {primariaCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Diversità fonti
          </p>
          <p className="font-heading text-3xl italic tabular-nums mt-1">
            {sourcesLoaded}
            <span className="text-sm text-muted-foreground not-italic">/4</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            planimetria · sito · docs · intervista
          </p>
        </div>
      </div>

      {/* Mix fonti */}
      {totalWords > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-3">
            Mix fonti (per volume di testo)
          </p>
          <div className="h-2.5 rounded-full overflow-hidden flex bg-muted">
            <div
              className="bg-violet-500"
              style={{ width: `${mix.planimetria}%` }}
              title={`Planimetria ${mix.planimetria}%`}
            />
            <div
              className="bg-sky-500"
              style={{ width: `${mix.sito}%` }}
              title={`Sito ${mix.sito}%`}
            />
            <div
              className="bg-emerald-500"
              style={{ width: `${mix.documenti}%` }}
              title={`Documenti ${mix.documenti}%`}
            />
            <div
              className="bg-brand"
              style={{ width: `${mix.intervista}%` }}
              title={`Intervista ${mix.intervista}%`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground mt-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Planimetria {mix.planimetria}%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Sito {mix.sito}%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Documenti {mix.documenti}%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand" />
              Intervista {mix.intervista}%
            </span>
          </div>
        </div>
      )}

      {/* Spunti spaziali per Step Luogo */}
      {spatialHints.length > 0 && (
        <div className="rounded-2xl border border-violet-300 bg-violet-50 p-5">
          <div className="flex items-start gap-3">
            <Sparkles
              className="h-4 w-4 text-violet-700 shrink-0 mt-0.5"
              strokeWidth={1.8}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-violet-900">
                {spatialHints.length} spunti dalla planimetria
              </p>
              <p className="text-xs text-violet-900/80 mt-1 leading-relaxed">
                Nomi di ambienti osservati sul disegno. Diventeranno punti di
                interesse nello step Luogo, dopo l&apos;incrocio con tutte le
                fonti.
              </p>
              <ul className="mt-3 space-y-1.5">
                {spatialHints.map((h, idx) => (
                  <li
                    key={idx}
                    className="rounded-lg bg-white border border-violet-200 px-3 py-2"
                  >
                    <p className="text-[12px] font-medium text-violet-900">
                      {h.name}
                    </p>
                    {h.description && (
                      <p className="text-[11px] text-violet-900/70 mt-0.5 leading-relaxed">
                        {h.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {kb.facts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-4">
            Fatti estratti per fonte
          </p>
          <ul className="space-y-2.5">
            {kbFactsBySourceLabel(kb.facts, sources).map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground tabular-nums shrink-0">
                    {row.weight}/9
                  </span>
                  <span className="truncate">{row.label}</span>
                </div>
                <span className="font-heading italic tabular-nums text-foreground shrink-0">
                  {row.count}{" "}
                  <span className="text-muted-foreground text-xs not-italic">
                    {row.count === 1 ? "fatto" : "fatti"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Puoi tornare qui in qualsiasi momento.{" "}
        <Link
          href={`/progetti/${projectId}/fonti`}
          className="text-foreground underline underline-offset-2"
        >
          Modifica fonti
        </Link>
      </p>
    </div>
  );
}

function RecapRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground pt-1">
        {label}
      </p>
      <div className="text-right">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border/60" />;
}

function KbExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-brand/15 text-brand flex items-center justify-center text-[11px] font-bold">
            ?
          </div>
          <p className="text-sm font-medium text-left">
            Come leggere e usare questa Knowledge Base
          </p>
        </div>
        {open ? (
          <ChevronUp
            className="h-4 w-4 text-muted-foreground"
            strokeWidth={1.8}
          />
        ) : (
          <Plus className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 space-y-5 text-sm leading-relaxed border-t border-border/60">
          <div>
            <p className="text-muted-foreground mb-3">
              Ogni riga qui sotto è un <b>fatto atomico</b> estratto dalle tue
              fonti (sito, documenti, intervista). Sono i mattoni con cui
              l&apos;AI scriverà le schede dell&apos;audioguida e risponderà nel
              chatbot. Nessuno di questi fatti viene usato finché non lo{" "}
              <b>approvi</b>
              (click sul pallino a sinistra).
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Le 4 categorie — determinano il <b>tono</b> del racconto
            </p>
            <ul className="space-y-1.5">
              {KB_CATEGORIES.map((c) => (
                <li key={c.value} className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium border shrink-0",
                      c.color,
                    )}
                  >
                    {c.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.value === "solido" &&
                      "Fatto verificato. L'AI lo racconta con sicurezza (es. date, misure, eventi documentati)."}
                    {c.value === "interpretazione" &&
                      "Lettura plausibile ma non certa. L'AI la usa come chiave narrativa (es. significato simbolico di un elemento)."}
                    {c.value === "memoria" &&
                      'Tradizione orale o racconto personale dall\'intervista. Tono evocativo, cauto ("si narra che…").'}
                    {c.value === "ipotesi" &&
                      'Interessante ma non solida. Resta sospesa ("alcuni studiosi ritengono…") finché non la confermi.'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Affidabilità — ereditata dalla fonte di origine
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                <b className="text-foreground">Alta</b> — fonte verificata
                (intervista curatore, documento ufficiale). Il chatbot runtime
                userà SOLO questi fatti per evitare risposte inventate.
              </li>
              <li>
                <b className="text-foreground">Media</b> — attendibile, da
                controllare (sito web, brochure turistica).
              </li>
              <li>
                <b className="text-foreground">Bassa</b> — tradizione locale o
                non verificata. Usata con cautela, mai dal chatbot.
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Cosa succede dopo
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                <b className="text-foreground">Brief editoriale</b> — l&apos;AI
                legge i fatti approvati per proporre target, tono e storie
                obbligatorie del progetto.
              </li>
              <li>
                <b className="text-foreground">Schede narrative</b> — ogni POI
                pesca i fatti con il suo <i>POI collegato</i> e li trasforma in
                testo parlato dal narratore.
              </li>
              <li>
                <b className="text-foreground">Chatbot</b> — risponde alle
                domande del visitatore usando solo i fatti con affidabilità
                alta.
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Cosa puoi fare qui
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                <b className="text-foreground">Approva</b> (cerchio) — il fatto
                entra in pipeline. I non approvati hanno bordo giallo.
              </li>
              <li>
                <b className="text-foreground">Modifica</b> (matita) — cambia
                testo, categoria, affidabilità, POI collegato.
              </li>
              <li>
                <b className="text-foreground">Elimina</b> — il fatto non esiste
                più.
              </li>
              <li>
                <b className="text-foreground">Aggiungi fatto</b> — inserisci
                manualmente un fatto che l&apos;AI non ha estratto.
              </li>
              <li>
                <b className="text-foreground">Riestrai</b> — rigenera da zero
                (attenzione, sovrascrive).
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================= */
/* ======================= KNOWLEDGE BASE ====================== */
/* ============================================================= */

const KB_CATEGORIES: {
  value: KBCategory;
  label: string;
  hint: string;
  color: string;
}[] = [
  {
    value: "solido",
    label: "Solido",
    hint: "Verificato · tono assertivo",
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  },
  {
    value: "interpretazione",
    label: "Interpretazione",
    hint: "Plausibile · chiave narrativa",
    color: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  },
  {
    value: "memoria",
    label: "Memoria",
    hint: "Tradizione / racconto personale",
    color: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  },
  {
    value: "ipotesi",
    label: "Ipotesi",
    hint: "Da verificare · tono cauto",
    color: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  },
];

function categoryStyle(c: KBCategory): string {
  return KB_CATEGORIES.find((x) => x.value === c)?.color ?? "";
}

type KbFilter = "tutti" | "da-revisionare" | "approvati";

function KnowledgeBaseSection({
  projectId,
  sources,
  kb,
  onChange,
}: {
  projectId: string;
  sources: ProjectSources;
  kb: ProjectKB;
  onChange: (v: ProjectKB) => void;
}) {
  const [extracting, setExtracting] = useState(false);
  const [extractLabel, setExtractLabel] = useState<string | null>(null);
  const [extractProgress, setExtractProgress] = useState({
    current: 0,
    total: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<KbFilter>("tutti");
  const [catFilter, setCatFilter] = useState<KBCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  const keys = typeof window !== "undefined" ? loadApiKeys() : null;
  // Provider selection interna al prodotto: OpenAI di default (più affidabile JSON), Kimi come fallback.
  const activeProvider: "kimi" | "openai" | null = keys?.llm.openai
    ? "openai"
    : keys?.llm.kimi
      ? "kimi"
      : null;
  const hasLlmKey = activeProvider !== null;

  const hasAnySource =
    !!sources.website?.text ||
    sources.documents.length > 0 ||
    !!sources.interview?.transcriptText ||
    (sources.interview?.qa.some((q) => q.answer.trim()) ?? false);

  const sourceLabelFor = (fact: KBFact): string => {
    switch (fact.sourceRef.kind) {
      case "planimetria":
        return "Planimetria";
      case "sito":
        return sources.website?.title ?? "Sito web";
      case "documento": {
        const d = sources.documents.find((x) => x.id === fact.sourceRef.id);
        return d?.name ?? "Documento";
      }
      case "intervista":
        return `Intervista · ${sources.interview?.respondent.name || sources.interview?.respondent.role || "gestore"}`;
      case "manuale":
        return "Aggiunto manualmente";
      default:
        return "—";
    }
  };

  // Chiave stabile per raggruppamento: stessa fonte fisica → stesso bucket
  const sourceGroupKey = (fact: KBFact): string => {
    switch (fact.sourceRef.kind) {
      case "planimetria":
        return "planimetria";
      case "sito":
        return "sito";
      case "documento":
        return `documento:${fact.sourceRef.id ?? "unknown"}`;
      case "intervista":
        return "intervista";
      case "manuale":
        return "manuale";
      default:
        return "other";
    }
  };

  // Ordine di visualizzazione dei gruppi (planimetria prima, manuali ultimi)
  const sourceGroupOrder = (key: string): number => {
    if (key === "planimetria") return 0;
    if (key === "sito") return 1;
    if (key.startsWith("documento:")) return 2;
    if (key === "intervista") return 3;
    if (key === "manuale") return 4;
    return 5;
  };

  const extract = async () => {
    if (!hasAnySource) {
      setError(
        "Carica almeno una fonte (sito, documento o intervista) prima di estrarre.",
      );
      return;
    }
    if (!activeProvider || !keys) {
      setError("Configura una chiave Kimi o OpenAI in Impostazioni.");
      return;
    }
    const apiKey = keys.llm[activeProvider];

    setExtracting(true);
    setError(null);
    const project = loadProject(projectId);

    type QueueItem = {
      label: string;
      source: unknown;
      inherit: {
        importance: Importance;
        reliability: Reliability;
        poiRef?: number;
      };
    };
    const queue: QueueItem[] = [];
    const CHUNK_SIZE = 12000; // char target per chunk
    const CHUNK_OVERLAP = 400;

    const chunkText = (text: string): string[] => {
      if (text.length <= CHUNK_SIZE + CHUNK_OVERLAP) return [text];
      const chunks: string[] = [];
      let i = 0;
      while (i < text.length) {
        let end = Math.min(i + CHUNK_SIZE, text.length);
        if (end < text.length) {
          // cerca boundary paragrafo entro 500 char
          const nl = text.lastIndexOf("\n\n", end);
          if (nl > i + CHUNK_SIZE * 0.6) end = nl;
        }
        chunks.push(text.slice(i, end));
        if (end >= text.length) break;
        i = end - CHUNK_OVERLAP;
      }
      return chunks;
    };

    if (sources.planimetria?.image) {
      const plan = sources.planimetria;
      // Compongo un testo completo che unisce descrizione generale + dettagli per ogni spunto
      const hintsBlock = plan.spatialHints
        .filter((h) => h.name.trim())
        .map((h) =>
          h.description.trim()
            ? `## ${h.name}\n${h.description.trim()}`
            : `## ${h.name}`,
        )
        .join("\n\n");
      const fullText = [
        plan.description.trim(),
        hintsBlock
          ? `\n\n---\n\nDettaglio punti osservati:\n\n${hintsBlock}`
          : "",
      ]
        .filter(Boolean)
        .join("");

      if (fullText.trim().length > 30) {
        const chunks = chunkText(fullText);
        chunks.forEach((chunk, idx) => {
          queue.push({
            label:
              chunks.length > 1
                ? `Planimetria · parte ${idx + 1}/${chunks.length}`
                : "Planimetria",
            source: {
              kind: "planimetria",
              text: chunk,
              spatialHints: plan.spatialHints.map((h) => h.name),
              importance: plan.importance,
              reliability: plan.reliability,
            },
            inherit: {
              importance: plan.importance,
              reliability: plan.reliability,
            },
          });
        });
      }
    }

    if (sources.website?.text && sources.website.text.length > 30) {
      const chunks = chunkText(sources.website.text);
      chunks.forEach((chunk, idx) => {
        queue.push({
          label:
            chunks.length > 1
              ? `${sources.website!.title ?? "Sito web"} · parte ${idx + 1}/${chunks.length}`
              : (sources.website!.title ?? "Sito web"),
          source: {
            kind: "sito",
            text: chunk,
            importance: sources.website!.importance,
            reliability: sources.website!.reliability,
          },
          inherit: {
            importance: sources.website!.importance,
            reliability: sources.website!.reliability,
          },
        });
      });
    }
    sources.documents.forEach((d) => {
      if (!d.text.trim()) return;
      const chunks = chunkText(d.text);
      chunks.forEach((chunk, idx) => {
        queue.push({
          label:
            chunks.length > 1
              ? `${d.title || d.name} · parte ${idx + 1}/${chunks.length}`
              : d.title || d.name,
          source: {
            kind: "documento",
            id: d.id,
            name: d.title || d.name,
            text: chunk,
            importance: d.importance,
            reliability: d.reliability,
            poiRef: d.poiRef,
          },
          inherit: {
            importance: d.importance,
            reliability: d.reliability,
            poiRef: d.poiRef,
          },
        });
      });
    });
    if (sources.interview) {
      const iv = sources.interview;
      const hasQa =
        iv.mode !== "trascrizione" && iv.qa.some((q) => q.answer.trim());
      const hasTranscript =
        iv.mode === "trascrizione" && (iv.transcriptText?.length ?? 0) > 50;
      if (hasQa || hasTranscript) {
        const rLabel =
          iv.respondent.role === "altro"
            ? iv.respondent.roleLabel
            : iv.respondent.role;
        const respondent = `${iv.respondent.name || "—"} (${rLabel})`;
        const baseLabel = `Intervista · ${iv.respondent.name || rLabel || "gestore"}`;
        if (hasTranscript) {
          const chunks = chunkText(iv.transcriptText ?? "");
          chunks.forEach((chunk, idx) => {
            queue.push({
              label:
                chunks.length > 1
                  ? `${baseLabel} · parte ${idx + 1}/${chunks.length}`
                  : baseLabel,
              source: {
                kind: "intervista",
                mode: "trascrizione",
                respondentLabel: respondent,
                transcriptText: chunk,
                importance: iv.importance,
                reliability: iv.reliability,
              },
              inherit: {
                importance: iv.importance,
                reliability: iv.reliability,
              },
            });
          });
        } else {
          queue.push({
            label: baseLabel,
            source: {
              kind: "intervista",
              mode: iv.mode,
              respondentLabel: respondent,
              qa: iv.qa.filter((q) => q.answer.trim()),
              importance: iv.importance,
              reliability: iv.reliability,
            },
            inherit: {
              importance: iv.importance,
              reliability: iv.reliability,
            },
          });
        }
      }
    }

    setExtractProgress({ current: 0, total: queue.length });
    const allFacts: KBFact[] = [];
    const now = new Date().toISOString();

    try {
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        setExtractLabel(item.label);
        setExtractProgress({ current: i, total: queue.length });

        const res = await fetch("/api/ai/extract-kb-single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey,
            provider: activeProvider,
            projectName: project?.name,
            type: project?.type,
            city: project?.city,
            spatialHints: sources.planimetria?.spatialHints.map((h) => h.name),
            source: item.source,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(`${item.label}: ${data.message ?? "errore estrazione"}`);
          continue; // skip this source, continue with others
        }
        const rawFacts: {
          content: string;
          category: KBCategory;
          sourceKind: KBSourceKind;
          sourceId?: string;
          poiRef?: number;
        }[] = data.facts ?? [];

        rawFacts.forEach((f) => {
          allFacts.push({
            id: newSourceId("f"),
            content: f.content,
            category: f.category,
            importance: item.inherit.importance,
            reliability: item.inherit.reliability,
            poiRef: f.poiRef ?? item.inherit.poiRef,
            sourceRef: { kind: f.sourceKind, id: f.sourceId },
            approved: false,
            createdAt: now,
          });
        });
      }

      // Dedup on identical content (case-insensitive trim)
      const seen = new Set<string>();
      const deduped: KBFact[] = [];
      allFacts.forEach((f) => {
        const key = f.content.toLowerCase().replace(/\s+/g, " ").trim();
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(f);
        }
      });

      setExtractProgress({ current: queue.length, total: queue.length });
      onChange({
        facts: deduped,
        lastExtractedAt: now,
        extractedSignature: sourcesSignature(sources),
      });
    } catch {
      setError("Errore di rete durante l'estrazione.");
    } finally {
      setExtracting(false);
      setExtractLabel(null);
    }
  };

  const updateFact = (id: string, patch: Partial<KBFact>) => {
    onChange({
      ...kb,
      facts: kb.facts.map((f) =>
        f.id === id
          ? { ...f, ...patch, updatedAt: new Date().toISOString() }
          : f,
      ),
    });
  };
  const removeFact = (id: string) =>
    onChange({ ...kb, facts: kb.facts.filter((f) => f.id !== id) });

  const addManual = () => {
    const newFact: KBFact = {
      id: newSourceId("f"),
      content: "",
      category: "solido",
      importance: "primaria",
      reliability: "alta",
      sourceRef: { kind: "manuale" },
      approved: true,
      createdAt: new Date().toISOString(),
    };
    onChange({ ...kb, facts: [newFact, ...kb.facts] });
    setOpenId(newFact.id);
  };

  const approveAll = () =>
    onChange({
      ...kb,
      facts: kb.facts.map((f) => ({ ...f, approved: true })),
    });

  const visible = kb.facts.filter((f) => {
    if (filter === "approvati" && !f.approved) return false;
    if (filter === "da-revisionare" && f.approved) return false;
    if (catFilter !== "all" && f.category !== catFilter) return false;
    return true;
  });

  // Group by fonte
  const groups = new Map<string, KBFact[]>();
  visible.forEach((f) => {
    const key = sourceGroupKey(f);
    const arr = groups.get(key) ?? [];
    arr.push(f);
    groups.set(key, arr);
  });
  const sortedKeys = Array.from(groups.keys()).sort(
    (a, b) => sourceGroupOrder(a) - sourceGroupOrder(b),
  );

  const approvedCount = kb.facts.filter((f) => f.approved).length;

  return (
    <div className="space-y-5">
      <KbExplainer />

      {/* Badge staleness: fonti cambiate dopo ultima estrazione */}
      {kb.lastExtractedAt &&
        kb.extractedSignature !== undefined &&
        kb.extractedSignature !== sourcesSignature(sources) && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
            <AlertCircle
              className="h-4 w-4 text-amber-700 shrink-0 mt-0.5"
              strokeWidth={1.8}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-900">
                Fonti modificate dopo l&apos;ultima estrazione
              </p>
              <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                La Knowledge Base non riflette le ultime modifiche alle fonti.
                Clicca &laquo;Riestrai&raquo; per allinearla.
              </p>
            </div>
          </div>
        )}

      {/* TOP STATUS */}
      <div className="rounded-2xl border border-border bg-card p-5 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-baseline gap-5 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Fatti estratti
            </p>
            <p className="font-heading text-3xl italic tabular-nums mt-0.5">
              {kb.facts.length}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Approvati
            </p>
            <p className="font-heading text-3xl italic tabular-nums mt-0.5 text-brand">
              {approvedCount}
            </p>
          </div>
          {kb.lastExtractedAt && (
            <p className="text-[11px] text-muted-foreground">
              Ultima estrazione:{" "}
              {new Date(kb.lastExtractedAt).toLocaleString("it-IT", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addManual}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium border border-border text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Aggiungi fatto
          </button>
          <button
            type="button"
            onClick={extract}
            disabled={extracting || !hasLlmKey || !hasAnySource}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-medium transition-colors",
              extracting
                ? "bg-muted text-muted-foreground cursor-wait"
                : !hasLlmKey || !hasAnySource
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : kb.facts.length > 0
                    ? "border border-border text-foreground hover:bg-muted"
                    : "bg-foreground text-background hover:bg-foreground/90",
            )}
          >
            {extracting ? (
              <>
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  strokeWidth={1.8}
                />
                {extractLabel
                  ? `${extractProgress.current + 1}/${extractProgress.total} · ${extractLabel.slice(0, 30)}…`
                  : "Estraggo…"}
              </>
            ) : kb.facts.length > 0 ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
                Riestrai
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
                Estrai Knowledge Base
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-3 flex items-start gap-2">
          <AlertCircle
            className="h-4 w-4 text-destructive shrink-0 mt-0.5"
            strokeWidth={1.8}
          />
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      )}

      {kb.facts.length === 0 && !extracting && (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-brand/10 mx-auto flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-brand" strokeWidth={1.6} />
          </div>
          <p className="font-heading text-xl italic">
            Ancora nessun fatto estratto
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {hasAnySource
              ? "Clicca \u00abEstrai Knowledge Base\u00bb: l\u2019AI legger\u00e0 sito, documenti e intervista e produrr\u00e0 una lista di fatti atomici classificati."
              : "Carica almeno una fonte (sito, documento o intervista) prima di estrarre la Knowledge Base."}
          </p>
        </div>
      )}

      {kb.facts.length > 0 && (
        <>
          {/* FILTERS */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-full p-1">
              {(
                [
                  { k: "tutti", l: `Tutti ${kb.facts.length}` },
                  {
                    k: "da-revisionare",
                    l: `Da revisionare ${kb.facts.length - approvedCount}`,
                  },
                  { k: "approvati", l: `Approvati ${approvedCount}` },
                ] as const
              ).map((f) => (
                <button
                  key={f.k}
                  type="button"
                  onClick={() => setFilter(f.k)}
                  className={cn(
                    "h-7 px-3 rounded-full text-[11px] font-medium transition-colors",
                    filter === f.k
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.l}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setCatFilter("all")}
                className={cn(
                  "h-7 px-3 rounded-full text-[11px] font-medium transition-colors border",
                  catFilter === "all"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:text-foreground",
                )}
              >
                Ogni categoria
              </button>
              {KB_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCatFilter(c.value)}
                  className={cn(
                    "h-7 px-3 rounded-full text-[11px] font-medium transition-colors border",
                    catFilter === c.value
                      ? `${c.color} border-current`
                      : "bg-transparent text-muted-foreground border-border hover:text-foreground",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {approvedCount < kb.facts.length && (
              <button
                type="button"
                onClick={approveAll}
                className="ml-auto inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Approva tutti i visibili
              </button>
            )}
          </div>

          {/* FACTS GROUPED */}
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nessun fatto corrisponde ai filtri selezionati.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedKeys.map((key) => {
                const facts = groups.get(key) ?? [];
                // Etichetta gruppo: usa il primo fatto per derivare label human-readable
                const label = facts[0] ? sourceLabelFor(facts[0]) : key;
                const approvedInGroup = facts.filter((f) => f.approved).length;
                // Default: collapsed se il totale fatti > 30
                const defaultCollapsed = kb.facts.length > 30;
                const isCollapsed =
                  collapsedGroups[key] !== undefined
                    ? collapsedGroups[key]
                    : defaultCollapsed;
                return (
                  <div
                    key={key}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedGroups((prev) => ({
                          ...prev,
                          [key]: !isCollapsed,
                        }))
                      }
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-baseline gap-3 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {label}
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                          {facts.length}{" "}
                          {facts.length === 1 ? "fatto" : "fatti"}
                          {" · "}
                          <span className="text-brand">
                            {approvedInGroup}
                          </span>{" "}
                          approvati
                        </span>
                      </div>
                      <ChevronUp
                        className={cn(
                          "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                          isCollapsed ? "rotate-180" : "",
                        )}
                        strokeWidth={1.8}
                      />
                    </button>
                    {!isCollapsed && (
                      <ul className="space-y-2 px-3 pb-3">
                        {facts.map((f) => {
                          const isOpen = openId === f.id;
                          return (
                            <li
                              key={f.id}
                              className={cn(
                                "rounded-xl border bg-card transition-colors",
                                f.approved
                                  ? "border-border"
                                  : "border-amber-500/40 bg-amber-50/30",
                              )}
                            >
                              <div className="flex items-start gap-3 p-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateFact(f.id, { approved: !f.approved })
                                  }
                                  aria-label={
                                    f.approved
                                      ? "Annulla approvazione"
                                      : "Approva"
                                  }
                                  className={cn(
                                    "shrink-0 mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                    f.approved
                                      ? "bg-brand border-brand text-white"
                                      : "border-muted-foreground/40 hover:border-foreground",
                                  )}
                                >
                                  {f.approved && (
                                    <Check
                                      className="h-3 w-3"
                                      strokeWidth={3}
                                    />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <p
                                    onClick={() =>
                                      setOpenId(isOpen ? null : f.id)
                                    }
                                    className="text-sm leading-relaxed cursor-text"
                                  >
                                    {f.content || (
                                      <span className="text-muted-foreground italic">
                                        Fatto vuoto — click per modificare
                                      </span>
                                    )}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                    <span
                                      className={cn(
                                        "inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium border",
                                        categoryStyle(f.category),
                                      )}
                                    >
                                      {
                                        KB_CATEGORIES.find(
                                          (c) => c.value === f.category,
                                        )?.label
                                      }
                                    </span>
                                    <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] text-muted-foreground bg-muted">
                                      {f.reliability}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground truncate">
                                      · {sourceLabelFor(f)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenId(isOpen ? null : f.id)
                                    }
                                    className="h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                                    aria-label={isOpen ? "Chiudi" : "Modifica"}
                                  >
                                    {isOpen ? (
                                      <ChevronUp
                                        className="h-3.5 w-3.5"
                                        strokeWidth={1.8}
                                      />
                                    ) : (
                                      <Pencil
                                        className="h-3.5 w-3.5"
                                        strokeWidth={1.8}
                                      />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeFact(f.id)}
                                    className="h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    aria-label="Elimina"
                                  >
                                    <Trash2
                                      className="h-3.5 w-3.5"
                                      strokeWidth={1.8}
                                    />
                                  </button>
                                </div>
                              </div>

                              {isOpen && (
                                <div className="border-t border-border/60 p-4 space-y-3 bg-muted/20">
                                  <div>
                                    <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1 block">
                                      Fatto
                                    </Label>
                                    <textarea
                                      value={f.content}
                                      onChange={(e) =>
                                        updateFact(f.id, {
                                          content: e.target.value,
                                        })
                                      }
                                      rows={3}
                                      placeholder="Scrivi un fatto atomico…"
                                      className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5 block">
                                        Categoria
                                      </Label>
                                      <div className="flex flex-wrap gap-1">
                                        {KB_CATEGORIES.map((c) => (
                                          <button
                                            key={c.value}
                                            type="button"
                                            onClick={() =>
                                              updateFact(f.id, {
                                                category: c.value,
                                              })
                                            }
                                            title={c.hint}
                                            className={cn(
                                              "inline-flex items-center h-7 px-2.5 rounded-full text-[10px] font-medium border transition-colors",
                                              f.category === c.value
                                                ? `${c.color} border-current`
                                                : "border-border text-muted-foreground hover:text-foreground",
                                            )}
                                          >
                                            {c.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    <div>
                                      <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5 block">
                                        Affidabilità
                                      </Label>
                                      <div className="flex gap-1">
                                        {(
                                          [
                                            "alta",
                                            "media",
                                            "bassa",
                                          ] as Reliability[]
                                        ).map((r) => (
                                          <button
                                            key={r}
                                            type="button"
                                            onClick={() =>
                                              updateFact(f.id, {
                                                reliability: r,
                                              })
                                            }
                                            className={cn(
                                              "inline-flex items-center h-7 px-3 rounded-full text-[10px] font-medium transition-colors",
                                              f.reliability === r
                                                ? "bg-foreground text-background"
                                                : "bg-muted text-muted-foreground hover:text-foreground",
                                            )}
                                          >
                                            {r}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-muted-foreground">
                                    Fonte: {sourceLabelFor(f)} ·{" "}
                                    {f.sourceRef.kind === "manuale"
                                      ? "manuale"
                                      : "estratto dall'AI"}
                                  </p>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
