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
  characterContractJson: Record<string, unknown>;
}

interface ProjectInfo {
  id: string;
  name: string;
  type: string | null;
  city: string | null;
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
  { value: "family", label: "Family" },
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
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [projectId, reloadNarrators]);

  const backboneCount = narrators.filter((n) => n.kind === "backbone").length;
  const characterCount = narrators.filter((n) => n.kind === "character").length;

  const proposeWithAI = async () => {
    if (!hasLlmKey || !keys || !activeProvider || proposing) return;
    setProposing(true);
    setProposeError(null);
    try {
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProposeError(data.message ?? "Errore generazione narratori.");
        return;
      }
      const proposed: Partial<Narrator>[] = data.narrators ?? [];
      for (const n of proposed) {
        if (!n.name || !n.kind) continue;
        await fetch(`/api/projects/${projectId}/narrators`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: n.name,
            kind: n.kind,
            voiceStyle: n.voiceStyle ?? "sobrio-autorevole",
            language: n.language ?? "it",
            characterBio: n.characterBio ?? null,
            preferredDrivers: n.preferredDrivers ?? [],
            characterContractJson: n.characterContractJson ?? {},
          }),
        });
      }
      await reloadNarrators();
    } catch (e) {
      setProposeError(e instanceof Error ? e.message : "Errore di rete.");
    } finally {
      setProposing(false);
    }
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
          subtitle="Un narratore backbone (tiene insieme la visita) + 0..n personaggi contestualizzati con Character Contract."
          count={`${backboneCount} backbone · ${characterCount} character`}
          defaultOpen
          action={
            <div className="flex items-center gap-2">
              {narrators.length === 0 && hasLlmKey && (
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
                  {proposing ? "Generazione..." : "Proponi con AI"}
                </button>
              )}
              <button
                type="button"
                onClick={() => addNarrator("backbone")}
                disabled={backboneCount > 0}
                title={
                  backboneCount > 0
                    ? "Un solo backbone ammesso"
                    : "Aggiungi narratore backbone"
                }
                className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
                Backbone
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
                  onUpdate={(patch) => updateNarrator(n.id, patch)}
                  onRemove={() => removeNarrator(n.id)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section
          icon={<RouteIcon className="h-4 w-4" strokeWidth={1.8} />}
          title="Percorsi"
          subtitle="Itinerari tematici composti dai POI, con ordine, durata e narratore assegnato. (In arrivo nella prossima iterazione.)"
          count={0}
        >
          <Empty label="Sezione Percorsi in arrivo dopo Narratori." />
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
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          Schede e Audio
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
        <div
          className="flex items-center gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {action}
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

/* ─────────── Narrator card ─────────── */

function NarratorCard({
  narrator,
  availableDrivers,
  availablePois,
  onUpdate,
  onRemove,
}: {
  narrator: Narrator;
  availableDrivers: { id: string; name: string }[];
  availablePois: { id: string; name: string }[];
  onUpdate: (patch: Partial<Narrator>) => void;
  onRemove: () => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [local, setLocal] = useState(narrator);
  const [savedFlash, setSavedFlash] = useState(false);

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

  return (
    <article className="rounded-xl border border-border bg-card overflow-hidden">
      <header
        className={cn(
          "px-4 py-3 flex items-center justify-between border-b border-border/60",
          isCharacter ? "bg-muted/30" : "bg-brand/5",
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground shrink-0">
            {local.kind === "backbone" ? "Backbone" : "Personaggio"}
          </span>
          <Input
            value={local.name}
            onChange={(e) => persist({ name: e.target.value })}
            className="h-8 text-sm font-medium border-0 bg-transparent focus-visible:ring-0 px-2"
            placeholder="Nome narratore"
          />
          {savedFlash && (
            <Check
              className="h-3.5 w-3.5 text-emerald-600 shrink-0"
              strokeWidth={2}
            />
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="h-7 w-7 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          title="Elimina narratore"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </header>

      <div className="p-4 space-y-4">
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
                Character Contract
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                label="Identity"
                hint="Chi è + tipo (reale/ruolo/composito)"
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
            <Field label="Relazione col luogo" hint="Che rapporto ha col sito">
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
                    const presence = Array.isArray(contract.territoryOfPresence)
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
                onChange={(e) => setContract({ factualLimits: e.target.value })}
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
                onChange={(e) => setContract({ thingsToAvoid: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-border bg-card p-3 text-sm leading-relaxed"
                placeholder="Es. nostalgia scontata, superlativi, tono teatrale"
              />
            </Field>
          </>
        )}
      </div>
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
