"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ProjectStepper } from "@/components/project-stepper";
import {
  loadProject,
  loadSources,
  loadBrief,
  loadMap,
  loadDriversPersonas,
  sourcesCompletion,
  StoredProject,
  ProjectSources,
  ProjectBrief,
  ProjectMap,
  ProjectDriversPersonas,
} from "@/lib/project-store";

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<StoredProject | null | undefined>(
    undefined,
  );
  const [sources, setSources] = useState<ProjectSources>({
    images: [],
    documents: [],
  });
  const [brief, setBrief] = useState<ProjectBrief | undefined>(undefined);
  const [map, setMap] = useState<ProjectMap | undefined>(undefined);
  const [drivers, setDrivers] = useState<ProjectDriversPersonas | undefined>(
    undefined,
  );

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const p = loadProject(id) ?? null;
      const [s, b, m, d] = await Promise.all([
        loadSources(id),
        loadBrief(id),
        loadMap(id),
        loadDriversPersonas(id),
      ]);
      if (!alive) return;
      setProject(p);
      setSources(s);
      setBrief(b);
      setMap(m);
      setDrivers(d);
    };
    refresh();

    const onStorage = () => {
      refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("toolia:sources-updated", onStorage);
    window.addEventListener("toolia:brief-updated", onStorage);
    window.addEventListener("toolia:map-updated", onStorage);
    window.addEventListener("toolia:drivers-updated", onStorage);
    return () => {
      alive = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("toolia:sources-updated", onStorage);
      window.removeEventListener("toolia:brief-updated", onStorage);
      window.removeEventListener("toolia:map-updated", onStorage);
      window.removeEventListener("toolia:drivers-updated", onStorage);
    };
  }, [id]);

  const briefComplete =
    !!brief &&
    !!brief.obiettivo.trim() &&
    !!brief.promessaNarrativa.trim() &&
    !!brief.target.trim() &&
    brief.mustTell.some((s) => s.trim().length > 0);

  const completion = {
    fonti: sourcesCompletion(sources) >= 2,
    brief: briefComplete,
    luogo: (map?.pois.length ?? 0) >= 1,
    driver:
      (drivers?.drivers.length ?? 0) >= 1 &&
      (drivers?.personas.length ?? 0) >= 1,
  };

  if (project === undefined) {
    return <div className="min-h-screen bg-paper" />;
  }

  if (project === null) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 px-6">
        <p className="font-heading text-3xl italic">Progetto non trovato</p>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Questo progetto non esiste nel tuo browser. Torna alla dashboard per
          crearne uno o selezionarne un altro.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Torna alla dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-paper">
      <AppSidebar />

      <div className="flex-1 md:pl-64 flex">
        {/* Project stepper */}
        <aside className="hidden lg:flex fixed md:left-64 top-0 bottom-0 w-72 border-r border-border/70 bg-sidebar/40 flex-col overflow-y-auto">
          <div className="px-6 pt-7 pb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
              Progetti
            </Link>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
              {project.type ?? "Progetto"}
            </p>
            <h2 className="font-heading text-2xl italic leading-tight tracking-tight">
              {project.name}
            </h2>
            {project.city && (
              <p className="mt-1 text-xs text-muted-foreground">
                {project.city}
              </p>
            )}
          </div>
          <div className="px-3 flex-1">
            <ProjectStepper projectId={id} completion={completion} />
          </div>
        </aside>

        <main className="flex-1 lg:pl-72 min-w-0">{children}</main>
      </div>
    </div>
  );
}
