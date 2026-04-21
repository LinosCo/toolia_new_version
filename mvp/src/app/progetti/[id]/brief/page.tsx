"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  Plus,
  X,
  Clock,
  Target,
  MessageCircle,
  Quote,
  Baby,
  ListChecks,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loadBrief,
  saveBrief,
  emptyBrief,
  loadKB,
  loadProject,
  saveProgress,
  type ProjectBrief,
  type BriefTone,
  type TipoEsperienza,
  type FamilyEta,
  type FamilyModalita,
  type KBFact,
  type ProjectKB,
} from "@/lib/project-store";
import { loadApiKeys } from "@/lib/api-keys";
import { cn } from "@/lib/utils";

const TIPI_ESPERIENZA: {
  value: TipoEsperienza;
  label: string;
  hint: string;
}[] = [
  {
    value: "didattico",
    label: "Didattico",
    hint: "Apprendimento strutturato, contenuto informativo",
  },
  {
    value: "contemplativo",
    label: "Contemplativo",
    hint: "Osservazione, silenzio, riflessione",
  },
  {
    value: "avventuroso",
    label: "Avventuroso",
    hint: "Esplorazione attiva, scoperta passo dopo passo",
  },
  {
    value: "emozionale",
    label: "Emozionale",
    hint: "Impatto sensoriale, pathos, storia umana",
  },
  {
    value: "immersivo",
    label: "Immersivo",
    hint: "Perdersi nel luogo, ambienti sensoriali",
  },
];

const TONES: { value: BriefTone; label: string; hint: string }[] = [
  {
    value: "sobrio-autorevole",
    label: "Sobrio e autorevole",
    hint: "Misurato, preciso, stile museale",
  },
  {
    value: "colloquiale-caldo",
    label: "Colloquiale e caldo",
    hint: "Come un amico che ti accompagna",
  },
  {
    value: "evocativo",
    label: "Evocativo",
    hint: "Immagini, atmosfere, narrazione cinematografica",
  },
  {
    value: "ironico",
    label: "Ironico",
    hint: "Leggero, con tocchi di umorismo",
  },
];

const ETA: { value: FamilyEta; label: string }[] = [
  { value: "3-6", label: "3–6 anni" },
  { value: "6-10", label: "6–10 anni" },
  { value: "10-14", label: "10–14 anni" },
];

const MODALITA: { value: FamilyModalita; label: string; hint: string }[] = [
  { value: "investigativo", label: "Investigativo", hint: "Indizi, enigmi" },
  { value: "avventura", label: "Avventura", hint: "Esplorazione a tappe" },
  {
    value: "caccia-tesoro",
    label: "Caccia al tesoro",
    hint: "Obiettivi da trovare",
  },
  { value: "osservazione", label: "Osservazione", hint: "Guarda e scopri" },
];

