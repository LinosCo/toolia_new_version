"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Sparkles, Plus, RefreshCw, AlertCircle } from "lucide-react";

interface AssetRow {
  id: string;
  kind: string;
  category: string;
  status: string;
  label: string | null;
  _count?: { evidence: number };
}
interface Manifest {
  palette?: Record<string, string | string[] | undefined>;
  tone?: { descriptors?: string[] };
  imagery?: { style?: string };
  summary?: string;
}
interface Skill {
  id: string;
  version: number;
  manifest: Manifest;
}

export function BrandWorkspace({ projectId }: { projectId: string }) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [kind, setKind] = useState("UPLOAD_TEXT");
  const [category, setCategory] = useState("PAST_CONTENT");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/projects/${projectId}/brand`;

  const load = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([fetch(`${base}/assets`), fetch(`${base}/skill`)]);
      if (a.ok) setAssets((await a.json()).assets);
      if (s.ok) setSkill((await s.json()).skill);
    } catch {
      setError("Errore di caricamento");
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  async function addAsset() {
    if (!content.trim()) return;
    setBusy("add");
    setError(null);
    try {
      const res = await fetch(`${base}/assets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, category, content }),
      });
      if (!res.ok) throw new Error("Errore creazione asset");
      setContent("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(null);
    }
  }

  async function extract(assetId: string) {
    setBusy(assetId);
    setError(null);
    try {
      const res = await fetch(`${base}/assets/${assetId}/extract`, { method: "POST" });
      if (!res.ok) throw new Error("Estrazione fallita");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(null);
    }
  }

  async function distill() {
    setBusy("distill");
    setError(null);
    try {
      const res = await fetch(`${base}/distill`, { method: "POST" });
      if (!res.ok) throw new Error("Distillazione fallita (servono evidenze?)");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(null);
    }
  }

  const palette = skill?.manifest.palette ?? {};
  const swatches = Object.entries(palette).filter(
    ([k, v]) => k !== "citations" && typeof v === "string",
  ) as [string, string][];

  return (
    <div className="space-y-6">
      {error && (
        <p className="flex items-center gap-2 rounded-md bg-destructive/[0.06] px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </p>
      )}

      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-medium">Aggiungi asset</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
          >
            <option value="UPLOAD_TEXT">Testo</option>
            <option value="UPLOAD_IMAGE">Immagine (data URL)</option>
            <option value="URL_PAGE">URL</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
          >
            {["PAST_CONTENT", "LOGO", "COLOR_PALETTE", "TYPOGRAPHY", "BRAND_BOOK", "MOODBOARD", "PRODUCT_PHOTO", "OTHER"].map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ),
            )}
          </select>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Incolla testo di brand, una data URL immagine, o un URL…"
          className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-foreground/30"
        />
        <button
          onClick={addAsset}
          disabled={busy === "add" || !content.trim()}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === "add" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Aggiungi
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Asset ({assets.length})</h2>
        {assets.length === 0 && (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Nessun asset. Aggiungine uno per iniziare.
          </p>
        )}
        {assets.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">{a.category}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {a.status} · {a._count?.evidence ?? 0} evidenze
              </span>
            </div>
            <button
              onClick={() => extract(a.id)}
              disabled={busy === a.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {busy === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Estrai
            </button>
          </div>
        ))}
      </section>

      <section>
        <button
          onClick={distill}
          disabled={busy === "distill"}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === "distill" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Distilla BrandSkill
        </button>
      </section>

      {skill && (
        <section className="rounded-xl border border-border p-4">
          <h2 className="mb-3 text-sm font-medium">BrandSkill v{skill.version}</h2>
          {swatches.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {swatches.map(([name, hex]) => (
                <div key={name} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1">
                  <span className="size-5 rounded" style={{ backgroundColor: hex }} />
                  <span className="text-xs text-muted-foreground">
                    {name}: {hex}
                  </span>
                </div>
              ))}
            </div>
          )}
          {skill.manifest.tone?.descriptors && skill.manifest.tone.descriptors.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {skill.manifest.tone.descriptors.map((d) => (
                <span key={d} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {d}
                </span>
              ))}
            </div>
          )}
          {skill.manifest.imagery?.style && (
            <p className="mb-2 text-sm">
              <span className="text-muted-foreground">Imagery:</span> {skill.manifest.imagery.style}
            </p>
          )}
          {skill.manifest.summary && <p className="text-sm leading-relaxed">{skill.manifest.summary}</p>}
        </section>
      )}
    </div>
  );
}
