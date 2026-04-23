"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  Trash2,
  ChevronDown,
  FileText,
  AudioLines,
  BookOpen,
  Send,
  EyeOff,
  Eye,
  Star,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loadBrief,
  loadKB,
  loadMap,
  loadDriversPersonas,
  saveProgress,
  type ProjectBrief,
  type ProjectKB,
  type ProjectMap,
  type ProjectDriversPersonas,
} from "@/lib/project-store";
import { loadApiKeys } from "@/lib/api-keys";
import { cn } from "@/lib/utils";

type SchedaStatus =
  | "draft"
  | "in_review"
  | "client_review"
  | "published"
  | "archived";

interface Narrator {
  id: string;
  name: string;
  kind: "backbone" | "character";
  voiceStyle: string;
  characterBio: string | null;
  characterContractJson: Record<string, unknown>;
  voiceId: string | null;
  voiceModel: string | null;
  portraitUrl: string | null;
}

interface Scheda {
  id: string;
  poiId: string;
  narratorId: string;
  language: string;
  title: string;
  scriptText: string;
  durationEstimateSeconds: number | null;
  isCore: boolean;
  isDeepDive: boolean;
  status: SchedaStatus;
  version: number;
  qualityScore: number | null;
  semanticBaseJson: Record<string, unknown>;
  audio: {
    id: string;
    fileUrl: string;
    durationSeconds: number;
    voiceModel: string;
    isStale: boolean;
    updatedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectInfo {
  id: string;
  name: string;
  type: string | null;
  city: string | null;
}

type StatusFilter = "all" | SchedaStatus;

const STATUS_LABELS: Record<SchedaStatus, string> = {
  draft: "Bozza",
  in_review: "In revisione",
  client_review: "Al cliente",
  published: "Pubblicata",
  archived: "Archiviata",
};

const STATUS_COLORS: Record<SchedaStatus, string> = {
  draft: "bg-muted text-foreground",
  in_review: "bg-amber-100 text-amber-900",
  client_review: "bg-blue-100 text-blue-900",
  published: "bg-emerald-100 text-emerald-900",
  archived: "bg-muted text-muted-foreground",
};

const STATUS_ORDER: SchedaStatus[] = [
  "draft",
  "in_review",
  "client_review",
  "published",
  "archived",
];

export default function SchedeStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [brief, setBrief] = useState<ProjectBrief | undefined>(undefined);
  const [kb, setKb] = useState<ProjectKB>({ facts: [] });
  const [map, setMap] = useState<ProjectMap | undefined>(undefined);
  const [drivers, setDrivers] = useState<ProjectDriversPersonas | undefined>(
    undefined,
  );
  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [schede, setSchede] = useState<Scheda[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedPoi, setSelectedPoi] = useState<string | "all">("all");

  const keys = typeof window !== "undefined" ? loadApiKeys() : null;
  const activeProvider: "kimi" | "openai" | null = keys?.llm.openai
    ? "openai"
    : keys?.llm.kimi
      ? "kimi"
      : null;
  const hasLlmKey = activeProvider !== null;

  const reloadAll = useCallback(async () => {
    const [pr, ns, sc] = await Promise.all([
      fetch(`/api/projects/${projectId}`, { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`/api/projects/${projectId}/narrators`, { cache: "no-store" }).then(
        (r) => (r.ok ? r.json() : null),
      ),
      fetch(`/api/projects/${projectId}/schede`, { cache: "no-store" }).then(
        (r) => (r.ok ? r.json() : null),
      ),
    ]);
    if (pr?.project) {
      setProject({
        id: pr.project.id,
        name: pr.project.name,
        type: pr.project.type,
        city: pr.project.city,
      });
    }
    setNarrators(ns?.narrators ?? []);
    setSchede(sc?.schede ?? []);
  }, [projectId]);

  useEffect(() => {
    saveProgress(projectId, { currentStep: "luogo" });
    let alive = true;
    (async () => {
      const [b, k, m, d] = await Promise.all([
        loadBrief(projectId),
        loadKB(projectId),
        loadMap(projectId),
        loadDriversPersonas(projectId),
      ]);
      if (!alive) return;
      setBrief(b);
      setKb(k);
      setMap(m);
      setDrivers(d);
      await reloadAll();
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [projectId, reloadAll]);

  const stats = useMemo(() => {
    const by: Record<SchedaStatus, number> = {
      draft: 0,
      in_review: 0,
      client_review: 0,
      published: 0,
      archived: 0,
    };
    for (const s of schede) by[s.status]++;
    return by;
  }, [schede]);

  const pois = map?.pois ?? [];
  const poisById = useMemo(() => new Map(pois.map((p) => [p.id, p])), [pois]);
  const narratorsById = useMemo(
    () => new Map(narrators.map((n) => [n.id, n])),
    [narrators],
  );

  // Schede filtrate
  const visibleSchede = useMemo(() => {
    let list = schede;
    if (filter !== "all") list = list.filter((s) => s.status === filter);
    if (selectedPoi !== "all")
      list = list.filter((s) => s.poiId === selectedPoi);
    return list;
  }, [schede, filter, selectedPoi]);

  // Raggruppate per POI
  const schedeByPoi = useMemo(() => {
    const map = new Map<string, Scheda[]>();
    for (const s of visibleSchede) {
      if (!map.has(s.poiId)) map.set(s.poiId, []);
      map.get(s.poiId)!.push(s);
    }
    return map;
  }, [visibleSchede]);

  // Coverage
  const coverage = useMemo(() => {
    const totalPossible = pois.length * Math.max(1, narrators.length);
    const published = schede.filter((s) => s.status === "published").length;
    const withAudio = schede.filter((s) => s.audio && !s.audio.isStale).length;
    const avgProgress = totalPossible > 0 ? schede.length / totalPossible : 0;
    return {
      total: schede.length,
      totalPossible,
      published,
      withAudio,
      avgProgress,
    };
  }, [schede, pois.length, narrators.length]);

  const updateScheda = async (id: string, patch: Partial<Scheda>) => {
    setSchede((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
    const res = await fetch(`/api/projects/${projectId}/schede/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.scheda) {
        setSchede((prev) =>
          prev.map((s) => (s.id === id ? (json.scheda as Scheda) : s)),
        );
      }
    }
  };

  const removeScheda = async (id: string) => {
    if (!window.confirm("Eliminare questa scheda?")) return;
    setSchede((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/projects/${projectId}/schede/${id}`, {
      method: "DELETE",
    });
  };

  if (!loaded) return <div className="min-h-screen" />;

  const noPois = pois.length === 0;
  const noNarrators = narrators.length === 0;

  return (
    <div className="px-8 md:px-14 py-10 md:py-14 max-w-[1200px]">
      <header className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Step 06
        </p>
        <h1 className="font-heading text-5xl md:text-6xl italic leading-[1.02] tracking-tight mt-2">
          Schede e Audio
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-2xl leading-relaxed">
          Due passaggi: prima la <em>base di significato</em> per ogni POI (cosa
          c'è da raccontare, fatti, angoli), poi le schede vere per ogni
          combinazione POI × narratore. Approvazione e audio arrivano dopo.
        </p>
      </header>

      {!hasLlmKey && (
        <WarnBanner>
          Configura una chiave LLM in Impostazioni per generare basi e schede
          con l'AI.
        </WarnBanner>
      )}
      {noPois && (
        <WarnBanner>
          Aggiungi POI nello Step Luogo prima di generare le schede.
        </WarnBanner>
      )}
      {noNarrators && (
        <WarnBanner>
          Crea almeno un narratore nello Step Percorsi e Narratori.
        </WarnBanner>
      )}

      {/* Stats + filtri */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-y border-border/80">
          <StatCell
            label="Schede create"
            value={`${coverage.total}`}
            sub={`/ ${coverage.totalPossible} possibili`}
          />
          <StatCell label="Pubblicate" value={`${coverage.published}`} accent />
          <StatCell label="Con audio" value={`${coverage.withAudio}`} />
          <StatCell
            label="Copertura"
            value={`${Math.round(coverage.avgProgress * 100)}%`}
          />
        </div>
      </div>

      {/* Filtri */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/60 w-fit">
          <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
            Tutte ({schede.length})
          </FilterTab>
          {STATUS_ORDER.filter((s) => s !== "archived").map((s) => (
            <FilterTab
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
            >
              {STATUS_LABELS[s]} ({stats[s]})
            </FilterTab>
          ))}
        </div>
        <div className="flex-1" />
        <select
          value={selectedPoi}
          onChange={(e) => setSelectedPoi(e.target.value)}
          className="h-9 rounded-full border border-border bg-card px-4 text-sm min-w-[200px]"
        >
          <option value="all">Tutti i POI</option>
          {pois.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lista per POI */}
      {pois.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          Nessun POI disponibile. Configura prima lo Step Luogo.
        </div>
      ) : (
        <div className="space-y-6">
          {pois
            .filter((p) => selectedPoi === "all" || p.id === selectedPoi)
            .map((poi) => (
              <PoiBlock
                key={poi.id}
                poi={poi}
                schede={schedeByPoi.get(poi.id) ?? []}
                narrators={narrators}
                brief={brief}
                kb={kb}
                drivers={drivers}
                project={project}
                projectId={projectId}
                apiKey={keys?.llm[activeProvider ?? "openai"] ?? ""}
                provider={activeProvider}
                hasLlmKey={hasLlmKey}
                narratorsById={narratorsById}
                onUpdateScheda={updateScheda}
                onRemoveScheda={removeScheda}
                onReload={reloadAll}
                zoneInfo={
                  poi.zoneId
                    ? map?.zones.find((z) => z.id === poi.zoneId)
                    : undefined
                }
              />
            ))}
        </div>
      )}

      {/* Nav footer */}
      <div className="mt-12 flex items-center justify-between pt-8 border-t border-border/60">
        <a
          href={`/progetti/${projectId}/percorsi`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <span className="inline-block rotate-180">→</span>
          Percorsi e Narratori
        </a>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
            Prossimo: Pubblica
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {coverage.published >= 1
              ? "Almeno una scheda pubblicata. Pronto per lo step Pubblica (in arrivo)."
              : "Pubblica almeno una scheda per procedere."}
          </p>
        </div>
      </div>
    </div>
  );
}

function WarnBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
      <AlertCircle
        className="h-4 w-4 text-amber-700 shrink-0 mt-0.5"
        strokeWidth={1.8}
      />
      <p className="text-xs text-amber-900 leading-relaxed">{children}</p>
    </div>
  );
}

function StatCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="py-5 px-2 border-l border-border/60 first:border-l-0">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "font-heading text-3xl md:text-4xl mt-1 tracking-tight",
          accent ? "text-brand italic" : "text-foreground",
        )}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 h-8 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
        active
          ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/* ─────────── POI block ─────────── */

interface PoiBlockProps {
  poi: {
    id: string;
    name: string;
    description?: string;
    type?: string;
    zoneId?: string;
    minStaySeconds?: number;
  };
  schede: Scheda[];
  narrators: Narrator[];
  brief: ProjectBrief | undefined;
  kb: ProjectKB;
  drivers: ProjectDriversPersonas | undefined;
  project: ProjectInfo | null;
  projectId: string;
  apiKey: string;
  provider: "kimi" | "openai" | null;
  hasLlmKey: boolean;
  narratorsById: Map<string, Narrator>;
  zoneInfo?: { id: string; name: string; function: string };
  onUpdateScheda: (id: string, patch: Partial<Scheda>) => Promise<void>;
  onRemoveScheda: (id: string) => Promise<void>;
  onReload: () => Promise<void>;
}

function PoiBlock({
  poi,
  schede,
  narrators,
  brief,
  kb,
  drivers,
  project,
  projectId,
  apiKey,
  provider,
  hasLlmKey,
  narratorsById,
  zoneInfo,
  onUpdateScheda,
  onRemoveScheda,
  onReload,
}: PoiBlockProps) {
  const [semanticBase, setSemanticBase] = useState<Record<string, unknown>>({});
  const [baseLoaded, setBaseLoaded] = useState(false);
  const [generatingBase, setGeneratingBase] = useState(false);
  const [baseExpanded, setBaseExpanded] = useState(false);
  const [generatingSchedaFor, setGeneratingSchedaFor] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetch(
        `/api/projects/${projectId}/pois/${poi.id}/semantic-base`,
        { cache: "no-store" },
      );
      if (r.ok) {
        const j = await r.json();
        if (alive) {
          setSemanticBase(j.semanticBase ?? {});
          setBaseLoaded(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [projectId, poi.id]);

  const hasBase = Object.keys(semanticBase).length > 0;

  const saveBase = async (next: Record<string, unknown>) => {
    setSemanticBase(next);
    await fetch(`/api/projects/${projectId}/pois/${poi.id}/semantic-base`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
  };

  const generateBase = async () => {
    if (!hasLlmKey || !provider || generatingBase) return;
    setGeneratingBase(true);
    try {
      const relevantFacts = kb.facts
        .filter((f) => f.approved)
        .filter((f) => !f.poiRef || f.poiRef === poi.id.length) // weak heuristic
        .slice(0, 60);
      const r = await fetch("/api/ai/generate-semantic-base", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey,
          provider,
          projectName: project?.name,
          poi: {
            id: poi.id,
            name: poi.name,
            description: poi.description,
            type: poi.type,
            zoneId: poi.zoneId,
            zoneName: zoneInfo?.name,
            zoneFunction: zoneInfo?.function,
          },
          brief: brief
            ? {
                obiettivo: brief.obiettivo,
                promessaNarrativa: brief.promessaNarrativa,
                tono: brief.tono,
                tipoEsperienza: brief.tipoEsperienza,
                mustTell: brief.mustTell,
                avoid: brief.avoid,
                verify: brief.verify,
              }
            : undefined,
          drivers: drivers?.drivers.map((d) => ({
            id: d.id,
            name: d.name,
            domain: d.domain,
          })),
          kbFacts: relevantFacts.map((f) => ({
            content: f.content,
            category: f.category,
            importance: f.importance,
            reliability: f.reliability,
            poiRef: f.poiRef ?? null,
          })),
          visitorQuestions: brief?.visitorQuestions,
        }),
      });
      const data = await r.json();
      if (r.ok && data.semanticBase) {
        await saveBase(data.semanticBase);
        setBaseExpanded(true);
      }
    } finally {
      setGeneratingBase(false);
    }
  };

  const generateSchedaFor = async (narratorId: string) => {
    if (!hasLlmKey || !provider || !hasBase || generatingSchedaFor) return;
    setGeneratingSchedaFor(narratorId);
    try {
      const narrator = narrators.find((n) => n.id === narratorId);
      if (!narrator) return;
      const r = await fetch("/api/ai/generate-scheda", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey,
          provider,
          language: "it",
          projectName: project?.name,
          poi: {
            id: poi.id,
            name: poi.name,
            description: poi.description,
            minStaySeconds: poi.minStaySeconds,
          },
          narrator: {
            id: narrator.id,
            name: narrator.name,
            kind: narrator.kind,
            voiceStyle: narrator.voiceStyle,
            characterBio: narrator.characterBio ?? "",
            characterContractJson: narrator.characterContractJson,
          },
          semanticBase,
          brief: brief
            ? {
                obiettivo: brief.obiettivo,
                promessaNarrativa: brief.promessaNarrativa,
                tono: brief.tono,
                tipoEsperienza: brief.tipoEsperienza,
                mustTell: brief.mustTell,
                avoid: brief.avoid,
              }
            : undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) return;

      // Se esiste già scheda per questa combinazione, PATCH; altrimenti POST
      const existing = schede.find(
        (s) => s.narratorId === narratorId && s.language === "it",
      );
      if (existing) {
        await onUpdateScheda(existing.id, {
          title: data.title,
          scriptText: data.scriptText,
          semanticBaseJson: semanticBase,
        });
      } else {
        await fetch(`/api/projects/${projectId}/schede`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            poiId: poi.id,
            narratorId,
            language: "it",
            title: data.title,
            scriptText: data.scriptText,
            semanticBaseJson: semanticBase,
          }),
        });
        await onReload();
      }
    } finally {
      setGeneratingSchedaFor(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* POI header */}
      <header className="px-5 py-4 bg-muted/20 border-b border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                POI
              </span>
              {zoneInfo && (
                <span className="text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-muted">
                  {zoneInfo.name} · {zoneInfo.function}
                </span>
              )}
              <span className="font-heading text-xl italic leading-tight">
                {poi.name}
              </span>
            </div>
            {poi.description && (
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
                {poi.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-muted">
              {schede.length}/{narrators.length} schede
            </span>
          </div>
        </div>
      </header>

      {/* Base semantica */}
      <div className="px-5 py-4 border-b border-border/60">
        <button
          type="button"
          onClick={() => setBaseExpanded(!baseExpanded)}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.8}
            />
            <p className="text-sm font-medium">Base di significato</p>
            {!baseLoaded ? (
              <span className="text-[11px] text-muted-foreground">carico…</span>
            ) : hasBase ? (
              <span className="text-[11px] text-emerald-600 inline-flex items-center gap-1">
                <Check className="h-3 w-3" strokeWidth={2.5} /> pronta
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                mancante
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasLlmKey && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  void generateBase();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    void generateBase();
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-medium cursor-pointer transition-colors",
                  generatingBase
                    ? "bg-muted text-muted-foreground cursor-wait"
                    : "bg-foreground text-background hover:bg-foreground/90",
                )}
              >
                {generatingBase ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {generatingBase
                  ? "Generazione…"
                  : hasBase
                    ? "Rigenera base"
                    : "Genera base"}
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                baseExpanded ? "rotate-180" : "",
              )}
              strokeWidth={1.8}
            />
          </div>
        </button>
        {baseExpanded && hasBase && (
          <SemanticBaseEditor
            value={semanticBase}
            onChange={(next) => saveBase(next)}
          />
        )}
        {baseExpanded && !hasBase && (
          <p className="mt-3 text-xs text-muted-foreground italic">
            Base vuota. Clicca &ldquo;Genera base&rdquo; per crearla con l'AI.
          </p>
        )}
      </div>

      {/* Schede per narratore */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText
            className="h-4 w-4 text-muted-foreground"
            strokeWidth={1.8}
          />
          <p className="text-sm font-medium">Schede per narratore</p>
        </div>
        {narrators.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Nessun narratore. Creane in Step 05.
          </p>
        ) : (
          <div className="space-y-3">
            {narrators.map((n) => {
              const existing = schede.find(
                (s) => s.narratorId === n.id && s.language === "it",
              );
              return (
                <SchedaRow
                  key={n.id}
                  poiId={poi.id}
                  narrator={n}
                  scheda={existing}
                  canGenerate={hasLlmKey && hasBase}
                  generating={generatingSchedaFor === n.id}
                  onGenerate={() => generateSchedaFor(n.id)}
                  onUpdate={(patch) =>
                    existing ? onUpdateScheda(existing.id, patch) : undefined
                  }
                  onRemove={() =>
                    existing ? onRemoveScheda(existing.id) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────── Semantic base editor ─────────── */

interface BaseShape {
  identity?: string;
  grounding?: string;
  keyMessages?: string[];
  verifiedFacts?: { category: string; content: string }[];
  narrativeAngles?: string[];
  editorialWarnings?: string[];
  deliveryConstraints?: string[];
  visualAffordances?: string[];
  questionSurfaces?: string[];
  expansionPotential?: string[];
}

function SemanticBaseEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [local, setLocal] = useState(value as BaseShape);

  useEffect(() => setLocal(value as BaseShape), [value]);

  const persist = (patch: Partial<BaseShape>) => {
    setLocal((l) => ({ ...l, ...patch }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...(value as Record<string, unknown>), ...patch });
    }, 500);
  };

  return (
    <div className="mt-4 space-y-4">
      <Field label="Identità (cosa/chi è)">
        <Input
          value={local.identity ?? ""}
          onChange={(e) => persist({ identity: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Contesto (dove siamo, cosa accade)">
        <textarea
          value={local.grounding ?? ""}
          onChange={(e) => persist({ grounding: e.target.value })}
          rows={2}
          className="w-full rounded-md border border-border bg-card p-3 text-sm"
        />
      </Field>
      <ListField
        label="Messaggi chiave (cosa deve arrivare)"
        value={local.keyMessages ?? []}
        onChange={(v) => persist({ keyMessages: v })}
        placeholder="Es. La fortezza è stata abbandonata nel 1945..."
      />
      <div>
        <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5 block">
          Fatti verificati
        </Label>
        <div className="space-y-1.5">
          {(local.verifiedFacts ?? []).map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={f.category}
                onChange={(e) => {
                  const next = [...(local.verifiedFacts ?? [])];
                  next[i] = { ...next[i], category: e.target.value };
                  persist({ verifiedFacts: next });
                }}
                className="h-8 rounded-md border border-border bg-card px-2 text-[11px] w-28 shrink-0"
              >
                <option value="solido">Solido</option>
                <option value="interpretazione">Interpretazione</option>
                <option value="memoria">Memoria</option>
                <option value="ipotesi">Ipotesi</option>
              </select>
              <Input
                value={f.content}
                onChange={(e) => {
                  const next = [...(local.verifiedFacts ?? [])];
                  next[i] = { ...next[i], content: e.target.value };
                  persist({ verifiedFacts: next });
                }}
                className="h-8 text-sm flex-1"
              />
              <button
                type="button"
                onClick={() =>
                  persist({
                    verifiedFacts: (local.verifiedFacts ?? []).filter(
                      (_, x) => x !== i,
                    ),
                  })
                }
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.8} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              persist({
                verifiedFacts: [
                  ...(local.verifiedFacts ?? []),
                  { category: "solido", content: "" },
                ],
              })
            }
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            + fatto
          </button>
        </div>
      </div>
      <ListField
        label="Angoli narrativi"
        value={local.narrativeAngles ?? []}
        onChange={(v) => persist({ narrativeAngles: v })}
      />
      <ListField
        label="Avvertenze editoriali"
        value={local.editorialWarnings ?? []}
        onChange={(v) => persist({ editorialWarnings: v })}
      />
      <ListField
        label="Vincoli di fruizione"
        value={local.deliveryConstraints ?? []}
        onChange={(v) => persist({ deliveryConstraints: v })}
      />
      <ListField
        label="Elementi visivi forti"
        value={local.visualAffordances ?? []}
        onChange={(v) => persist({ visualAffordances: v })}
      />
      <ListField
        label="Domande probabili"
        value={local.questionSurfaces ?? []}
        onChange={(v) => persist({ questionSurfaces: v })}
      />
      <ListField
        label="Potenziale approfondimento"
        value={local.expansionPotential ?? []}
        onChange={(v) => persist({ expansionPotential: v })}
      />
    </div>
  );
}

function ListField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5 block">
        {label}
      </Label>
      <div className="space-y-1.5">
        {value.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={it}
              onChange={(e) => {
                const next = [...value];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="h-8 text-sm"
              placeholder={placeholder}
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, x) => x !== i))}
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.8} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...value, ""])}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          + voce
        </button>
      </div>
    </div>
  );
}

/* ─────────── Scheda row ─────────── */

function SchedaRow({
  narrator,
  scheda,
  canGenerate,
  generating,
  onGenerate,
  onUpdate,
  onRemove,
}: {
  poiId: string;
  narrator: Narrator;
  scheda: Scheda | undefined;
  canGenerate: boolean;
  generating: boolean;
  onGenerate: () => void;
  onUpdate?: (patch: Partial<Scheda>) => void;
  onRemove?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState(scheda);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setLocal(scheda), [scheda]);

  const persist = (patch: Partial<Scheda>) => {
    if (!local || !onUpdate) return;
    setLocal((l) => ({ ...(l as Scheda), ...patch }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onUpdate(patch), 500);
  };

  const duration = local?.durationEstimateSeconds ?? 0;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        local?.status === "published" ? "border-emerald-200" : "border-border",
      )}
    >
      {/* Header narratore + azioni */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div
          className={cn(
            "h-10 w-10 rounded-full overflow-hidden shrink-0 relative",
            narrator.portraitUrl
              ? ""
              : "bg-muted flex items-center justify-center border border-border",
          )}
        >
          {narrator.portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={narrator.portraitUrl}
              alt={narrator.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-heading italic text-muted-foreground">
              {(narrator.name[0] ?? "?").toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{narrator.name}</p>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {narrator.kind === "backbone" ? "Principale" : "Personaggio"}
            </span>
            {local && (
              <span
                className={cn(
                  "text-[10px] uppercase tracking-[0.12em] font-medium px-2 py-0.5 rounded-full",
                  STATUS_COLORS[local.status],
                )}
              >
                {STATUS_LABELS[local.status]}
              </span>
            )}
            {local?.isCore && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-brand">
                <Star className="h-2.5 w-2.5 fill-brand" strokeWidth={1.8} />
                core
              </span>
            )}
          </div>
          {local && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {local.title || "(senza titolo)"}
              {duration > 0 && (
                <span className="ml-2 tabular-nums">
                  · {mins}:{String(secs).padStart(2, "0")}
                </span>
              )}
              {local.version > 1 && (
                <span className="ml-2">· v{local.version}</span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!local ? (
            canGenerate ? (
              <button
                type="button"
                onClick={onGenerate}
                disabled={generating}
                className={cn(
                  "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors",
                  generating
                    ? "bg-muted text-muted-foreground cursor-wait"
                    : "bg-brand text-white hover:bg-brand/90",
                )}
              >
                {generating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {generating ? "Generazione…" : "Genera"}
              </button>
            ) : (
              <span className="text-[11px] text-muted-foreground italic">
                Genera prima la base
              </span>
            )
          ) : (
            <>
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors"
              >
                {expanded ? "Chiudi" : "Apri"}
              </button>
              <button
                type="button"
                onClick={onGenerate}
                disabled={generating || !canGenerate}
                title="Rigenera testo dall'AI"
                className="h-7 w-7 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40"
              >
                {generating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" strokeWidth={1.8} />
                )}
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="h-7 w-7 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={1.8} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Editor espanso */}
      {expanded && local && (
        <div className="border-t border-border/60 p-4 space-y-4 bg-muted/10">
          <Field label="Titolo">
            <Input
              value={local.title}
              onChange={(e) => persist({ title: e.target.value })}
              className="h-9"
            />
          </Field>
          <Field
            label={`Testo parlato (${local.scriptText.trim().split(/\s+/).filter(Boolean).length} parole)`}
          >
            <textarea
              value={local.scriptText}
              onChange={(e) => persist({ scriptText: e.target.value })}
              rows={10}
              className="w-full rounded-md border border-border bg-card p-3 text-sm leading-relaxed font-serif"
            />
          </Field>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                persist({
                  isCore: !local.isCore,
                })
              }
              className={cn(
                "h-7 px-3 rounded-full text-[11px] font-medium border transition-colors inline-flex items-center gap-1",
                local.isCore
                  ? "bg-brand/10 border-brand/40 text-brand"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Star
                className={cn("h-3 w-3", local.isCore ? "fill-brand" : "")}
                strokeWidth={1.8}
              />
              Essenziale
            </button>
          </div>

          {/* Workflow stati */}
          <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border/60">
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Stato:
            </span>
            {local.status === "draft" && (
              <>
                <StatusBtn
                  icon={<Send className="h-3 w-3" />}
                  label="Invia in revisione"
                  onClick={() =>
                    onUpdate?.({
                      status: "in_review" as SchedaStatus,
                    } as Partial<Scheda>)
                  }
                />
              </>
            )}
            {local.status === "in_review" && (
              <>
                <StatusBtn
                  icon={<Send className="h-3 w-3" />}
                  label="Invia al cliente"
                  onClick={() =>
                    onUpdate?.({
                      status: "client_review" as SchedaStatus,
                    } as Partial<Scheda>)
                  }
                />
                <StatusBtn
                  icon={<Eye className="h-3 w-3" />}
                  label="Pubblica"
                  onClick={() =>
                    onUpdate?.({
                      status: "published" as SchedaStatus,
                    } as Partial<Scheda>)
                  }
                  variant="success"
                />
                <StatusBtn
                  icon={<EyeOff className="h-3 w-3" />}
                  label="Rimetti in bozza"
                  onClick={() =>
                    onUpdate?.({
                      status: "draft" as SchedaStatus,
                    } as Partial<Scheda>)
                  }
                  variant="subtle"
                />
              </>
            )}
            {local.status === "client_review" && (
              <>
                <StatusBtn
                  icon={<Eye className="h-3 w-3" />}
                  label="Pubblica"
                  onClick={() =>
                    onUpdate?.({
                      status: "published" as SchedaStatus,
                    } as Partial<Scheda>)
                  }
                  variant="success"
                />
                <StatusBtn
                  icon={<EyeOff className="h-3 w-3" />}
                  label="Rimetti in revisione"
                  onClick={() =>
                    onUpdate?.({
                      status: "in_review" as SchedaStatus,
                    } as Partial<Scheda>)
                  }
                  variant="subtle"
                />
              </>
            )}
            {local.status === "published" && (
              <>
                <StatusBtn
                  icon={<EyeOff className="h-3 w-3" />}
                  label="Sospendi (→ bozza)"
                  onClick={() =>
                    onUpdate?.({
                      status: "draft" as SchedaStatus,
                    } as Partial<Scheda>)
                  }
                  variant="subtle"
                />
              </>
            )}
            {local.version > 1 && (
              <span className="text-[11px] text-muted-foreground ml-2">
                Versione {local.version}
              </span>
            )}
          </div>

          {/* Audio stub */}
          <AudioStub scheda={local} narrator={narrator} />
        </div>
      )}
    </div>
  );
}

function StatusBtn({
  icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "success" | "subtle";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium transition-colors",
        variant === "success"
          ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : variant === "subtle"
            ? "text-muted-foreground border border-border hover:bg-muted"
            : "bg-foreground text-background hover:bg-foreground/90",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function AudioStub({
  scheda,
  narrator,
}: {
  scheda: Scheda;
  narrator: Narrator;
}) {
  const canGenerate = scheda.status === "published" && !!narrator.voiceId;
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <AudioLines
          className="h-4 w-4 text-muted-foreground"
          strokeWidth={1.8}
        />
        <p className="font-medium">Audio</p>
      </div>
      {!scheda.audio ? (
        <>
          <p className="text-xs text-muted-foreground">
            {canGenerate
              ? "Pronta per generare audio con ElevenLabs."
              : scheda.status !== "published"
                ? "L'audio si genera dopo aver pubblicato la scheda."
                : "Assegna una voce al narratore in Step 05."}
          </p>
          <button
            type="button"
            disabled
            title="Generazione audio disattivata finché non approvi tutto il progetto"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium bg-muted text-muted-foreground cursor-not-allowed opacity-60"
          >
            <Sparkles className="h-3 w-3" />
            Genera audio (attiverà quando approvi)
          </button>
        </>
      ) : (
        <div className="space-y-2">
          {scheda.audio.isStale && (
            <p className="text-xs text-amber-700 font-medium">
              ⚠ Audio obsoleto: il testo è stato modificato dopo la generazione
            </p>
          )}
          <audio controls src={scheda.audio.fileUrl} className="w-full h-9" />
          <p className="text-[11px] text-muted-foreground">
            Voce: {scheda.audio.voiceModel} · durata{" "}
            {Math.round(scheda.audio.durationSeconds)}s
          </p>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </Label>
      <div>{children}</div>
    </div>
  );
}
