"use client";

import Link from "next/link";
import { ArrowRight, Compass, Sparkles } from "lucide-react";

export function VisitorScegli({ basePath }: { basePath: string }) {
  return (
    <div className="min-h-screen flex flex-col px-5 pt-28 pb-32">
      <header className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-3">
          Scegli come visitare
        </p>
        <h1 className="font-heading italic text-[34px] leading-[1.05] tracking-tight">
          Da dove
          <br />
          vuoi iniziare?
        </h1>
      </header>

      <div className="flex flex-col gap-4 flex-1">
        <Link
          href={`${basePath}/crea`}
          className="group relative overflow-hidden rounded-3xl bg-brand text-white p-7 flex flex-col gap-4 min-h-[220px] hover:bg-brand/90 transition-colors shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-white/15 text-[10px] uppercase tracking-[0.22em] font-medium">
              <Sparkles className="h-3 w-3" strokeWidth={2} />
              Consigliato
            </span>
            <ArrowRight
              className="h-5 w-5 transition-transform group-hover:translate-x-1"
              strokeWidth={1.8}
            />
          </div>
          <div className="mt-auto">
            <p className="font-heading italic text-[28px] leading-tight tracking-tight mb-2">
              Genera con l&apos;AI
            </p>
            <p className="text-[14px] leading-relaxed text-white/85 max-w-[80%]">
              Rispondi a poche domande, l&apos;intelligenza artificiale crea un
              percorso su misura per te.
            </p>
          </div>
        </Link>

        <Link
          href={`${basePath}/itinerari`}
          className="group relative overflow-hidden rounded-3xl bg-card border border-border/70 p-7 flex flex-col gap-4 min-h-[180px] hover:border-foreground/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <Compass className="h-5 w-5" strokeWidth={1.6} />
            <ArrowRight
              className="h-5 w-5 transition-transform group-hover:translate-x-1 text-muted-foreground group-hover:text-foreground"
              strokeWidth={1.8}
            />
          </div>
          <div className="mt-auto">
            <p className="font-heading italic text-[26px] leading-tight tracking-tight mb-2">
              Visita base
            </p>
            <p className="text-[14px] leading-relaxed text-muted-foreground max-w-[85%]">
              Scegli un itinerario tematico tra quelli pensati dal curatore del
              luogo.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