export default function BriefStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  const [brief, setBriefState] = useState<ProjectBrief>(emptyBrief());
  const [kb, setKb] = useState<ProjectKB>({ facts: [] });
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keys = typeof window !== "undefined" ? loadApiKeys() : null;
  const activeProvider: "kimi" | "openai" | null = keys?.llm.openai
    ? "openai"
    : keys?.llm.kimi
      ? "kimi"
      : null;
  const hasLlmKey = activeProvider !== null;

  useEffect(() => {
    saveProgress(projectId, { currentStep: "brief" });
    let alive = true;
    const refresh = async (skipBrief = false) => {
      const ops: Promise<unknown>[] = [loadKB(projectId)];
      if (!skipBrief) ops.unshift(loadBrief(projectId));
      const results = await Promise.all(ops);
      if (!alive) return;
      if (!skipBrief) {
        setBriefState((results[0] as ProjectBrief | undefined) ?? emptyBrief());
        setKb(results[1] as ProjectKB);
      } else {
        setKb(results[0] as ProjectKB);
      }
      setLoaded(true);
    };
    refresh();
    // Ri-sync KB quando Fonti cambia (utente approva altri fatti)
    const onSourcesChanged = () => refresh(true);
    window.addEventListener("toolia:sources-updated", onSourcesChanged);
    return () => {
      alive = false;
      window.removeEventListener("toolia:sources-updated", onSourcesChanged);
    };
  }, [projectId]);

  const persist = (next: ProjectBrief) => {
    setBriefState(next);
    saveBrief(projectId, next).then(() => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      setSaved(true);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
      window.dispatchEvent(new Event("toolia:brief-updated"));
    });
  };

  const approvedFacts = useMemo(
    () => kb.facts.filter((f) => f.approved),
    [kb.facts],
  );
  const canGenerate = approvedFacts.length >= 10 && hasLlmKey;

  const generate = async () => {
    if (!canGenerate || !keys || !activeProvider) return;
    setGenerating(true);
    setError(null);
    try {
      const project = loadProject(projectId);
      const facts = approvedFacts
        .slice()
        .sort((a, b) => weightOf(b) - weightOf(a))
        .map((f) => ({
          content: f.content,
          category: f.category,
          importance: f.importance,
          reliability: f.reliability,
          poiRef: f.poiRef,
          sourceKind: f.sourceRef.kind,
        }));

      const res = await fetch("/api/ai/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: keys.llm[activeProvider],
          provider: activeProvider,
          projectName: project?.name ?? "Progetto",
          type: project?.type,
          city: project?.city,
          facts,
          hasFamilyMode: brief.familyMode.enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Errore durante la generazione.");
        return;
      }
      persist({
        ...brief,
        ...data.brief,
        familyMode: brief.familyMode.enabled
          ? { ...brief.familyMode, ...data.brief.familyMode }
          : brief.familyMode,
        generatedAt: new Date().toISOString(),
      });
    } catch {
      setError("Errore di rete durante la generazione.");
    } finally {
      setGenerating(false);
    }
  };

  if (!loaded) return <div className="min-h-screen" />;

  const hasContent =
    !!brief.obiettivo ||
    !!brief.promessaNarrativa ||
    !!brief.target ||
    brief.mustTell.length > 0;

  // Brief è "obsoleto" se i fatti KB approvati sono cambiati dopo l'ultima generazione
  const staleBrief = (() => {
    if (!brief.generatedAt || !hasContent) return false;
    const briefTime = new Date(brief.generatedAt).getTime();
    const changes = kb.facts
      .filter((f) => f.approved)
      .map((f) => new Date(f.updatedAt ?? f.createdAt).getTime());
    if (changes.length === 0) return false;
    return Math.max(...changes) > briefTime + 2000;
  })();

  const briefReady =
    !!brief.obiettivo.trim() &&
    !!brief.promessaNarrativa.trim() &&
    !!brief.target.trim() &&
    brief.mustTell.some((s) => s.trim().length > 0);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="shrink-0 px-6 md:px-10 pt-8 pb-6 border-b border-border/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
              Step 2 · Brief editoriale
            </p>
            <h1 className="font-heading text-3xl md:text-4xl italic leading-tight tracking-tight">
              La direzione del progetto
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-xl leading-relaxed">
              Il brief guida tutti gli output futuri: app visitatore, brochure,
              podcast. L&apos;AI legge i fatti approvati e propone una
              direzione; tu la ritocchi.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-xs text-brand">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Salvato
              </span>
            )}
            {staleBrief && (
              <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-amber-100 text-amber-800 text-[11px] font-medium border border-amber-300">
                <AlertCircle className="h-3 w-3" strokeWidth={2} />
                Fatti KB aggiornati — rigenera per allineare
              </span>
            )}
            <button
              type="button"
              onClick={generate}
              disabled={!canGenerate || generating}
              className={cn(
                "inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium transition-colors",
                generating
                  ? "bg-muted text-muted-foreground cursor-wait"
                  : !canGenerate
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : staleBrief
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : hasContent
                        ? "border border-border text-foreground hover:bg-muted"
                        : "bg-foreground text-background hover:bg-foreground/90",
              )}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                  Genero il brief…
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

      <main className="flex-1 px-6 md:px-10 py-8 max-w-[900px] w-full mx-auto space-y-6">
        {!canGenerate && !hasContent && (
          <WarningGate
            approvedCount={approvedFacts.length}
            hasLlmKey={hasLlmKey}
            projectId={projectId}
          />
        )}

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4 flex items-start gap-3">
            <AlertCircle
              className="h-4 w-4 text-destructive shrink-0 mt-0.5"
              strokeWidth={1.8}
            />
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {generating && !hasContent && (
          <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-12 w-12 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Sparkles
                className="h-5 w-5 text-brand animate-pulse"
                strokeWidth={1.8}
              />
            </div>
            <div>
              <p className="font-heading text-xl italic">
                Sto leggendo i fatti…
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                L&apos;AI sta consolidando i {approvedFacts.length} fatti
                approvati in una direzione editoriale.
              </p>
            </div>
          </div>
        )}

        {(hasContent || !generating) && canGenerate !== false && (
          <>
            {brief.mandatoEditoriale && (
              <div className="rounded-2xl border border-brand/30 bg-brand/[0.04] p-5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-brand font-medium mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" strokeWidth={1.8} />
                  Mandato editoriale
                </p>
                <p className="font-heading italic text-lg leading-snug text-foreground">
                  {brief.mandatoEditoriale}
                </p>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Generato dall&apos;AI dai campi sottostanti — rigenera per
                  aggiornare.
                </p>
              </div>
            )}

            <Section
              num="01"
              icon={<Target className="h-4 w-4" strokeWidth={1.8} />}
              title="Identità del progetto"
              subtitle="La voce e la promessa che guida ogni output"
              defaultOpen={true}
            >
              <Field
                label="Promessa narrativa"
                hint="La frase-manifesto del progetto, in una riga"
              >
                <Input
                  value={brief.promessaNarrativa}
                  onChange={(e) =>
                    persist({ ...brief, promessaNarrativa: e.target.value })
                  }
                  placeholder="Es. Un forte nato per una guerra che si è combattuta altrove"
                  className="h-11 text-base"
                />
              </Field>
              <Field
                label="Obiettivo dell'esperienza"
                hint="Cosa deve portarsi a casa il visitatore"
              >
                <textarea
                  value={brief.obiettivo}
                  onChange={(e) =>
                    persist({ ...brief, obiettivo: e.target.value })
                  }
                  rows={2}
                  placeholder="Es. Scoprire il lavoro umano dietro una fortificazione apparentemente militare"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[15px] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </Field>
              <Field
                label="Obiettivo del cliente (business)"
                hint="Outcome per l'ente, distinto da quello del visitatore"
              >
                <textarea
                  value={brief.obiettivoCliente}
                  onChange={(e) =>
                    persist({ ...brief, obiettivoCliente: e.target.value })
                  }
                  rows={2}
                  placeholder="Es. Posizionare il forte come meta culturale di qualità, attrarre turismo lento"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[15px] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </Field>
              <Field
                label="Tipo di esperienza"
                hint="Il registro di fondo — si sovrappone al tono ma guida il tipo di attività"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TIPI_ESPERIENZA.map((t) => {
                    const selected = brief.tipoEsperienza === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() =>
                          persist({ ...brief, tipoEsperienza: t.value })
                        }
                        className={cn(
                          "text-left rounded-xl border p-3.5 transition-colors",
                          selected
                            ? "border-foreground bg-foreground/[0.03]"
                            : "border-border hover:border-foreground/40 bg-card",
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              "mt-1 h-3.5 w-3.5 rounded-full border-2 shrink-0 flex items-center justify-center",
                              selected
                                ? "border-foreground bg-foreground"
                                : "border-border",
                            )}
                          >
                            {selected && (
                              <span className="h-1 w-1 rounded-full bg-background" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{t.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                              {t.hint}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Target visitatore" hint="A chi ci rivolgiamo">
                <textarea
                  value={brief.target}
                  onChange={(e) =>
                    persist({ ...brief, target: e.target.value })
                  }
                  rows={2}
                  placeholder="Es. Turisti 35-60 curiosi di storia e territorio, famiglie con adolescenti"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[15px] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </Field>
              <Field
                label="Percezione da lasciare"
                hint="L'impressione finale desiderata al termine della visita"
              >
                <Input
                  value={brief.percezioneDaLasciare}
                  onChange={(e) =>
                    persist({
                      ...brief,
                      percezioneDaLasciare: e.target.value,
                    })
                  }
                  placeholder="Es. Rispetto silenzioso per chi ha costruito e chi ha custodito"
                  className="h-11 text-base"
                />
              </Field>
              <Field label="Durata media" hint="Tempo di fruizione orientativo">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-baseline gap-3 mb-2">
                    <Clock
                      className="h-4 w-4 text-muted-foreground shrink-0"
                      strokeWidth={1.8}
                    />
                    <span className="font-heading text-3xl italic tabular-nums">
                      {brief.durataMinuti}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      minuti
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={180}
                    step={5}
                    value={brief.durataMinuti}
                    onChange={(e) =>
                      persist({
                        ...brief,
                        durataMinuti: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-foreground"
                  />
                </div>
              </Field>
            </Section>

            <Section
              num="02"
              icon={<Quote className="h-4 w-4" strokeWidth={1.8} />}
              title="Voce e tono"
              subtitle="Come parla il progetto — vincola linguaggio e atmosfera"
            >
              <Field
                label="Tono"
                hint="Scegli come parla la narratrice/il narratore"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TONES.map((t) => {
                    const selected = brief.tono === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => persist({ ...brief, tono: t.value })}
                        className={cn(
                          "text-left rounded-xl border p-3.5 transition-colors",
                          selected
                            ? "border-foreground bg-foreground/[0.03]"
                            : "border-border hover:border-foreground/40 bg-card",
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              "mt-1 h-3.5 w-3.5 rounded-full border-2 shrink-0 flex items-center justify-center",
                              selected
                                ? "border-foreground bg-foreground"
                                : "border-border",
                            )}
                          >
                            {selected && (
                              <span className="h-1 w-1 rounded-full bg-background" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{t.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                              {t.hint}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Field>
              <ChipListField
                label="Sensibilità da rispettare"
                hint="Temi politici, culturali o storici da trattare con cautela"
                values={brief.sensibilita}
                onChange={(sensibilita) => persist({ ...brief, sensibilita })}
                placeholder="Es. Non enfatizzare retorica militarista"
                max={5}
              />
              <ChipListField
                label="Vincoli di brand"
                hint="Regole di linguaggio e positioning"
                values={brief.vincoliBrand}
                onChange={(vincoliBrand) => persist({ ...brief, vincoliBrand })}
                placeholder="Es. Usare toponomastica locale, evitare anglicismi"
                max={5}
              />
            </Section>

            <Section
              num="03"
              icon={<ListChecks className="h-4 w-4" strokeWidth={1.8} />}
              title="Storie e argomenti"
              subtitle="Cosa raccontare e cosa evitare"
            >
              <ChipListField
                label="Storie obbligatorie (must tell)"
                hint="Le 2-4 storie identitarie che devono apparire in ogni output"
                values={brief.mustTell}
                onChange={(mustTell) => persist({ ...brief, mustTell })}
                placeholder="Es. La notte del 14 agosto 1916 quando…"
                max={6}
                multiline
              />
              <ChipListField
                label="Da raccontare se c'è tempo (nice to tell)"
                hint="Arricchimenti opzionali"
                values={brief.niceToTell}
                onChange={(niceToTell) => persist({ ...brief, niceToTell })}
                placeholder="Es. La tradizione dei narcisi di fine maggio"
                max={10}
                multiline
              />
              <ChipListField
                label="Da evitare"
                hint="Argomenti, toni o dettagli da non toccare"
                values={brief.avoid}
                onChange={(avoid) => persist({ ...brief, avoid })}
                placeholder="Es. Retorica gloriosa della guerra"
                max={8}
                multiline
              />
              <ChipListField
                label="Da verificare"
                hint="Claim e ipotesi che richiedono conferma prima di pubblicare (auto-popolato dalle ipotesi della KB)"
                values={brief.verify}
                onChange={(verify) => persist({ ...brief, verify })}
                placeholder="Es. Identità dell'autore della medaglia trovata nel 2019"
                max={20}
                multiline
              />
            </Section>

            <Section
              num="04"
              icon={<MessageCircle className="h-4 w-4" strokeWidth={1.8} />}
              title="Domande del visitatore"
              subtitle="Raggruppate per tipo — alimentano il futuro chatbot"
            >
              <ChipListField
                label="Domande pratiche"
                hint="Logistica: parcheggio, orari, biglietti, accessibilità, bagni"
                values={brief.visitorQuestions.pratiche}
                onChange={(pratiche) =>
                  persist({
                    ...brief,
                    visitorQuestions: { ...brief.visitorQuestions, pratiche },
                  })
                }
                placeholder="Es. C'è un parcheggio? Qual è l'orario estivo?"
                max={8}
                multiline
              />
              <ChipListField
                label="Curiosità spontanee"
                hint="Domande che nascono sul posto, dettagli insoliti"
                values={brief.visitorQuestions.curiosita}
                onChange={(curiosita) =>
                  persist({
                    ...brief,
                    visitorQuestions: { ...brief.visitorQuestions, curiosita },
                  })
                }
                placeholder="Es. Perché quella pietra è nera? Chi viveva qui davvero?"
                max={10}
                multiline
              />
              <ChipListField
                label="Approfondimenti"
                hint="Domande per visitatori che vogliono più contesto storico/tematico"
                values={brief.visitorQuestions.approfondimento}
                onChange={(approfondimento) =>
                  persist({
                    ...brief,
                    visitorQuestions: {
                      ...brief.visitorQuestions,
                      approfondimento,
                    },
                  })
                }
                placeholder="Es. Come si inserisce questo forte nella linea difensiva alpina?"
                max={8}
                multiline
              />
            </Section>

            <Section
              num="05"
              icon={<ListChecks className="h-4 w-4" strokeWidth={1.8} />}
              title="Criterio di ammissibilità narrativa"
              subtitle="Regole esplicite che filtrano ogni contenuto generato"
            >
              <ChipListField
                label="Cosa PUÒ entrare"
                hint="Regole di inclusione — condizioni che un contenuto deve rispettare per essere usato"
                values={brief.criterioAmmissibilita.inclusione}
                onChange={(inclusione) =>
                  persist({
                    ...brief,
                    criterioAmmissibilita: {
                      ...brief.criterioAmmissibilita,
                      inclusione,
                    },
                  })
                }
                placeholder="Es. Ogni fatto deve avere una fonte citabile"
                max={6}
                multiline
              />
              <ChipListField
                label="Cosa NON entra MAI"
                hint="Esclusioni dure (più rigido di 'da evitare')"
                values={brief.criterioAmmissibilita.esclusione}
                onChange={(esclusione) =>
                  persist({
                    ...brief,
                    criterioAmmissibilita: {
                      ...brief.criterioAmmissibilita,
                      esclusione,
                    },
                  })
                }
                placeholder="Es. Nessun claim speculativo sulle motivazioni delle battaglie"
                max={6}
                multiline
              />
            </Section>

            <Section
              num="06"
              icon={<ListChecks className="h-4 w-4" strokeWidth={1.8} />}
              title="Policy d'uso delle fonti"
              subtitle="Per ciascun task, quale fonte pesa di più"
            >
              <Field
                label="Per le schede narrative"
                hint="Come bilanciare evidence, intervista, sito nella generazione schede"
              >
                <textarea
                  value={brief.policyFonti.schede}
                  onChange={(e) =>
                    persist({
                      ...brief,
                      policyFonti: {
                        ...brief.policyFonti,
                        schede: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  placeholder="Es. Evidence obbligatoria; intervista per colore narrativo; sito come contesto"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </Field>
              <Field
                label="Per il chatbot runtime"
                hint="Regole strette — guardrail anti-allucinazione"
              >
                <textarea
                  value={brief.policyFonti.chatbot}
                  onChange={(e) =>
                    persist({
                      ...brief,
                      policyFonti: {
                        ...brief.policyFonti,
                        chatbot: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  placeholder="Es. Solo fatti ad affidabilità alta; ipotesi escluse"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </Field>
              <Field
                label="Per le zone narrative"
                hint="Come pesare fonti nella definizione zone e promesse"
              >
                <textarea
                  value={brief.policyFonti.zone}
                  onChange={(e) =>
                    persist({
                      ...brief,
                      policyFonti: {
                        ...brief.policyFonti,
                        zone: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  placeholder="Es. Intervista e documenti per promessa narrativa; planimetria per confini fisici"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </Field>
              <Field
                label="Per i driver narrativi"
                hint="Come scegliere le lenti tematiche"
              >
                <textarea
                  value={brief.policyFonti.driver}
                  onChange={(e) =>
                    persist({
                      ...brief,
                      policyFonti: {
                        ...brief.policyFonti,
                        driver: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  placeholder="Es. Intervista prevale per identità; documenti per temi storici"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </Field>
            </Section>

            <Section
              num="07"
              icon={<Baby className="h-4 w-4" strokeWidth={1.8} />}
              title="Modalità bambini (Family Mode)"
              subtitle="Layer parallelo di contenuti per famiglie con bambini"
            >
              <div className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium mb-1">
                    Attiva modalità bambini
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Abilita testi semplificati, missioni a quiz e compagno
                    animato nell&apos;app visitatore.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={brief.familyMode.enabled}
                  onClick={() =>
                    persist({
                      ...brief,
                      familyMode: {
                        ...brief.familyMode,
                        enabled: !brief.familyMode.enabled,
                      },
                    })
                  }
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
                    brief.familyMode.enabled ? "bg-brand" : "bg-muted",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                      brief.familyMode.enabled
                        ? "translate-x-[22px]"
                        : "translate-x-[2px]",
                    )}
                  />
                </button>
              </div>

              {brief.familyMode.enabled && (
                <div className="space-y-4 pt-2">
                  <Field
                    label="Nome del compagno animato"
                    hint="La mascotte che accompagna i bambini nella visita"
                  >
                    <Input
                      value={brief.familyMode.mascotName ?? ""}
                      onChange={(e) =>
                        persist({
                          ...brief,
                          familyMode: {
                            ...brief.familyMode,
                            mascotName: e.target.value,
                          },
                        })
                      }
                      placeholder="Es. Pepo, il cagnolino del forte"
                      className="h-11 text-base"
                    />
                  </Field>
                  <Field label="Fascia d'età target">
                    <div className="flex flex-wrap gap-1.5">
                      {ETA.map((e) => {
                        const sel = brief.familyMode.etaTarget === e.value;
                        return (
                          <button
                            key={e.value}
                            type="button"
                            onClick={() =>
                              persist({
                                ...brief,
                                familyMode: {
                                  ...brief.familyMode,
                                  etaTarget: e.value,
                                },
                              })
                            }
                            className={cn(
                              "h-9 px-4 rounded-full text-sm font-medium transition-colors",
                              sel
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {e.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Modalità di gioco">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {MODALITA.map((m) => {
                        const sel = brief.familyMode.modalitaGioco === m.value;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() =>
                              persist({
                                ...brief,
                                familyMode: {
                                  ...brief.familyMode,
                                  modalitaGioco: m.value,
                                },
                              })
                            }
                            className={cn(
                              "text-left rounded-xl border p-3 transition-colors",
                              sel
                                ? "border-foreground bg-foreground/[0.03]"
                                : "border-border hover:border-foreground/40 bg-card",
                            )}
                          >
                            <p className="text-sm font-medium">{m.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {m.hint}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Tono per i bambini">
                    <Input
                      value={brief.familyMode.tonoFamily ?? ""}
                      onChange={(e) =>
                        persist({
                          ...brief,
                          familyMode: {
                            ...brief.familyMode,
                            tonoFamily: e.target.value,
                          },
                        })
                      }
                      placeholder="Es. Giocoso, curioso, rassicurante"
                      className="h-11 text-base"
                    />
                  </Field>
                </div>
              )}
            </Section>

            <TensionMap brief={brief} facts={kb.facts} />
          </>
        )}
      </main>

      <footer className="shrink-0 border-t border-border/60 bg-paper">
        <div className="max-w-[900px] mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <Link
            href={`/progetti/${projectId}/fonti`}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Fonti
          </Link>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {approvedFacts.length} fatti approvati
          </p>
          <Link
            href={`/progetti/${projectId}/luogo`}
            onClick={() => saveProgress(projectId, { currentStep: "luogo" })}
            aria-disabled={!briefReady}
            className={cn(
              "inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm font-medium transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
              briefReady
                ? "bg-brand text-white hover:bg-brand/90"
                : "bg-muted text-muted-foreground pointer-events-none",
            )}
          >
            Vai al Luogo
            <ArrowLeft className="h-4 w-4 rotate-180" strokeWidth={2} />
          </Link>
        </div>
      </footer>
    </div>
  );
}

function weightOf(f: KBFact): number {
  const i =
    f.importance === "primaria" ? 3 : f.importance === "secondaria" ? 2 : 1;
  const r = f.reliability === "alta" ? 3 : f.reliability === "media" ? 2 : 1;
  return i * r;
}

function Section({
  num,
  icon,
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-border bg-paper overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-start gap-4 min-w-0 text-left">
          <span className="font-heading italic text-sm text-muted-foreground tabular-nums pt-0.5 shrink-0">
            {num}
          </span>
          <span className="h-8 w-8 rounded-full bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-xl italic leading-tight">
              {title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {subtitle}
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp
            className="h-4 w-4 text-muted-foreground shrink-0"
            strokeWidth={1.8}
          />
        ) : (
          <ChevronDown
            className="h-4 w-4 text-muted-foreground shrink-0"
            strokeWidth={1.8}
          />
        )}
      </button>
      {open && (
        <div className="border-t border-border/60 p-5 space-y-5">
          {children}
        </div>
      )}
    </section>
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
      {hint && <p className="text-xs text-muted-foreground -mt-0.5">{hint}</p>}
      <div className="pt-0.5">{children}</div>
    </div>
  );
}

function ChipListField({
  label,
  hint,
  values,
  onChange,
  placeholder,
  max,
  multiline = false,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  max: number;
  multiline?: boolean;
}) {
  const update = (i: number, v: string) =>
    onChange(values.map((x, idx) => (idx === i ? v : x)));
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const add = () => {
    if (values.length >= max) return;
    onChange([...values, ""]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </Label>
      {hint && <p className="text-xs text-muted-foreground -mt-0.5">{hint}</p>}
      <ul className="space-y-2">
        {values.map((v, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2.5"
          >
            <span className="shrink-0 h-6 w-6 rounded-full bg-muted text-foreground text-[11px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            {multiline ? (
              <textarea
                value={v}
                onChange={(e) => update(i, e.target.value)}
                rows={2}
                placeholder={placeholder}
                className="flex-1 text-sm leading-relaxed resize-none bg-transparent focus:outline-none min-w-0 pt-0.5"
              />
            ) : (
              <input
                value={v}
                onChange={(e) => update(i, e.target.value)}
                placeholder={placeholder}
                className="flex-1 text-sm bg-transparent focus:outline-none min-w-0 pt-0.5"
              />
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Rimuovi"
              className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
      {values.length < max && (
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Aggiungi
        </button>
      )}
    </div>
  );
}

function WarningGate({
  approvedCount,
  hasLlmKey,
  projectId,
}: {
  approvedCount: number;
  hasLlmKey: boolean;
  projectId: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center space-y-4">
      <div className="h-14 w-14 rounded-2xl bg-muted mx-auto flex items-center justify-center">
        <Sparkles className="h-5 w-5 text-muted-foreground" strokeWidth={1.6} />
      </div>
      <div>
        <p className="font-heading text-xl italic mb-1">
          Non ancora pronto per il Brief
        </p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {!hasLlmKey
            ? "Configura una chiave LLM (OpenAI o Kimi) in Impostazioni per generare il brief."
            : `Servono almeno 10 fatti approvati nella Knowledge Base. Ne hai ${approvedCount}.`}
        </p>
      </div>
      {!hasLlmKey ? (
        <Link
          href="/impostazioni"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          Vai a Impostazioni
        </Link>
      ) : (
        <Link
          href={`/progetti/${projectId}/fonti`}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          Torna alla Knowledge Base
        </Link>
      )}
    </div>
  );
}

function TensionMap({
  brief,
  facts,
}: {
  brief: ProjectBrief;
  facts: KBFact[];
}) {
  const [open, setOpen] = useState(false);
  const approved = facts.filter((f) => f.approved);
  const approvedSolidi = approved.filter((f) => f.category === "solido");
  const approvedMemorie = approved.filter((f) => f.category === "memoria");
  const approvedIpotesi = approved.filter((f) => f.category === "ipotesi");

  const verifyCovered = approvedIpotesi.filter((f) =>
    brief.verify.some((v) =>
      v.toLowerCase().includes(f.content.slice(0, 30).toLowerCase()),
    ),
  ).length;

  const tensions: {
    level: "ok" | "warn" | "info";
    label: string;
    message: string;
  }[] = [];

  if (approvedSolidi.length < 5 && brief.mustTell.length > 0) {
    tensions.push({
      level: "warn",
      label: "Pochi fatti solidi",
      message: `Hai ${approvedSolidi.length} fatti solidi approvati ma ${brief.mustTell.length} storie obbligatorie. Verifica che ogni must-tell abbia fonti forti.`,
    });
  }
  if (approvedMemorie.length > 0) {
    tensions.push({
      level: "info",
      label: "Memorie da raccontare cauti",
      message: `${approvedMemorie.length} fatti "memoria". Nelle schede saranno resi in tono evocativo-cauto ("si narra che…").`,
    });
  }
  if (approvedIpotesi.length > 0 && verifyCovered < approvedIpotesi.length) {
    tensions.push({
      level: "warn",
      label: "Ipotesi non inserite in verify",
      message: `${approvedIpotesi.length - verifyCovered} ipotesi approvate non sono in "da verificare". Valuta di aggiungerle.`,
    });
  }
  if (brief.mustTell.length === 0) {
    tensions.push({
      level: "warn",
      label: "Nessuna storia obbligatoria",
      message:
        "Il progetto non ha must-tell: senza, le schede generate rischiano di essere generiche.",
    });
  }
  if (brief.avoid.length === 0 && approved.length > 20) {
    tensions.push({
      level: "info",
      label: "Nessun argomento da evitare",
      message:
        "Considera se ci sono toni o dettagli da escludere (es. retorica militarista, claim non verificati).",
    });
  }
  if (tensions.length === 0 && approved.length > 10) {
    tensions.push({
      level: "ok",
      label: "Brief coerente",
      message:
        "Nessuna tensione rilevata tra brief e knowledge base. Puoi procedere.",
    });
  }

  if (tensions.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 text-left">
          <span className="h-8 w-8 rounded-full bg-brand/15 text-brand flex items-center justify-center shrink-0">
            <AlertCircle className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-lg italic leading-tight">
              Mappa delle tensioni
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tensions.length}{" "}
              {tensions.length === 1 ? "segnalazione" : "segnalazioni"} ·
              coerenza tra brief e fatti
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp
            className="h-4 w-4 text-muted-foreground shrink-0"
            strokeWidth={1.8}
          />
        ) : (
          <ChevronDown
            className="h-4 w-4 text-muted-foreground shrink-0"
            strokeWidth={1.8}
          />
        )}
      </button>
      {open && (
        <ul className="border-t border-border/60 divide-y divide-border/60">
          {tensions.map((t, i) => (
            <li key={i} className="flex items-start gap-3 px-5 py-3">
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0 mt-1.5",
                  t.level === "warn"
                    ? "bg-amber-500"
                    : t.level === "ok"
                      ? "bg-emerald-500"
                      : "bg-sky-500",
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {t.message}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
