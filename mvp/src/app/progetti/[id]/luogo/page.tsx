"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Sparkles,
  Loader2,
  AlertCircle,
  Check,
  X,
  Trash2,
  Plus,
  Clock,
  Map as MapIcon,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import {
  loadProject,
  loadSources,
  loadBrief,
  loadKB,
  loadMap,
  saveMap,
  saveProgress,
  inferSpatialMode,
  emptyMap,
  type ProjectMap,
  type MapPoi,
  type MapZone,
  type ZoneFunction,
  type SpatialMode,
  type ProjectSources,
  type ProjectKB,
  type ProjectBrief,
  type StoredProject,
} from "@/lib/project-store";
import { loadApiKeys } from "@/lib/api-keys";
import { loadGoogleMaps, geocodeAddress } from "@/lib/google-maps-loader";
import { affineFrom2Anchors, applyAffine } from "@/lib/planimetria-transform";
import { cn } from "@/lib/utils";

function cuid(prefix = "p"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const DEFAULT_CENTER = { lat: 45.4642, lng: 9.19 };

const ZONE_FUNCTIONS: {
  value: ZoneFunction;
  label: string;
  color: string;
}[] = [
  {
    value: "opening",
    label: "Apertura",
    color: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  },
  {
    value: "development",
    label: "Sviluppo",
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  },
  {
    value: "climax",
    label: "Climax",
    color: "bg-brand/15 text-brand border-brand/30",
  },
  {
    value: "closure",
    label: "Chiusura",
    color: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  },
];

const SPATIAL_HINT: Record<SpatialMode, string> = {
  indoor:
    "Luogo al chiuso — lavora sulla planimetria; GPS serve solo se pubblichi un'app esterna con mappa",
  gps: "Luogo all'aperto — usa la mappa GPS, la planimetria non è necessaria",
  hybrid: "Luogo misto — planimetria per gli interni, GPS per gli esterni",
};

type MainView = "planimetria" | "gps";

export default function LuogoStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  const [project, setProject] = useState<StoredProject | null>(null);
  const [sources, setSources] = useState<ProjectSources | null>(null);
  const [, setBrief] = useState<ProjectBrief | undefined>(undefined);
  const [kb, setKb] = useState<ProjectKB>({ facts: [] });
  const [map, setMapState] = useState<ProjectMap>(emptyMap());
  const [loaded, setLoaded] = useState(false);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [view, setView] = useState<MainView>("planimetria");
  const [zoneBusy, setZoneBusy] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [showGpsWizard, setShowGpsWizard] = useState(false);

  const mapStateRef = useRef(map);
  useEffect(() => {
    mapStateRef.current = map;
  }, [map]);

  const keys = typeof window !== "undefined" ? loadApiKeys() : null;
  const activeProvider: "kimi" | "openai" | null = keys?.llm.openai
    ? "openai"
    : keys?.llm.kimi
      ? "kimi"
      : null;

  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (next: ProjectMap) => {
      setMapState(next);
      mapStateRef.current = next;
      saveMap(projectId, next).then(() => {
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        setSaved(true);
        savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
        window.dispatchEvent(new Event("toolia:map-updated"));
      });
    },
    [projectId],
  );

  /* ========== Initial load ========== */
  useEffect(() => {
    saveProgress(projectId, { currentStep: "luogo" });
    let alive = true;
    (async () => {
      const proj = loadProject(projectId) ?? null;
      const [src, br, existingMap, kbData] = await Promise.all([
        loadSources(projectId),
        loadBrief(projectId),
        loadMap(projectId),
        loadKB(projectId),
      ]);
      if (!alive) return;
      setProject(proj);
      setSources(src);
      setBrief(br);
      setKb(kbData);

      const mode = inferSpatialMode(proj?.type ?? undefined);
      const hasPlanimetria = !!src.planimetria;

      let initial: ProjectMap;
      if (existingMap) {
        // Retrofit planimetriaX/Y se mancano
        const planPoiMap = new Map(
          (src.planimetriaPoi ?? []).map((p) => [p.n, p]),
        );
        const needsRetrofit = existingMap.pois.some(
          (p) =>
            typeof p.fromPlanimetriaN === "number" &&
            typeof p.planimetriaX !== "number" &&
            planPoiMap.has(p.fromPlanimetriaN),
        );
        if (needsRetrofit) {
          initial = {
            ...existingMap,
            pois: existingMap.pois.map((p) => {
              if (
                typeof p.fromPlanimetriaN === "number" &&
                typeof p.planimetriaX !== "number"
              ) {
                const ps = planPoiMap.get(p.fromPlanimetriaN);
                if (ps) return { ...p, planimetriaX: ps.x, planimetriaY: ps.y };
              }
              return p;
            }),
          };
          saveMap(projectId, initial);
        } else {
          initial = existingMap;
        }
      } else {
        const poisFromPlan: MapPoi[] = (src.planimetriaPoi ?? [])
          .slice()
          .sort((a, b) => a.n - b.n)
          .map((p, idx) => ({
            id: cuid("poi"),
            name: p.name,
            description: p.description,
            order: idx,
            fromPlanimetriaN: p.n,
            planimetriaX: p.x,
            planimetriaY: p.y,
            type: mode === "gps" ? "outdoor" : "indoor",
          }));
        initial = {
          ...emptyMap(),
          spatialMode: mode,
          pois: poisFromPlan,
        };
        saveMap(projectId, initial);
      }
      setMapState(initial);
      mapStateRef.current = initial;

      // View di default: planimetria se esiste, altrimenti GPS
      setView(hasPlanimetria ? "planimetria" : "gps");
      setLoaded(true);
    })();

    // Re-sync quando Fonti cambia (planimetria/POI) o KB cambia (per zone)
    const onUpstream = async () => {
      const [src, kbData] = await Promise.all([
        loadSources(projectId),
        loadKB(projectId),
      ]);
      if (!alive) return;
      setSources(src);
      setKb(kbData);
      // Se arrivano nuovi planimetriaPoi dalle Fonti, aggiungi quelli mancanti
      const existing = mapStateRef.current;
      const known = new Set(
        existing.pois
          .map((p) => p.fromPlanimetriaN)
          .filter((n): n is number => typeof n === "number"),
      );
      const newOnes = (src.planimetriaPoi ?? []).filter((p) => !known.has(p.n));
      if (newOnes.length > 0) {
        const additions: MapPoi[] = newOnes.map((p, idx) => ({
          id: cuid("poi"),
          name: p.name,
          description: p.description,
          order: existing.pois.length + idx,
          fromPlanimetriaN: p.n,
          planimetriaX: p.x,
          planimetriaY: p.y,
        }));
        persist({ ...existing, pois: [...existing.pois, ...additions] });
      }
    };
    window.addEventListener("toolia:sources-updated", onUpstream);
    return () => {
      alive = false;
      window.removeEventListener("toolia:sources-updated", onUpstream);
    };
  }, [projectId, persist]);

  /* ========== POI CRUD ========== */
  const updatePoi = (id: string, patch: Partial<MapPoi>) => {
    persist({
      ...map,
      pois: map.pois.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  };
  const removePoi = (id: string) => {
    persist({ ...map, pois: map.pois.filter((p) => p.id !== id) });
    if (selectedPoiId === id) setSelectedPoiId(null);
  };
  const addPoi = (planX?: number, planY?: number) => {
    const newPoi: MapPoi = {
      id: cuid("poi"),
      name: "Nuovo punto",
      description: "",
      order: map.pois.length,
      planimetriaX: planX,
      planimetriaY: planY,
    };
    persist({ ...map, pois: [...map.pois, newPoi] });
    setSelectedPoiId(newPoi.id);
  };

  /* ========== Zones AI ========== */
  const suggestZones = async () => {
    if (!activeProvider || !keys) {
      setZoneError("Configura una chiave LLM in Impostazioni.");
      return;
    }
    if (map.pois.length < 2) {
      setZoneError("Servono almeno 2 POI.");
      return;
    }
    setZoneBusy(true);
    setZoneError(null);
    try {
      const poisInput = map.pois.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        relatedFacts: kb.facts
          .filter((f) => f.approved && f.poiRef === p.fromPlanimetriaN)
          .slice(0, 5)
          .map((f) => f.content),
      }));
      const res = await fetch("/api/ai/suggest-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: keys.llm[activeProvider],
          provider: activeProvider,
          projectName: project?.name,
          type: project?.type,
          pois: poisInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setZoneError(data.message ?? "Errore proposta zone.");
        return;
      }
      const rawZones: {
        name: string;
        narrativePromise: string;
        function: ZoneFunction;
        poiIds: string[];
      }[] = data.zones ?? [];
      const zones: MapZone[] = rawZones.map((z, i) => ({
        id: cuid("zone"),
        name: z.name,
        narrativePromise: z.narrativePromise,
        function: z.function,
        order: i,
      }));
      const zoneByPoi = new Map<string, string>();
      rawZones.forEach((z, i) => {
        z.poiIds.forEach((pid) => zoneByPoi.set(pid, zones[i].id));
      });
      const nextPois = map.pois.map((p) => ({
        ...p,
        zoneId: zoneByPoi.get(p.id) ?? p.zoneId,
      }));
      persist({ ...map, zones, pois: nextPois });
    } catch {
      setZoneError("Errore di rete.");
    } finally {
      setZoneBusy(false);
    }
  };

  const updateZone = (id: string, patch: Partial<MapZone>) => {
    persist({
      ...map,
      zones: map.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)),
    });
  };
  const removeZone = (id: string) => {
    persist({
      ...map,
      zones: map.zones.filter((z) => z.id !== id),
      pois: map.pois.map((p) =>
        p.zoneId === id ? { ...p, zoneId: undefined } : p,
      ),
    });
  };
  const addZone = () => {
    const newZone: MapZone = {
      id: cuid("zone"),
      name: "Nuova zona",
      narrativePromise: "",
      function: "development",
      order: map.zones.length,
    };
    persist({ ...map, zones: [...map.zones, newZone] });
  };

  const selectedPoi = useMemo(
    () => map.pois.find((p) => p.id === selectedPoiId) ?? null,
    [map.pois, selectedPoiId],
  );

  const placedGps = map.pois.filter(
    (p) => typeof p.lat === "number" && typeof p.lng === "number",
  ).length;
  const positionedOnPlan = map.pois.filter(
    (p) => typeof p.planimetriaX === "number",
  ).length;

  const hasPlanimetria = !!sources?.planimetria;

  if (!loaded) return <div className="min-h-screen" />;

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="shrink-0 px-6 md:px-10 pt-7 pb-5 border-b border-border/60">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
          Step 3 · Luogo
        </p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="font-heading text-3xl md:text-4xl italic leading-tight tracking-tight">
              Struttura del luogo
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
              Organizza i punti di interesse e raggruppali in zone. La
              planimetria è l&apos;autore primario; la georeferenziazione GPS è
              opzionale e si aggancia prima della pubblicazione.
            </p>
          </div>
          <div className="shrink-0 flex items-start gap-3">
            {saved && (
              <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-brand/15 text-brand text-xs font-medium">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Salvato
              </span>
            )}
            <div className="rounded-xl border border-border bg-card px-3 py-2 max-w-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5 flex items-center gap-1">
                <Info className="h-3 w-3" strokeWidth={1.8} />
                Modalità: {map.spatialMode}
              </p>
              <p className="text-xs text-muted-foreground leading-snug">
                {SPATIAL_HINT[map.spatialMode]}
              </p>
            </div>
          </div>
        </div>

        {/* VIEW TABS */}
        <div className="mt-4 flex items-center gap-1 bg-muted rounded-full p-1 w-fit">
          <button
            type="button"
            onClick={() => setView("planimetria")}
            disabled={!hasPlanimetria}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-medium transition-colors",
              view === "planimetria"
                ? "bg-background text-foreground shadow-sm"
                : !hasPlanimetria
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
            Planimetria
            {hasPlanimetria && (
              <span className="text-[10px] opacity-70 tabular-nums">
                · {positionedOnPlan}/{map.pois.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setView("gps")}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-medium transition-colors",
              view === "gps"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MapIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
            Mappa GPS
            <span className="text-[10px] opacity-70 tabular-nums">
              · {placedGps}/{map.pois.length}
            </span>
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 h-[calc(100vh-260px)]">
        {/* LEFT — VIEW CANVAS */}
        <section className="relative flex-1 bg-muted min-h-[480px]">
          {view === "planimetria" && hasPlanimetria && (
            <PlanimetriaCanvas
              imageUrl={sources!.planimetria!}
              pois={map.pois}
              selectedId={selectedPoiId}
              onSelect={setSelectedPoiId}
              onMovePoi={(id, x, y) =>
                updatePoi(id, { planimetriaX: x, planimetriaY: y })
              }
              onAddPoi={(x, y) => addPoi(x, y)}
            />
          )}
          {view === "planimetria" && !hasPlanimetria && (
            <EmptyState
              icon={<ImageIcon className="h-5 w-5" strokeWidth={1.8} />}
              title="Nessuna planimetria caricata"
              body="Torna nelle Fonti per caricare una planimetria, oppure usa la vista GPS."
            />
          )}
          {view === "gps" && (
            <GpsView
              map={map}
              sources={sources}
              project={project}
              persist={persist}
              selectedPoiId={selectedPoiId}
              setSelectedPoiId={setSelectedPoiId}
              onOpenWizard={() => setShowGpsWizard(true)}
            />
          )}
        </section>

        {/* RIGHT — POI / ZONES PANEL */}
        <aside className="lg:w-[380px] shrink-0 border-l border-border/60 bg-paper flex flex-col max-h-[70vh] lg:max-h-none">
          <RightPanel
            map={map}
            selectedPoi={selectedPoi}
            selectedPoiId={selectedPoiId}
            onSelectPoi={setSelectedPoiId}
            onUpdatePoi={updatePoi}
            onRemovePoi={removePoi}
            onAddPoi={() => addPoi()}
            onAddZone={addZone}
            onUpdateZone={updateZone}
            onRemoveZone={removeZone}
            onSuggestZones={suggestZones}
            zoneBusy={zoneBusy}
            zoneError={zoneError}
            canSuggestZones={!!activeProvider}
          />
        </aside>
      </main>

      <footer className="shrink-0 border-t border-border/60 bg-paper">
        <div className="max-w-[1200px] mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <Link
            href={`/progetti/${projectId}/brief`}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Brief
          </Link>
          <p className="text-xs text-muted-foreground">
            {map.pois.length} POI · {map.zones.length} zone
            {placedGps > 0 && <> · {placedGps} georeferenziati</>}
          </p>
          <button
            type="button"
            onClick={() => setShowGpsWizard(true)}
            disabled={!hasPlanimetria || positionedOnPlan < 2}
            className={cn(
              "inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-medium transition-colors",
              !hasPlanimetria || positionedOnPlan < 2
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "border border-border text-foreground hover:bg-muted",
            )}
          >
            <MapIcon className="h-4 w-4" strokeWidth={1.8} />
            Georeferenzia con 2 ancore
          </button>
        </div>
      </footer>

      {showGpsWizard && hasPlanimetria && (
        <GpsWizard
          map={map}
          planimetria={sources!.planimetria!}
          mapsKey={keys?.googleMaps ?? ""}
          project={project}
          onClose={() => setShowGpsWizard(false)}
          onFinish={(updatedMap) => {
            persist(updatedMap);
            setShowGpsWizard(false);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================ */
/* ===================== PLANIMETRIA CANVAS ==================== */
/* ============================================================ */

function PlanimetriaCanvas({
  imageUrl,
  pois,
  selectedId,
  onSelect,
  onMovePoi,
  onAddPoi,
}: {
  imageUrl: string;
  pois: MapPoi[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMovePoi: (id: string, x: number, y: number) => void;
  onAddPoi: (x: number, y: number) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const getCoords = (e: React.PointerEvent) => {
    if (!wrapperRef.current) return null;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const c = getCoords(e);
    if (c) onMovePoi(draggingId, c.x, c.y);
  };

  const endDrag = () => setDraggingId(null);

  const onCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current || draggingId) return;
    // Click solo se non su un POI esistente (stopPropagation sui pin)
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onAddPoi(x, y);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#E6DFD0] overflow-auto">
      <div
        ref={wrapperRef}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={onCanvasClick}
        className="relative inline-block select-none cursor-crosshair"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Planimetria"
          draggable={false}
          className="block max-h-[calc(100vh-340px)] max-w-full object-contain pointer-events-none shadow-md"
        />
        {pois.map((p, i) => {
          if (
            typeof p.planimetriaX !== "number" ||
            typeof p.planimetriaY !== "number"
          )
            return null;
          const isSelected = selectedId === p.id;
          return (
            <button
              type="button"
              key={p.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                setDraggingId(p.id);
                onSelect(p.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(p.id);
              }}
              style={{
                left: `${p.planimetriaX * 100}%`,
                top: `${p.planimetriaY * 100}%`,
                touchAction: "none",
              }}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-transform",
                draggingId === p.id
                  ? "scale-125 cursor-grabbing"
                  : isSelected
                    ? "bg-brand scale-125 cursor-grab"
                    : "bg-foreground cursor-grab hover:scale-110",
              )}
            >
              {p.fromPlanimetriaN ?? i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================ */
/* ====================== GPS VIEW ============================ */
/* ============================================================ */

function GpsView({
  map,
  sources,
  project,
  persist,
  selectedPoiId,
  setSelectedPoiId,
  onOpenWizard,
}: {
  map: ProjectMap;
  sources: ProjectSources | null;
  project: StoredProject | null;
  persist: (next: ProjectMap) => void;
  selectedPoiId: string | null;
  setSelectedPoiId: (id: string | null) => void;
  onOpenWizard: () => void;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const mapStateRef = useRef(map);
  const selectedRef = useRef(selectedPoiId);
  useEffect(() => {
    mapStateRef.current = map;
  }, [map]);
  useEffect(() => {
    selectedRef.current = selectedPoiId;
  }, [selectedPoiId]);

  const mapsKey = typeof window !== "undefined" ? loadApiKeys().googleMaps : "";
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Geocode center
  useEffect(() => {
    if (!mapsKey) return;
    if (map.centerLat && map.centerLng) return;
    const addr = project?.address;
    if (!addr) return;
    geocodeAddress(mapsKey, addr).then((coords) => {
      if (coords) {
        persist({
          ...mapStateRef.current,
          centerLat: coords.lat,
          centerLng: coords.lng,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey, project?.address]);

  useEffect(() => {
    if (!mapsKey || mapInstRef.current || !mapDivRef.current) return;
    let cancelled = false;
    loadGoogleMaps(mapsKey)
      .then((maps) => {
        if (cancelled || !mapDivRef.current) return;
        const center =
          map.centerLat && map.centerLng
            ? { lat: map.centerLat, lng: map.centerLng }
            : DEFAULT_CENTER;
        const gm = new maps.Map(mapDivRef.current, {
          center,
          zoom: 18,
          mapTypeId: "hybrid",
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: false,
          clickableIcons: false,
        });
        mapInstRef.current = gm;
        gm.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const sid = selectedRef.current;
          if (!sid) return;
          const current = mapStateRef.current;
          const next = {
            ...current,
            pois: current.pois.map((x) =>
              x.id === sid
                ? { ...x, lat: e.latLng!.lat(), lng: e.latLng!.lng() }
                : x,
            ),
          };
          persist(next);
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("Errore caricamento Google Maps.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey]);

  useEffect(() => {
    if (!mapInstRef.current || !ready) return;
    if (map.centerLat && map.centerLng) {
      mapInstRef.current.setCenter({
        lat: map.centerLat,
        lng: map.centerLng,
      });
    }
  }, [map.centerLat, map.centerLng, ready]);

  useEffect(() => {
    if (!mapInstRef.current || !ready || !window.google) return;
    const gm = mapInstRef.current;
    const currentIds = new Set(map.pois.map((p) => p.id));
    for (const [id, marker] of markersRef.current.entries()) {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    }
    map.pois.forEach((p, idx) => {
      if (typeof p.lat !== "number" || typeof p.lng !== "number") {
        const m = markersRef.current.get(p.id);
        if (m) {
          m.setMap(null);
          markersRef.current.delete(p.id);
        }
        return;
      }
      const selected = selectedPoiId === p.id;
      const icon: google.maps.Symbol = {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: selected ? 16 : 13,
        fillColor: selected ? "#A45B2A" : "#2A2623",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      };
      const label = {
        text: String(idx + 1),
        color: "#fff",
        fontSize: "12px",
        fontWeight: "700",
      };
      const existing = markersRef.current.get(p.id);
      if (existing) {
        existing.setPosition({ lat: p.lat, lng: p.lng });
        existing.setIcon(icon);
        existing.setLabel(label);
      } else {
        const mk = new window.google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map: gm,
          draggable: true,
          label,
          icon,
          title: p.name,
        });
        mk.addListener("click", () => setSelectedPoiId(p.id));
        mk.addListener("dragend", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const current = mapStateRef.current;
          const next = {
            ...current,
            pois: current.pois.map((x) =>
              x.id === p.id
                ? { ...x, lat: e.latLng!.lat(), lng: e.latLng!.lng() }
                : x,
            ),
          };
          persist(next);
        });
        markersRef.current.set(p.id, mk);
      }
    });
  }, [map.pois, ready, selectedPoiId, persist, setSelectedPoiId]);

  const selected = map.pois.find((p) => p.id === selectedPoiId);
  const hasPlan = !!sources?.planimetria;
  const positionedOnPlan = map.pois.filter(
    (p) => typeof p.planimetriaX === "number",
  ).length;

  if (!mapsKey) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-5 w-5" strokeWidth={1.8} />}
        title="Chiave Google Maps mancante"
        body="Apri Impostazioni → Chiavi API e salva la chiave Google Maps."
      />
    );
  }
  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-5 w-5" strokeWidth={1.8} />}
        title="Mappa non disponibile"
        body={error}
      />
    );
  }

  return (
    <>
      <div ref={mapDivRef} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground bg-muted">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
          <span className="text-xs">Carico la mappa…</span>
        </div>
      )}
      {ready && selected && typeof selected.lat !== "number" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg inline-flex items-center gap-2 pointer-events-none">
          <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
          Click sulla mappa per piantare &quot;{selected.name}&quot;
        </div>
      )}
      {ready && hasPlan && positionedOnPlan >= 2 && (
        <button
          type="button"
          onClick={onOpenWizard}
          className="absolute top-4 right-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-foreground text-background text-xs font-medium hover:bg-foreground/90 transition-colors shadow-lg"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
          Auto-piazza da planimetria (2 ancore)
        </button>
      )}
    </>
  );
}

/* ============================================================ */
/* ======================= RIGHT PANEL ======================== */
/* ============================================================ */

function RightPanel({
  map,
  selectedPoi,
  selectedPoiId,
  onSelectPoi,
  onUpdatePoi,
  onRemovePoi,
  onAddPoi,
  onAddZone,
  onUpdateZone,
  onRemoveZone,
  onSuggestZones,
  zoneBusy,
  zoneError,
  canSuggestZones,
}: {
  map: ProjectMap;
  selectedPoi: MapPoi | null;
  selectedPoiId: string | null;
  onSelectPoi: (id: string | null) => void;
  onUpdatePoi: (id: string, patch: Partial<MapPoi>) => void;
  onRemovePoi: (id: string) => void;
  onAddPoi: () => void;
  onAddZone: () => void;
  onUpdateZone: (id: string, patch: Partial<MapZone>) => void;
  onRemoveZone: (id: string) => void;
  onSuggestZones: () => void;
  zoneBusy: boolean;
  zoneError: string | null;
  canSuggestZones: boolean;
}) {
  const [tab, setTab] = useState<"pois" | "zones">("pois");

  return (
    <>
      <div className="px-5 pt-4 pb-2 border-b border-border/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-muted rounded-full p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab("pois")}
            className={cn(
              "h-7 px-3 rounded-full text-[11px] font-medium transition-colors",
              tab === "pois"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            POI {map.pois.length}
          </button>
          <button
            type="button"
            onClick={() => setTab("zones")}
            className={cn(
              "h-7 px-3 rounded-full text-[11px] font-medium transition-colors",
              tab === "zones"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Zone {map.zones.length}
          </button>
        </div>
      </div>

      {tab === "pois" && (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {map.pois.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Nessun POI. Torna alle Fonti per caricare una planimetria o
                aggiungi manualmente.
              </p>
              <button
                type="button"
                onClick={onAddPoi}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-foreground text-background text-xs font-medium hover:bg-foreground/90"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                Aggiungi POI
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-2 pb-1">
                <p className="text-[11px] text-muted-foreground">
                  {selectedPoi
                    ? `Selezionato: ${selectedPoi.name}`
                    : "Click su un POI per modificarlo"}
                </p>
                <button
                  type="button"
                  onClick={onAddPoi}
                  className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium text-foreground hover:bg-muted"
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  Aggiungi
                </button>
              </div>
              {map.pois.map((p, i) => {
                const selected = selectedPoiId === p.id;
                const placedGps =
                  typeof p.lat === "number" && typeof p.lng === "number";
                const positionedPlan = typeof p.planimetriaX === "number";
                const zone = map.zones.find((z) => z.id === p.zoneId);
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPoi(p.id)}
                    className={cn(
                      "group rounded-xl border bg-card p-3 transition-all cursor-pointer",
                      selected
                        ? "border-brand shadow-[0_2px_8px_rgba(164,91,42,0.15)]"
                        : "border-border hover:border-foreground/40",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "shrink-0 h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center mt-0.5",
                          selected
                            ? "bg-brand text-white"
                            : positionedPlan
                              ? "bg-foreground text-background"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <input
                          value={p.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            onUpdatePoi(p.id, { name: e.target.value })
                          }
                          className="w-full text-sm font-medium bg-transparent focus:outline-none"
                        />
                        <textarea
                          value={p.description}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            onUpdatePoi(p.id, { description: e.target.value })
                          }
                          rows={2}
                          placeholder="Descrizione"
                          className="w-full text-xs text-muted-foreground bg-transparent focus:outline-none resize-none leading-relaxed"
                        />
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          {positionedPlan && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                              <ImageIcon className="h-3 w-3" strokeWidth={2} />
                              Planimetria
                            </span>
                          )}
                          {placedGps && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-brand font-medium">
                              <Check className="h-3 w-3" strokeWidth={2.5} />
                              GPS
                            </span>
                          )}
                          {zone && (
                            <span className="inline-flex items-center h-4 px-1.5 rounded-full text-[9px] bg-muted text-muted-foreground">
                              {zone.name}
                            </span>
                          )}
                        </div>
                        {selected && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-2 space-y-2 border-t border-border/60"
                          >
                            <div className="flex items-center gap-2">
                              <Clock
                                className="h-3 w-3 text-muted-foreground shrink-0"
                                strokeWidth={1.8}
                              />
                              <span className="text-[11px] text-muted-foreground">
                                Tempo sosta:
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={3600}
                                step={30}
                                value={p.minStaySeconds ?? 0}
                                onChange={(e) =>
                                  onUpdatePoi(p.id, {
                                    minStaySeconds:
                                      parseInt(e.target.value, 10) || 0,
                                  })
                                }
                                className="w-16 h-6 text-[11px] text-right rounded border border-border bg-card px-1 focus:outline-none focus:ring-1 focus:ring-foreground/30"
                              />
                              <span className="text-[11px] text-muted-foreground">
                                sec
                              </span>
                            </div>
                            {map.zones.length > 0 && (
                              <select
                                value={p.zoneId ?? ""}
                                onChange={(e) =>
                                  onUpdatePoi(p.id, {
                                    zoneId: e.target.value || undefined,
                                  })
                                }
                                className="h-7 w-full text-[11px] rounded border border-border bg-card px-2 focus:outline-none focus:ring-1 focus:ring-foreground/30"
                              >
                                <option value="">— Nessuna zona —</option>
                                {map.zones.map((z) => (
                                  <option key={z.id} value={z.id}>
                                    {z.name}
                                  </option>
                                ))}
                              </select>
                            )}
                            {placedGps && (
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdatePoi(p.id, {
                                    lat: undefined,
                                    lng: undefined,
                                  })
                                }
                                className="text-[10px] text-muted-foreground hover:text-destructive"
                              >
                                Rimuovi GPS
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemovePoi(p.id);
                        }}
                        aria-label="Rimuovi"
                        className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {tab === "zones" && (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          <div className="flex items-center justify-between px-2 gap-2">
            <p className="text-[11px] text-muted-foreground">
              {map.zones.length} zone narrative
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onSuggestZones}
                disabled={zoneBusy || !canSuggestZones || map.pois.length < 2}
                className={cn(
                  "inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium transition-colors",
                  zoneBusy || !canSuggestZones || map.pois.length < 2
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-foreground text-background hover:bg-foreground/90",
                )}
              >
                {zoneBusy ? (
                  <>
                    <Loader2
                      className="h-3 w-3 animate-spin"
                      strokeWidth={1.8}
                    />
                    Propongo
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" strokeWidth={1.8} />
                    Proponi con AI
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onAddZone}
                className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium text-foreground hover:bg-muted"
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
                Aggiungi
              </button>
            </div>
          </div>
          {zoneError && (
            <div className="mx-2 rounded-xl border border-destructive/30 bg-destructive/[0.03] p-2 flex items-start gap-2">
              <AlertCircle
                className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5"
                strokeWidth={1.8}
              />
              <p className="text-[11px] text-muted-foreground">{zoneError}</p>
            </div>
          )}
          {map.zones.length > 0 &&
            map.pois.filter((p) => !p.zoneId).length > 0 && (
              <div className="mx-2 rounded-xl border border-amber-300 bg-amber-50 p-2 flex items-start gap-2">
                <AlertCircle
                  className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5"
                  strokeWidth={1.8}
                />
                <p className="text-[11px] text-amber-900 leading-snug">
                  {map.pois.filter((p) => !p.zoneId).length} POI senza zona —
                  riproponi con AI o assegnali manualmente.
                </p>
              </div>
            )}
          {map.zones.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-sm text-muted-foreground">
                Nessuna zona. Click &quot;Proponi con AI&quot; per generarle dai
                POI.
              </p>
            </div>
          ) : (
            map.zones.map((z) => {
              const fn = ZONE_FUNCTIONS.find((f) => f.value === z.function);
              const poisInZone = map.pois.filter((p) => p.zoneId === z.id);
              return (
                <div
                  key={z.id}
                  className="rounded-xl border border-border bg-card p-3 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input
                        value={z.name}
                        onChange={(e) =>
                          onUpdateZone(z.id, { name: e.target.value })
                        }
                        className="w-full text-sm font-medium bg-transparent focus:outline-none"
                      />
                      <textarea
                        value={z.narrativePromise}
                        onChange={(e) =>
                          onUpdateZone(z.id, {
                            narrativePromise: e.target.value,
                          })
                        }
                        rows={2}
                        placeholder="Promessa narrativa"
                        className="w-full text-xs text-muted-foreground bg-transparent focus:outline-none resize-none leading-relaxed"
                      />
                      <div className="flex items-center flex-wrap gap-1">
                        {ZONE_FUNCTIONS.map((f) => (
                          <button
                            key={f.value}
                            type="button"
                            onClick={() =>
                              onUpdateZone(z.id, { function: f.value })
                            }
                            className={cn(
                              "inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium border transition-colors",
                              z.function === f.value
                                ? f.color + " border-current"
                                : "border-border text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                      {poisInZone.length > 0 && (
                        <div className="pt-2 border-t border-border/60">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1">
                            {poisInZone.length} POI
                          </p>
                          <ul className="flex flex-wrap gap-1">
                            {poisInZone.map((p) => (
                              <li
                                key={p.id}
                                className="inline-flex items-center h-5 px-2 rounded-full text-[10px] bg-muted text-foreground"
                              >
                                {p.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveZone(z.id)}
                      aria-label="Rimuovi zona"
                      className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium border",
                      fn?.color,
                    )}
                  >
                    Funzione: {fn?.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}

/* ============================================================ */
/* ======================== GPS WIZARD ======================== */
/* ============================================================ */

function GpsWizard({
  map,
  planimetria,
  mapsKey,
  project,
  onClose,
  onFinish,
}: {
  map: ProjectMap;
  planimetria: string;
  mapsKey: string;
  project: StoredProject | null;
  onClose: () => void;
  onFinish: (updatedMap: ProjectMap) => void;
}) {
  type Step = "pickPlan1" | "pickGps1" | "pickPlan2" | "pickGps2";
  const [step, setStep] = useState<Step>("pickPlan1");
  const [anchor1, setAnchor1] = useState<{
    poiId?: string;
    planX?: number;
    planY?: number;
    lat?: number;
    lng?: number;
  }>({});
  const [anchor2, setAnchor2] = useState<{
    poiId?: string;
    planX?: number;
    planY?: number;
    lat?: number;
    lng?: number;
  }>({});

  const poisOnPlan = map.pois.filter((p) => typeof p.planimetriaX === "number");

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapInstRef = useRef<google.maps.Map | null>(null);
  const onGpsClickRef = useRef<(lat: number, lng: number) => void>(() => {});
  const [ready, setReady] = useState(false);

  const currentStepIsGps = step === "pickGps1" || step === "pickGps2";

  useEffect(() => {
    if (!mapsKey || mapInstRef.current || !mapDivRef.current) return;
    loadGoogleMaps(mapsKey).then(async (maps) => {
      if (!mapDivRef.current) return;
      let center =
        map.centerLat && map.centerLng
          ? { lat: map.centerLat, lng: map.centerLng }
          : DEFAULT_CENTER;
      if (!map.centerLat && project?.address) {
        const c = await geocodeAddress(mapsKey, project.address);
        if (c) center = c;
      }
      const gm = new maps.Map(mapDivRef.current, {
        center,
        zoom: 18,
        mapTypeId: "hybrid",
        streetViewControl: false,
        mapTypeControl: true,
        fullscreenControl: false,
        clickableIcons: false,
      });
      mapInstRef.current = gm;
      gm.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        onGpsClickRef.current(e.latLng.lat(), e.latLng.lng());
      });
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey]);

  const finalize = (second: typeof anchor2) => {
    if (
      typeof anchor1.planX !== "number" ||
      typeof anchor1.planY !== "number" ||
      typeof anchor1.lat !== "number" ||
      typeof anchor1.lng !== "number" ||
      typeof second.planX !== "number" ||
      typeof second.planY !== "number" ||
      typeof second.lat !== "number" ||
      typeof second.lng !== "number"
    )
      return;
    const params = affineFrom2Anchors(
      {
        planX: anchor1.planX,
        planY: anchor1.planY,
        lat: anchor1.lat,
        lng: anchor1.lng,
      },
      {
        planX: second.planX,
        planY: second.planY,
        lat: second.lat,
        lng: second.lng,
      },
    );
    if (!params) {
      onClose();
      return;
    }
    const nextPois = map.pois.map((p) => {
      if (
        typeof p.planimetriaX !== "number" ||
        typeof p.planimetriaY !== "number"
      )
        return p;
      const { lat, lng } = applyAffine(params, p.planimetriaX, p.planimetriaY);
      return { ...p, lat, lng };
    });
    const anchors = [anchor1, second].map((a) => ({
      poiId: a.poiId!,
      planimetriaX: a.planX!,
      planimetriaY: a.planY!,
      lat: a.lat!,
      lng: a.lng!,
    }));
    onFinish({ ...map, pois: nextPois, anchors });
  };

  const onGpsClick = (lat: number, lng: number) => {
    if (step === "pickGps1") {
      setAnchor1((a) => ({ ...a, lat, lng }));
      setStep("pickPlan2");
    } else if (step === "pickGps2") {
      setAnchor2((a) => ({ ...a, lat, lng }));
      finalize({ ...anchor2, lat, lng });
    }
  };

  useEffect(() => {
    onGpsClickRef.current = onGpsClick;
  });

  const onPickPoi = (poiId: string) => {
    const poi = map.pois.find((p) => p.id === poiId);
    if (!poi || typeof poi.planimetriaX !== "number") return;
    if (step === "pickPlan1") {
      if (anchor2.poiId === poiId) return;
      setAnchor1({
        poiId,
        planX: poi.planimetriaX,
        planY: poi.planimetriaY,
      });
      setStep("pickGps1");
    } else if (step === "pickPlan2") {
      if (anchor1.poiId === poiId) return;
      setAnchor2({
        poiId,
        planX: poi.planimetriaX,
        planY: poi.planimetriaY,
      });
      setStep("pickGps2");
    }
  };

  const titles: Record<Step, { title: string; sub: string }> = {
    pickPlan1: {
      title: "Ancora 1 · Scegli un POI sulla planimetria",
      sub: "Clicca un punto ben riconoscibile (es. ingresso, torre).",
    },
    pickGps1: {
      title: "Ancora 1 · Click sulla mappa reale",
      sub: "Clicca sulla posizione corrispondente al POI appena scelto.",
    },
    pickPlan2: {
      title: "Ancora 2 · Scegli un secondo POI sulla planimetria",
      sub: "Scegli un punto lontano dal primo (angolo opposto se possibile).",
    },
    pickGps2: {
      title: "Ancora 2 · Click sulla mappa reale",
      sub: "Ultimo click: distribuisco tutti i POI automaticamente.",
    },
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-stretch">
      <div className="bg-paper flex-1 flex flex-col">
        <header className="shrink-0 border-b border-border/60 px-6 py-4 bg-brand text-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] opacity-80 mb-1">
              Georeferenzia · {stepNumber(step)}/4
            </p>
            <p className="font-medium text-sm">{titles[step].title}</p>
            <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
              {titles[step].sub}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-white/20 text-white text-xs font-medium hover:bg-white/30 shrink-0"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
            Chiudi
          </button>
        </header>

        <div className="flex-1 flex min-h-0">
          {/* Planimetria */}
          <div className="flex-1 bg-[#E6DFD0] p-4 overflow-auto border-r border-border/60">
            <div className="relative inline-block mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={planimetria}
                alt="Planimetria"
                draggable={false}
                className="block max-h-[calc(100vh-180px)] max-w-full object-contain shadow-md"
              />
              {poisOnPlan.map((p) => {
                const isAnchor1 = anchor1.poiId === p.id;
                const isAnchor2 = anchor2.poiId === p.id;
                const used = isAnchor1 || isAnchor2;
                const canPick =
                  (step === "pickPlan1" && !used) ||
                  (step === "pickPlan2" && !used);
                return (
                  <button
                    type="button"
                    key={p.id}
                    disabled={!canPick && !used}
                    onClick={() => canPick && onPickPoi(p.id)}
                    style={{
                      left: `${p.planimetriaX! * 100}%`,
                      top: `${p.planimetriaY! * 100}%`,
                    }}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] transition-transform",
                      used
                        ? "bg-brand scale-125"
                        : canPick
                          ? "bg-foreground cursor-pointer hover:scale-110 hover:bg-brand"
                          : "bg-foreground/40 cursor-not-allowed",
                    )}
                  >
                    {p.fromPlanimetriaN ?? ""}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Map */}
          <div className="flex-1 relative">
            <div ref={mapDivRef} className="absolute inset-0" />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                <span className="text-xs">Carico la mappa…</span>
              </div>
            )}
            {currentStepIsGps && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg inline-flex items-center gap-2 pointer-events-none">
                <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                Click sulla mappa dove sta il POI
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function stepNumber(
  step: "pickPlan1" | "pickGps1" | "pickPlan2" | "pickGps2",
): number {
  return step === "pickPlan1"
    ? 1
    : step === "pickGps1"
      ? 2
      : step === "pickPlan2"
        ? 3
        : 4;
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="max-w-sm text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-background border border-border mx-auto flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
