"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Headphones,
  Loader2,
  MapPin,
  Star,
} from "lucide-react";
import { PreviewMap } from "@/components/visitor/preview-map";
import type {
  ComposedItinerary,
  ComposedItineraryItem,
  VisitorData,
} from "@/lib/visitor-types";

export function VisitorVisita({
  projectId,
  basePath,
}: {
  projectId: string;
  basePath: string;
}) {
  const search = useSearchParams();
  const pathId = search.get("path");
  const isComposed = search.get("compose") === "1";

  const [data, setData] = useState<VisitorData | null>(null);
  const [composed, setComposed] = useState<ComposedItinerary | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/projects/${projectId}/visitor-data`, {
        cache: "no-store",
      });
      if (res.ok) setData(await res.json());
    })();
  }, [projectId]);

  useEffect(() => {
    if (!isComposed || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(
        `toolia-preview-visit:${projectId}`,
      );
      if (raw) setComposed(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [projectId, isComposed]);

  const itineraryItems = useMemo<ComposedItineraryItem[]>(() => {
    if (isComposed && composed) return composed.itinerary;
    if (pathId && data) {
      const p = data.paths.find((x) => x.id === pathId);
      if (!p) return [];
      const order = Array.isArray(p.poiOrderJson)
        ? (p.poiOrderJson as string[])
        : [];
      return order
        .map((pid, idx) => {
          const poi = data.pois.find((x) => x.id === pid);
          if (!poi) return null;
          const scheda = data.schede.find(
            (s) =>
              s.poiId === pid &&
              (p.narratorId ? s.narratorId === p.narratorId : true),
          );
          const duration =
            scheda?.audio?.durationSeconds ??
            scheda?.durationEstimateSeconds ??
            poi.minStaySeconds ??
            60;
          return {
            order: idx + 1,
            poi: {
              id: poi.id,
              name: poi.name,
              description: poi.description,
              imageUrl: poi.imageUrl,
              lat: poi.lat,
              lng: poi.lng,
              zone: poi.zone?.name ?? null,
            },
            scheda: scheda
              ? {
                  id: scheda.id,
                  title: scheda.title,
                  narratorId: scheda.narratorId,
                  durationSeconds: Math.round(duration),
                  audio: scheda.audio?.fileUrl
                    ? {
                        url: scheda.audio.fileUrl,
                        durationSeconds: scheda.audio.durationSeconds,
                      }
                    : null,
                }
              : null,
            isCore: p.corePoiIds?.includes(pid) ?? false,
            score: 0,
          } as ComposedItineraryItem;
        })
        .filter(Boolean) as ComposedItineraryItem[];
    }
    return [];
  }, [isComposed, composed, pathId, data]);

  const totalSec = useMemo(
    () =>
      itineraryItems.reduce(
        (acc, it) => acc + (it.scheda?.durationSeconds ?? 0),
        0,
      ),
    [itineraryItems],
  );

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const path = pathId ? data.paths.find((x) => x.id === pathId) : null;
  const narrator =
    (isComposed && composed
      ? data.narrators.find((n) => n.id === composed.visit.narratorId)
      : path
        ? data.narrators.find((n) => n.id === path.narratorId)
        : null) ?? null;

  const title = isComposed
    ? "La tua visita"
    : (path?.name ?? data.project.name);
  const subtitle = isComposed
    ? "Composta per te dall'AI"
    : (path?.description ?? "");
  const queryString = isComposed ? "?compose=1" : pathId ? `?path=${pathId}` : "";

  // Mappa POI sequence (per polyline)
  const orderedIds = itineraryItems.map((it) => it.poi.id);
  const mapPois = itineraryItems.map((it) => ({
    id: it.poi.id,
    name: it.poi.name,
    lat: it.poi.lat,
    lng: it.poi.lng,
  }));
  const mapHasGeo = mapPois.some(
    (p) => typeof p.lat === "number" && typeof p.lng === "number",
  );

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <section className="px-5 pt-28 pb-6">
        <Link
          href={`${basePath}/itinerari`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Cambia itinerario
        </Link>
        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-2">
          {isComposed ? "Visita personalizzata" : "Itinerario d'autore"}
        </p>
        <h1 className="font-heading italic text-[32px] leading-tight tracking-tight mb-3">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
            {itineraryItems.length} luoghi
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
            {Math.round(totalSec / 60)} min
          </span>
          {narrator && (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Headphones className="h-3.5 w-3.5" strokeWidth={1.8} />
              {narrator.name}
            </span>
          )}
        </div>
      </section>

      {/* Mappa con percorso */}
      {mapHasGeo && itineraryItems.length > 0 && (
        <section className="px-5 mb-8">
          <PreviewMap
            projectId={projectId}
            pois={mapPois}
            pathOrder={orderedIds}
            aspect="aspect-square"
          />
        </section>
      )}

      {/* Lista tappe */}
      <section className="px-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-4">
          Le tappe
        </p>
        {itineraryItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
            Nessuna tappa in questo itinerario.
          </div>
        ) : (
          <ol className="space-y-3">
            {itineraryItems.map((it, idx) => {
              const isLast = idx === itineraryItems.length - 1;
              return (
                <li key={it.poi.id} className="relative">
                  {!isLast && (
                    <div className="absolute left-[27px] top-[60px] bottom-[-12px] w-px bg-border/70" />
                  )}
                  <Link
                    href={`${basePath}/poi/${it.poi.id}${queryString}`}
                    className="group flex gap-4 p-2 rounded-2xl hover:bg-accent/40 transition-colors"
                  >
                    <div className="shrink-0 w-[54px] flex flex-col items-center">
                      <div className="h-11 w-11 rounded-full bg-foreground text-background flex items-center justify-center font-heading italic text-base tabular-nums relative z-10">
                        {it.order}
                      </div>
                    </div>
                    <div className="flex-1 flex gap-3 items-stretch min-w-0">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                        {it.poi.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={it.poi.imageUrl}
                            alt={it.poi.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-stone-300 to-stone-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {it.poi.zone && (
                            <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                              {it.poi.zone}
                            </span>
                          )}
                          {it.isCore && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-brand">
                              <Star
                                className="h-2.5 w-2.5 fill-brand stroke-brand"
                                strokeWidth={0}
                              />
                              essenziale
                            </span>
                          )}
                        </div>
                        <h3 className="font-heading italic text-lg leading-tight tracking-tight mb-1 group-hover:text-brand transition-colors">
                          {it.poi.name}
                        </h3>
                        {it.scheda?.title && (
                          <p className="text-[12px] text-muted-foreground line-clamp-1">
                            {it.scheda.title}
                          </p>
                        )}
                        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                          {it.scheda?.durationSeconds && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" strokeWidth={1.8} />
                              {Math.round(it.scheda.durationSeconds / 60) || 1}{" "}
                              min
                            </span>
                          )}
                          {it.scheda?.audio && (
                            <span className="inline-flex items-center gap-1">
                              <Headphones
                                className="h-3 w-3"
                                strokeWidth={1.8}
                              />
                              audio
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center pr-2">
                        <ArrowRight
                          className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground"
                          strokeWidth={1.8}
                        />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        {/* Start CTA */}
        {itineraryItems.length > 0 && (
          <div className="mt-10 flex justify-center">
            <Link
              href={`${basePath}/poi/${itineraryItems[0].poi.id}${queryString}`}
              className="group inline-flex items-center gap-2 h-12 px-6 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors"
            >
              Inizia la visita
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.8}
              />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
