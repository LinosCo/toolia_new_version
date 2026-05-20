"use client";

import { useState } from "react";
import { Loader2, Wand2, Check, X } from "lucide-react";

interface Verification {
  passed: boolean;
  mustTellCovered: string[];
  mustTellMissing: string[];
  avoidViolations: string[];
}

interface Draft {
  id: string;
  title: string;
  body: string;
}

export function GeneratePanel({ projectId }: { projectId: string }) {
  const [format, setFormat] = useState("social_post");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setDraft(null);
    setVerification(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/content/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format, topic }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "errore");
      const data = await res.json();
      setDraft(data.draft);
      setVerification(data.verification);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore di generazione"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Genera contenuto</h2>

      <form onSubmit={generate} className="flex flex-wrap gap-2">
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-foreground/30"
        >
          <option value="social_post">Post social</option>
          <option value="article">Articolo</option>
        </select>

        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Tema (es. l'affresco incompiuto)"
          className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground/30"
        />

        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand/90 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.1)] disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Wand2 className="size-4" />
          )}
          Genera
        </button>
      </form>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-destructive/[0.06] px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {draft && (
        <article className="rounded-xl border border-border p-4">
          {verification && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {verification.mustTellCovered.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
                >
                  <Check className="size-3" /> {m}
                </span>
              ))}
              {verification.mustTellMissing.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full bg-destructive/[0.06] px-2 py-0.5 text-xs text-destructive"
                >
                  <X className="size-3" /> {m}
                </span>
              ))}
              {verification.avoidViolations.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1 rounded-full bg-destructive/[0.06] px-2 py-0.5 text-xs text-destructive"
                >
                  <X className="size-3" /> avoid: {a}
                </span>
              ))}
            </div>
          )}
          <h3 className="mb-2 text-base font-medium">{draft.title}</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {draft.body}
          </p>
        </article>
      )}
    </section>
  );
}
