"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Loader2,
  AlertCircle,
  Trash2,
  Plus,
  RefreshCw,
  ChevronDown,
  Users,
  Compass,
  Layers,
  Settings2,
  Baby,
  ListOrdered,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  loadProject,
  loadBrief,
  loadKB,
  loadMap,
  loadDriversPersonas,
  saveDriversPersonas,
  saveProgress,
  emptyDriversPersonas,
  newSourceId,
  type ProjectDriversPersonas,
  type Driver,
  type Persona,
  type DriverPersonaWeight,
  type EditorialLens,
  type NarrativeContinuityRule,
  type ContinuityRuleType,
  type PersonaPayoff,
  type PersonaPreferredDuration,
  type ExperienceMode,
  type ProjectBrief,
  type ProjectKB,
  type ProjectMap,
  type StoredProject,
} from "@/lib/project-store";
import { loadApiKeys } from "@/lib/api-keys";

const PAYOFF_OPTIONS: { value: PersonaPayoff; label: string; hint: string }[] =
  [
    {
      value: "meraviglia",
      label: "Meraviglia",
      hint: "Stupore, scoperta visiva",
    },
    { value: "conoscenza", label: "Conoscenza", hint: "Capire, approfondire" },
    { value: "emozione", label: "Emozione", hint: "Essere toccato, coinvolto" },
    { value: "scoperta", label: "Scoperta", hint: "Trovare cose non note" },
  ];

const DURATION_OPTIONS: {
  value: PersonaPreferredDuration;
  label: string;
  hint: string;
}[] = [
  { value: "breve", label: "Breve", hint: "~30 min" },
  { value: "media", label: "Media", hint: "~1 ora" },
  { value: "lunga", label: "Lunga", hint: "2h+" },
];

const EXPERIENCE_MODES: { value: ExperienceMode; label: string }[] = [
  { value: "contemplativo", label: "Contemplativo" },
  { value: "dinamico", label: "Dinamico" },
  { value: "emotivo", label: "Emotivo" },
  { value: "analitico", label: "Analitico" },
  { value: "immersivo", label: "Immersivo" },
  { value: "orientamento", label: "Orientamento" },
];

const CONTINUITY_TYPE_OPTIONS: {
  value: ContinuityRuleType;
  label: string;
  hint: string;
}[] = [
  {
    value: "compatibility",
    label: "Compatibilità",
    hint: "Cosa si mescola bene",
  },
  {
    value: "anti-collage",
    label: "Anti-collage",
    hint: "Combinazioni da evitare",
  },
  { value: "dominance", label: "Dominanza", hint: "Chi prevale nei blend" },
];

