"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Clock,
  Headphones,
  Heart,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Star,
} from "lucide-react";
import type {
  ComposedItinerary,
  ComposedItineraryItem,
  VisitorData,
} from "../../visitor-types";

export default function PoiDetailPage({
  params,
}: {
  params: Promise<{ id: string; poiId: string }>;
}) {
  const { id, poiId } = use(params);
  const search = useSearchParams();
  const pathId = search.get("path");
  const isComposed = search.get("compose") === "1";

  const [data, setData] = useState<VisitorData | null>(null);
  const [composed, setComposed] = useState<ComposedItinerary | null>(null);
  const [selectedNarrator, setSelectedNarrator] = useState<string | null>(null);
  const [expandedQA, setExpandedQA] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/projects/${id}/visitor-data`, {
        cache: "no-store",
      });
      if (res.ok) setData(await res.json());
    })();
  }, [id]);

  useEffect(() => {
    if (!isComposed || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(`toolia-preview-visit:${id}`);
      if (raw) setComposed(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [id, isComposed]);

  const poi = data?.pois.find((p) => p.id === poiId) ?? null;
  const path = pathId ? data?.paths.find((p) => p.id === pathId) : null;

  // Schede disponibili per questo POI + lingua principale
  const language = data?.project.languages?.[0] ?? "it";
  const availableSchede = useMemo(
    () =>
      (data?.schede ?? []).filter(
        (s) => s.poiId === poiId && s.language === language,
      ),
    [data, poiId, language],
  );

  // Narratore preferito: param → path → primo disponibile
  const preferredNarratorId: string | null =
    selectedNarrator ??
    (isComposed && composed?.visit.narratorId
      ? composed.visit.narratorId
      : null) ??
    path?.narratorId ??
    availableSchede[0]?.narratorId ??
    null;

  const scheda =
    availableSchede.find((s) => s.narratorId === preferredNarratorId) ??
    availableSchede[0] ??
    null;

  const narrator = data?.narrators.find((n) => n.id === scheda?.narratorId);

  // Next POI nell'itinerario
  const itineraryItems: ComposedItineraryItem[] = useMemo(() => {
    if (isComposed && composed) return composed.itinerary;
    if (pathId && data) {
      const p = data.paths.find((x) => x.id === pathId);
      if (!p) return [];
      const order = Array.isArray(p.poiOrderJson)
        ? (p.poiOrderJson as string[])
        : [];
      return order
        .map((pid, idx) => {
          const poiI = data.pois.find((x) => x.id === pid);
          if (!poiI) return null;
          return {
            order: idx + 1,
            poi: {
              id: poiI.id,
              name: poiI.name,
              description: poiI.description,
              imageUrl: poiI.imageUrl,
              lat: poiI.lat,
              lng: poiI.lng,
              zone: poiI.zone?.name ?? null,
            },
            scheda: null,
            isCore: p.corePoiIds?.includes(pid) ?? false,
            score: 0,
          } as ComposedItineraryItem;
        })
        .filter(Boolean) as ComposedItineraryItem[];
    }
    return [];
  }, [isComposed, composed, pathId, data]);

  const currentIdx = itineraryItems.findIndex((it) => it.poi.id === poiId);
  const nextItem =
    currentIdx >= 0 && currentIdx < itineraryItems.length - 1
      ? itineraryItems[currentIdx + 1]
      : null;
  const prevItem = currentIdx > 0 ? itineraryItems[currentIdx - 1] : null;
  const returnQs = isComposed ? "?compose=1" : pathId ? `?path=${pathId}` : "";

  const qaForPoi = (data?.assistantQA ?? []).filter(
    (q) => q.poiId === poiId || q.scope === "project",
  );
  const missions = (data?.familyMissions ?? []).filter(
    (m) => m.poiId === poiId,
  );

  // Raccordo in ingresso (bridge da path)
  const bridges = useMemo(() => {
    if (!path)
      return [] as Array<{
        fromPoiId: string;
        toPoiId: string;
        navigation?: string;
        body?: string;
        lensAccent?: string;
      }>;
    const arr = Array.isArray(path.bridgesJson)
      ? (path.bridgesJson as Array<{
          fromPoiId: string;
          toPoiId: string;
          navigation?: string;
          body?: string;
          lensAccent?: string;
        }>)
      : [];
    return arr;
  }, [path]);
  const incomingBridge = bridges.find((b) => b.toPoiId === poiId);

  if (!data) {
    return (
      <div className="min-h-[820px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!poi) {
    return (
      <div className="min-h-[820px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">POI non trovato.</p>
      </div>
    );
  }

  const familyMode = data.project.familyMode;

  return (
    <div className="min-h-[820px] bg-paper pb-32">
      {/* Hero POI */}
      <section className="relative w-full aspect-[4/5] max-h-[520px] overflow-hidden bg-muted">
        {poi.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poi.imageUrl}
            alt={poi.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-stone-300 via-stone-400 to-stone-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

        <div className="absolute top-20 left-5">
          <Link
            href={
              isComposed
                ? `/progetti/${id}/preview/visita?compose=1`
                : pathId
                  ? `/progetti/${id}/preview/visita?path=${pathId}`
                  : `/progetti/${id}/preview`
            }
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-[11px] font-medium hover:bg-white/25 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2} />
            Itinerario
          </Link>
        </div>

        <div className="absolute bottom-8 left-5 right-5">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            {poi.zone && (
              <span className="text-[10px] uppercase tracking-[0.28em] text-white/80">
                {poi.zone.name}
              </span>
            )}
            {scheda?.isCore && (
              <span className="inline-flex items-center gap-1 text-[11px] text-white">
                <Star
                  className="h-3 w-3 fill-white stroke-white"
                  strokeWidth={0}
                />
                tappa essenziale
              </span>
            )}
            {currentIdx >= 0 && (
              <span className="text-[11px] text-white/80 tabular-nums">
                {currentIdx + 1} / {itineraryItems.length}
              </span>
            )}
          </div>
          <h1 className="font-heading italic text-white text-[40px] leading-[0.96] tracking-tight max-w-[280px]">
            {poi.name}
          </h1>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 md:px-0 pt-10">
        {/* Bridge in ingresso */}
        {incomingBridge && (
          <div className="mb-8 pl-4 border-l-2 border-brand/70 text-muted-foreground italic font-heading text-lg leading-relaxed">
            {incomingBridge.body ?? incomingBridge.navigation}
          </div>
        )}

        {/* Narrator bar */}
        {narrator && (
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-accent/40 border border-border/50 mb-8">
            <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted shrink-0">
              {narrator.portraitUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={narrator.portraitUrl}
                  alt={narrator.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="h-full w-full flex items-center justify-center font-heading italic text-lg text-muted-foreground">
                  {narrator.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-0.5">
                Ti racconta
              </p>
              <p className="font-heading italic text-xl leading-tight truncate">
                {narrator.name}
              </p>
              {narrator.voiceStyle && (
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {narrator.voiceStyle}
                </p>
              )}
            </div>

            {availableSchede.length > 1 && (
              <select
                value={preferredNarratorId ?? ""}
                onChange={(e) => setSelectedNarrator(e.target.value)}
                className="h-9 px-3 rounded-full border border-border/60 bg-card text-xs"
              >
                {availableSchede.map((s) => {
                  const n = data.narrators.find((x) => x.id === s.narratorId);
                  return (
                    <option key={s.id} value={s.narratorId}>
                      {n?.name ?? s.narratorId}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        )}

        {/* Audio player */}
        {scheda?.audio && <AudioPlayer url={scheda.audio.fileUrl} />}

        {/* Scheda */}
        {scheda ? (
          <article className="mt-8">
            <h2 className="font-heading italic text-2xl tracking-tight mb-5">
              {scheda.title}
            </h2>
            <div className="prose prose-stone max-w-none text-[17px] leading-[1.75] text-foreground/90 whitespace-pre-wrap">
              {scheda.scriptText}
            </div>

            <div className="mt-6 flex items-center gap-4 text-[11px] text-muted-foreground">
              {scheda.durationEstimateSeconds && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3 w-3" strokeWidth={1.8} />
                  {Math.max(
                    1,
                    Math.round(scheda.durationEstimateSeconds / 60),
                  )}{" "}
                  min di lettura
                </span>
              )}
              {scheda.audio && (
                <span className="inline-flex items-center gap-1.5">
                  <Headphones className="h-3 w-3" strokeWidth={1.8} />
                  audio {Math.round(scheda.audio.durationSeconds)}s
                </span>
              )}
              {scheda.isDeepDive && (
                <span className="text-brand">Approfondimento</span>
              )}
            </div>
          </article>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
            Nessuna scheda pubblicata per questo POI.
          </div>
        )}

        {/* Family missions */}
        {familyMode.enabled && missions.length > 0 && (
          <section className="mt-12 rounded-3xl bg-amber-50/60 ring-1 ring-amber-200/60 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-4 w-4 text-amber-700" strokeWidth={2} />
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-800">
                Per i più piccoli
                {familyMode.mascotName ? ` · ${familyMode.mascotName}` : ""}
              </p>
            </div>
            <div className="space-y-4">
              {missions.map((m) => (
                <div key={m.id} className="rounded-2xl bg-card p-5">
                  <p className="font-heading italic text-xl mb-2">
                    {m.kidMissionBrief}
                  </p>
                  {m.clue && (
                    <p className="text-sm text-muted-foreground mb-3">
                      <span className="text-foreground font-medium">
                        Indizio:{" "}
                      </span>
                      {m.clue}
                    </p>
                  )}
                  {m.reward && (
                    <p className="text-[12px] text-amber-800">{m.reward}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Q&A pack */}
        {qaForPoi.length > 0 && (
          <section className="mt-12">
            <div className="flex items-center gap-2 mb-5">
              <MessageCircle
                className="h-4 w-4 text-muted-foreground"
                strokeWidth={1.8}
              />
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Se vuoi sapere di più
              </p>
            </div>
            <div className="space-y-2">
              {qaForPoi.map((q) => {
                const open = expandedQA === q.id;
                const title =
                  q.triggerQuestions?.[0] ?? "Altra curiosità sul luogo";
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-border/60 bg-card overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedQA(open ? null : q.id)}
                      className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-accent/40 transition-colors"
                    >
                      <span className="font-medium text-sm">{title}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          open ? "rotate-180" : ""
                        }`}
                        strokeWidth={1.8}
                      />
                    </button>
                    {open && (
                      <div className="px-4 pb-4 space-y-3 text-[14px] leading-relaxed">
                        <p className="text-foreground/90">{q.verifiedAnswer}</p>
                        {q.extendedAnswer && (
                          <p className="text-muted-foreground italic border-l-2 border-border pl-3">
                            {q.extendedAnswer}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom nav */}
        {itineraryItems.length > 0 && (
          <nav className="mt-16 pt-8 border-t border-border/60 flex items-center justify-between gap-4">
            {prevItem ? (
              <Link
                href={`/progetti/${id}/preview/poi/${prevItem.poi.id}${returnQs}`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground min-w-0"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                <span className="flex flex-col items-start min-w-0">
                  <span className="text-[10px] uppercase tracking-[0.2em]">
                    Precedente
                  </span>
                  <span className="font-heading italic text-base truncate max-w-[180px]">
                    {prevItem.poi.name}
                  </span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {nextItem ? (
              <Link
                href={`/progetti/${id}/preview/poi/${nextItem.poi.id}${returnQs}`}
                className="inline-flex items-center gap-2 text-sm text-foreground min-w-0 text-right"
              >
                <span className="flex flex-col items-end min-w-0">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Prossima tappa
                  </span>
                  <span className="font-heading italic text-base truncate max-w-[200px]">
                    {nextItem.poi.name}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground italic">
                Fine visita
              </span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}

function AudioPlayer({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = async () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      await a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = ref.current;
    if (!a || !duration) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    a.currentTime = pct * duration;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-2xl bg-foreground text-background p-5 flex items-center gap-4">
      <audio ref={ref} src={url} preload="metadata" />
      <button
        onClick={toggle}
        className="h-14 w-14 rounded-full bg-background text-foreground flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
      >
        {playing ? (
          <Pause className="h-5 w-5" strokeWidth={2} />
        ) : (
          <Play className="h-5 w-5 ml-0.5" strokeWidth={2} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.22em] text-background/60 mb-2">
          Audio narrato
        </p>
        <div
          className="h-1.5 w-full bg-background/20 rounded-full cursor-pointer overflow-hidden"
          onClick={seek}
        >
          <div
            className="h-full bg-background transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-background/70 tabular-nums">
          <span>{fmt(currentTime)}</span>
          <span>{duration > 0 ? fmt(duration) : "—"}</span>
        </div>
      </div>
    </div>
  );
}
