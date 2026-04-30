"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PreviewMap } from "@/components/visitor/preview-map";
import type { VisitorData } from "@/lib/visitor-types";

export function VisitorMappa({
  projectId,
}: {
  projectId: string;
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
          Impossibile caricare la mappa.
        </p>
      </div>
    );
  }

  const mapPois = data.pois.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
  }));

  return (
    <div className="min-h-screen flex flex-col pt-20 pb-24 px-5">
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">
          Esplora liberamente
        </p>
        <h1 className="font-heading italic text-[30px] leading-tight tracking-tight">
          Mappa interattiva
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-[90%]">
          Tutti i punti di interesse sono segnalati con dei pin. Tocca un pin
          per aprire la scheda.
        </p>
      </header>

      <div className="flex-1 flex">
        <div className="w-full">
          <PreviewMap
            projectId={projectId}
            pois={mapPois}
            aspect="aspect-[3/4]"
          />
        </div>
      </div>
    </div>
  );
}
