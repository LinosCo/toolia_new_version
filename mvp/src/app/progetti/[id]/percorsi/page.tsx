"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  Mic,
  Users,
  Route as RouteIcon,
  AlertCircle,
  Check,
  X,
  Settings2,
  Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loadBrief,
  loadDriversPersonas,
  loadMap,
  saveProgress,
  type ProjectBrief,
  type ProjectDriversPersonas,
  type ProjectMap,
} from "@/lib/project-store";
import { loadApiKeys } from "@/lib/api-keys";
import { cn } from "@/lib/utils";

type NarratorKind = "backbone" | "character";

interface Narrator {
  id: string;
  name: string;
  kind: NarratorKind;
  voiceStyle: string;
  language: string;
  characterBio: string | null;
  preferredDrivers: string[];
  voiceModel: string | null;
  voiceId: string | null;
  portraitUrl: string | null;
  characterContractJson: Record<string, unknown>;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  preview_url?: string;
  language?: string;
}

interface ProjectInfo {
  id: string;
  name: string;
  type: string | null;
  city: string | null;
}

interface PathChapter {
  id: string;
  name: string;
  function: "apertura" | "sviluppo" | "climax" | "chiusura";
  poiIds: string[];
  description: string;
}

interface PathItem {
  id: string;
  name: string;
  description: string;
  durationTargetMinutes: number | null;
  poiOrderJson: string[];
  corePoiIds: string[];
  narratorId: string | null;
  themeFocus: string | null;
  chaptersJson: PathChapter[];
}

interface AdaptationRules {
  minDurationMinutes: number;
  standardDurationMinutes: number;
  maxDurationMinutes: number;
  shorteningStrategy: string;
  lengtheningStrategy: string;
  notes: string;
}

function defaultAdaptationRules(): AdaptationRules {
  return {
    minDurationMinutes: 20,
    standardDurationMinutes: 60,
    maxDurationMinutes: 120,
    shorteningStrategy:
      "Mantieni solo i POI essenziali (core) e il climax. Salta approfondimenti e POI secondari.",
    lengtheningStrategy:
      "Aggiungi approfondimenti sui POI core, segmenti con valore atmosferico, bridge più ricchi.",
    notes: "",
  };
}

const VOICE_STYLES = [
  "sobrio-autorevole",
  "coinvolgente",
  "caldo",
  "evocativo",
  "ironico",
  "formale",
  "poetico",
];

const CHARACTER_FUNCTIONS = [
  { value: "guida", label: "Guida" },
  { value: "testimone", label: "Testimone" },
  { value: "esperto", label: "Esperto" },
  { value: "gioco", label: "Gioco/Missione" },
];

const CHARACTER_TARGETS = [
  { value: "adulti", label: "Adulti" },
  { value: "generalista", label: "Generalista" },
  { value: "family", label: "Famiglie" },
];

