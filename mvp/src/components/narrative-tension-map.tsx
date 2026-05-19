"use client";

import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { useDebouncedCallback } from "@/lib/hooks/use-debounce";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TensionItem {
  title?: string;
  why?: string;
  topic?: string;
  reason?: string;
  claim?: string;
  source?: string;
  status?: "pending" | "verified" | "rejected";
  clientWants?: string;
  sourcesSay?: string;
  recommendation?: string;
  sourceIds?: string[];
}

export interface TensionMapData {
  mustTellJson: TensionItem[];
  niceToTellJson: TensionItem[];
  avoidJson: TensionItem[];
  verifyJson: TensionItem[];
  tensionsJson: TensionItem[];
}

const DEFAULT_DATA: TensionMapData = {
  mustTellJson: [],
  niceToTellJson: [],
  avoidJson: [],
  verifyJson: [],
  tensionsJson: [],
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  projectId: string;
  // Pass the current brief object + interview so the AI has full context.
  // Both are optional — the AI endpoint handles missing values gracefully.
  brief?: object;
  interviewTranscript?: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NarrativeTensionMap({
  projectId,
  brief,
  interviewTranscript,
}: Props) {
  const [data, setData] = useState<TensionMapData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [open, setOpen] = useState(false);

  // -------------------------------------------------------------------------
  // Load
  // -------------------------------------------------------------------------

  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects/${projectId}/narrative-tension`)
      .then((r) => r.json())
      .then((d: Partial<TensionMapData>) =>
        setData({
          mustTellJson: d.mustTellJson ?? [],
          niceToTellJson: d.niceToTellJson ?? [],
          avoidJson: d.avoidJson ?? [],
          verifyJson: d.verifyJson ?? [],
          tensionsJson: d.tensionsJson ?? [],
        }),
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  // -------------------------------------------------------------------------
  // Save (debounced)
  // -------------------------------------------------------------------------

  const persistDebounced = useDebouncedCallback(async (next: TensionMapData) => {
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/narrative-tension`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } catch (e) {
      console.error("Failed to save tension map:", e);
    } finally {
      setSaving(false);
    }
  }, 800);

  function updateBucket(bucket: keyof TensionMapData, items: TensionItem[]) {
    const next = { ...data, [bucket]: items };
    setData(next);
    persistDebounced(next);
  }

  // -------------------------------------------------------------------------
  // AI propose
  // -------------------------------------------------------------------------

  async function proposeWithAi() {
    const hasData =
      data.mustTellJson.length > 0 || data.tensionsJson.length > 0;
    if (
      hasData &&
      !confirm(
        "Esiste già una tension map. Sovrascriverla con la proposta AI?",
      )
    ) {
      return;
    }
    setProposing(true);
    try {
      // Fetch KB facts
      const kbRes = await fetch(`/api/projects/${projectId}/kb`);
      const kb = await kbRes.json();
      const facts = (Array.isArray(kb.facts) ? kb.facts : [])
        .filter((f: { approved?: boolean }) => f.approved)
        .map(
          (f: {
            id: string;
            category: string;
            content: string;
            reliability: string;
          }) => ({
            id: f.id,
            category: f.category,
            content: f.content,
            reliability: f.reliability,
          }),
        );

      const res = await fetch("/api/ai/propose-tension-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          kbFacts: facts,
          brief,
          interviewTranscript,
          provider: "openai",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          (err as { error?: string; message?: string }).message ??
          (err as { error?: string }).error ??
          `Errore ${res.status}`;
        alert(`Errore proposta AI: ${msg}`);
        return;
      }

      const proposed = await res.json();
      const next: TensionMapData = {
        mustTellJson: proposed.mustTell ?? [],
        niceToTellJson: proposed.niceToTell ?? [],
        avoidJson: proposed.avoid ?? [],
        verifyJson: proposed.verify ?? [],
        tensionsJson: proposed.tensions ?? [],
      };
      setData(next);
      persistDebounced(next);
      // Expand the panel so the user sees the result
      setOpen(true);
    } catch (e) {
      console.error(e);
      alert("Errore nella proposta della tension map");
    } finally {
      setProposing(false);
    }
  }

  // -------------------------------------------------------------------------
  // Bucket renderer
  // -------------------------------------------------------------------------

  type FieldDef = {
    key: keyof TensionItem;
    label: string;
    placeholder: string;
    multiline?: boolean;
  };

  function renderBucket(
    title: string,
    bucket: keyof TensionMapData,
    borderColor: string,
    bgColor: string,
    fields: FieldDef[],
  ) {
    const items = data[bucket];
    return (
      <div
        className={cn("rounded-xl border-l-4 border border-border pl-4 pr-3 py-3 bg-paper space-y-2", borderColor)}
      >
        <div className="flex items-center justify-between">
          <h4 className={cn("font-heading italic text-sm", bgColor)}>{title}</h4>
          <button
            type="button"
            onClick={() => updateBucket(bucket, [...items, {}])}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            Aggiungi
          </button>
        </div>

        {items.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Nessuna voce.</p>
        )}

        {items.map((item, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-2.5 space-y-1.5"
          >
            {fields.map((f) => (
              <div key={f.key as string}>
                <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1">
                  {f.label}
                </label>
                {f.multiline ? (
                  <textarea
                    value={(item[f.key] as string) ?? ""}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[i] = { ...updated[i], [f.key]: e.target.value };
                      updateBucket(bucket, updated);
                    }}
                    className="w-full rounded border border-border bg-paper px-2 py-1 text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    placeholder={f.placeholder}
                    rows={2}
                  />
                ) : (
                  <input
                    type="text"
                    value={(item[f.key] as string) ?? ""}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[i] = { ...updated[i], [f.key]: e.target.value };
                      updateBucket(bucket, updated);
                    }}
                    className="w-full rounded border border-border bg-paper px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateBucket(
                  bucket,
                  items.filter((_, j) => j !== i),
                )
              }
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.8} />
              Rimuovi
            </button>
          </div>
        ))}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const totalItems =
    data.mustTellJson.length +
    data.niceToTellJson.length +
    data.avoidJson.length +
    data.verifyJson.length +
    data.tensionsJson.length;

  return (
    <section className="rounded-2xl border border-border bg-paper overflow-hidden">
      {/* ---- Header / toggle ---- */}
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 min-w-0 text-left flex-1"
        >
          <span className="h-8 w-8 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <AlertCircle className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-xl italic leading-tight">
              Mappa delle tensioni narrative
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bussola editoriale: cosa dire, evitare, verificare, bilanciare
              {saving && (
                <span className="ml-2 italic text-brand">salvataggio…</span>
              )}
              {!saving && totalItems > 0 && (
                <span className="ml-2 tabular-nums">
                  · {totalItems} {totalItems === 1 ? "voce" : "voci"}
                </span>
              )}
            </p>
          </div>
          {open ? (
            <ChevronUp
              className="h-4 w-4 text-muted-foreground shrink-0 ml-2"
              strokeWidth={1.8}
            />
          ) : (
            <ChevronDown
              className="h-4 w-4 text-muted-foreground shrink-0 ml-2"
              strokeWidth={1.8}
            />
          )}
        </button>

        {/* AI propose button — always visible */}
        <button
          type="button"
          onClick={proposeWithAi}
          disabled={proposing || loading}
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium transition-colors shrink-0",
            proposing
              ? "bg-muted text-muted-foreground cursor-wait"
              : "bg-brand/10 text-brand hover:bg-brand/20",
          )}
        >
          {proposing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
              Proposta…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
              Proponi con AI
            </>
          )}
        </button>
      </div>

      {/* ---- Collapsible body ---- */}
      {open && (
        <div className="border-t border-border/60 p-5 space-y-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
              Caricamento…
            </div>
          ) : (
            <>
              {/* 4-bucket grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderBucket(
                  "Must Tell",
                  "mustTellJson",
                  "border-l-emerald-500",
                  "text-emerald-700 dark:text-emerald-400",
                  [
                    {
                      key: "title",
                      label: "Titolo",
                      placeholder: "Storia identitaria…",
                    },
                    {
                      key: "why",
                      label: "Perché conta",
                      placeholder: "Motivazione editoriale",
                      multiline: true,
                    },
                  ],
                )}
                {renderBucket(
                  "Nice to Tell",
                  "niceToTellJson",
                  "border-l-sky-400",
                  "text-sky-700 dark:text-sky-400",
                  [
                    {
                      key: "title",
                      label: "Titolo",
                      placeholder: "Storia interessante…",
                    },
                    {
                      key: "why",
                      label: "Perché conta",
                      placeholder: "Motivazione",
                      multiline: true,
                    },
                  ],
                )}
                {renderBucket(
                  "Avoid",
                  "avoidJson",
                  "border-l-red-500",
                  "text-red-700 dark:text-red-400",
                  [
                    {
                      key: "topic",
                      label: "Argomento",
                      placeholder: "Tema da evitare…",
                    },
                    {
                      key: "reason",
                      label: "Motivo",
                      placeholder: "Perché evitarlo",
                      multiline: true,
                    },
                  ],
                )}
                {renderBucket(
                  "Verify",
                  "verifyJson",
                  "border-l-amber-500",
                  "text-amber-700 dark:text-amber-400",
                  [
                    {
                      key: "claim",
                      label: "Affermazione",
                      placeholder: "Claim da verificare…",
                    },
                    {
                      key: "source",
                      label: "Fonte attuale",
                      placeholder: "Da dove arriva",
                    },
                  ],
                )}
              </div>

              {/* Tensions panel */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading italic text-base">
                    Tensioni rilevate
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      updateBucket("tensionsJson", [
                        ...data.tensionsJson,
                        {},
                      ])
                    }
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3 w-3" strokeWidth={2} />
                    Aggiungi tensione
                  </button>
                </div>

                {data.tensionsJson.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    Nessuna tensione rilevata.
                  </p>
                )}

                {data.tensionsJson.map((item, i) => (
                  <div
                    key={i}
                    className="bg-card border border-border rounded-xl p-4 space-y-3"
                  >
                    <TensionField
                      label="Cliente vuole"
                      value={item.clientWants ?? ""}
                      onChange={(v) => {
                        const updated = [...data.tensionsJson];
                        updated[i] = { ...updated[i], clientWants: v };
                        updateBucket("tensionsJson", updated);
                      }}
                      placeholder="Cosa il cliente vuole enfatizzare…"
                    />
                    <TensionField
                      label="Fonti dicono"
                      value={item.sourcesSay ?? ""}
                      onChange={(v) => {
                        const updated = [...data.tensionsJson];
                        updated[i] = { ...updated[i], sourcesSay: v };
                        updateBucket("tensionsJson", updated);
                      }}
                      placeholder="Cosa le fonti effettivamente sostengono…"
                    />
                    <TensionField
                      label="Raccomandazione editoriale"
                      value={item.recommendation ?? ""}
                      onChange={(v) => {
                        const updated = [...data.tensionsJson];
                        updated[i] = { ...updated[i], recommendation: v };
                        updateBucket("tensionsJson", updated);
                      }}
                      placeholder="Come bilanciare le due posizioni…"
                    />
                    {/* Verify status badge (if present) */}
                    {item.status && (
                      <div className="flex items-center gap-1.5">
                        {item.status === "verified" ? (
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-emerald-500"
                            strokeWidth={2}
                          />
                        ) : item.status === "rejected" ? (
                          <XCircle
                            className="h-3.5 w-3.5 text-red-500"
                            strokeWidth={2}
                          />
                        ) : (
                          <AlertCircle
                            className="h-3.5 w-3.5 text-amber-500"
                            strokeWidth={2}
                          />
                        )}
                        <span className="text-xs text-muted-foreground capitalize">
                          {item.status}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        updateBucket(
                          "tensionsJson",
                          data.tensionsJson.filter((_, j) => j !== i),
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.8} />
                      Rimuovi tensione
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Small helper for textarea fields inside tensions
// ---------------------------------------------------------------------------

function TensionField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border bg-paper px-2 py-1.5 text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-foreground/30"
        placeholder={placeholder}
        rows={2}
      />
    </div>
  );
}
