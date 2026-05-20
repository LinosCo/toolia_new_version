"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Check, X, Calendar as CalIcon } from "lucide-react";
import { transitionsFrom, type DraftStatus } from "@/lib/content/workflow";

type Status = DraftStatus;
interface DraftRow { id: string; title: string; format: string; status: Status; scheduledAt: string | null; verificationJson: { passed?: boolean } | null; updatedAt: string }

const STATUS_LABEL: Record<Status, string> = { draft: "Bozza", in_review: "In revisione", client_review: "Al cliente", published: "Pubblicata", archived: "Archiviata" };
const STATUS_COLOR: Record<Status, string> = {
  draft: "bg-muted text-foreground",
  in_review: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  client_review: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  archived: "bg-muted text-muted-foreground",
};
const FILTERS: Array<{ key: Status | "all"; label: string }> = [
  { key: "all", label: "Tutte" }, { key: "draft", label: "Bozza" }, { key: "in_review", label: "In revisione" },
  { key: "client_review", label: "Al cliente" }, { key: "published", label: "Pubblicata" }, { key: "archived", label: "Archiviata" },
];

export function DraftList({ projectId }: { projectId: string }) {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/projects/${projectId}/content/drafts${q}`);
      if (res.ok) setDrafts((await res.json()).drafts);
    } catch { setError("Errore di caricamento"); } finally { setLoading(false); }
  }, [projectId, filter]);

  useEffect(() => { load(); }, [load]);

  async function transition(id: string, to: Status) {
    setBusy(id); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/content/drafts/${id}/transition`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to }),
      });
      if (!res.ok) throw new Error((await res.json()).error === "transition_forbidden" ? "Transizione non consentita per il tuo ruolo" : "Errore");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Errore"); } finally { setBusy(null); }
  }

  const counts = drafts.reduce<Record<string, number>>((acc, d) => { acc[d.status] = (acc[d.status] ?? 0) + 1; return acc; }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f.key ? "bg-brand text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {f.label}{f.key !== "all" && counts[f.key] ? ` (${counts[f.key]})` : ""}
          </button>
        ))}
      </div>

      {error && <p className="rounded-md bg-destructive/[0.06] px-3 py-2 text-sm text-destructive">{error}</p>}
      {loading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Caricamento…</p>}

      {!loading && drafts.length === 0 && (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nessun contenuto. Vai su <b>Genera</b> per crearne uno.
        </p>
      )}

      <ul className="space-y-2">
        {drafts.map((d) => (
          <li key={d.id} className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[d.status]}`}>{STATUS_LABEL[d.status]}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{d.format}</span>
                  {d.verificationJson?.passed === true && <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="size-3" /> verificato</span>}
                  {d.verificationJson?.passed === false && <span className="inline-flex items-center gap-1 text-xs text-destructive"><X className="size-3" /> da rivedere</span>}
                  {d.scheduledAt && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalIcon className="size-3" /> {new Date(d.scheduledAt).toLocaleDateString("it-IT")}</span>}
                </div>
                <h3 className="truncate text-sm font-medium">{d.title}</h3>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                {transitionsFrom(d.status).map((t) => (
                  <button key={t.to} onClick={() => transition(d.id, t.to)} disabled={busy === d.id}
                    className="rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50">
                    {busy === d.id ? <Loader2 className="size-3 animate-spin" /> : t.label}
                  </button>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