export default function DriverStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  const [project, setProject] = useState<StoredProject | null>(null);
  const [brief, setBrief] = useState<ProjectBrief | undefined>(undefined);
  const [kb, setKb] = useState<ProjectKB>({ facts: [] });
  const [map, setMap] = useState<ProjectMap | undefined>(undefined);
  const [data, setData] = useState<ProjectDriversPersonas>(
    emptyDriversPersonas(),
  );
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [proposing, setProposing] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const autoProposeAttemptedRef = useRef(false);

  const keys = typeof window !== "undefined" ? loadApiKeys() : null;
  const activeProvider: "kimi" | "openai" | null = keys?.llm.openai
    ? "openai"
    : keys?.llm.kimi
      ? "kimi"
      : null;
  const hasLlmKey = activeProvider !== null;

  useEffect(() => {
    saveProgress(projectId, { currentStep: "luogo" }); // temporaneo finché progress type supporta "driver"
    let alive = true;
    (async () => {
      const p = loadProject(projectId) ?? null;
      const [b, k, m, d] = await Promise.all([
        loadBrief(projectId),
        loadKB(projectId),
        loadMap(projectId),
        loadDriversPersonas(projectId),
      ]);
      if (!alive) return;
      setProject(p);
      setBrief(b);
      setKb(k);
      setMap(m);
      setData(d ?? emptyDriversPersonas());
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [projectId]);

  const persist = (next: ProjectDriversPersonas) => {
    setData(next);
    saveDriversPersonas(projectId, next).then(() => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      setSaved(true);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
      window.dispatchEvent(new Event("toolia:drivers-updated"));
    });
  };

  const approvedFacts = useMemo(
    () => kb.facts.filter((f) => f.approved),
    [kb.facts],
  );

  const canPropose =
    hasLlmKey &&
    !!brief?.obiettivo.trim() &&
    approvedFacts.length >= 5 &&
    (map?.pois.length ?? 0) >= 1;

  const requestProposal = async () => {
    if (!canPropose || !keys || !activeProvider) return;
    setProposing(true);
    setProposalError(null);
    try {
      const res = await fetch("/api/ai/propose-drivers-personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: keys.llm[activeProvider],
          provider: activeProvider,
          projectName: project?.name ?? "Progetto",
          type: project?.type,
          city: project?.city,
          brief: brief
            ? {
                obiettivo: brief.obiettivo,
                obiettivoCliente: brief.obiettivoCliente,
                promessaNarrativa: brief.promessaNarrativa,
                target: brief.target,
                tipoEsperienza: brief.tipoEsperienza,
                tono: brief.tono,
                mustTell: brief.mustTell,
                niceToTell: brief.niceToTell,
                avoid: brief.avoid,
                familyModeEnabled: brief.familyMode.enabled,
              }
            : undefined,
          facts: approvedFacts.slice(0, 150).map((f) => ({
            content: f.content,
            category: f.category,
            importance: f.importance,
            reliability: f.reliability,
          })),
          pois: (map?.pois ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            zoneId: p.zoneId,
            type: p.type,
          })),
          zones: (map?.zones ?? []).map((z) => ({
            id: z.id,
            name: z.name,
            narrativePromise: z.narrativePromise,
          })),
        }),
      });
      const raw = await res.json();
      if (!res.ok) {
        setProposalError(raw.message ?? "Errore proposta.");
        return;
      }
      applyProposal(raw);
    } catch {
      setProposalError("Errore di rete.");
    } finally {
      setProposing(false);
    }
  };

  const applyProposal = (raw: Record<string, unknown>) => {
    const next = emptyDriversPersonas();

    const rawDrivers = Array.isArray(raw.drivers) ? raw.drivers : [];
    const drivers: Driver[] = rawDrivers.map(
      (d: unknown, i: number): Driver => {
        const o = (d ?? {}) as Partial<Driver> & {
          enabledContentTypes?: unknown;
        };
        return {
          id: newSourceId("drv"),
          name: typeof o.name === "string" ? o.name : `Driver ${i + 1}`,
          domain: typeof o.domain === "string" ? o.domain : "",
          description: typeof o.description === "string" ? o.description : "",
          narrativeValue:
            typeof o.narrativeValue === "string" ? o.narrativeValue : "",
          enabledContentTypes: Array.isArray(o.enabledContentTypes)
            ? o.enabledContentTypes.filter(
                (x): x is string => typeof x === "string",
              )
            : [],
          order: i,
        };
      },
    );
    next.drivers = drivers;

    const rawPersonas = Array.isArray(raw.personas) ? raw.personas : [];
    const personas: Persona[] = rawPersonas.map((p: unknown, i: number) => {
      const o = (p ?? {}) as Partial<Persona> & {
        suggestedDriverIndexes?: unknown;
      };
      const sIdx = Array.isArray(o.suggestedDriverIndexes)
        ? (o.suggestedDriverIndexes as unknown[]).filter(
            (n): n is number => typeof n === "number",
          )
        : [];
      return {
        id: newSourceId("per"),
        name: typeof o.name === "string" ? o.name : `Persona ${i + 1}`,
        motivation: typeof o.motivation === "string" ? o.motivation : "",
        payoff: (PAYOFF_OPTIONS.find((x) => x.value === o.payoff)?.value ??
          "meraviglia") as PersonaPayoff,
        preferredDuration: (DURATION_OPTIONS.find(
          (x) => x.value === o.preferredDuration,
        )?.value ?? "media") as PersonaPreferredDuration,
        preferredExperience: Array.isArray(o.preferredExperience)
          ? (o.preferredExperience as unknown[]).filter(
              (e): e is ExperienceMode =>
                EXPERIENCE_MODES.some((m) => m.value === e),
            )
          : [],
        validityNotes:
          typeof o.validityNotes === "string" ? o.validityNotes : "",
        suggestedDriverIds: sIdx
          .map((n) => drivers[n]?.id)
          .filter((x): x is string => !!x),
        order: i,
      };
    });
    next.personas = personas;

    const rawMatrix = Array.isArray(raw.matrix) ? raw.matrix : [];
    const matrix: DriverPersonaWeight[] = rawMatrix
      .map((m: unknown): DriverPersonaWeight | null => {
        const o = (m ?? {}) as {
          driverIndex?: number;
          personaIndex?: number;
          weight?: number;
        };
        if (
          typeof o.driverIndex !== "number" ||
          typeof o.personaIndex !== "number" ||
          typeof o.weight !== "number"
        )
          return null;
        const dId = drivers[o.driverIndex]?.id;
        const pId = personas[o.personaIndex]?.id;
        if (!dId || !pId) return null;
        return {
          driverId: dId,
          personaId: pId,
          weight: Math.max(0, Math.min(10, Math.round(o.weight))),
        };
      })
      .filter((x): x is DriverPersonaWeight => x !== null);
    next.matrix = matrix;

    const rawLenses = Array.isArray(raw.lenses) ? raw.lenses : [];
    const lenses: EditorialLens[] = rawLenses
      .map((l: unknown): EditorialLens | null => {
        const o = (l ?? {}) as {
          name?: string;
          personaIndex?: number;
          primaryDriverIndex?: number;
          secondaryDriverIndexes?: unknown;
          description?: string;
        };
        const pId = personas[o.personaIndex ?? -1]?.id;
        const dId = drivers[o.primaryDriverIndex ?? -1]?.id;
        if (!pId || !dId) return null;
        const sIdx = Array.isArray(o.secondaryDriverIndexes)
          ? (o.secondaryDriverIndexes as unknown[]).filter(
              (n): n is number => typeof n === "number",
            )
          : [];
        return {
          id: newSourceId("lens"),
          name: typeof o.name === "string" ? o.name : "Lente senza nome",
          personaId: pId,
          primaryDriverId: dId,
          secondaryDriverIds: sIdx
            .map((n) => drivers[n]?.id)
            .filter((x): x is string => !!x),
          description: typeof o.description === "string" ? o.description : "",
        };
      })
      .filter((x): x is EditorialLens => x !== null);
    next.lenses = lenses;

    const rawRules = Array.isArray(raw.continuityRules)
      ? raw.continuityRules
      : [];
    next.continuityRules = rawRules
      .map((r: unknown): NarrativeContinuityRule | null => {
        const o = (r ?? {}) as { type?: string; rule?: string };
        if (typeof o.rule !== "string" || !o.rule.trim()) return null;
        const type: ContinuityRuleType =
          CONTINUITY_TYPE_OPTIONS.find((t) => t.value === o.type)?.value ??
          "compatibility";
        return { id: newSourceId("rule"), type, rule: o.rule.trim() };
      })
      .filter((x): x is NarrativeContinuityRule => x !== null);

    const rd = (raw.dominanceRules ?? {}) as Partial<
      ProjectDriversPersonas["dominanceRules"]
    >;
    next.dominanceRules = {
      maxSecondaryDrivers:
        typeof rd.maxSecondaryDrivers === "number"
          ? Math.max(1, Math.min(5, Math.round(rd.maxSecondaryDrivers)))
          : 2,
      minDominanceScore:
        typeof rd.minDominanceScore === "number"
          ? clamp01(rd.minDominanceScore)
          : 0.5,
      blendThreshold:
        typeof rd.blendThreshold === "number"
          ? clamp01(rd.blendThreshold)
          : 0.7,
    };

    const rim = (raw.inferenceModel ?? {}) as Partial<
      ProjectDriversPersonas["inferenceModel"]
    >;
    next.inferenceModel = {
      passioneWeight: clamp01(rim.passioneWeight ?? 0.3),
      modalitaWeight: clamp01(rim.modalitaWeight ?? 0.2),
      durataWeight: clamp01(rim.durataWeight ?? 0.15),
      contestoWeight: clamp01(rim.contestoWeight ?? 0.1),
      gruppoWeight: clamp01(rim.gruppoWeight ?? 0.15),
      obiettivoWeight: clamp01(rim.obiettivoWeight ?? 0.1),
      dominantThreshold: clamp01(rim.dominantThreshold ?? 0.5),
    };

    const rft = (raw.familyTriggerRules ?? {}) as Partial<
      ProjectDriversPersonas["familyTriggerRules"]
    >;
    next.familyTriggerRules = {
      enabled: !!rft.enabled,
      triggerSignals: Array.isArray(rft.triggerSignals)
        ? (rft.triggerSignals as unknown[]).filter(
            (s): s is string => typeof s === "string",
          )
        : [],
      triggerDescription:
        typeof rft.triggerDescription === "string"
          ? rft.triggerDescription
          : "",
      recommendedPois: [],
    };

    const rvs = (raw.visitorSignalModel ?? {}) as Partial<
      ProjectDriversPersonas["visitorSignalModel"]
    >;
    next.visitorSignalModel = {
      passioni: arrOfStrings(rvs.passioni),
      modalitaFruizione: arrOfStrings(rvs.modalitaFruizione),
      durataOptions: arrOfStrings(rvs.durataOptions),
      contestoOptions: arrOfStrings(rvs.contestoOptions),
      gruppoOptions: arrOfStrings(rvs.gruppoOptions),
      obiettiviOptions: arrOfStrings(rvs.obiettiviOptions),
    };

    const rwi = (raw.wizardInteractionRules ?? {}) as Partial<
      ProjectDriversPersonas["wizardInteractionRules"]
    >;
    next.wizardInteractionRules = {
      minSelectionsRequired:
        typeof rwi.minSelectionsRequired === "number"
          ? Math.max(1, Math.round(rwi.minSelectionsRequired))
          : 2,
      maxPointsTotal:
        typeof rwi.maxPointsTotal === "number"
          ? Math.max(1, Math.round(rwi.maxPointsTotal))
          : 10,
      maxPointsPerOption:
        typeof rwi.maxPointsPerOption === "number"
          ? Math.max(1, Math.round(rwi.maxPointsPerOption))
          : 5,
      forceRanking: rwi.forceRanking !== false,
    };

    next.generatedAt = new Date().toISOString();
    persist(next);
  };

  // Auto-propose al primo ingresso se vuoto
  useEffect(() => {
    if (!loaded) return;
    if (autoProposeAttemptedRef.current) return;
    if (data.drivers.length > 0 || data.personas.length > 0) return;
    if (!canPropose) return;
    if (proposing) return;
    autoProposeAttemptedRef.current = true;
    void requestProposal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loaded,
    data.drivers.length,
    data.personas.length,
    canPropose,
    proposing,
  ]);

  if (!loaded) return <div className="min-h-screen" />;

  const hasContent = data.drivers.length > 0 || data.personas.length > 0;
  const stepReady = data.drivers.length >= 1 && data.personas.length >= 1;

  /* ========================== CRUD helpers ========================== */
  const addDriver = () => {
    const d: Driver = {
      id: newSourceId("drv"),
      name: "Nuovo driver",
      domain: "",
      description: "",
      narrativeValue: "",
      enabledContentTypes: [],
      order: data.drivers.length,
    };
    persist({ ...data, drivers: [...data.drivers, d] });
  };

  const updateDriver = (id: string, patch: Partial<Driver>) =>
    persist({
      ...data,
      drivers: data.drivers.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    });

  const removeDriver = (id: string) =>
    persist({
      ...data,
      drivers: data.drivers.filter((d) => d.id !== id),
      matrix: data.matrix.filter((m) => m.driverId !== id),
      lenses: data.lenses
        .filter((l) => l.primaryDriverId !== id)
        .map((l) => ({
          ...l,
          secondaryDriverIds: l.secondaryDriverIds.filter((x) => x !== id),
        })),
      personas: data.personas.map((p) => ({
        ...p,
        suggestedDriverIds: p.suggestedDriverIds.filter((x) => x !== id),
      })),
    });

  const addPersona = () => {
    const p: Persona = {
      id: newSourceId("per"),
      name: "Nuova persona",
      motivation: "",
      payoff: "meraviglia",
      preferredDuration: "media",
      preferredExperience: [],
      validityNotes: "",
      suggestedDriverIds: [],
      order: data.personas.length,
    };
    persist({ ...data, personas: [...data.personas, p] });
  };

  const updatePersona = (id: string, patch: Partial<Persona>) =>
    persist({
      ...data,
      personas: data.personas.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    });

  const removePersona = (id: string) =>
    persist({
      ...data,
      personas: data.personas.filter((p) => p.id !== id),
      matrix: data.matrix.filter((m) => m.personaId !== id),
      lenses: data.lenses.filter((l) => l.personaId !== id),
    });

  const setMatrix = (driverId: string, personaId: string, weight: number) => {
    const existing = data.matrix.find(
      (m) => m.driverId === driverId && m.personaId === personaId,
    );
    const next = existing
      ? data.matrix.map((m) => (m === existing ? { ...m, weight } : m))
      : [...data.matrix, { driverId, personaId, weight }];
    persist({ ...data, matrix: next });
  };

  const addLens = () => {
    const p = data.personas[0];
    const d = data.drivers[0];
    if (!p || !d) return;
    const l: EditorialLens = {
      id: newSourceId("lens"),
      name: `${d.name} per ${p.name}`,
      personaId: p.id,
      primaryDriverId: d.id,
      secondaryDriverIds: [],
      description: "",
    };
    persist({ ...data, lenses: [...data.lenses, l] });
  };

  const updateLens = (id: string, patch: Partial<EditorialLens>) =>
    persist({
      ...data,
      lenses: data.lenses.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });

  const removeLens = (id: string) =>
    persist({ ...data, lenses: data.lenses.filter((l) => l.id !== id) });

  const addRule = () => {
    const r: NarrativeContinuityRule = {
      id: newSourceId("rule"),
      type: "compatibility",
      rule: "",
    };
    persist({ ...data, continuityRules: [...data.continuityRules, r] });
  };

  const updateRule = (id: string, patch: Partial<NarrativeContinuityRule>) =>
    persist({
      ...data,
      continuityRules: data.continuityRules.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    });

  const removeRule = (id: string) =>
    persist({
      ...data,
      continuityRules: data.continuityRules.filter((r) => r.id !== id),
    });

  const inferenceSum =
    data.inferenceModel.passioneWeight +
    data.inferenceModel.modalitaWeight +
    data.inferenceModel.durataWeight +
    data.inferenceModel.contestoWeight +
    data.inferenceModel.gruppoWeight +
    data.inferenceModel.obiettivoWeight;

  /* ========================== RENDER ========================== */
  return (
    <div className="min-h-screen flex flex-col">
      <header className="shrink-0 px-6 md:px-10 pt-8 pb-6 border-b border-border/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
              Step 4 · Driver e Personas
            </p>
            <h1 className="font-heading text-3xl md:text-4xl italic leading-tight tracking-tight">
              Per chi raccontiamo, con quali assi
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-xl leading-relaxed">
              Driver narrativi interni, personas plausibili, regole di
              continuità, motore di inferenza del wizard visitatore. Tutto
              dentro a un unico posto — l&apos;AI propone, tu arbitri.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-xs text-brand">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Salvato
              </span>
            )}
            <button
              type="button"
              onClick={requestProposal}
              disabled={!canPropose || proposing}
              className={cn(
                "inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium transition-colors",
                !canPropose || proposing
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : hasContent
                    ? "border border-border text-foreground hover:bg-muted"
                    : "bg-foreground text-background hover:bg-foreground/90",
              )}
            >
              {proposing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                  Genero…
                </>
              ) : hasContent ? (
                <>
                  <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                  Rigenera con AI
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                  Genera con AI
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 md:px-10 py-8 max-w-[1100px] w-full mx-auto space-y-5">
        {proposalError && <ErrorBanner message={proposalError} />}

        {!canPropose && !hasContent && !proposing && (
          <GateCard
            hasLlmKey={hasLlmKey}
            hasBrief={!!brief?.obiettivo.trim()}
            factsCount={approvedFacts.length}
            poisCount={map?.pois.length ?? 0}
            projectId={projectId}
          />
        )}

        {proposing && !hasContent && <SpinnerCard />}

        {hasContent && (
          <>
            <Section
              icon={<Compass className="h-4 w-4" strokeWidth={1.8} />}
              title="Driver narrativi"
              subtitle="Leve profonde che definiscono COME il luogo viene letto. Non sono tag: cambiano il racconto."
              count={data.drivers.length}
              action={
                <button
                  type="button"
                  onClick={addDriver}
                  className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors"
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  Aggiungi
                </button>
              }
              defaultOpen
            >
              <DriverList
                drivers={data.drivers}
                onUpdate={updateDriver}
                onRemove={removeDriver}
              />
            </Section>

            <Section
              icon={<Users className="h-4 w-4" strokeWidth={1.8} />}
              title="Project Personas"
              subtitle="Profili di visitatori plausibili per questo luogo. Interni al motore — non mostrati al visitatore."
              count={data.personas.length}
              action={
                <button
                  type="button"
                  onClick={addPersona}
                  className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors"
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  Aggiungi
                </button>
              }
              defaultOpen
            >
              <PersonaList
                personas={data.personas}
                drivers={data.drivers}
                onUpdate={updatePersona}
                onRemove={removePersona}
              />
            </Section>

            <Section
              icon={<Layers className="h-4 w-4" strokeWidth={1.8} />}
              title="Matrice Driver × Persona"
              subtitle="Peso 0-10 di ogni driver per ogni persona. 0 = irrilevante · 10 = dominante."
              count={`${data.drivers.length}×${data.personas.length}`}
            >
              {data.drivers.length > 0 && data.personas.length > 0 ? (
                <MatrixEditor
                  drivers={data.drivers}
                  personas={data.personas}
                  matrix={data.matrix}
                  onSet={setMatrix}
                />
              ) : (
                <Empty label="Servono driver e personas" />
              )}
            </Section>

            <Section
              icon={<Sparkles className="h-4 w-4" strokeWidth={1.8} />}
              title="Lenti editoriali"
              subtitle="Combinazioni persona + driver che produrranno contenuti distinti. Un sottoinsieme selezionato della matrice."
              count={data.lenses.length}
              action={
                <button
                  type="button"
                  onClick={addLens}
                  disabled={
                    data.personas.length === 0 || data.drivers.length === 0
                  }
                  className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  Aggiungi
                </button>
              }
            >
              <LensList
                lenses={data.lenses}
                drivers={data.drivers}
                personas={data.personas}
                onUpdate={updateLens}
                onRemove={removeLens}
              />
            </Section>

            <Section
              icon={<ListOrdered className="h-4 w-4" strokeWidth={1.8} />}
              title="Regole di continuità narrativa"
              subtitle="Compatibilità, anti-collage, dominanza — come evitare che la personalizzazione rompa il racconto."
              count={data.continuityRules.length}
              action={
                <button
                  type="button"
                  onClick={addRule}
                  className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors"
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  Aggiungi regola
                </button>
              }
            >
              <RuleList
                rules={data.continuityRules}
                onUpdate={updateRule}
                onRemove={removeRule}
              />
            </Section>

            <Section
              icon={<Settings2 className="h-4 w-4" strokeWidth={1.8} />}
              title="Regole di dominanza"
              subtitle="Quante secondarie ammesse, quando un blend è troppo dispersivo."
            >
              <DominanceEditor
                value={data.dominanceRules}
                onChange={(v) => persist({ ...data, dominanceRules: v })}
              />
            </Section>

            <Section
              icon={<Settings2 className="h-4 w-4" strokeWidth={1.8} />}
              title="Modello di inferenza"
              subtitle="Pesi dei segnali del wizard visitatore per calcolare il profilo narrativo. La somma dei 6 pesi dovrebbe tendere a 1."
              highlight={
                inferenceSum > 1.15 || inferenceSum < 0.85 ? "warn" : undefined
              }
            >
              <InferenceEditor
                value={data.inferenceModel}
                onChange={(v) => persist({ ...data, inferenceModel: v })}
                sum={inferenceSum}
              />
            </Section>

            <Section
              icon={<Baby className="h-4 w-4" strokeWidth={1.8} />}
              title="Family mode — regole di attivazione"
              subtitle="Modalità di fruizione per famiglie con bambini. Non è una persona separata."
            >
              <FamilyEditor
                value={data.familyTriggerRules}
                onChange={(v) => persist({ ...data, familyTriggerRules: v })}
              />
            </Section>

            <Section
              icon={<Users className="h-4 w-4" strokeWidth={1.8} />}
              title="Modello segnali visitatore (wizard)"
              subtitle="Le poche informazioni che il wizard raccoglie dal visitatore. Passioni contestuali al luogo + opzioni standard."
            >
              <VisitorSignalEditor
                value={data.visitorSignalModel}
                onChange={(v) => persist({ ...data, visitorSignalModel: v })}
              />
            </Section>

            <Section
              icon={<Settings2 className="h-4 w-4" strokeWidth={1.8} />}
              title="Regole di interazione del wizard"
              subtitle="Vincoli UI per evitare profili piatti: punti, ranking, minimi."
            >
              <WizardRulesEditor
                value={data.wizardInteractionRules}
                onChange={(v) =>
                  persist({ ...data, wizardInteractionRules: v })
                }
              />
            </Section>
          </>
        )}
      </main>

      <footer className="shrink-0 border-t border-border/60 bg-paper">
        <div className="max-w-[1100px] mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <Link
            href={`/progetti/${projectId}/luogo`}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Luogo
          </Link>
          <span
            className={cn(
              "inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm font-medium",
              stepReady
                ? "bg-brand/10 text-brand"
                : "bg-muted text-muted-foreground",
            )}
          >
            {stepReady ? (
              <>
                <Check className="h-4 w-4" strokeWidth={2} />
                {data.drivers.length} driver · {data.personas.length} personas ·{" "}
                {data.lenses.length} lenti
              </>
            ) : (
              "Serve almeno 1 driver e 1 persona"
            )}
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================= */
/* ========================= HELPERS =========================== */
/* ============================================================= */

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function arrOfStrings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4 flex items-start gap-3">
      <AlertCircle
        className="h-4 w-4 text-destructive shrink-0 mt-0.5"
        strokeWidth={1.8}
      />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function GateCard({
  hasLlmKey,
  hasBrief,
  factsCount,
  poisCount,
  projectId,
}: {
  hasLlmKey: boolean;
  hasBrief: boolean;
  factsCount: number;
  poisCount: number;
  projectId: string;
}) {
  const reasons: string[] = [];
  if (!hasLlmKey) reasons.push("chiave LLM in Impostazioni");
  if (!hasBrief) reasons.push("Brief compilato");
  if (factsCount < 5) reasons.push("≥5 fatti KB approvati");
  if (poisCount < 1) reasons.push("≥1 POI nello Step Luogo");
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-4">
      <div className="h-14 w-14 rounded-2xl bg-muted mx-auto flex items-center justify-center">
        <Compass className="h-6 w-6 text-foreground" strokeWidth={1.6} />
      </div>
      <p className="font-heading text-2xl italic">
        Servono i passaggi precedenti
      </p>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        Driver e Personas richiedono: {reasons.join(" · ")}.
      </p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Link
          href={`/progetti/${projectId}/fonti`}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-border text-xs font-medium hover:bg-muted transition-colors"
        >
          Fonti
        </Link>
        <Link
          href={`/progetti/${projectId}/brief`}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-border text-xs font-medium hover:bg-muted transition-colors"
        >
          Brief
        </Link>
        <Link
          href={`/progetti/${projectId}/luogo`}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-border text-xs font-medium hover:bg-muted transition-colors"
        >
          Luogo
        </Link>
      </div>
    </div>
  );
}

function SpinnerCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-4 text-center">
      <div className="h-12 w-12 rounded-2xl bg-brand/10 flex items-center justify-center">
        <Sparkles
          className="h-5 w-5 text-brand animate-pulse"
          strokeWidth={1.8}
        />
      </div>
      <p className="font-heading text-xl italic">
        L&apos;AI sta progettando driver, personas e regole…
      </p>
      <p className="text-sm text-muted-foreground max-w-md">
        Legge brief, fatti KB, POI e zone per costruire il motore editoriale del
        progetto. Può richiedere 15-30 secondi.
      </p>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  count,
  action,
  defaultOpen = false,
  children,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count?: number | string;
  action?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  highlight?: "warn";
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.section
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border bg-card overflow-hidden",
        highlight === "warn" ? "border-amber-300" : "border-border",
      )}
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

function ChipList({
  values,
  onChange,
  placeholder,
  suggestions,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const add = (v: string) => {
    const t = v.trim();
    if (!t) return;
    if (values.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    onChange([...values, t]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li
              key={v}
              className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full border border-border bg-muted/40 text-[11px]"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="h-4 w-4 inline-flex items-center justify-center rounded-full hover:bg-destructive/15 hover:text-destructive"
                aria-label={`Rimuovi ${v}`}
              >
                <X className="h-2.5 w-2.5" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder={placeholder}
          className="h-8 text-xs"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
          Aggiungi
        </button>
      </div>
      {suggestions &&
        suggestions.filter((s) => !values.includes(s)).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {suggestions
              .filter((s) => !values.includes(s))
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => add(s)}
                  className="inline-flex items-center h-6 px-2 rounded-full text-[10px] border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                >
                  + {s}
                </button>
              ))}
          </div>
        )}
    </div>
  );
}

