"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Rows3,
  Check,
  Plus,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ProjectCard } from "@/components/project-card";
import { ProjectRow } from "@/components/project-row";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  mockProjects,
  MockProject,
  ProjectType,
  projectTypeLabel,
} from "@/lib/mock-projects";

interface StoredProject {
  id: string;
  name: string;
  type: ProjectType | null;
  coverImage?: string;
  address?: string;
  mapsLink?: string;
  city?: string;
  createdAt: string;
}

function deriveCityFromAddress(addr?: string): string {
  if (!addr) return "";
  const parts = addr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  // Drop last part if it's "Italia" or a country-like word
  const countries =
    /^(italia|italy|france|francia|spagna|spain|deutschland|germania|germany|schweiz|svizzera|switzerland)$/i;
  const cleaned = parts.filter((p) => !countries.test(p));
  const candidate = cleaned[cleaned.length - 1] ?? "";
  // Strip leading zip (5 digits) and trailing 2-letter province code
  return candidate
    .replace(/^\d{4,5}\s+/, "")
    .replace(/\s+[A-Z]{2}$/, "")
    .trim();
}

function hydrateStoredProjects(raw: StoredProject[]): MockProject[] {
  return raw.map((p) => {
    // migrazione: se address contiene un URL, spostalo su mapsLink
    const addrIsUrl = !!p.address?.match(/^https?:\/\//);
    const address = addrIsUrl ? undefined : p.address;
    const mapsLink = addrIsUrl ? p.address : p.mapsLink;
    const location = p.city || deriveCityFromAddress(address);
    return {
      id: p.id,
      name: p.name,
      client: "—",
      location,
      type: (p.type ?? "altro") as ProjectType,
      status: "draft" as const,
      completedSteps: 0,
      languages: ["it"],
      updatedAt: p.createdAt,
      coverGradient: ["#C69B6D", "#594333"] as [string, string],
      coverImage: p.coverImage,
      address,
      mapsLink,
    };
  });
}

function deleteStoredProject(id: string) {
  try {
    const raw = JSON.parse(localStorage.getItem("toolia-projects") ?? "[]");
    const next = raw.filter((p: StoredProject) => p.id !== id);
    localStorage.setItem("toolia-projects", JSON.stringify(next));
    localStorage.removeItem(`toolia-project-${id}-progress`);
  } catch {
    // ignore
  }
  // cleanup fonti in IndexedDB (fire-and-forget)
  import("@/lib/project-store").then((m) => m.deleteSources(id));
}
import { cn } from "@/lib/utils";

type Filter = "all" | "draft" | "in_progress" | "published";
type ViewMode = "grid" | "list";
type SortMode = "recent" | "name" | "progress";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Tutti" },
  { value: "in_progress", label: "In lavorazione" },
  { value: "draft", label: "Bozze" },
  { value: "published", label: "Pubblicati" },
];

const sortOptions: { value: SortMode; label: string }[] = [
  { value: "recent", label: "Più recenti" },
  { value: "name", label: "Nome (A-Z)" },
  { value: "progress", label: "Avanzamento" },
];

const typeOptions: ProjectType[] = [
  "villa",
  "museo",
  "cantina",
  "citta",
  "parco",
  "territorio",
  "altro",
];

function matchesFilter(p: MockProject, f: Filter) {
  return f === "all" ? true : p.status === f;
}

