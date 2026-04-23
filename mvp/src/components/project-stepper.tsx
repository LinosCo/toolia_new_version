"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepDef {
  slug: string;
  label: string;
  kicker: string;
  description: string;
}

export const PROJECT_STEPS: StepDef[] = [
  {
    slug: "fonti",
    label: "Fonti",
    kicker: "01",
    description: "Planimetria, sito, documenti, intervista, Knowledge Base",
  },
  {
    slug: "brief",
    label: "Brief",
    kicker: "02",
    description: "Direzione editoriale: target, tono, storie",
  },
  {
    slug: "luogo",
    label: "Luogo",
    kicker: "03",
    description: "POI e zone dalle fonti incrociate",
  },
  {
    slug: "driver",
    label: "Driver e Personas",
    kicker: "04",
    description: "Motore editoriale: driver, personas, lenti, regole",
  },
  {
    slug: "percorsi",
    label: "Percorsi e Narratori",
    kicker: "05",
    description: "Voci narranti, itinerari tematici, capitoli",
  },
  {
    slug: "schede",
    label: "Schede e Audio",
    kicker: "06",
    description: "Generazione testi, approvazione, TTS",
  },
  {
    slug: "pubblica",
    label: "Pubblica",
    kicker: "07",
    description: "Checklist qualità + preview app visitatore",
  },
];

export function ProjectStepper({
  projectId,
  completion,
}: {
  projectId: string;
  completion?: Record<string, boolean>;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 mb-3">
        Progetto
      </p>
      <ul className="space-y-0.5">
        {PROJECT_STEPS.map((step, idx) => {
          const href = `/progetti/${projectId}/${step.slug}`;
          const active = pathname.startsWith(href);
          const done = completion?.[step.slug];
          return (
            <li key={step.slug}>
              <Link
                href={href}
                className={cn(
                  "group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium transition-colors",
                    done
                      ? "bg-brand text-white"
                      : active
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground group-hover:bg-foreground/10",
                  )}
                >
                  {done ? (
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  ) : (
                    <span className="tabular-nums">{idx + 1}</span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm leading-tight",
                      active ? "font-medium text-foreground" : "",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {step.description}
                  </p>
                </div>
                {active && (
                  <Circle
                    className="h-2 w-2 fill-brand stroke-brand shrink-0 mt-2"
                    strokeWidth={0}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