/* ============================================================= */
/* ========================= DRIVER ============================ */
/* ============================================================= */

function DriverList({
  drivers,
  onUpdate,
  onRemove,
}: {
  drivers: Driver[];
  onUpdate: (id: string, patch: Partial<Driver>) => void;
  onRemove: (id: string) => void;
}) {
  if (drivers.length === 0)
    return <Empty label="Nessun driver. Aggiungine uno o rigenera con l'AI." />;
  return (
    <ul className="space-y-3 pt-4">
      {drivers.map((d) => (
        <li
          key={d.id}
          className="rounded-xl border border-border bg-paper/40 p-4 space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <Input
                value={d.name}
                onChange={(e) => onUpdate(d.id, { name: e.target.value })}
                placeholder="Nome del driver"
                className="h-9 text-sm font-medium"
              />
              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2">
                <Input
                  value={d.domain}
                  onChange={(e) => onUpdate(d.id, { domain: e.target.value })}
                  placeholder="Dominio (storia, natura…)"
                  className="h-8 text-xs"
                />
                <textarea
                  value={d.description}
                  onChange={(e) =>
                    onUpdate(d.id, { description: e.target.value })
                  }
                  placeholder="Cosa è questo driver (2-3 frasi)"
                  rows={2}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Valore narrativo (perché interessa il visitatore)
                </Label>
                <textarea
                  value={d.narrativeValue}
                  onChange={(e) =>
                    onUpdate(d.id, { narrativeValue: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Tipi di contenuti abilitati
                </Label>
                <ChipList
                  values={d.enabledContentTypes}
                  onChange={(v) => onUpdate(d.id, { enabledContentTypes: v })}
                  placeholder="es. aneddoto, scheda storica, confronto visivo"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(d.id)}
              className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Rimuovi driver"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================= */
/* ========================= PERSONA =========================== */
/* ============================================================= */

function PersonaList({
  personas,
  drivers,
  onUpdate,
  onRemove,
}: {
  personas: Persona[];
  drivers: Driver[];
  onUpdate: (id: string, patch: Partial<Persona>) => void;
  onRemove: (id: string) => void;
}) {
  if (personas.length === 0)
    return (
      <Empty label="Nessuna persona. Aggiungine una o rigenera con l'AI." />
    );
  return (
    <ul className="space-y-3 pt-4">
      {personas.map((p) => (
        <li
          key={p.id}
          className="rounded-xl border border-border bg-paper/40 p-4 space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-3">
              <Input
                value={p.name}
                onChange={(e) => onUpdate(p.id, { name: e.target.value })}
                placeholder="Nome della persona"
                className="h-9 text-sm font-medium"
              />
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Motivazione di visita
                </Label>
                <textarea
                  value={p.motivation}
                  onChange={(e) =>
                    onUpdate(p.id, { motivation: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Payoff atteso
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {PAYOFF_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => onUpdate(p.id, { payoff: o.value })}
                        title={o.hint}
                        className={cn(
                          "h-7 px-2.5 rounded-full text-[10px] font-medium transition-colors border",
                          p.payoff === o.value
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Durata preferita
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {DURATION_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() =>
                          onUpdate(p.id, { preferredDuration: o.value })
                        }
                        title={o.hint}
                        className={cn(
                          "h-7 px-2.5 rounded-full text-[10px] font-medium transition-colors border",
                          p.preferredDuration === o.value
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {o.label} · {o.hint}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Modalità di esperienza preferita
                </Label>
                <div className="flex flex-wrap gap-1">
                  {EXPERIENCE_MODES.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => {
                        const has = p.preferredExperience.includes(o.value);
                        onUpdate(p.id, {
                          preferredExperience: has
                            ? p.preferredExperience.filter((x) => x !== o.value)
                            : [...p.preferredExperience, o.value],
                        });
                      }}
                      className={cn(
                        "h-7 px-2.5 rounded-full text-[10px] font-medium transition-colors border",
                        p.preferredExperience.includes(o.value)
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Driver suggeriti (dominanti per questa persona)
                </Label>
                <div className="flex flex-wrap gap-1">
                  {drivers.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic">
                      Aggiungi prima i driver.
                    </p>
                  ) : (
                    drivers.map((d) => {
                      const active = p.suggestedDriverIds.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() =>
                            onUpdate(p.id, {
                              suggestedDriverIds: active
                                ? p.suggestedDriverIds.filter((x) => x !== d.id)
                                : [...p.suggestedDriverIds, d.id],
                            })
                          }
                          className={cn(
                            "h-7 px-2.5 rounded-full text-[10px] font-medium transition-colors border",
                            active
                              ? "bg-brand/10 border-brand text-brand"
                              : "border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {d.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Note di validità (perché questa persona è plausibile qui)
                </Label>
                <textarea
                  value={p.validityNotes}
                  onChange={(e) =>
                    onUpdate(p.id, { validityNotes: e.target.value })
                  }
                  rows={2}
                  placeholder="Test: è plausibile per il luogo? Cambia davvero il racconto? Non si sovrappone ad altre?"
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(p.id)}
              className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Rimuovi persona"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================= */
/* ========================== MATRIX =========================== */
/* ============================================================= */

function MatrixEditor({
  drivers,
  personas,
  matrix,
  onSet,
}: {
  drivers: Driver[];
  personas: Persona[];
  matrix: DriverPersonaWeight[];
  onSet: (driverId: string, personaId: string, weight: number) => void;
}) {
  const get = (dId: string, pId: string) =>
    matrix.find((m) => m.driverId === dId && m.personaId === pId)?.weight ?? 0;

  const color = (w: number) => {
    if (w >= 8) return "bg-brand text-white";
    if (w >= 5) return "bg-brand/30 text-foreground";
    if (w >= 2) return "bg-muted text-muted-foreground";
    return "bg-muted/40 text-muted-foreground/60";
  };

  return (
    <div className="pt-4 overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="text-left py-2 pr-3 font-normal text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Driver ↓ · Persona →
            </th>
            {personas.map((p) => (
              <th
                key={p.id}
                className="text-left py-2 px-2 font-medium text-[11px] min-w-[100px] truncate"
                title={p.name}
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => (
            <tr key={d.id} className="border-t border-border/60">
              <td className="py-2 pr-3 text-[11px] font-medium">{d.name}</td>
              {personas.map((p) => {
                const w = get(d.id, p.id);
                return (
                  <td key={p.id} className="py-2 px-2">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={w}
                      onChange={(e) => {
                        const v = Math.max(
                          0,
                          Math.min(10, parseInt(e.target.value, 10) || 0),
                        );
                        onSet(d.id, p.id, v);
                      }}
                      className={cn(
                        "h-8 w-12 rounded-md border border-border text-center text-xs font-medium focus:outline-none focus:ring-1 focus:ring-foreground/30 transition-colors",
                        color(w),
                      )}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================= */
/* ========================== LENSES =========================== */
/* ============================================================= */

function LensList({
  lenses,
  drivers,
  personas,
  onUpdate,
  onRemove,
}: {
  lenses: EditorialLens[];
  drivers: Driver[];
  personas: Persona[];
  onUpdate: (id: string, patch: Partial<EditorialLens>) => void;
  onRemove: (id: string) => void;
}) {
  if (lenses.length === 0)
    return <Empty label="Nessuna lente. Aggiungine o rigenera con l'AI." />;
  return (
    <ul className="space-y-3 pt-4">
      {lenses.map((l) => (
        <li
          key={l.id}
          className="rounded-xl border border-border bg-paper/40 p-4 space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <Input
                value={l.name}
                onChange={(e) => onUpdate(l.id, { name: e.target.value })}
                className="h-9 text-sm font-medium"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center gap-2">
                  <span className="uppercase tracking-[0.14em] text-[10px] text-muted-foreground shrink-0">
                    Persona
                  </span>
                  <select
                    value={l.personaId}
                    onChange={(e) =>
                      onUpdate(l.id, { personaId: e.target.value })
                    }
                    className="flex-1 h-8 rounded-md border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/30"
                  >
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <span className="uppercase tracking-[0.14em] text-[10px] text-muted-foreground shrink-0">
                    Driver primario
                  </span>
                  <select
                    value={l.primaryDriverId}
                    onChange={(e) =>
                      onUpdate(l.id, { primaryDriverId: e.target.value })
                    }
                    className="flex-1 h-8 rounded-md border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/30"
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Driver secondari
                </Label>
                <div className="flex flex-wrap gap-1">
                  {drivers
                    .filter((d) => d.id !== l.primaryDriverId)
                    .map((d) => {
                      const on = l.secondaryDriverIds.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() =>
                            onUpdate(l.id, {
                              secondaryDriverIds: on
                                ? l.secondaryDriverIds.filter((x) => x !== d.id)
                                : [...l.secondaryDriverIds, d.id],
                            })
                          }
                          className={cn(
                            "h-7 px-2.5 rounded-full text-[10px] font-medium transition-colors border",
                            on
                              ? "bg-foreground text-background border-foreground"
                              : "border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {d.name}
                        </button>
                      );
                    })}
                </div>
              </div>
              <textarea
                value={l.description}
                onChange={(e) =>
                  onUpdate(l.id, { description: e.target.value })
                }
                rows={2}
                placeholder="Come si esprime questa lente: registro, scelte, peso"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
              />
            </div>
            <button
              type="button"
              onClick={() => onRemove(l.id)}
              className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Rimuovi lente"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================= */
/* ========================= RULES ============================= */
/* ============================================================= */

function RuleList({
  rules,
  onUpdate,
  onRemove,
}: {
  rules: NarrativeContinuityRule[];
  onUpdate: (id: string, patch: Partial<NarrativeContinuityRule>) => void;
  onRemove: (id: string) => void;
}) {
  if (rules.length === 0) return <Empty label="Nessuna regola." />;
  return (
    <ul className="space-y-2 pt-4">
      {rules.map((r) => (
        <li
          key={r.id}
          className="rounded-xl border border-border bg-paper/40 p-3 flex items-start gap-3"
        >
          <select
            value={r.type}
            onChange={(e) =>
              onUpdate(r.id, {
                type: e.target.value as ContinuityRuleType,
              })
            }
            className="h-8 rounded-md border border-border bg-card px-2 text-xs shrink-0 focus:outline-none focus:ring-1 focus:ring-foreground/30"
          >
            {CONTINUITY_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <textarea
            value={r.rule}
            onChange={(e) => onUpdate(r.id, { rule: e.target.value })}
            rows={2}
            className="flex-1 min-w-0 rounded-md border border-border bg-card px-3 py-1.5 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
          />
          <button
            type="button"
            onClick={() => onRemove(r.id)}
            className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Rimuovi"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================= */
/* ======================= DOMINANCE =========================== */
/* ============================================================= */

function DominanceEditor({
  value,
  onChange,
}: {
  value: ProjectDriversPersonas["dominanceRules"];
  onChange: (v: ProjectDriversPersonas["dominanceRules"]) => void;
}) {
  return (
    <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <SliderField
        label="Max driver secondari"
        hint="1-3 tipicamente"
        value={value.maxSecondaryDrivers}
        min={1}
        max={5}
        step={1}
        onChange={(v) => onChange({ ...value, maxSecondaryDrivers: v })}
      />
      <SliderField
        label="Soglia dominanza"
        hint="Sopra questa soglia una persona/driver diventa dominante (0-1)"
        value={value.minDominanceScore}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => onChange({ ...value, minDominanceScore: v })}
      />
      <SliderField
        label="Soglia blend dispersivo"
        hint="Sopra questa soglia il blend è troppo frammentato (0-1)"
        value={value.blendThreshold}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => onChange({ ...value, blendThreshold: v })}
      />
    </div>
  );
}

/* ============================================================= */
/* ======================= INFERENCE =========================== */
/* ============================================================= */

function InferenceEditor({
  value,
  onChange,
  sum,
}: {
  value: ProjectDriversPersonas["inferenceModel"];
  onChange: (v: ProjectDriversPersonas["inferenceModel"]) => void;
  sum: number;
}) {
  const set = (key: keyof typeof value, v: number) =>
    onChange({ ...value, [key]: v });
  return (
    <div className="pt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SliderField
          label="Peso passioni"
          value={value.passioneWeight}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => set("passioneWeight", v)}
        />
        <SliderField
          label="Peso modalità fruizione"
          value={value.modalitaWeight}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => set("modalitaWeight", v)}
        />
        <SliderField
          label="Peso durata"
          value={value.durataWeight}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => set("durataWeight", v)}
        />
        <SliderField
          label="Peso contesto"
          value={value.contestoWeight}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => set("contestoWeight", v)}
        />
        <SliderField
          label="Peso gruppo"
          value={value.gruppoWeight}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => set("gruppoWeight", v)}
        />
        <SliderField
          label="Peso obiettivo"
          value={value.obiettivoWeight}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => set("obiettivoWeight", v)}
        />
      </div>
      <div className="border-t border-border/60 pt-3 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Somma totale
          </p>
          <p
            className={cn(
              "font-heading text-2xl italic tabular-nums",
              sum > 1.15 || sum < 0.85 ? "text-amber-700" : "text-foreground",
            )}
          >
            {sum.toFixed(2)}
          </p>
        </div>
        <SliderField
          label="Soglia dominante (per profili inferiti)"
          value={value.dominantThreshold}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => set("dominantThreshold", v)}
        />
      </div>
    </div>
  );
}

function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </Label>
        <span className="text-xs tabular-nums text-foreground">
          {step < 1 ? value.toFixed(2) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
      {hint && (
        <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
      )}
    </div>
  );
}

/* ============================================================= */
/* ========================= FAMILY ============================ */
/* ============================================================= */

function FamilyEditor({
  value,
  onChange,
}: {
  value: ProjectDriversPersonas["familyTriggerRules"];
  onChange: (v: ProjectDriversPersonas["familyTriggerRules"]) => void;
}) {
  return (
    <div className="pt-4 space-y-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        <span className="text-sm">
          Family mode attivato per questo progetto
        </span>
      </label>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Segnali che attivano il family mode
        </Label>
        <ChipList
          values={value.triggerSignals}
          onChange={(v) => onChange({ ...value, triggerSignals: v })}
          placeholder="es. gruppo:famiglia, eta:bambini, richiesta:gioco"
          suggestions={[
            "gruppo:famiglia",
            "eta:bambini",
            "richiesta:gioco",
            "modalita:esplorativa",
          ]}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Quando e perché attivare family mode
        </Label>
        <textarea
          value={value.triggerDescription}
          onChange={(e) =>
            onChange({ ...value, triggerDescription: e.target.value })
          }
          rows={3}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
        />
      </div>
    </div>
  );
}

/* ============================================================= */
/* ====================== VISITOR SIGNAL ======================= */
/* ============================================================= */

function VisitorSignalEditor({
  value,
  onChange,
}: {
  value: ProjectDriversPersonas["visitorSignalModel"];
  onChange: (v: ProjectDriversPersonas["visitorSignalModel"]) => void;
}) {
  return (
    <div className="pt-4 space-y-5">
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Passioni (contestuali al luogo)
        </Label>
        <ChipList
          values={value.passioni}
          onChange={(v) => onChange({ ...value, passioni: v })}
          placeholder="es. storia militare, architettura, paesaggio"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Modalità di fruizione
        </Label>
        <ChipList
          values={value.modalitaFruizione}
          onChange={(v) => onChange({ ...value, modalitaFruizione: v })}
          placeholder="rapido, profondo, contemplativo…"
          suggestions={[
            "rapido",
            "profondo",
            "essenziale",
            "ricco",
            "contemplativo",
            "dinamico",
            "emotivo",
            "analitico",
          ]}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Opzioni di durata
        </Label>
        <ChipList
          values={value.durataOptions}
          onChange={(v) => onChange({ ...value, durataOptions: v })}
          placeholder="30 minuti, 1 ora, 2+ ore"
          suggestions={["30 minuti", "1 ora", "2 ore o più"]}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Opzioni di contesto
        </Label>
        <ChipList
          values={value.contestoOptions}
          onChange={(v) => onChange({ ...value, contestoOptions: v })}
          placeholder="visita singola, evento, gita scolastica"
          suggestions={[
            "visita singola",
            "evento",
            "gita scolastica",
            "appuntamento",
            "visita guidata",
          ]}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Composizione del gruppo
        </Label>
        <ChipList
          values={value.gruppoOptions}
          onChange={(v) => onChange({ ...value, gruppoOptions: v })}
          placeholder="solo, coppia, famiglia, amici, scolaresca"
          suggestions={["solo", "coppia", "famiglia", "amici", "scolaresca"]}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Obiettivi della visita
        </Label>
        <ChipList
          values={value.obiettiviOptions}
          onChange={(v) => onChange({ ...value, obiettiviOptions: v })}
          placeholder="svago, studio, fotografia"
          suggestions={["svago", "studio", "fotografia", "ricerca", "lavoro"]}
        />
      </div>
    </div>
  );
}

/* ============================================================= */
/* ======================= WIZARD RULES ======================== */
/* ============================================================= */

function WizardRulesEditor({
  value,
  onChange,
}: {
  value: ProjectDriversPersonas["wizardInteractionRules"];
  onChange: (v: ProjectDriversPersonas["wizardInteractionRules"]) => void;
}) {
  return (
    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <SliderField
        label="Scelte minime richieste"
        hint="Il visitatore non può lasciare tutto vuoto"
        value={value.minSelectionsRequired}
        min={1}
        max={6}
        step={1}
        onChange={(v) => onChange({ ...value, minSelectionsRequired: v })}
      />
      <SliderField
        label="Punti totali da distribuire"
        hint="Forza prioritizzazione"
        value={value.maxPointsTotal}
        min={3}
        max={20}
        step={1}
        onChange={(v) => onChange({ ...value, maxPointsTotal: v })}
      />
      <SliderField
        label="Punti max per singola opzione"
        hint="Evita concentrazione totale su una sola voce"
        value={value.maxPointsPerOption}
        min={1}
        max={10}
        step={1}
        onChange={(v) => onChange({ ...value, maxPointsPerOption: v })}
      />
      <label className="flex items-center gap-2 self-end pb-2">
        <input
          type="checkbox"
          checked={value.forceRanking}
          onChange={(e) =>
            onChange({ ...value, forceRanking: e.target.checked })
          }
        />
        <span className="text-sm">Forza il ranking (ordine priorità)</span>
      </label>
    </div>
  );
}
