"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Sparkles,
  Star,
} from "lucide-react";
import type { VisitorData } from "@/lib/visitor-types";

const RATING_STARS = [1, 2, 3, 4, 5] as const;
type Rating = 0 | 1 | 2 | 3 | 4 | 5;

interface DurationSlot {
  value: number; // minuti
  label: string;
  hint: string;
}

function deriveDurationSlots(data: VisitorData): DurationSlot[] {
  // Stima: per ogni POI, prendi la scheda media (al primo narratore) in IT
  const byPoi = new Map<string, number>();
  for (const s of data.schede) {
    const dur = s.durationEstimateSeconds ?? 60;
    const cur = byPoi.get(s.poiId);
    if (cur === undefined || dur < cur) byPoi.set(s.poiId, dur);
  }
  // Aggiungi minStay del POI per realismo
  let coreSec = 0;
  let totalSec = 0;
  for (const poi of data.pois) {
    const sched = byPoi.get(poi.id) ?? 0;
    const stay = poi.minStaySeconds ?? 0;
    const sec = sched + stay;
    totalSec += sec;
    // Considera "core" se almeno una scheda del POI è isCore
    const hasCore = data.schede.some((s) => s.poiId === poi.id && s.isCore);
    if (hasCore) coreSec += sec;
  }

  const round5 = (m: number) => Math.max(15, Math.round(m / 5) * 5);
  const shortMin = round5(coreSec / 60);
  const longMin = round5(totalSec / 60);
  const midMin = round5((coreSec + (totalSec - coreSec) * 0.5) / 60);

  // Se i tre slot collassano (progetto piccolo), genera fallback ragionevole
  if (longMin <= shortMin + 5) {
    return [
      { value: shortMin, label: `${shortMin} min`, hint: "L'essenziale" },
      {
        value: shortMin * 2,
        label: `${shortMin * 2} min`,
        hint: "Con calma",
      },
    ];
  }

  return [
    {
      value: shortMin,
      label: `${shortMin} min`,
      hint: "Solo le tappe essenziali",
    },
    {
      value: midMin,
      label: `${midMin} min`,
      hint: "Una visita equilibrata",
    },
    {
      value: longMin,
      label: longMin >= 120 ? `${(longMin / 60).toFixed(1)} h` : `${longMin} min`,
      hint: "Tutto, con calma",
    },
  ];
}

export function VisitorCrea({
  projectId,
  basePath,
}: {
  projectId: string;
  basePath: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<VisitorData | null>(null);
  const [step, setStep] = useState<0 | 1>(0);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [duration, setDuration] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/projects/${projectId}/visitor-data`, {
        cache: "no-store",
      });
      if (res.ok) setData(await res.json());
    })();
  }, [projectId]);

  const slots = useMemo(() => (data ? deriveDurationSlots(data) : []), [data]);
  useEffect(() => {
    if (slots.length && duration === null) {
      // default = slot medio se presente, altrimenti il primo
      setDuration(slots[Math.min(1, slots.length - 1)].value);
    }
  }, [slots, duration]);

  const setRating = (driverId: string, value: Rating) => {
    setRatings((cur) => ({ ...cur, [driverId]: value }));
  };

  const compose = async () => {
    if (!duration) return;
    setComposing(true);
    setError(null);
    try {
      // Driver con rating > 0, ordinati per peso desc
      const selectedDrivers = Object.entries(ratings)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

      const res = await fetch(`/api/projects/${projectId}/compose-visit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          driverIds: selectedDrivers,
          driverRatings: ratings,
          personaId: null,
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
          `toolia-preview-visit:${projectId}`,
          JSON.stringify(json),
        );
      }
      router.push(`${basePath}/visita?compose=1`);
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

  const { drivers } = data;
  const hasDrivers = drivers.length > 0;
  const totalRating = Object.values(ratings).reduce<number>(
    (a, b) => a + b,
    0,
  );
  const canComposeFromStep0 = !hasDrivers || totalRating > 0;

  return (
    <div className="min-h-screen flex flex-col px-5 pt-20 pb-32">
      <Link
        href={`${basePath}/scegli`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 self-start"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
        Indietro
      </Link>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 flex-1 last:flex-none">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-medium transition-colors ${
                step >= i
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > i ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            {i < 1 && (
              <div
                className={`h-px flex-1 transition-colors ${
                  step > i ? "bg-foreground" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* STEP 0: rating driver */}
      {step === 0 && hasDrivers && (
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-3">
            Le tue preferenze
          </p>
          <h1 className="font-heading italic text-[28px] leading-tight tracking-tight mb-3">
            Cosa ti piacerebbe approfondire?
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Da 0 a 5 stelle quanto ti interessa ognuno di questi argomenti.
          </p>

          <div className="flex flex-col gap-2">
            {drivers.map((d) => {
              const value = ratings[d.id] ?? 0;
              return (
                <div
                  key={d.id}
                  className="rounded-2xl border border-border/70 bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-heading italic text-[20px] leading-tight tracking-tight truncate">
                        {d.name}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
                        {d.domain}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {RATING_STARS.map((r) => {
                      const filled = value >= r;
                      // tap sulla stella già attiva = toggle off
                      const next: Rating = value === r ? ((r - 1) as Rating) : r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRating(d.id, next)}
                          aria-label={`${r} stelle su 5`}
                          className="p-1.5 -m-1.5"
                        >
                          <Star
                            className={`h-7 w-7 transition-colors ${
                              filled
                                ? "fill-brand stroke-brand"
                                : "fill-transparent stroke-muted-foreground/40"
                            }`}
                            strokeWidth={1.4}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 0 && !hasDrivers && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Nessun tema configurato per questo progetto. Procediamo direttamente
            alla scelta della durata.
          </p>
        </div>
      )}

      {/* STEP 1: durata */}
      {step === 1 && (
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-3">
            Quanto tempo
          </p>
          <h1 className="font-heading italic text-[28px] leading-tight tracking-tight mb-3">
            Quanto tempo hai?
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Comporremo un percorso che sta nel tempo che hai a disposizione.
          </p>

          <div className="flex flex-col gap-3">
            {slots.map((s) => {
              const active = duration === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setDuration(s.value)}
                  className={`flex items-start gap-4 p-5 rounded-2xl border text-left transition-all ${
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-border/70 bg-card hover:border-foreground/40"
                  }`}
                >
                  <Clock className="h-5 w-5 mt-0.5 shrink-0" strokeWidth={1.6} />
                  <div>
                    <p className="font-heading italic text-2xl leading-tight mb-1">
                      {s.label}
                    </p>
                    <p
                      className={`text-[13px] leading-relaxed ${
                        active ? "text-white/85" : "text-muted-foreground"
                      }`}
                    >
                      {s.hint}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-900">
          {error}
        </div>
      )}

      {/* Nav: CTA primaria full-width + secondaria sotto, niente overlap con i FAB */}
      <div className="mt-8 flex flex-col gap-3 px-2">
        {step === 0 ? (
          <button
            type="button"
            disabled={!canComposeFromStep0}
            onClick={() => setStep(1)}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continua
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </button>
        ) : (
          <button
            type="button"
            disabled={composing || !duration}
            onClick={compose}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-60"
          >
            {composing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" strokeWidth={1.8} />
            )}
            Componi la mia visita
          </button>
        )}
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(0)}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 h-10"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
            Ricomincia
          </button>
        )}
      </div>
    </div>
  );
}
