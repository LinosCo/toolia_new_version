"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, MapPin, Loader2, ArrowRight } from "lucide-react";
import type { VisitorData } from "@/lib/visitor-types";

export function VisitorItinerari({
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
          Impossibile caricare gli itinerari.
        </p>
      </div>
    );
  }

  const { paths, pois, narrators } = data;

  return (
    <div className="min-h-screen pb-24 pt-20 px-5">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-3">
          Itinerari tematici
        </p>
        <h1 className="font-heading italic text-[34px] leading-[1.05] tracking-tight">
          Scegli la categoria
        </h1>
      </header>

      {paths.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
          Nessun itinerario disponibile per questo progetto.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {paths.map((p, idx) => {
            const order = Array.isArray(p.poiOrderJson)
              ? (p.poiOrderJson as string[])
              : [];
            const firstPoi = pois.find((x) => x.id === order[0]);
            const img = firstPoi?.imageUrl;
            const narrator = narrators.find((n) => n.id === p.narratorId);
            return (
              <li key={p.id}>
                <Link
                  href={`${basePath}/visita?path=${p.id}`}
                  className="group relative block overflow-hidden rounded-3xl shadow-lg active:scale-[0.99] transition-transform"
                >
                  <div className="relative aspect-[4/5] bg-gradient-to-br from-stone-300 to-stone-500">
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={p.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                    <span className="absolute top-5 left-5 text-white/85 font-heading italic text-5xl tabular-nums leading-none">
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    <div className="absolute bottom-5 left-5 right-5 text-white">
                      <h3 className="font-heading italic text-[26px] leading-tight tracking-tight mb-2">
                        {p.name}
                      </h3>
                      {p.themeFocus && (
                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/75 mb-3">
                          {p.themeFocus}
                        </p>
                      )}
                      <div className="flex items-center gap-x-4 text-[11px] text-white/85">
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
                          <span className="truncate max-w-[110px]">
                            con {narrator.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="absolute top-5 right-5 h-10 w-10 rounded-full bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center">
                      <ArrowRight
                        className="h-4 w-4 text-white transition-transform group-hover:translate-x-0.5"
                        strokeWidth={1.8}
                      />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
