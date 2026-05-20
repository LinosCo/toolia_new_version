"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  RefreshCw,
  FileText,
  AlertCircle,
} from "lucide-react";

interface Hit {
  id: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

const SOURCE_LABEL: Record<string, string> = {
  KB_FACT: "Fatto KB",
  POI_SEMANTIC: "POI",
  BRIEF: "Brief",
  TENSION: "Tensione",
  SCHEDA: "Scheda",
  SOURCE: "Fonte",
};

export function RetrievalPlayground({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/content/retrieve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, topK: 8 }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "errore");
      setHits((await res.json()).hits as Hit[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di ricerca");
    } finally {
      setLoading(false);
    }
  }

  async function reindex() {
    setReindexing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/content/reindex`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "errore");
      const { facts, chunks } = await res.json();
      setNotice(`Indicizzati ${facts} fatti (${chunks} chunk).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di reindex");
    } finally {
      setReindexing(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Search form */}
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Es. perché l'affresco è incompiuto?"
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground/30"
          />
        </div>

        {/* Cerca button */}
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand/90 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.1)] disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Cerca
        </button>

        {/* Reindex icon-button */}
        <button
          type="button"
          onClick={reindex}
          disabled={reindexing}
          title="Reindicizza la KB del progetto"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {reindexing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </button>
      </form>

      {/* Notice banner */}
      {notice && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          {notice}
        </p>
      )}

      {/* Error banner */}
      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-destructive/[0.06] px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      {/* Empty state — no query yet */}
      {hits === null && !loading && (
        <div className="rounded-xl border border-dashed border-border py-14 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Search className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Digita una domanda per interrogare la knowledge base.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Se non hai risultati, premi l&apos;icona di reindicizzazione per
            indicizzare i fatti approvati.
          </p>
        </div>
      )}

      {/* No-results state */}
      {hits !== null && hits.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-border py-14 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Nessun risultato trovato.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Hai indicizzato la KB? Premi il pulsante di reindicizzazione.
          </p>
        </div>
      )}

      {/* Results list */}
      {hits !== null && hits.length > 0 && (
        <ul className="space-y-3">
          {hits.map((h) => (
            <li
              key={h.id}
              className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
            >
              {/* Header row: chip + similarity bar */}
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                  <FileText className="size-3 text-brand" />
                  {SOURCE_LABEL[h.sourceType] ?? h.sourceType}
                </span>

                <div className="flex items-center gap-2">
                  {/* Relevance bar */}
                  <div
                    className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"
                    aria-label={`Pertinenza: ${Math.round(h.similarity * 100)}%`}
                  >
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${Math.round(h.similarity * 100)}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {(h.similarity * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Content */}
              <p className="text-sm leading-relaxed text-foreground">
                {h.content}
              </p>

              {/* Provenance footer */}
              <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/60">
                {h.sourceType} · chunk {h.chunkIndex}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
