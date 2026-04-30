"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ProjectStepper } from "@/components/project-stepper";
import {
  sourcesCompletion,
  cacheProjectLocally,
  type StoredProject,
} from "@/lib/project-store";
import {
  useProjectMeta,
  useSources,
  useBrief,
  useMap,
  useDrivers,
  useNarrators,
  usePaths,
  useSchede,
  invalidateProjectData,
} from "@/lib/hooks/use-project-data";

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: metaData, isLoading: metaLoading, error: metaError } =
    useProjectMeta(id);
  const { data: sources } = useSources(id);
  const { data: brief } = useBrief(id);
  const { data: map } = useMap(id);
  const { data: drivers } = useDrivers(id);
  const { data: narratorsData } = useNarrators(id);
  const { data: pathsData } = usePaths(id);
  const { data: schedeData } = useSchede(id);

  useEffect(() => {
    if (!metaData?.project) return;
    const api = metaData.project;
    const p: StoredProject = {
      id: api.id,
      name: api.name,
      type: (api.type ?? null) as StoredProject["type"],
      coverImage: api.coverImage ?? undefined,
      address: api.address ?? undefined,
      mapsLink: api.mapsLink ?? undefined,
      city: api.city ?? undefined,
      createdAt: api.createdAt,
    };
    cacheProjectLocally(p);
  }, [metaData]);

  // Invalida cache su eventi locali emessi dalle pagine step
  useEffect(() => {
    const onSources = () => invalidateProjectData(id, "sources");
    const onBrief = () => invalidateProjectData(id, "brief");
    const onMap = () => invalidateProjectData(id, "map");
    const onDrivers = () => invalidateProjectData(id, "drivers");
    window.addEventListener("toolia:sources-updated", onSources);
    window.addEventListener("toolia:brief-updated", onBrief);
    window.addEventListener("toolia:map-updated", onMap);
    window.addEventListener("toolia:drivers-updated", onDrivers);
    return () => {
      window.removeEventListener("toolia:sources-updated", onSources);
      window.removeEventListener("toolia:brief-updated", onBrief);
      window.removeEventListener("toolia:map-updated", onMap);
      window.removeEventListener("toolia:drivers-updated", onDrivers);
    };
  }, [id]);

  const project = metaData?.project;
  const projectPublished = project?.status === "published";

  const briefComplete =
    !!brief &&
    !!brief.obiettivo.trim() &&
    !!brief.promessaNarrativa.trim() &&
    !!brief.target.trim() &&
    brief.mustTell.some((s) => s.trim().length > 0);

  const narratorsCount = narratorsData?.narrators?.length ?? 0;
  const pathsCount = pathsData?.paths?.length ?? 0;
  const schedeList = (schedeData?.schede ?? []) as Array<{ status?: string }>;
  const schedeCount = schedeList.length;
  const publishedSchedeCount = schedeList.filter(
    (x) => x.status === "published",
  ).length;

  const completion = {
    fonti:
      sourcesCompletion(sources ?? { images: [], documents: [] }) >= 2,
    brief: briefComplete,
    luogo: (map?.pois.length ?? 0) >= 1,
    driver:
      (drivers?.drivers.length ?? 0) >= 1 &&
      (drivers?.personas.length ?? 0) >= 1,
    percorsi: narratorsCount >= 1 && pathsCount >= 1,
    schede: schedeCount >= 1 && publishedSchedeCount >= 1,
    pubblica: projectPublished,
  };

  if (metaLoading && !metaData) {
    return <div className="min-h-screen bg-paper" />;
  }

  if (metaError || !project) {
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
