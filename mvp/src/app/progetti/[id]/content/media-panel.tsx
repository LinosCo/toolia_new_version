"use client";

import { useState } from "react";
import { Loader2, ImagePlus, Check, X } from "lucide-react";

interface MediaResult { id: string; mode: string; prompt?: string | null; outputUrl: string | null; status: string; identityPassed?: boolean | null; identityScore?: number | null; identityNotes?: string | null }

export function MediaPanel({ projectId }: { projectId: string }) {
  const [mode, setMode] = useState<"GENERATION" | "PRESERVATION_EDIT">("GENERATION");
  const [prompt, setPrompt] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MediaResult | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    if (mode === "PRESERVATION_EDIT" && !sourceUrl.trim()) { setError("Per la modifica serve un'immagine sorgente (data URL)."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/media/generate`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, prompt, ...(mode === "PRESERVATION_EDIT" ? { sourceUrl } : {}) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "errore");
      setResult((await res.json()).asset);
    } catch (err) { setError(err instanceof Error ? err.message : "Errore di generazione"); } finally { setLoading(false); }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Media</h2>
      <form onSubmit={generate} className="space-y-2">
        <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="rounded-lg border border-border bg-background px-2 py-2 text-sm">
          <option value="GENERATION">Genera da prompt</option>
          <option value="PRESERVATION_EDIT">Modifica preservando (foto reale)</option>
        </select>
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Descrivi l'immagine o la modifica…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground/30" />
        {mode === "PRESERVATION_EDIT" && (
          <textarea value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} rows={2}
            placeholder="Incolla la data URL dell'immagine sorgente (data:image/...;base64,...)"
            className="w-full rounded-lg border border-border bg-background p-2 text-xs font-mono outline-none focus:ring-1 focus:ring-foreground/30" />
        )}
        <button type="submit" disabled={loading || !prompt.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Genera
        </button>
      </form>

      {error && <p className="rounded-md bg-destructive/[0.06] px-3 py-2 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="rounded-xl border border-border p-4">
          {result.status === "rejected" && (
            <p className="mb-2 flex items-center gap-1.5 text-sm text-destructive"><X className="size-4" /> Identità non preservata{result.identityScore != null ? ` (${Math.round(result.identityScore * 100)}%)` : ""}{result.identityNotes ? ` — ${result.identityNotes}` : ""}</p>
          )}
          {result.status === "ready" && result.identityPassed && (
            <p className="mb-2 flex items-center gap-1.5 text-sm text-emerald-600"><Check className="size-4" /> Identità preservata{result.identityScore != null ? ` (${Math.round(result.identityScore * 100)}%)` : ""}</p>
          )}
          {result.status === "failed" && <p className="mb-2 text-sm text-destructive">Generazione fallita.</p>}
          {result.outputUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.outputUrl} alt={result.prompt ?? "media"} className={`max-h-96 w-auto rounded-lg border border-border ${result.status === "rejected" ? "opacity-60" : ""}`} />
          )}
        </div>
      )}
    </section>
  );
}