export default function DashboardPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("recent");
  const [typeFilters, setTypeFilters] = useState<Set<ProjectType>>(new Set());
  const [storedProjects, setStoredProjects] = useState<MockProject[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("toolia-projects");
      if (raw) {
        const parsed: StoredProject[] = JSON.parse(raw);
        setStoredProjects(hydrateStoredProjects(parsed));
      }
    } catch {
      // ignore
    }
  }, []);

  const allProjects = useMemo(
    () => [...storedProjects, ...mockProjects],
    [storedProjects],
  );

  const toggleType = (t: ProjectType) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const handleDelete = (id: string) => {
    deleteStoredProject(id);
    setStoredProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const isDeletable = (id: string) => storedProjects.some((p) => p.id === id);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = allProjects.filter((p) => {
      const matchF = matchesFilter(p, filter);
      const matchT = typeFilters.size === 0 || typeFilters.has(p.type);
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q);
      return matchF && matchT && matchQ;
    });

    const sorted = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "progress") return b.completedSteps - a.completedSteps;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return sorted;
  }, [query, filter, typeFilters, sort, allProjects]);

  const activeAdvCount = typeFilters.size + (sort !== "recent" ? 1 : 0);

  const stats = useMemo(() => {
    const total = allProjects.length;
    const inProg = allProjects.filter((p) => p.status === "in_progress").length;
    const pub = allProjects.filter((p) => p.status === "published").length;
    return { total, inProg, pub };
  }, [allProjects]);

  return (
    <div className="flex min-h-screen w-full bg-paper">
      <AppSidebar />

      <main className="flex-1 md:pl-64">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 py-10 md:py-14">
          {/* Hero */}
          <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                Toolia Studio · Aprile 2026
              </p>
              <h1 className="font-heading text-5xl md:text-6xl leading-[1.02] tracking-tight">
                <span className="italic">I tuoi</span> progetti
              </h1>
              <p className="mt-4 text-base text-muted-foreground max-w-lg">
                Audioguide AI per siti culturali. Crea, gestisci e pubblica le
                esperienze di visita dei tuoi clienti in un unico posto.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/progetti/nuovo"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Nuovo progetto
              </Link>
            </div>
          </header>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-0 mb-12 border-y border-border/80">
            <Stat label="Progetti totali" value={String(stats.total)} />
            <Stat label="In lavorazione" value={String(stats.inProg)} accent />
            <Stat label="Pubblicati" value={String(stats.pub)} />
          </div>

          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
            {/* Filter tabs */}
            <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/60 w-fit">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "px-4 h-8 rounded-full text-xs font-medium transition-colors",
                    filter === f.value
                      ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Search */}
            <div className="relative md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca un progetto…"
                className="h-10 pl-10 rounded-full bg-card"
              />
            </div>

            {/* Advanced filters dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "relative h-10 w-10 rounded-full border inline-flex items-center justify-center transition-colors",
                  activeAdvCount > 0
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/60 text-foreground hover:bg-muted",
                )}
                aria-label="Filtri avanzati"
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.6} />
                {activeAdvCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-brand text-white text-[10px] font-medium flex items-center justify-center">
                    {activeAdvCount}
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Ordina per
                  </DropdownMenuLabel>
                  {sortOptions.map((o) => (
                    <DropdownMenuItem
                      key={o.value}
                      onClick={() => setSort(o.value)}
                      className="justify-between"
                    >
                      {o.label}
                      {sort === o.value && (
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Tipo di sito
                  </DropdownMenuLabel>
                  {typeOptions.map((t) => (
                    <DropdownMenuItem
                      key={t}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleType(t);
                      }}
                      className="justify-between"
                    >
                      {projectTypeLabel[t]}
                      {typeFilters.has(t) && (
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                {activeAdvCount > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setTypeFilters(new Set());
                        setSort("recent");
                      }}
                      className="text-muted-foreground"
                    >
                      Azzera filtri
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View mode toggle */}
            <div className="hidden md:flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/60">
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-label="Vista griglia"
                aria-pressed={view === "grid"}
                className={cn(
                  "h-7 w-7 inline-flex items-center justify-center rounded-full transition-colors",
                  view === "grid"
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.6} />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-label="Vista lista"
                aria-pressed={view === "list"}
                className={cn(
                  "h-7 w-7 inline-flex items-center justify-center rounded-full transition-colors",
                  view === "list"
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Rows3 className="h-3.5 w-3.5" strokeWidth={1.6} />
              </button>
            </div>
          </div>

          {/* Results */}
          {visible.length > 0 ? (
            view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {visible.map((p, i) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    index={i}
                    onDelete={isDeletable(p.id) ? handleDelete : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {visible.map((p, i) => (
                  <ProjectRow
                    key={p.id}
                    project={p}
                    index={i}
                    onDelete={isDeletable(p.id) ? handleDelete : undefined}
                  />
                ))}
              </div>
            )
          ) : (
            <EmptyState />
          )}

          {/* Footer note */}
          <footer className="mt-20 pt-8 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
            <p>
              Toolia Studio <span className="divider-dot" /> MVP locale
            </p>
            <p>
              Versione 0.1 <span className="divider-dot" />{" "}
              {new Date().getFullYear()}
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="py-6 px-0 md:px-2 first:pl-0 border-l border-border/60 first:border-l-0">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "font-heading text-4xl md:text-5xl mt-2 tracking-tight",
          accent ? "text-brand italic" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-border rounded-2xl py-16 px-6 text-center">
      <p className="font-heading text-3xl italic text-foreground">
        Nessun progetto trovato
      </p>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
        Prova a modificare i filtri o crea un nuovo progetto per iniziare.
      </p>
      <div className="mt-6 inline-flex">
        <Link
          href="/progetti/nuovo"
          className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nuovo progetto
        </Link>
      </div>
    </div>
  );
}