export default function PercorsiStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [brief, setBrief] = useState<ProjectBrief | undefined>(undefined);
  const [drivers, setDrivers] = useState<ProjectDriversPersonas | undefined>(
    undefined,
  );
  const [map, setMap] = useState<ProjectMap | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [proposeError, setProposeError] = useState<string | null>(null);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [paths, setPaths] = useState<PathItem[]>([]);
  const [proposingPaths, setProposingPaths] = useState(false);
  const [pathsError, setPathsError] = useState<string | null>(null);
  const [adaptation, setAdaptation] = useState<AdaptationRules>(
    defaultAdaptationRules(),
  );
  const adaptationSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoProposedRef = useRef(false);

  const keys = typeof window !== "undefined" ? loadApiKeys() : null;
  const activeProvider: "kimi" | "openai" | null = keys?.llm.openai
    ? "openai"
    : keys?.llm.kimi
      ? "kimi"
      : null;
  const hasLlmKey = activeProvider !== null;

  const reloadNarrators = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/narrators`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      setNarrators(json.narrators ?? []);
    }
  }, [projectId]);

  const reloadPaths = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/paths`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      setPaths(json.paths ?? []);
    }
  }, [projectId]);

  useEffect(() => {
    saveProgress(projectId, { currentStep: "luogo" });
    let alive = true;
    (async () => {
      const [p, b, d, m] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : null,
        ),
        loadBrief(projectId),
        loadDriversPersonas(projectId),
        loadMap(projectId),
      ]);
      if (!alive) return;
      if (p?.project) {
        setProject({
          id: p.project.id,
          name: p.project.name,
          type: p.project.type,
          city: p.project.city,
        });
      }
      setBrief(b);
      setDrivers(d);
      setMap(m);
      await reloadNarrators();
      await reloadPaths();
      // Carica regole adattamento
      try {
        const ar = await fetch(`/api/projects/${projectId}/adaptation-rules`, {
          cache: "no-store",
        });
        if (ar.ok) {
          const aj = await ar.json();
          if (alive && aj?.rules) {
            setAdaptation({ ...defaultAdaptationRules(), ...aj.rules });
          }
        }
      } catch {
        // silent
      }
      // Carica lista voci ElevenLabs
      try {
        const vr = await fetch("/api/tts/elevenlabs/voices", {
          cache: "no-store",
        });
        if (vr.ok) {
          const vj = await vr.json();
          if (alive) setVoices(vj.voices ?? []);
        }
      } catch {
        // silent
      }
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [projectId, reloadNarrators, reloadPaths]);

  // Auto-propose al primo ingresso se vuoto + chiave LLM presente + driver già pronti
  useEffect(() => {
    if (!loaded || autoProposedRef.current || proposing) return;
    if (narrators.length > 0) return;
    if (!hasLlmKey) return;
    if (!drivers?.drivers.length) return;
    autoProposedRef.current = true;
    void proposeWithAI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, narrators.length, hasLlmKey, drivers]);

  const mainCount = narrators.filter((n) => n.kind === "backbone").length;
  const characterCount = narrators.filter((n) => n.kind === "character").length;

  const proposeWithAI = async () => {
    if (!hasLlmKey || !keys || !activeProvider || proposing) return;
    if (narrators.length > 0) {
      const ok = window.confirm(
        "Rigenerare i narratori? Quelli attuali verranno sostituiti.",
      );
      if (!ok) return;
    }
    setProposing(true);
    setProposeError(null);
    try {
      // Se esistono già, cancella prima (rigenerazione pulita)
      if (narrators.length > 0) {
        await Promise.all(
          narrators.map((n) =>
            fetch(`/api/projects/${projectId}/narrators/${n.id}`, {
              method: "DELETE",
            }),
          ),
        );
      }
      const res = await fetch("/api/ai/propose-narrators", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey: keys.llm[activeProvider],
          provider: activeProvider,
          projectName: project?.name ?? "Progetto",
          type: project?.type,
          city: project?.city,
          brief: brief
            ? {
                obiettivo: brief.obiettivo,
                promessaNarrativa: brief.promessaNarrativa,
                target: brief.target,
                tipoEsperienza: brief.tipoEsperienza,
                tono: brief.tono,
                mustTell: brief.mustTell,
                avoid: brief.avoid,
                familyModeEnabled: brief.familyMode.enabled,
              }
            : undefined,
          drivers: drivers?.drivers.map((d) => ({
            id: d.id,
            name: d.name,
            domain: d.domain,
            description: d.description,
          })),
          personas: drivers?.personas.map((p) => ({
            id: p.id,
            name: p.name,
            motivation: p.motivation,
            payoff: p.payoff,
          })),
          pois: map?.pois.slice(0, 10).map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
          })),
          voices: voices.map((v) => ({
            voice_id: v.voice_id,
            name: v.name,
            gender: v.labels?.gender,
            age: v.labels?.age,
            accent: v.labels?.accent,
            description: v.labels?.description,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProposeError(data.message ?? "Errore generazione narratori.");
        return;
      }
      const proposed: Partial<Narrator>[] = data.narrators ?? [];
      const createdIds: { id: string; narrator: Partial<Narrator> }[] = [];
      for (const n of proposed) {
        if (!n.name || !n.kind) continue;
        const r = await fetch(`/api/projects/${projectId}/narrators`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: n.name,
            kind: n.kind,
            voiceStyle: n.voiceStyle ?? "sobrio-autorevole",
            language: n.language ?? "it",
            characterBio: n.characterBio ?? null,
            preferredDrivers: n.preferredDrivers ?? [],
            voiceId: n.voiceId ?? null,
            voiceModel: n.voiceId ? "elevenlabs" : null,
            characterContractJson: n.characterContractJson ?? {},
          }),
        });
        if (r.ok) {
          const j = await r.json();
          if (j?.narrator?.id)
            createdIds.push({ id: j.narrator.id, narrator: n });
        }
      }
      await reloadNarrators();

      // Genera ritratti in background (non bloccanti)
      if (keys.llm.openai) {
        for (const c of createdIds) {
          generatePortraitForNarrator(c.id, c.narrator).catch(() => {
            // silent, il bottone Rigenera ritratto resta disponibile nella card
          });
        }
      }
    } catch (e) {
      setProposeError(e instanceof Error ? e.message : "Errore di rete.");
    } finally {
      setProposing(false);
    }
  };

  const generatePortraitForNarrator = async (
    narratorId: string,
    narrator: Partial<Narrator>,
  ) => {
    if (!keys?.llm.openai) return;
    const contract = (narrator.characterContractJson ?? {}) as Record<
      string,
      unknown
    >;
    const res = await fetch("/api/ai/generate-narrator-portrait", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        apiKey: keys.llm.openai,
        name: narrator.name,
        kind: narrator.kind,
        bio: narrator.characterBio,
        identity: (contract.identity as string) ?? "",
        toneAndRegister: (contract.toneAndRegister as string) ?? "",
        placeName: project?.name,
        placeType: project?.type,
      }),
    });
    if (!res.ok) return;
    const json = await res.json();
    if (json?.portraitUrl) {
      await fetch(`/api/projects/${projectId}/narrators/${narratorId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ portraitUrl: json.portraitUrl }),
      });
      await reloadNarrators();
    }
  };

  const updateAdaptation = (patch: Partial<AdaptationRules>) => {
    setAdaptation((prev) => {
      const next = { ...prev, ...patch };
      if (adaptationSaveRef.current) clearTimeout(adaptationSaveRef.current);
      adaptationSaveRef.current = setTimeout(async () => {
        await fetch(`/api/projects/${projectId}/adaptation-rules`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(next),
        });
      }, 500);
      return next;
    });
  };

  const proposePaths = async () => {
    if (!hasLlmKey || !keys || !activeProvider || proposingPaths) return;
    if (paths.length > 0) {
      const ok = window.confirm(
        "Rigenerare i percorsi? Quelli attuali verranno sostituiti.",
      );
      if (!ok) return;
    }
    setProposingPaths(true);
    setPathsError(null);
    try {
      if (paths.length > 0) {
        await Promise.all(
          paths.map((p) =>
            fetch(`/api/projects/${projectId}/paths/${p.id}`, {
              method: "DELETE",
            }),
          ),
        );
      }

      const res = await fetch("/api/ai/propose-paths", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey: keys.llm[activeProvider],
          provider: activeProvider,
          projectName: project?.name ?? "Progetto",
          type: project?.type,
          city: project?.city,
          brief: brief
            ? {
                obiettivo: brief.obiettivo,
                promessaNarrativa: brief.promessaNarrativa,
                target: brief.target,
                tipoEsperienza: brief.tipoEsperienza,
                tono: brief.tono,
                durataMinuti: brief.durataMinuti,
              }
            : undefined,
          drivers: drivers?.drivers.map((d) => ({
            id: d.id,
            name: d.name,
            domain: d.domain,
          })),
          zones: map?.zones.map((z) => ({
            id: z.id,
            name: z.name,
            function: z.function,
            narrativePromise: z.narrativePromise,
          })),
          pois: map?.pois.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            zoneId: p.zoneId,
            minStaySeconds: p.minStaySeconds,
          })),
          narrators: narrators.map((n) => ({
            id: n.id,
            name: n.name,
            kind: n.kind,
            voiceStyle: n.voiceStyle,
            characterBio: n.characterBio ?? "",
            preferredDrivers: n.preferredDrivers,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPathsError(data.message ?? "Errore generazione percorsi.");
        return;
      }
      for (const p of data.paths ?? []) {
        if (!p?.name) continue;
        await fetch(`/api/projects/${projectId}/paths`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: p.name,
            description: p.description ?? "",
            durationTargetMinutes: p.durationTargetMinutes ?? null,
            poiOrder: p.poiOrder ?? [],
            corePoiIds: p.corePoiIds ?? [],
            narratorId: p.narratorId ?? null,
            themeFocus: p.themeFocus ?? null,
            chapters: p.chapters ?? [],
          }),
        });
      }
      await reloadPaths();
    } catch (e) {
      setPathsError(e instanceof Error ? e.message : "Errore di rete.");
    } finally {
      setProposingPaths(false);
    }
  };

  const addPath = async () => {
    await fetch(`/api/projects/${projectId}/paths`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Nuovo percorso",
        description: "",
        poiOrder: [],
        chapters: [],
      }),
    });
    await reloadPaths();
  };

  const updatePath = async (id: string, patch: Partial<PathItem>) => {
    setPaths((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const body: Record<string, unknown> = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.description !== undefined) body.description = patch.description;
    if (patch.durationTargetMinutes !== undefined)
      body.durationTargetMinutes = patch.durationTargetMinutes;
    if (patch.narratorId !== undefined) body.narratorId = patch.narratorId;
    if (patch.themeFocus !== undefined) body.themeFocus = patch.themeFocus;
    if (patch.poiOrderJson !== undefined) body.poiOrder = patch.poiOrderJson;
    if (patch.chaptersJson !== undefined) body.chapters = patch.chaptersJson;
    await fetch(`/api/projects/${projectId}/paths/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const removePath = async (id: string) => {
    if (!window.confirm("Eliminare questo percorso?")) return;
    setPaths((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/projects/${projectId}/paths/${id}`, {
      method: "DELETE",
    });
  };

  const addNarrator = async (kind: NarratorKind) => {
    await fetch(`/api/projects/${projectId}/narrators`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: kind === "backbone" ? "Voce narrante" : "Personaggio",
        kind,
        voiceStyle: "sobrio-autorevole",
        language: "it",
        preferredDrivers: [],
        characterContractJson: {},
      }),
    });
    await reloadNarrators();
  };

  const updateNarrator = async (id: string, patch: Partial<Narrator>) => {
    // Aggiorna optimistic
    setNarrators((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    );
    await fetch(`/api/projects/${projectId}/narrators/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
  };

  const removeNarrator = async (id: string) => {
    if (!window.confirm("Eliminare questo narratore?")) return;
    setNarrators((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/projects/${projectId}/narrators/${id}`, {
      method: "DELETE",
    });
  };

  if (!loaded) return <div className="min-h-screen" />;

  return (
    <div className="px-8 md:px-14 py-10 md:py-14 max-w-[1100px]">
      <header className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Step 05
        </p>
        <h1 className="font-heading text-5xl md:text-6xl italic leading-[1.02] tracking-tight mt-2">
          Percorsi e Narratori
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-2xl leading-relaxed">
          Definisci chi racconta e come si svolge la visita. I narratori
          influenzano <em>cosa</em> viene raccontato, non solo come. I percorsi
          sono itinerari tematici composti dai POI con un ordine e una durata.
        </p>
      </header>

      {!hasLlmKey && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle
            className="h-4 w-4 text-amber-700 shrink-0 mt-0.5"
            strokeWidth={1.8}
          />
          <p className="text-xs text-amber-900">
            Configura una chiave LLM in Impostazioni per proporre narratori con
            l'AI.
          </p>
        </div>
      )}

      <div className="space-y-6">
        <Section
          icon={<Mic className="h-4 w-4" strokeWidth={1.8} />}
          title="Narratori"
          subtitle="Una voce principale che tiene insieme la visita + personaggi secondari con ruoli specifici."
          count={`${mainCount} principale · ${characterCount} personaggi`}
          defaultOpen
          action={
            <div className="flex items-center gap-2">
              {hasLlmKey && (
                <button
                  type="button"
                  onClick={proposeWithAI}
                  disabled={proposing}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors",
                    proposing
                      ? "bg-muted text-muted-foreground cursor-wait"
                      : "bg-brand text-white hover:bg-brand/90",
                  )}
                >
                  {proposing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {proposing
                    ? "Generazione..."
                    : narrators.length === 0
                      ? "Proponi con AI"
                      : "Rigenera"}
                </button>
              )}
              <button
                type="button"
                onClick={() => addNarrator("backbone")}
                disabled={mainCount > 0}
                title={
                  mainCount > 0
                    ? "Una sola voce principale"
                    : "Aggiungi voce principale"
                }
                className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
                Voce principale
              </button>
              <button
                type="button"
                onClick={() => addNarrator("character")}
                className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors"
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
                Personaggio
              </button>
            </div>
          }
        >
          {proposeError && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              {proposeError}
            </div>
          )}
          {narrators.length === 0 ? (
            <Empty label="Nessun narratore. Proponili con l'AI o aggiungine uno." />
          ) : (
            <div className="space-y-4">
              {narrators.map((n) => (
                <NarratorCard
                  key={n.id}
                  narrator={n}
                  availableDrivers={drivers?.drivers ?? []}
                  availablePois={map?.pois ?? []}
                  voices={voices}
                  hasOpenAiKey={!!keys?.llm.openai}
                  onUpdate={(patch) => updateNarrator(n.id, patch)}
                  onRemove={() => removeNarrator(n.id)}
                  onGeneratePortrait={() =>
                    generatePortraitForNarrator(n.id, n)
                  }
                />
              ))}
            </div>
          )}
        </Section>

        <Section
          icon={<RouteIcon className="h-4 w-4" strokeWidth={1.8} />}
          title="Percorsi"
          subtitle="Itinerari tematici composti dai POI, con capitoli narrativi, durata e narratore assegnato."
          count={paths.length}
          defaultOpen
          action={
            <div className="flex items-center gap-2">
              {hasLlmKey &&
                narrators.length > 0 &&
                (map?.pois.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={proposePaths}
                    disabled={proposingPaths}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors",
                      proposingPaths
                        ? "bg-muted text-muted-foreground cursor-wait"
                        : "bg-brand text-white hover:bg-brand/90",
                    )}
                  >
                    {proposingPaths ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {proposingPaths
                      ? "Generazione..."
                      : paths.length === 0
                        ? "Proponi con AI"
                        : "Rigenera"}
                  </button>
                )}
              <button
                type="button"
                onClick={addPath}
                className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors"
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
                Percorso
              </button>
            </div>
          }
        >
          {pathsError && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              {pathsError}
            </div>
          )}
          {narrators.length === 0 && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              Prima crea almeno un narratore per poter assegnarlo ai percorsi.
            </div>
          )}
          {(map?.pois.length ?? 0) === 0 && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              Aggiungi POI nello Step Luogo prima di creare i percorsi.
            </div>
          )}
          {paths.length === 0 ? (
            <Empty label="Nessun percorso. Proponili con l'AI o aggiungi manualmente." />
          ) : (
            <div className="space-y-4">
              {paths.map((p) => (
                <PathCard
                  key={p.id}
                  path={p}
                  narrators={narrators}
                  availablePois={map?.pois ?? []}
                  onUpdate={(patch) => updatePath(p.id, patch)}
                  onRemove={() => removePath(p.id)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section
          icon={<Settings2 className="h-4 w-4" strokeWidth={1.8} />}
          title="Regole di adattamento"
          subtitle="Come la visita si accorcia/allunga in base al tempo del visitatore. Usate dalla modalità &ldquo;Crea la tua visita&rdquo; nell'app."
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field
                label="Durata minima (min)"
                hint="Sotto questa soglia non si propone nemmeno"
              >
                <Input
                  type="number"
                  value={adaptation.minDurationMinutes}
                  onChange={(e) =>
                    updateAdaptation({
                      minDurationMinutes: Number(e.target.value) || 0,
                    })
                  }
                  className="h-9"
                />
              </Field>
              <Field
                label="Durata standard (min)"
                hint="Durata tipica della visita piena"
              >
                <Input
                  type="number"
                  value={adaptation.standardDurationMinutes}
                  onChange={(e) =>
                    updateAdaptation({
                      standardDurationMinutes: Number(e.target.value) || 0,
                    })
                  }
                  className="h-9"
                />
              </Field>
              <Field
                label="Durata massima (min)"
                hint="Con approfondimenti e deep-dive"
              >
                <Input
                  type="number"
                  value={adaptation.maxDurationMinutes}
                  onChange={(e) =>
                    updateAdaptation({
                      maxDurationMinutes: Number(e.target.value) || 0,
                    })
                  }
                  className="h-9"
                />
              </Field>
            </div>
            <Field
              label="Strategia se il tempo è poco"
              hint="Istruzioni per l'AI: cosa mantenere, cosa tagliare quando il visitatore ha meno tempo"
            >
              <textarea
                value={adaptation.shorteningStrategy}
                onChange={(e) =>
                  updateAdaptation({ shorteningStrategy: e.target.value })
                }
                rows={3}
                className="w-full rounded-md border border-border bg-card p-3 text-sm leading-relaxed"
                placeholder="Es. Mantieni solo i POI essenziali (core) e il climax. Salta approfondimenti e POI secondari."
              />
            </Field>
            <Field
              label="Strategia se il tempo è molto"
              hint="Cosa aggiungere quando il visitatore ha tempo extra"
            >
              <textarea
                value={adaptation.lengtheningStrategy}
                onChange={(e) =>
                  updateAdaptation({ lengtheningStrategy: e.target.value })
                }
                rows={3}
                className="w-full rounded-md border border-border bg-card p-3 text-sm leading-relaxed"
                placeholder="Es. Aggiungi approfondimenti sui POI core, segmenti con valore atmosferico, bridge più ricchi."
              />
            </Field>
            <Field
              label="Note aggiuntive"
              hint="Considerazioni libere sull'adattamento"
            >
              <textarea
                value={adaptation.notes}
                onChange={(e) => updateAdaptation({ notes: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-border bg-card p-3 text-sm leading-relaxed"
                placeholder="Es. Se piove, preferire POI indoor. Se gruppo con bambini, ridurre durata capitoli lunghi."
              />
            </Field>
          </div>
        </Section>
      </div>

      {/* Nav footer */}
      <div className="mt-12 flex items-center justify-between pt-8 border-t border-border/60">
        <a
          href={`/progetti/${projectId}/driver`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <span className="rotate-180 inline-block">
            <ArrowRight className="h-4 w-4" />
          </span>
          Driver e Personas
        </a>
        <a
          href={`/progetti/${projectId}/schede`}
          className={cn(
            "inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition-colors",
            narrators.length > 0 && paths.length > 0
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-muted text-muted-foreground",
          )}
        >
          {narrators.length > 0 && paths.length > 0
            ? "Vai a Schede e Audio"
            : "Completa narratori e percorsi"}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

/* ─────────── UI helpers ─────────── */

function Section({
  icon,
  title,
  subtitle,
  count,
  action,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count?: number | string;
  action?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.section
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        className="w-full px-5 py-4 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors text-left cursor-pointer select-none"
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium flex items-center gap-2">
              {title}
              {count !== undefined && (
                <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                  · {count}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Action area: non toglia propagazione al click del header */}
          <div onClick={(e) => e.stopPropagation()}>{action}</div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open ? "rotate-180" : "",
            )}
            strokeWidth={1.8}
          />
        </div>
      </div>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-border/60">
          {children}
        </div>
      )}
    </motion.section>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="py-8 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

/* ─────────── Path card ─────────── */

const CHAPTER_FUNCTIONS: { value: PathChapter["function"]; label: string }[] = [
  { value: "apertura", label: "Apertura" },
  { value: "sviluppo", label: "Sviluppo" },
  { value: "climax", label: "Climax" },
  { value: "chiusura", label: "Chiusura" },
];

function PathCard({
  path,
  narrators,
  availablePois,
  onUpdate,
  onRemove,
}: {
  path: PathItem;
  narrators: Narrator[];
  availablePois: { id: string; name: string; minStaySeconds?: number }[];
  onUpdate: (patch: Partial<PathItem>) => void;
  onRemove: () => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [local, setLocal] = useState(path);
  const [savedFlash, setSavedFlash] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => setLocal(path), [path]);

  const persist = (patch: Partial<PathItem>) => {
    setLocal((l) => ({ ...l, ...patch }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await onUpdate(patch);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 800);
    }, 400);
  };

  const narrator = narrators.find((n) => n.id === local.narratorId);
  const poiById = new Map(availablePois.map((p) => [p.id, p]));

  const movePoi = (idx: number, dir: -1 | 1) => {
    const order = [...local.poiOrderJson];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= order.length) return;
    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    persist({ poiOrderJson: order });
  };

  const removePoi = (poiId: string) => {
    const order = local.poiOrderJson.filter((x) => x !== poiId);
    // Rimuovi anche dai capitoli e da corePoiIds
    const chapters = local.chaptersJson.map((c) => ({
      ...c,
      poiIds: c.poiIds.filter((x) => x !== poiId),
    }));
    const core = local.corePoiIds.filter((x) => x !== poiId);
    persist({ poiOrderJson: order, chaptersJson: chapters, corePoiIds: core });
  };

  const toggleCore = (poiId: string) => {
    const core = local.corePoiIds.includes(poiId)
      ? local.corePoiIds.filter((x) => x !== poiId)
      : [...local.corePoiIds, poiId];
    persist({ corePoiIds: core });
  };

  const addPoi = (poiId: string) => {
    if (local.poiOrderJson.includes(poiId)) return;
    const order = [...local.poiOrderJson, poiId];
    persist({ poiOrderJson: order });
  };

  const addChapter = (fn: PathChapter["function"]) => {
    const newCh: PathChapter = {
      id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name:
        fn === "apertura"
          ? "Apertura"
          : fn === "sviluppo"
            ? "Sviluppo"
            : fn === "climax"
              ? "Climax"
              : "Chiusura",
      function: fn,
      poiIds: [],
      description: "",
    };
    persist({ chaptersJson: [...local.chaptersJson, newCh] });
  };

  const updateChapter = (chId: string, patch: Partial<PathChapter>) => {
    persist({
      chaptersJson: local.chaptersJson.map((c) =>
        c.id === chId ? { ...c, ...patch } : c,
      ),
    });
  };

  const removeChapter = (chId: string) => {
    persist({
      chaptersJson: local.chaptersJson.filter((c) => c.id !== chId),
    });
  };

  const togglePoiInChapter = (chId: string, poiId: string) => {
    const ch = local.chaptersJson.find((c) => c.id === chId);
    if (!ch) return;
    const poiIds = ch.poiIds.includes(poiId)
      ? ch.poiIds.filter((x) => x !== poiId)
      : [...ch.poiIds, poiId];
    updateChapter(chId, { poiIds });
  };

  const poisNotInOrder = availablePois.filter(
    (p) => !local.poiOrderJson.includes(p.id),
  );

  const autoCalcDuration = () => {
    const walkPerPoi = 90; // 1.5 min
    const secs = local.poiOrderJson.reduce((acc, pid) => {
      const poi = poiById.get(pid);
      return acc + (poi?.minStaySeconds ?? 60) + walkPerPoi;
    }, 0);
    persist({ durationTargetMinutes: Math.round(secs / 60) });
  };

  return (
    <article className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="px-4 py-3 flex items-start justify-between gap-3 border-b border-border/60 bg-brand/5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground">
              Percorso
            </span>
            <span className="font-heading text-lg italic leading-tight truncate">
              {local.name || "Senza nome"}
            </span>
            {savedFlash && (
              <Check
                className="h-3.5 w-3.5 text-emerald-600 shrink-0"
                strokeWidth={2}
              />
            )}
          </div>
          {local.description && (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {local.description}
            </p>
          )}
          <div className="mt-2 flex items-center flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-muted">
              {local.poiOrderJson.length} POI
            </span>
            {local.durationTargetMinutes != null && (
              <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-muted">
                ~{local.durationTargetMinutes} min
              </span>
            )}
            {narrator && (
              <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-foreground text-background text-[10px] font-medium">
                {narrator.name}
              </span>
            )}
            {local.themeFocus && (
              <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-muted italic">
                {local.themeFocus}
              </span>
            )}
            <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-muted">
              {local.chaptersJson.length} capitoli
            </span>
            {local.corePoiIds.length > 0 && (
              <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-brand/10 text-brand">
                <Star className="h-2.5 w-2.5 fill-brand" strokeWidth={1.8} />
                {local.corePoiIds.length} essenziali
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors"
          >
            {expanded ? "Chiudi" : "Modifica"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="h-7 w-7 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Elimina percorso"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {expanded && (
        <div className="p-4 space-y-4">
          <Field label="Nome">
            <Input
              value={local.name}
              onChange={(e) => persist({ name: e.target.value })}
              className="h-9"
              placeholder="Es. Tour completo, Percorso rapido"
            />
          </Field>

          <Field label="Descrizione" hint="Cosa offre, a chi si rivolge">
            <textarea
              value={local.description}
              onChange={(e) => persist({ description: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-border bg-card p-3 text-sm leading-relaxed"
              placeholder="Breve descrizione del percorso"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Durata (min)">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={local.durationTargetMinutes ?? ""}
                  onChange={(e) =>
                    persist({
                      durationTargetMinutes: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="h-9"
                  placeholder="60"
                />
                <button
                  type="button"
                  onClick={autoCalcDuration}
                  title="Calcola da soste POI + camminata"
                  className="h-9 px-3 rounded-md text-[11px] font-medium border border-border hover:bg-muted transition-colors whitespace-nowrap"
                >
                  Auto
                </button>
              </div>
            </Field>
            <Field label="Narratore">
              <select
                value={local.narratorId ?? ""}
                onChange={(e) =>
                  persist({ narratorId: e.target.value || null })
                }
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
              >
                <option value="">—</option>
                {narrators.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                    {n.kind === "backbone" ? " (principale)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Focus tematico">
              <Input
                value={local.themeFocus ?? ""}
                onChange={(e) =>
                  persist({ themeFocus: e.target.value || null })
                }
                className="h-9"
                placeholder="Es. visione generale"
              />
            </Field>
          </div>

          <Field
            label="POI in ordine di visita"
            hint="Riordina con le frecce, rimuovi con la X, aggiungi dai POI disponibili"
          >
            <div className="space-y-1">
              {local.poiOrderJson.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Nessun POI aggiunto
                </p>
              )}
              {local.poiOrderJson.map((pid, idx) => {
                const poi = poiById.get(pid);
                const isCore = local.corePoiIds.includes(pid);
                return (
                  <div
                    key={pid}
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-2",
                      isCore
                        ? "border-brand/40 bg-brand/5"
                        : "border-border/60 bg-card",
                    )}
                  >
                    <span className="text-[10px] tabular-nums text-muted-foreground w-5 text-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="flex-1 truncate text-sm">
                      {poi?.name ?? `[POI ${pid}]`}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCore(pid)}
                      title={
                        isCore
                          ? "Essenziale — sempre incluso anche se il tempo è breve"
                          : "Segna come essenziale"
                      }
                      className={cn(
                        "h-6 w-6 rounded-full inline-flex items-center justify-center transition-colors",
                        isCore
                          ? "text-brand bg-brand/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                    >
                      <Star
                        className={cn("h-3 w-3", isCore ? "fill-brand" : "")}
                        strokeWidth={1.8}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePoi(idx, -1)}
                      disabled={idx === 0}
                      className="h-6 w-6 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Su"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => movePoi(idx, 1)}
                      disabled={idx === local.poiOrderJson.length - 1}
                      className="h-6 w-6 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Giù"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removePoi(pid)}
                      className="h-6 w-6 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Rimuovi"
                    >
                      <X className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </div>
                );
              })}
              {poisNotInOrder.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-muted-foreground self-center">
                    Aggiungi:
                  </span>
                  {poisNotInOrder.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPoi(p.id)}
                      className="h-7 px-3 rounded-full text-[11px] font-medium border border-dashed border-border hover:bg-muted transition-colors"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          {/* Capitoli */}
          <div className="pt-3 border-t border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Capitoli narrativi
              </p>
              <div className="flex items-center gap-1">
                {CHAPTER_FUNCTIONS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => addChapter(f.value)}
                    className="h-6 px-2 rounded-full text-[10px] font-medium border border-border hover:bg-muted transition-colors"
                  >
                    + {f.label}
                  </button>
                ))}
              </div>
            </div>
            {local.chaptersJson.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Nessun capitolo. Aggiungi Apertura / Sviluppo / Climax /
                Chiusura.
              </p>
            ) : (
              <div className="space-y-2">
                {local.chaptersJson.map((ch) => (
                  <div
                    key={ch.id}
                    className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={ch.function}
                        onChange={(e) =>
                          updateChapter(ch.id, {
                            function: e.target.value as PathChapter["function"],
                          })
                        }
                        className="h-7 rounded-md border border-border bg-card px-2 text-[11px]"
                      >
                        {CHAPTER_FUNCTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={ch.name}
                        onChange={(e) =>
                          updateChapter(ch.id, { name: e.target.value })
                        }
                        className="h-7 text-sm flex-1"
                        placeholder="Nome capitolo"
                      />
                      <button
                        type="button"
                        onClick={() => removeChapter(ch.id)}
                        className="h-6 w-6 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" strokeWidth={2} />
                      </button>
                    </div>
                    <Input
                      value={ch.description}
                      onChange={(e) =>
                        updateChapter(ch.id, { description: e.target.value })
                      }
                      className="h-7 text-xs"
                      placeholder="Cosa prepara/porta/rivela questo capitolo"
                    />
                    {local.poiOrderJson.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {local.poiOrderJson.map((pid) => {
                          const poi = poiById.get(pid);
                          const selected = ch.poiIds.includes(pid);
                          return (
                            <button
                              key={pid}
                              type="button"
                              onClick={() => togglePoiInChapter(ch.id, pid)}
                              className={cn(
                                "h-6 px-2 rounded-full text-[10px] font-medium border transition-colors",
                                selected
                                  ? "bg-foreground text-background border-foreground"
                                  : "border-border text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {poi?.name ?? pid}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/* ─────────── Narrator card ─────────── */

function NarratorCard({
  narrator,
  availableDrivers,
  availablePois,
  voices,
  hasOpenAiKey,
  onUpdate,
  onRemove,
  onGeneratePortrait,
}: {
  narrator: Narrator;
  availableDrivers: { id: string; name: string }[];
  availablePois: { id: string; name: string }[];
  voices: ElevenLabsVoice[];
  hasOpenAiKey: boolean;
  onUpdate: (patch: Partial<Narrator>) => void;
  onRemove: () => void;
  onGeneratePortrait: () => Promise<void>;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [local, setLocal] = useState(narrator);
  const [savedFlash, setSavedFlash] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [generatingPortrait, setGeneratingPortrait] = useState(false);

  useEffect(() => setLocal(narrator), [narrator]);

  const persist = (patch: Partial<Narrator>) => {
    setLocal((l) => ({ ...l, ...patch }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await onUpdate(patch);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 800);
    }, 400);
  };

  const contract = (local.characterContractJson ?? {}) as Record<
    string,
    unknown
  >;
  const setContract = (patch: Record<string, unknown>) =>
    persist({ characterContractJson: { ...contract, ...patch } });

  const togglePreferredDriver = (driverId: string) => {
    const current = local.preferredDrivers ?? [];
    const next = current.includes(driverId)
      ? current.filter((d) => d !== driverId)
      : [...current, driverId];
    persist({ preferredDrivers: next });
  };

  const togglePresencePoi = (poiId: string) => {
    const current = Array.isArray(contract.territoryOfPresence)
      ? (contract.territoryOfPresence as string[])
      : [];
    const next = current.includes(poiId)
      ? current.filter((p) => p !== poiId)
      : [...current, poiId];
    setContract({ territoryOfPresence: next });
  };

  const isCharacter = local.kind === "character";
  const selectedDrivers = availableDrivers.filter((d) =>
    (local.preferredDrivers ?? []).includes(d.id),
  );

  return (
    <article className="rounded-xl border border-border bg-card overflow-hidden">
      <header
        className={cn(
          "px-4 py-3 flex items-start justify-between gap-3",
          expanded ? "border-b border-border/60" : "",
          isCharacter ? "bg-muted/30" : "bg-brand/5",
        )}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Portrait */}
          <div
            className={cn(
              "h-16 w-16 rounded-full overflow-hidden shrink-0 relative",
              local.portraitUrl
                ? ""
                : "bg-muted flex items-center justify-center border border-border",
            )}
          >
            {local.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={local.portraitUrl}
                alt={local.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-heading italic text-muted-foreground">
                {(local.name?.[0] ?? "?").toUpperCase()}
              </span>
            )}
            {hasOpenAiKey && (
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  setGeneratingPortrait(true);
                  try {
                    await onGeneratePortrait();
                  } finally {
                    setGeneratingPortrait(false);
                  }
                }}
                disabled={generatingPortrait}
                title={
                  local.portraitUrl ? "Rigenera ritratto" : "Genera ritratto AI"
                }
                className="absolute inset-0 opacity-0 hover:opacity-100 bg-black/60 text-white text-[10px] font-medium rounded-full flex items-center justify-center transition-opacity"
              >
                {generatingPortrait ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground">
                {local.kind === "backbone" ? "Voce principale" : "Personaggio"}
              </span>
              <span
                className={cn(
                  "font-heading text-lg italic leading-tight truncate",
                )}
              >
                {local.name || "Senza nome"}
              </span>
              {savedFlash && (
                <Check
                  className="h-3.5 w-3.5 text-emerald-600 shrink-0"
                  strokeWidth={2}
                />
              )}
            </div>
            {local.characterBio && (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {local.characterBio}
              </p>
            )}
            <div className="mt-2 flex items-center flex-wrap gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-muted">
                Stile: {local.voiceStyle}
              </span>
              {local.voiceId &&
                (() => {
                  const v = voices.find((x) => x.voice_id === local.voiceId);
                  return v ? (
                    <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-muted">
                      Voce: {v.name.split(" - ")[0]}
                    </span>
                  ) : null;
                })()}
              {selectedDrivers.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  ·
                  {selectedDrivers.slice(0, 3).map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex h-5 px-2 rounded-full bg-foreground text-background text-[10px] font-medium items-center"
                    >
                      {d.name}
                    </span>
                  ))}
                  {selectedDrivers.length > 3 && (
                    <span className="text-muted-foreground">
                      +{selectedDrivers.length - 3}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors"
            title={expanded ? "Chiudi" : "Modifica"}
          >
            {expanded ? "Chiudi" : "Modifica"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="h-7 w-7 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Elimina narratore"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {expanded && (
        <div className="p-4 space-y-4">
          <Field label="Nome">
            <Input
              value={local.name}
              onChange={(e) => persist({ name: e.target.value })}
              className="h-9"
              placeholder="Nome narratore"
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Stile voce">
              <select
                value={local.voiceStyle}
                onChange={(e) => persist({ voiceStyle: e.target.value })}
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
              >
                {VOICE_STYLES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Lingua">
              <Input
                value={local.language}
                onChange={(e) => persist({ language: e.target.value })}
                className="h-9"
                placeholder="it"
              />
            </Field>
          </div>

          {/* Voce TTS — ElevenLabs */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Voce parlata
            </p>
            {voices.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Configura <code>ELEVENLABS_API_KEY</code> nell'.env per vedere
                le voci disponibili.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                <div>
                  <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Voce ElevenLabs
                  </Label>
                  <select
                    value={local.voiceId ?? ""}
                    onChange={(e) =>
                      persist({
                        voiceId: e.target.value || null,
                        voiceModel: e.target.value ? "elevenlabs" : null,
                      })
                    }
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                  >
                    <option value="">—</option>
                    {voices.map((v) => (
                      <option key={v.voice_id} value={v.voice_id}>
                        {v.name}
                        {v.labels?.gender ? ` · ${v.labels.gender}` : ""}
                        {v.labels?.age ? ` · ${v.labels.age}` : ""}
                        {v.labels?.accent ? ` · ${v.labels.accent}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {local.voiceId &&
                  voices.find((v) => v.voice_id === local.voiceId)
                    ?.preview_url && (
                    <audio
                      controls
                      src={
                        voices.find((v) => v.voice_id === local.voiceId)
                          ?.preview_url
                      }
                      className="w-full h-9"
                    />
                  )}
              </div>
            )}
          </div>

          <Field
            label="Bio narrativa"
            hint="1-3 frasi: chi è, come parla, da dove guarda. Guida l'AI nella generazione schede."
          >
            <textarea
              value={local.characterBio ?? ""}
              onChange={(e) => persist({ characterBio: e.target.value })}
              rows={3}
              placeholder="Es. Vecchio custode della Rocca, racconta come se rivelasse segreti. Parla lentamente, guarda ogni dettaglio come se lo avesse vissuto."
              className="w-full rounded-md border border-border bg-card p-3 text-sm leading-relaxed resize-y"
            />
          </Field>

          {availableDrivers.length > 0 && (
            <Field
              label="Driver preferiti"
              hint="Su quali driver questo narratore esalta. Guida l'assegnazione schede."
            >
              <div className="flex flex-wrap gap-1.5">
                {availableDrivers.map((d) => {
                  const selected = local.preferredDrivers?.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => togglePreferredDriver(d.id)}
                      className={cn(
                        "h-7 px-3 rounded-full text-[11px] font-medium border transition-colors",
                        selected
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {d.name}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          {isCharacter && (
            <>
              <div className="pt-3 border-t border-border/60">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Users className="h-3 w-3" strokeWidth={1.8} />
                  Scheda personaggio
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field
                  label="Chi è"
                  hint="Descrizione + tipo (reale/ruolo/composito)"
                >
                  <Input
                    value={(contract.identity as string) ?? ""}
                    onChange={(e) => setContract({ identity: e.target.value })}
                    className="h-9"
                    placeholder="Es. Marco, ruolo custode (storicamente fondato)"
                  />
                </Field>
                <Field label="Funzione">
                  <select
                    value={(contract.function as string) ?? ""}
                    onChange={(e) => setContract({ function: e.target.value })}
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                  >
                    <option value="">—</option>
                    {CHARACTER_FUNCTIONS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field
                label="Relazione col luogo"
                hint="Che rapporto ha col sito"
              >
                <Input
                  value={(contract.relationshipToPlace as string) ?? ""}
                  onChange={(e) =>
                    setContract({ relationshipToPlace: e.target.value })
                  }
                  className="h-9"
                  placeholder="Es. Vive qui da 40 anni, ha aperto il forte ai visitatori"
                />
              </Field>
              <Field
                label="Territorio di competenza"
                hint="Su cosa parla bene (domini/driver)"
              >
                <Input
                  value={(contract.territoryOfCompetence as string) ?? ""}
                  onChange={(e) =>
                    setContract({ territoryOfCompetence: e.target.value })
                  }
                  className="h-9"
                  placeholder="Es. storia militare, vita quotidiana nel forte"
                />
              </Field>
              {availablePois.length > 0 && (
                <Field
                  label="Territorio di presenza"
                  hint="Dove entra davvero nella visita"
                >
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {availablePois.map((p) => {
                      const presence = Array.isArray(
                        contract.territoryOfPresence,
                      )
                        ? (contract.territoryOfPresence as string[])
                        : [];
                      const selected = presence.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => togglePresencePoi(p.id)}
                          className={cn(
                            "h-7 px-3 rounded-full text-[11px] font-medium border transition-colors",
                            selected
                              ? "bg-foreground text-background border-foreground"
                              : "border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Target">
                  <select
                    value={(contract.target as string) ?? ""}
                    onChange={(e) => setContract({ target: e.target.value })}
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                  >
                    <option value="">—</option>
                    {CHARACTER_TARGETS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tono e registro">
                  <Input
                    value={(contract.toneAndRegister as string) ?? ""}
                    onChange={(e) =>
                      setContract({ toneAndRegister: e.target.value })
                    }
                    className="h-9"
                    placeholder="Es. colloquiale, misurato, con pause"
                  />
                </Field>
              </div>
              <Field
                label="Limiti fattuali"
                hint="Cosa non sa o non deve dire con certezza"
              >
                <textarea
                  value={(contract.factualLimits as string) ?? ""}
                  onChange={(e) =>
                    setContract({ factualLimits: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-md border border-border bg-card p-3 text-sm leading-relaxed"
                  placeholder="Es. non dà date precise se non attestate, non si avventura in epoche posteriori al suo ruolo"
                />
              </Field>
              <Field
                label="Cose da evitare"
                hint="Cliché, forzature, banalizzazioni"
              >
                <textarea
                  value={(contract.thingsToAvoid as string) ?? ""}
                  onChange={(e) =>
                    setContract({ thingsToAvoid: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-md border border-border bg-card p-3 text-sm leading-relaxed"
                  placeholder="Es. nostalgia scontata, superlativi, tono teatrale"
                />
              </Field>
            </>
          )}
        </div>
      )}
    </article>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </Label>
      {hint && (
        <p className="text-[11px] text-muted-foreground -mt-0.5">{hint}</p>
      )}
      <div>{children}</div>
    </div>
  );
}
