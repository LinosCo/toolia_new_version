"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Compass,
  Heart,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import type { VisitorData } from "@/lib/visitor-types";
import { PreviewMap } from "@/components/visitor/preview-map";

export function VisitorHome({
  projectId,
  basePath,
}: {
  projectId: string;
  basePath: string;
}) {
  const [data, setData] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/visitor-data`, {
          cache: "no-store",
        });
        if (res.ok && alive) setData(await res.json());
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Impossibile caricare l&apos;anteprima.
        </p>
      </div>
    );
  }

  const { project, paths, pois, schede, narrators } = data;
  const poisCount = pois.length;
  const narratorsCount = narrators.length;
  const poiWithScheda = new Set(schede.map((s) => s.poiId)).size;

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative min-h-[78vh] w-full overflow-hidden">
        {project.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.coverImage}
            alt={project.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-stone-700 via-stone-800 to-stone-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/85" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[oklch(0.2_0.05_40_/_0.5)] via-transparent to-transparent" />

        <div className="relative z-10 min-h-[78vh] flex flex-col justify-end px-5 pb-12">
          <div className="max-w-4xl">
            {project.familyMode.enabled && (
              <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-[11px] uppercase tracking-[0.22em] text-white mb-5">
                <Heart className="h-3 w-3" strokeWidth={2} />
                Anche per bambini
              </span>
            )}
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/70 mb-3">
              {project.type}
              {project.city ? ` · ${project.city}` : ""}
            </p>
            <h1 className="font-heading italic text-white text-[40px] leading-[0.95] tracking-tight mb-6 max-w-xs">
              {project.name}
            </h1>
            {project.brief.tipoEsperienza && (
              <p className="text-white/85 text-[15px] leading-relaxed mb-8">
                {project.brief.tipoEsperienza}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Link
                href={`${basePath}/crea`}
                className="group inline-flex items-center gap-2.5 h-12 pl-5 pr-4 py-3 rounded-full bg-brand text-white text-[14px] font-medium shadow-2xl hover:bg-brand/90 transition-colors"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                Crea la tua visita
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={1.8}
                />
              </Link>
              <a
                href="#itinerari"
                className="group inline-flex items-center gap-2.5 h-12 pl-5 pr-4 py-3 rounded-full bg-white/12 backdrop-blur-md border border-white/25 text-white text-[14px] font-medium hover:bg-white/20 transition-colors"
              >
                <Compass className="h-4 w-4" strokeWidth={1.8} />
                Scegli un itinerario
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-white/70 text-xs">
              <span className="tabular-nums">
                <strong className="text-white font-medium text-sm">
                  {poisCount}
                </strong>{" "}
                luoghi
              </span>
              <span className="tabular-nums">
                <strong className="text-white font-medium text-sm">
                  {narratorsCount}
                </strong>{" "}
                voci narranti
              </span>
              <span className="tabular-nums">
                <strong className="text-white font-medium text-sm">
                  {paths.length}
                </strong>{" "}
                itinerari
              </span>
              <span className="tabular-nums">
                <strong className="text-white font-medium text-sm">
                  {poiWithScheda}
                </strong>{" "}
                schede
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ITINERARI */}
      <section id="itinerari" className="px-5 py-14">
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-3">
          Itinerari d&apos;autore
        </p>
        <h2 className="font-heading italic text-[28px] tracking-tight mb-8">
          Percorsi pensati
          <br />
          da chi conosce il luogo
        </h2>

        {paths.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
            Nessun itinerario tematico pubblicato.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {paths.map((p, idx) => {
              const narrator = narrators.find((n) => n.id === p.narratorId);
              const order = Array.isArray(p.poiOrderJson)
                ? (p.poiOrderJson as string[])
                : [];
              const firstPoi = pois.find((x) => x.id === order[0]);
              const img = firstPoi?.imageUrl;
              return (
                <Link
                  key={p.id}
                  href={`${basePath}/visita?path=${p.id}`}
                  className="group relative flex flex-col rounded-3xl border border-border/60 bg-card hover:border-foreground/30 transition-all duration-300 overflow-hidden"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-stone-200 via-stone-300 to-stone-400">
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={p.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute top-5 left-5 text-white/80 font-heading italic text-5xl tabular-nums">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="absolute bottom-5 left-5 right-5 text-white">
                      <h3 className="font-heading italic text-xl leading-tight tracking-tight mb-2">
                        {p.name}
                      </h3>
                      {p.themeFocus && (
                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/75">
                          {p.themeFocus}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {p.description}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-auto">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" strokeWidth={1.8} />
                        {order.length} tappe
                      </span>
                      {p.durationTargetMinutes && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3 w-3" strokeWidth={1.8} />
                          {p.durationTargetMinutes} min
                        </span>
                      )}
                      {narrator && (
                        <span className="truncate max-w-[120px]">
                          con {narrator.name}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* MAPPA */}
      {pois.some((p) => p.lat && p.lng) && (
        <section className="px-5 py-14 border-t border-border/60">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-3">
            La mappa del luogo
          </p>
          <h2 className="font-heading italic text-[28px] tracking-tight mb-6">
            Dove siamo
          </h2>
          <PreviewMap projectId={projectId} pois={pois} />
        </section>
      )}

      {/* NARRATORI */}
      {narrators.length > 0 && (
        <section className="px-5 py-12 border-t border-border/60 bg-accent/30">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-5">
            Le voci del luogo
          </p>
          <div className="flex flex-wrap gap-3">
            {narrators.map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-3 bg-card rounded-full border border-border/60 pl-1 pr-4 py-1"
              >
                <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted shrink-0">
                  {n.portraitUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.portraitUrl}
                      alt={n.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center font-heading italic text-base text-muted-foreground">
                      {n.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[13px] font-medium leading-tight">
                    {n.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {n.kind === "backbone" ? "Voce principale" : "Personaggio"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
