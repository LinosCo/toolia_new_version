"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { VisitorData } from "../visitor-types";

type DurationChoice = { value: number; label: string; hint: string };

const DURATIONS: DurationChoice[] = [
  { value: 30, label: "30 min", hint: "Un assaggio veloce" },
  { value: 60, label: "1 ora", hint: "La visita classica" },
  { value: 90, label: "1 ora e mezza", hint: "Più spazio per raccontare" },
  { value: 150, label: "Più di 2 ore", hint: "Tutto il luogo, con calma" },
];

export default function CreaVisitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<VisitorData | null>(null);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [duration, setDuration] = useState<number>(60);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null,
  );
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/projects/${id}/visitor-data`, {
        cache: "no-store",
      });
      if (res.ok) setData(await res.json());
    })();
  }, [id]);

  const toggleDriver = (did: string) => {
    setSelectedDrivers((cur) =>
      cur.includes(did) ? cur.filter((x) => x !== did) : [...cur, did],
    );
  };

  const compose = async () => {
    setComposing(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}/compose-visit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          driverIds: selectedDrivers,
          personaId: selectedPersonaId,
          durationMinutes: duration,
          familyMode: data?.project.familyMode.enabled ?? false,
        }),
      });
      if (!res.ok) {
        setError("Non è stato possibile comporre la visita.");
        setComposing(false);
        return;
      }
      const json = await res.json();
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          `toolia-preview-visit:${id}`,
          JSON.stringify(json),
        );
      }
      router.push(`/progetti/${id}/preview/visita?compose=1`);
    } catch {
      setError("Errore di connessione.");
      setComposing(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { drivers, personas } = data;
  const hasDrivers = drivers.length > 0;
  const hasPersonas = personas.length > 0;
  const canNext = step === 0 ? selectedDrivers.length > 0 || !hasDrivers : true;

  return (
    <div className="min-h-screen bg-paper pt-24 pb-20 px-6 md:px-12">
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/progetti/${id}/preview`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Torna all'ingresso
        </Link>

        {/* Stepper progress */}
        <div className="flex items-center gap-3 mb-12">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 flex-1 last:flex-none"
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-medium transition-colors ${
                  step >= i
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > i ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`h-px flex-1 transition-colors ${
                    step > i ? "bg-foreground" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* STEP 0: driver */}
        {step === 0 && hasDrivers && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-3">
              Primo passaggio
            </p>
            <h1 className="font-heading italic text-4xl md:text-5xl tracking-tight mb-3">
              Cosa ti interessa di più?
            </h1>
            <p className="text-sm text-muted-foreground mb-8 max-w-xl">
              Scegli uno o più temi. Adatteremo la visita ai tuoi interessi.
            </p>

            <div className="grid md:grid-cols-2 gap-3">
              {drivers.map((d) => {
                const active = selectedDrivers.includes(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => toggleDriver(d.id)}
                    className={`text-left p-5 rounded-2xl border transition-all ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/70 bg-card hover:border-foreground/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-[10px] uppercase tracking-[0.22em] opacity-70">
                        {d.domain}
                      </p>
                      {active && <Check className="h-4 w-4 shrink-0" />}
                    </div>
                    <p className="font-heading italic text-2xl leading-tight mb-2">
                      {d.name}
                    </p>
                    <p
                      className={`text-[13px] leading-relaxed ${
                        active ? "text-background/80" : "text-muted-foreground"
                      }`}
                    >
                      {d.narrativeValue || d.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 0 — persona: solo se personas esistono e si skippa driver */}
        {step === 0 && !hasDrivers && hasPersonas && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-3">
              Primo passaggio
            </p>
            <h1 className="font-heading italic text-4xl md:text-5xl tracking-tight mb-3">
              Come ti vuoi sentire?
            </h1>
            <div className="grid md:grid-cols-2 gap-3 mt-8">
              {personas.map((p) => {
                const active = selectedPersonaId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPersonaId(active ? null : p.id)}
                    className={`text-left p-5 rounded-2xl border transition-all ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/70 bg-card hover:border-foreground/40"
                    }`}
                  >
                    <p className="font-heading italic text-2xl">{p.name}</p>
                    <p
                      className={`text-[13px] leading-relaxed mt-2 ${
                        active ? "text-background/80" : "text-muted-foreground"
                      }`}
                    >
                      {p.motivation}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 1: durata */}
        {step === 1 && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-3">
              Secondo passaggio
            </p>
            <h1 className="font-heading italic text-4xl md:text-5xl tracking-tight mb-3">
              Quanto tempo hai?
            </h1>
            <p className="text-sm text-muted-foreground mb-8 max-w-xl">
              Comporremo un percorso che sta nel tempo che hai a disposizione.
            </p>

            <div className="grid md:grid-cols-2 gap-3">
              {DURATIONS.map((d) => {
                const active = duration === d.value;
                return (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/70 bg-card hover:border-foreground/40"
                    }`}
                  >
                    <Clock
                      className="h-5 w-5 mt-0.5 shrink-0"
                      strokeWidth={1.6}
                    />
                    <div>
                      <p className="font-heading italic text-2xl leading-tight mb-1">
                        {d.label}
                      </p>
                      <p
                        className={`text-[13px] leading-relaxed ${
                          active
                            ? "text-background/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        {d.hint}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: persona (opzionale) o conferma */}
        {step === 2 && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-3">
              Ultimo passaggio
            </p>
            <h1 className="font-heading italic text-4xl md:text-5xl tracking-tight mb-3">
              Come ti racconto il luogo?
            </h1>
            <p className="text-sm text-muted-foreground mb-8 max-w-xl">
              Scegli un'attitudine — oppure salta e lascia decidere a noi.
            </p>

            {hasPersonas ? (
              <div className="grid md:grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedPersonaId(null)}
                  className={`text-left p-5 rounded-2xl border transition-all ${
                    selectedPersonaId === null
                      ? "border-foreground bg-foreground text-background"
                      : "border-border/70 bg-card hover:border-foreground/40"
                  }`}
                >
                  <p className="font-heading italic text-2xl">Decidi tu</p>
                  <p
                    className={`text-[13px] leading-relaxed mt-2 ${
                      selectedPersonaId === null
                        ? "text-background/80"
                        : "text-muted-foreground"
                    }`}
                  >
                    Usa il tono editoriale del progetto
                  </p>
                </button>
                {personas.map((p) => {
                  const active = selectedPersonaId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPersonaId(p.id)}
                      className={`text-left p-5 rounded-2xl border transition-all ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border/70 bg-card hover:border-foreground/40"
                      }`}
                    >
                      <p className="font-heading italic text-2xl">{p.name}</p>
                      <p
                        className={`text-[13px] leading-relaxed mt-2 ${
                          active
                            ? "text-background/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        {p.motivation}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nessun profilo visitatore configurato. Procediamo con il tono
                editoriale di default.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-900">
            {error}
          </div>
        )}

        {/* Nav */}
        <div className="mt-12 flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={() =>
                setStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2) : s))
              }
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
              Indietro
            </button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button
              disabled={!canNext}
              onClick={() => setStep((s) => (s + 1) as 0 | 1 | 2)}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Avanti
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </button>
          ) : (
            <button
              disabled={composing}
              onClick={compose}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-60"
            >
              {composing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
              )}
              Componi la mia visita
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
