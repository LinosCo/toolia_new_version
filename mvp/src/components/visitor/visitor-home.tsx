"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Languages, Loader2 } from "lucide-react";
import type { VisitorData } from "@/lib/visitor-types";

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
          Impossibile caricare il progetto.
        </p>
      </div>
    );
  }

  const { project } = data;

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Hero photo full bleed */}
      <div className="absolute inset-0 z-0">
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/90" />
      </div>

      {/* Foreground */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Logo / brand top — pt generoso per restare sotto status bar + dynamic island */}
        <header className="pt-24 md:pt-20 px-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/75 mb-3">
            {project.type ?? "Visita"}
            {project.city ? ` · ${project.city}` : ""}
          </p>
          <h1 className="font-heading italic text-white text-[44px] leading-[0.95] tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
            {project.name}
          </h1>
        </header>

        {/* Welcome text centered */}
        <div className="flex-1 flex items-center justify-center px-8">
          <p className="text-white/90 text-[16px] leading-relaxed text-center max-w-xs">
            Benvenuto. Ti accompagniamo in un&apos;esperienza pensata per te.
          </p>
        </div>

        {/* CTA stack bottom */}
        <div className="pb-12 px-6 flex flex-col gap-3">
          <Link
            href={`${basePath}/lingua`}
            className="group inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-brand text-white text-[15px] font-medium shadow-2xl hover:bg-brand/90 transition-colors"
          >
            <Languages className="h-4 w-4" strokeWidth={1.8} />
            Cambia lingua
          </Link>
          <Link
            href={`${basePath}/scegli`}
            className="group inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-white/95 backdrop-blur-sm text-foreground text-[15px] font-medium hover:bg-white transition-colors"
          >
            Inizia visita
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={1.8}
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
