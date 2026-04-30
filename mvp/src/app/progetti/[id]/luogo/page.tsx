"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Loader2,
  AlertCircle,
  Trash2,
  Plus,
  RefreshCw,
  MapPin,
  Layers,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  loadProject,
  saveMap,
  saveProgress,
  emptyMap,
  inferSpatialMode,
  newSourceId,
  type ProjectMap,
  type MapPoi,
  type MapZone,
  type ZoneFunction,
  type SpatialMode,
  type PoiType,
  type ProjectSources,
  type ProjectBrief,
  type ProjectKB,
  type StoredProject,
} from "@/lib/project-store";
import {
  useSources,
  useBrief,
  useKB,
  useMap,
  useSyncedState,
  invalidateProjectData,
} from "@/lib/hooks/use-project-data";
import { loadApiKeys } from "@/lib/api-keys";
import {
  loadGoogleMaps,
  geocodeAddress,
  planimetriaToLatLng,
  gridLatLng,
} from "@/lib/google-maps-loader";

type ProposedPoi = {
  id: string; // locale, per tracking approvazione
  name: string;
  description: string;
  zoneSuggested: string;
  minStaySeconds: number;
  evidence: string;
  approved: boolean;
};

type ProposedZone = {
  id: string;
  name: string;
  narrativePromise: string;
  function: ZoneFunction;
  reasoning: string;
};

const ZONE_FUNCTION_LABEL: Record<ZoneFunction, string> = {
  apertura: "Apertura",
  sviluppo: "Sviluppo",
  climax: "Climax",
};

const ZONE_FUNCTION_HINT: Record<ZoneFunction, string> = {
  apertura: "Prima impressione, orientamento",
  sviluppo: "Cuore della visita",
  climax: "Culmine, punto memorabile",
};

const ZONE_PALETTE = [
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#8b5cf6", // violet
];

function pickNextUnplacedForGps(pois: MapPoi[]): MapPoi | undefined {
  return pois.find((p) => typeof p.lat !== "number");
}

export default function LuogoStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);

  const [project] = useState<StoredProject | null>(
    () => loadProject(projectId) ?? null,
  );
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [proposing, setProposing] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposedPois, setProposedPois] = useState<ProposedPoi[] | null>(null);
  const [proposedZones, setProposedZones] = useState<ProposedZone[] | null>(
    null,
  );
  const [proposedSpatialMode, setProposedSpatialMode] = useState<
    ProjectMap["spatialMode"] | null
  >(null);
  const autoProposeAttemptedRef = useRef(false);
  const autoGenImagesRef = useRef(false);
  const [autoGenProgress, setAutoGenProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const keys = typeof window !== "undefined" ? loadApiKeys() : null;
  const activeProvider: "kimi" | "openai" | null = keys?.llm.openai
    ? "openai"
    : keys?.llm.kimi
      ? "kimi"
      : null;
  const hasLlmKey = activeProvider !== null;

  const { data: sourcesData } = useSources(projectId);
  const { data: briefData } = useBrief(projectId);
  const { data: kbData } = useKB(projectId);
  const { data: mapData, isLoading: mapLoading } = useMap(projectId);

  const [sources] = useSyncedState<ProjectSources>(
    sourcesData ?? { images: [], documents: [] },
  );
  const [brief] = useSyncedState<ProjectBrief | undefined>(briefData);
  const [kb] = useSyncedState<ProjectKB>(kbData ?? { facts: [] });
  const [map, setMapState] = useSyncedState<ProjectMap>(
    mapData ?? { ...emptyMap(), spatialMode: inferSpatialMode(project?.type) },
  );

  const loaded = !mapLoading;

  useEffect(() => {
    saveProgress(projectId, { currentStep: "luogo" });
  }, [projectId]);

  const persist = (next: ProjectMap) => {
    setMapState(next);
    saveMap(projectId, next).then(() => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      setSaved(true);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
      invalidateProjectData(projectId, "map");
      window.dispatchEvent(new Event("toolia:map-updated"));
    });
  };

  const approvedFacts = useMemo(
    () => kb.facts.filter((f) => f.approved),
    [kb.facts],
  );

  const canPropose = hasLlmKey && (approvedFacts.length >= 5 || !!brief);

  const requestProposal = async () => {
    if (!canPropose || !keys || !activeProvider) return;
    setProposing(true);
    setProposalError(null);
    try {
      const res = await fetch("/api/ai/propose-luogo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: keys.llm[activeProvider],
          provider: activeProvider,
          projectName: project?.name ?? "Progetto",
          type: project?.type,
          city: project?.city,
          brief: brief
            ? {
                obiettivo: brief.obiettivo,
                promessaNarrativa: brief.promessaNarrativa,
                target: brief.target,
                tipoEsperienza: brief.tipoEsperienza,
                mustTell: brief.mustTell,
                niceToTell: brief.niceToTell,
                avoid: brief.avoid,
              }
            : undefined,
          planimetriaDescription: sources.planimetria?.description,
          spatialHints: sources.planimetria?.spatialHints,
          facts: approvedFacts.slice(0, 150).map((f) => ({
            content: f.content,
            category: f.category,
            importance: f.importance,
            reliability: f.reliability,
            sourceKind: f.sourceRef.kind,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProposalError(data.message ?? "Errore durante la proposta.");
        return;
      }
      const zones: ProposedZone[] = (data.zones ?? []).map(
        (
          z: {
            name: string;
            narrativePromise: string;
            function: ZoneFunction;
            reasoning: string;
          },
          i: number,
        ) => ({
          id: `pz-${i}-${Date.now()}`,
          name: z.name,
          narrativePromise: z.narrativePromise ?? "",
          function: z.function,
          reasoning: z.reasoning ?? "",
        }),
      );
      const pois: ProposedPoi[] = (data.pois ?? []).map(
        (
          p: {
            name: string;
            description: string;
            zoneSuggested: string;
            minStaySeconds: number;
            evidence: string;
          },
          i: number,
        ) => ({
          id: `pp-${i}-${Date.now()}`,
          name: p.name,
          description: p.description ?? "",
          zoneSuggested: p.zoneSuggested ?? "",
          minStaySeconds: p.minStaySeconds ?? 120,
          evidence: p.evidence ?? "",
          approved: true,
        }),
      );
      setProposedZones(zones);
      setProposedPois(pois);
      setProposedSpatialMode(data.spatialMode ?? null);
    } catch {
      setProposalError("Errore di rete.");
    } finally {
      setProposing(false);
    }
  };

  // Auto-propose al primo ingresso se nessun POI ancora
  useEffect(() => {
    if (!loaded) return;
    if (autoProposeAttemptedRef.current) return;
    if (map.pois.length > 0) return;
    if (!canPropose) return;
    if (proposing) return;
    if (proposedPois !== null) return;
    autoProposeAttemptedRef.current = true;
    void requestProposal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, map.pois.length, canPropose, proposing, proposedPois]);

  // Auto-genera foto mancanti via AI quando entra in questa pagina.
  // Silenzioso, in sequenza, una chiamata per volta. Triggers una sola volta.
  useEffect(() => {
    if (!loaded || autoGenImagesRef.current) return;
    if (!project?.name) return;
    const openaiKey = loadApiKeys().llm.openai;
    if (!openaiKey) return;
    const missing = map.pois.filter((p) => !p.image);
    if (missing.length === 0) return;
    autoGenImagesRef.current = true;

    (async () => {
      setAutoGenProgress({ done: 0, total: missing.length });
      for (let i = 0; i < missing.length; i++) {
        const poi = missing[i];
        try {
          const res = await fetch("/api/ai/generate-poi-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apiKey: openaiKey,
              style: "fotorealistico",
              poiName: poi.name,
              poiDescription: poi.description,
              projectName: project.name,
              projectType: project.type,
              city: project.city,
            }),
          });
          const data = await res.json();
          if (res.ok && data.dataUrl) {
            updatePoi(poi.id, { image: data.dataUrl });
          }
        } catch {
          // skip, continua col prossimo
        }
        setAutoGenProgress({ done: i + 1, total: missing.length });
      }
      setTimeout(() => setAutoGenProgress(null), 3000);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, project?.id, map.pois.length]);

  const acceptProposal = () => {
    if (!proposedZones || !proposedPois) return;
    const approvedList = proposedPois.filter((p) => p.approved);
    const zoneByName = new Map<string, string>();
    const newZones: MapZone[] = proposedZones.map((z, i) => {
      const id = newSourceId("z");
      zoneByName.set(z.name.toLowerCase(), id);
      return {
        id,
        name: z.name,
        narrativePromise: z.narrativePromise,
        function: z.function,
        order: i,
      };
    });
    const newPois: MapPoi[] = approvedList.map((p, i) => ({
      id: newSourceId("poi"),
      name: p.name,
      description: p.description,
      order: i,
      minStaySeconds: p.minStaySeconds,
      zoneId: zoneByName.get(p.zoneSuggested.toLowerCase()),
    }));
    const nextMap: ProjectMap = {
      ...map,
      spatialMode: proposedSpatialMode ?? map.spatialMode,
      zones: newZones,
      pois: newPois,
    };
    persist(nextMap);
    setProposedPois(null);
    setProposedZones(null);
    setProposedSpatialMode(null);
  };

  const discardProposal = () => {
    setProposedPois(null);
    setProposedZones(null);
    setProposedSpatialMode(null);
  };

  /* ========================== POI CRUD ========================== */

  const updatePoi = (poiId: string, patch: Partial<MapPoi>) => {
    // Le foto (dataURL base64) sono pesanti: se patch contiene image, salvo
    // solo via PATCH dedicato. Niente persist bulk (che supera il body limit
    // e manderebbe il PUT in timeout).
    if ("image" in patch) {
      const next = {
        ...map,
        pois: map.pois.map((p) => (p.id === poiId ? { ...p, ...patch } : p)),
      };
      setMapState(next);
      fetch(`/api/projects/${projectId}/pois/${poiId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageUrl: patch.image ?? null }),
      })
        .then(() => {
          window.dispatchEvent(new Event("toolia:map-updated"));
        })
        .catch(() => null);
      return;
    }
    persist({
      ...map,
      pois: map.pois.map((p) => (p.id === poiId ? { ...p, ...patch } : p)),
    });
  };

  const removePoi = (id: string) => {
    persist({ ...map, pois: map.pois.filter((p) => p.id !== id) });
  };

  const addPoi = (planX?: number, planY?: number) => {
    const newPoi: MapPoi = {
      id: newSourceId("poi"),
      name: "Nuovo punto",
      description: "",
      order: map.pois.length,
      minStaySeconds: 120,
      planimetriaX: planX,
      planimetriaY: planY,
    };
    persist({ ...map, pois: [...map.pois, newPoi] });
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
    persist({
      ...map,
      zones: [
        ...map.zones,
        {
          id: newSourceId("z"),
          name: "Nuova zona",
          narrativePromise: "",
          function: "sviluppo",
          order: map.zones.length,
        },
      ],
    });
  };

  const setSpatialMode = (spatialMode: SpatialMode) => {
    persist({ ...map, spatialMode });
  };

  const [autoGpsBusy, setAutoGpsBusy] = useState(false);
  const [autoGpsError, setAutoGpsError] = useState<string | null>(null);

  const autoComputeGps = async () => {
    const mapsKey = loadApiKeys().googleMaps;
    if (!mapsKey) {
      setAutoGpsError("Configura la chiave Google Maps in Impostazioni.");
      return;
    }
    const address =
      project?.address?.trim() || project?.city?.trim() || project?.name;
    if (!address) {
      setAutoGpsError(
        "Il progetto non ha un indirizzo. Impostalo nei dettagli del progetto.",
      );
      return;
    }
    setAutoGpsBusy(true);
    setAutoGpsError(null);
    try {
      const center = await geocodeAddress(mapsKey, address);
      if (!center) {
        setAutoGpsError("Non riesco a geocodificare l'indirizzo del progetto.");
        return;
      }
      const missing = map.pois.filter((p) => typeof p.lat !== "number");
      if (missing.length === 0) {
        setAutoGpsError(null);
        return;
      }
      let gridIdx = 0;
      const nextPois = map.pois.map((p) => {
        if (typeof p.lat === "number") return p;
        let coord: { lat: number; lng: number };
        if (
          typeof p.planimetriaX === "number" &&
          typeof p.planimetriaY === "number"
        ) {
          coord = planimetriaToLatLng(center, p.planimetriaX, p.planimetriaY);
        } else {
          coord = gridLatLng(center, gridIdx);
          gridIdx++;
        }
        return { ...p, lat: coord.lat, lng: coord.lng };
      });
      persist({
        ...map,
        pois: nextPois,
        centerLat: center.lat,
        centerLng: center.lng,
      });
    } catch (e) {
      setAutoGpsError(e instanceof Error ? e.message : "Errore.");
    } finally {
      setAutoGpsBusy(false);
    }
  };

  if (!loaded) return <div className="min-h-screen" />;

  const hasPlanimetria = !!sources.planimetria?.image;
  const luogoReady = map.pois.length >= 1;

  const placedOnPlan = map.pois.filter(
    (p) => typeof p.planimetriaX === "number",
  ).length;
  const placedOnGps = map.pois.filter((p) => typeof p.lat === "number").length;
  const poisWithZone = map.pois.filter((p) => !!p.zoneId).length;
  const poisWithImage = map.pois.filter((p) => !!p.image).length;
  const poisWithDescription = map.pois.filter(
    (p) => p.description.trim().length > 0,
  ).length;

  /* ========================== RENDER ========================== */

  const showProposal = proposedPois !== null && proposedZones !== null;
  const isReproposing = showProposal && map.pois.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      {autoGenProgress && (
        <div className="shrink-0 px-6 md:px-10 py-3 border-b border-border/60 bg-accent/40 flex items-center gap-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-brand shrink-0" />
          <span>
            Genero le foto dei POI con AI —{" "}
            <strong>
              {autoGenProgress.done} di {autoGenProgress.total}
            </strong>
          </span>
        </div>
      )}
      <header className="shrink-0 px-6 md:px-10 pt-8 pb-6 border-b border-border/60">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
              Step 3 · Struttura del luogo
            </p>
            <h1 className="font-heading text-3xl md:text-4xl italic leading-tight tracking-tight">
              Dove sono le cose
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-xl leading-relaxed">
              La mappa fisica del sito. L&apos;AI propone POI e zone dalle
              fonti, tu confermi, rinomini, piazzi.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-xs text-brand">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Salvato
              </span>
            )}
            {map.pois.length > 0 && (
              <button
                type="button"
                onClick={requestProposal}
                disabled={!canPropose || proposing}
                className={cn(
                  "inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium transition-colors",
                  !canPropose || proposing
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "border border-border text-foreground hover:bg-muted",
                )}
              >
                {proposing ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      strokeWidth={1.8}
                    />
                    Propongo…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                    Nuova proposta AI
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 md:px-10 py-8 max-w-[1100px] w-full mx-auto space-y-6">
        {proposalError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4 flex items-start gap-3">
            <AlertCircle
              className="h-4 w-4 text-destructive shrink-0 mt-0.5"
              strokeWidth={1.8}
            />
            <p className="text-xs text-muted-foreground">{proposalError}</p>
          </div>
        )}

        {/* GATE: niente chiave o niente materiale */}
        {!canPropose && map.pois.length === 0 && !proposing && (
          <ProposalGate
            hasLlmKey={hasLlmKey}
            factsCount={approvedFacts.length}
            hasBrief={!!brief?.obiettivo}
            projectId={projectId}
          />
        )}

        {/* SPINNER proposta iniziale */}
        {proposing && map.pois.length === 0 && !showProposal && (
          <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-4 text-center">
            <div className="h-12 w-12 rounded-2xl bg-brand/10 flex items-center justify-center">
              <Sparkles
                className="h-5 w-5 text-brand animate-pulse"
                strokeWidth={1.8}
              />
            </div>
            <p className="font-heading text-xl italic">
              L&apos;AI sta analizzando lo spazio…
            </p>
            <p className="text-sm text-muted-foreground max-w-md">
              Legge planimetria, spunti, fatti KB e brief per proporti zone e
              POI coerenti con le fonti.
            </p>
          </div>
        )}

        {/* PROPOSAL REVIEW PANEL */}
        {showProposal && (
          <ProposalReview
            zones={proposedZones!}
            pois={proposedPois!}
            spatialMode={proposedSpatialMode}
            isReproposing={isReproposing}
            existingPoisCount={map.pois.length}
            onTogglePoi={(id, approved) =>
              setProposedPois((prev) =>
                prev
                  ? prev.map((p) => (p.id === id ? { ...p, approved } : p))
                  : prev,
              )
            }
            onRenamePoi={(id, name) =>
              setProposedPois((prev) =>
                prev
                  ? prev.map((p) => (p.id === id ? { ...p, name } : p))
                  : prev,
              )
            }
            onEditPoiDescription={(id, description) =>
              setProposedPois((prev) =>
                prev
                  ? prev.map((p) => (p.id === id ? { ...p, description } : p))
                  : prev,
              )
            }
            onAccept={acceptProposal}
            onDiscard={discardProposal}
          />
        )}

        {/* EDITOR */}
        {map.pois.length > 0 && !showProposal && (
          <>
            <InvariantRuleBanner />

            <ZonesPanel
              zones={map.zones}
              pois={map.pois}
              onUpdateZone={updateZone}
              onRemoveZone={removeZone}
              onAddZone={addZone}
            />

            {/* Google Maps = superficie unica del Luogo */}
            <GpsEditor
              pois={map.pois}
              zones={map.zones}
              project={project}
              onUpdatePoi={updatePoi}
              onAssignToNext={(lat, lng) => {
                const next = map.pois.find((p) => typeof p.lat !== "number");
                if (next) updatePoi(next.id, { lat, lng });
              }}
              onAutoCompute={autoComputeGps}
              autoComputeBusy={autoGpsBusy}
              autoComputeError={autoGpsError}
              missingCount={map.pois.length - placedOnGps}
            />

            <PoiList
              pois={map.pois}
              zones={map.zones}
              project={project}
              onUpdatePoi={updatePoi}
              onRemovePoi={removePoi}
              onAddPoi={() => addPoi()}
            />

            {placedOnGps < map.pois.length && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                <AlertCircle
                  className="h-4 w-4 text-amber-700 shrink-0 mt-0.5"
                  strokeWidth={1.8}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-amber-900">
                    {map.pois.length - placedOnGps} POI senza coordinate GPS
                  </p>
                  <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                    L&apos;app visitatore usa Google Maps: ogni POI serve
                    lat/lng. Clicca &laquo;Calcola GPS automatico&raquo; oppure
                    piazza manualmente sulla mappa.
                  </p>
                </div>
              </div>
            )}

            <LuogoRecap
              total={map.pois.length}
              placedOnPlan={placedOnPlan}
              placedOnGps={placedOnGps}
              spatialMode={map.spatialMode}
              hasPlanimetria={hasPlanimetria}
              withZone={poisWithZone}
              withImage={poisWithImage}
              withDescription={poisWithDescription}
              zonesCount={map.zones.length}
            />
          </>
        )}
      </main>

      <footer className="shrink-0 border-t border-border/60 bg-paper">
        <div className="max-w-[1100px] mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <Link
            href={`/progetti/${projectId}/brief`}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Brief
          </Link>
          {luogoReady ? (
            <Link
              href={`/progetti/${projectId}/driver`}
              onClick={() => saveProgress(projectId, { currentStep: "luogo" })}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm font-medium bg-brand text-white hover:bg-brand/90 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
            >
              Vai a Driver e Personas
              <ArrowLeft className="h-4 w-4 rotate-180" strokeWidth={2} />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm font-medium bg-muted text-muted-foreground">
              Conferma almeno un POI
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ============================================================= */
/* ======================= COMPONENTS ========================== */
/* ============================================================= */

function SpatialModePanel({
  value,
  onChange,
}: {
  value: SpatialMode;
  onChange: (v: SpatialMode) => void;
}) {
  const options: { value: SpatialMode; label: string; hint: string }[] = [
    {
      value: "indoor",
      label: "Planimetria interna",
      hint: "Musei, palazzi, ville, ambienti chiusi",
    },
    {
      value: "gps",
      label: "GPS",
      hint: "Parchi, percorsi urbani, territori all'aperto",
    },
    {
      value: "hybrid",
      label: "Ibrida",
      hint: "Sia esterni sia interni (es. forti con ortofoto + ambienti)",
    },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium mb-3">
        Modalità spaziale
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "text-left rounded-xl border px-3 py-3 transition-colors",
              value === o.value
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground hover:border-foreground/40",
            )}
          >
            <p className="text-sm font-medium">{o.label}</p>
            <p
              className={cn(
                "text-[11px] mt-0.5 leading-snug",
                value === o.value
                  ? "text-background/70"
                  : "text-muted-foreground",
              )}
            >
              {o.hint}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function HybridSplitHint({
  indoor,
  outdoor,
  untyped,
}: {
  indoor: number;
  outdoor: number;
  untyped: number;
}) {
  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 flex items-start gap-3">
      <Info
        className="h-4 w-4 text-sky-700 shrink-0 mt-0.5"
        strokeWidth={1.8}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-sky-900">
          Modalità ibrida — divisione interno / esterno
        </p>
        <p className="text-xs text-sky-900/80 mt-1 leading-relaxed">
          I punti con tipo <strong>Interno</strong> si piazzano sulla
          planimetria. Quelli con tipo <strong>Esterno</strong> su Google Maps.
          Imposti il tipo di ogni punto dalla lista qui sotto.
        </p>
        <p className="text-[11px] text-sky-900/70 mt-2">
          {indoor} interni · {outdoor} esterni
          {untyped > 0 && (
            <>
              {" · "}
              <span className="text-amber-700 font-medium">
                {untyped} da tipizzare
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function InvariantRuleBanner() {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4 flex items-start gap-3">
      <Info
        className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5"
        strokeWidth={1.8}
      />
      <p className="text-xs text-muted-foreground leading-relaxed">
        Lo spazio guida il racconto. I percorsi che creerai dovranno rispettare
        dove si trovano davvero le cose: niente salti attraverso muri o ritorni
        indietro senza motivo.
      </p>
    </div>
  );
}

function LuogoRecap({
  total,
  placedOnPlan,
  placedOnGps,
  spatialMode,
  hasPlanimetria,
  withZone,
  withImage,
  withDescription,
  zonesCount,
}: {
  total: number;
  placedOnPlan: number;
  placedOnGps: number;
  spatialMode: SpatialMode;
  hasPlanimetria: boolean;
  withZone: number;
  withImage: number;
  withDescription: number;
  zonesCount: number;
}) {
  const dimensions: {
    label: string;
    filled: number;
    total: number;
    hint: string;
  }[] = [
    {
      label: "Posizione GPS",
      filled: placedOnGps,
      total,
      hint: "Lat/lng per l'app visitatore su Google Maps",
    },
    {
      label: "Zona assegnata",
      filled: withZone,
      total,
      hint: "Ogni punto appartiene a una zona narrativa",
    },
    {
      label: "Descrizione breve",
      filled: withDescription,
      total,
      hint: "Testo di contesto per il visitatore",
    },
    {
      label: "Foto",
      filled: withImage,
      total,
      hint: "Sfondo della scheda nell'app",
    },
  ];

  const avgPct =
    dimensions.length > 0
      ? Math.round(
          (dimensions.reduce((acc, d) => acc + d.filled / d.total, 0) /
            dimensions.length) *
            100,
        )
      : 0;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">Completamento del Luogo</p>
        <div className="flex items-baseline gap-3">
          <span className="font-heading italic text-2xl tabular-nums">
            {avgPct}%
          </span>
          <span className="text-[11px] text-muted-foreground">
            {total} punti · {zonesCount} zone
          </span>
        </div>
      </div>
      <div className="divide-y divide-border/60">
        {dimensions.map((d) => {
          const pct = d.total > 0 ? Math.round((d.filled / d.total) * 100) : 0;
          return (
            <div key={d.label} className="px-5 py-3 flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{d.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {d.hint}
                </p>
              </div>
              <div className="w-40 shrink-0">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      pct === 100
                        ? "bg-brand"
                        : pct >= 50
                          ? "bg-amber-400"
                          : "bg-muted-foreground/40",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="text-xs tabular-nums w-14 text-right text-muted-foreground">
                {d.filled}/{d.total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProposalGate({
  hasLlmKey,
  factsCount,
  hasBrief,
  projectId,
}: {
  hasLlmKey: boolean;
  factsCount: number;
  hasBrief: boolean;
  projectId: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-4">
      <div className="h-14 w-14 rounded-2xl bg-muted mx-auto flex items-center justify-center">
        <MapPin className="h-6 w-6 text-foreground" strokeWidth={1.6} />
      </div>
      <p className="font-heading text-2xl italic">Serve materiale</p>
      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        {!hasLlmKey
          ? "Configura la chiave LLM in Impostazioni."
          : factsCount < 5
            ? "Torna alle Fonti e approva almeno 5 fatti nella Knowledge Base prima di costruire il luogo."
            : !hasBrief
              ? "Compila il Brief prima di modellare lo spazio: serve la direzione editoriale per proporre zone coerenti."
              : "Non abbiamo abbastanza materiale per proporre una modellazione."}
      </p>
      <div className="flex items-center justify-center gap-2">
        <Link
          href={`/progetti/${projectId}/fonti`}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-border text-xs font-medium hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Torna alle Fonti
        </Link>
        {hasLlmKey && factsCount >= 5 && (
          <Link
            href={`/progetti/${projectId}/brief`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-border text-xs font-medium hover:bg-muted transition-colors"
          >
            Vai al Brief
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
          </Link>
        )}
      </div>
    </div>
  );
}

function NoPlanimetriaPanel({ projectId }: { projectId: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6 flex items-start gap-3">
      <MapPin
        className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5"
        strokeWidth={1.8}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Nessuna planimetria caricata</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Puoi gestire i POI solo dalla lista qui sotto. Per piazzarli su un
          disegno, carica la planimetria nelle{" "}
          <Link
            href={`/progetti/${projectId}/fonti`}
            className="underline text-foreground underline-offset-2"
          >
            Fonti
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function ProposalReview({
  zones,
  pois,
  spatialMode,
  isReproposing,
  existingPoisCount,
  onTogglePoi,
  onRenamePoi,
  onEditPoiDescription,
  onAccept,
  onDiscard,
}: {
  zones: ProposedZone[];
  pois: ProposedPoi[];
  spatialMode: ProjectMap["spatialMode"] | null;
  isReproposing: boolean;
  existingPoisCount: number;
  onTogglePoi: (id: string, approved: boolean) => void;
  onRenamePoi: (id: string, name: string) => void;
  onEditPoiDescription: (id: string, description: string) => void;
  onAccept: () => void;
  onDiscard: () => void;
}) {
  const approvedCount = pois.filter((p) => p.approved).length;
  const poisByZone = new Map<string, ProposedPoi[]>();
  pois.forEach((p) => {
    const key = p.zoneSuggested || "—";
    const arr = poisByZone.get(key) ?? [];
    arr.push(p);
    poisByZone.set(key, arr);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div
        className={cn(
          "rounded-2xl border p-5",
          isReproposing
            ? "border-amber-300 bg-amber-50"
            : "border-brand/30 bg-brand/5",
        )}
      >
        <div className="flex items-start gap-3">
          <Sparkles
            className={cn(
              "h-4 w-4 shrink-0 mt-0.5",
              isReproposing ? "text-amber-700" : "text-brand",
            )}
            strokeWidth={1.8}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {isReproposing
                ? "Nuova proposta (sostituirà l'attuale)"
                : "Proposta AI"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {isReproposing && (
                <>
                  <strong>Attenzione</strong>: confermando questa proposta i{" "}
                  {existingPoisCount} POI attuali verranno sostituiti.{" "}
                </>
              )}
              {zones.length} zone · {pois.length} POI candidati. Spuntali per
              confermarli, rinomina se serve. Niente coordinate ancora:
              decideremo insieme dopo.
              {spatialMode && (
                <>
                  {" "}
                  Modalità spaziale suggerita: <strong>{spatialMode}</strong>.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Zone proposte */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="px-5 py-3 border-b border-border/60 flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            Zone narrative · {zones.length}
          </p>
        </div>
        <ul className="divide-y divide-border/60">
          {zones.map((z) => (
            <li key={z.id} className="px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{z.name}</p>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {ZONE_FUNCTION_LABEL[z.function]}
                </span>
              </div>
              {z.narrativePromise && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {z.narrativePromise}
                </p>
              )}
              {z.reasoning && (
                <p className="text-[11px] text-muted-foreground/80 mt-2 italic">
                  {z.reasoning}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* POI proposti per zona */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={1.8}
            />
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
              Punti proposti · {approvedCount}/{pois.length}
            </p>
          </div>
        </div>
        <div className="divide-y divide-border/60">
          {Array.from(poisByZone.entries()).map(([zone, list]) => (
            <div key={zone} className="px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium mb-3">
                {zone}
              </p>
              <ul className="space-y-2">
                {list.map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      "rounded-xl border bg-paper/40 p-3 flex items-start gap-3",
                      p.approved
                        ? "border-border"
                        : "border-border/40 opacity-60",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onTogglePoi(p.id, !p.approved)}
                      className={cn(
                        "shrink-0 mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        p.approved
                          ? "bg-brand border-brand text-white"
                          : "border-muted-foreground/40 hover:border-foreground",
                      )}
                      aria-label={p.approved ? "Scarta" : "Approva"}
                    >
                      {p.approved && (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      )}
                    </button>
                    <div className="flex-1 min-w-0 space-y-2">
                      <Input
                        value={p.name}
                        onChange={(e) => onRenamePoi(p.id, e.target.value)}
                        className="h-8 text-sm font-medium bg-card"
                      />
                      <textarea
                        value={p.description}
                        onChange={(e) =>
                          onEditPoiDescription(p.id, e.target.value)
                        }
                        rows={2}
                        className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
                      />
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span>
                          Sosta {Math.round(p.minStaySeconds / 60)} min
                        </span>
                        {p.evidence && (
                          <span
                            className="italic truncate max-w-[60%]"
                            title={p.evidence}
                          >
                            &ldquo;{p.evidence}&rdquo;
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex items-center h-10 px-5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Scarta proposta
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={approvedCount === 0}
          className={cn(
            "inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-sm font-medium transition-colors",
            approvedCount === 0
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-foreground text-background hover:bg-foreground/90",
          )}
        >
          <Check className="h-4 w-4" strokeWidth={2} />
          Conferma {approvedCount} POI
        </button>
      </div>
    </motion.div>
  );
}

function ZonesPanel({
  zones,
  pois,
  onUpdateZone,
  onRemoveZone,
  onAddZone,
}: {
  zones: MapZone[];
  pois: MapPoi[];
  onUpdateZone: (id: string, patch: Partial<MapZone>) => void;
  onRemoveZone: (id: string) => void;
  onAddZone: () => void;
}) {
  const countByZone = (zoneId: string) =>
    pois.filter((p) => p.zoneId === zoneId).length;

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            Zone · {zones.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddZone}
          className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
          Aggiungi
        </button>
      </div>
      {zones.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nessuna zona. Aggiungine una o fai rigenerare la proposta AI.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {zones.map((z) => (
            <li key={z.id} className="px-5 py-4 space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <Input
                    value={z.name}
                    onChange={(e) =>
                      onUpdateZone(z.id, { name: e.target.value })
                    }
                    className="h-9 text-sm font-medium"
                  />
                  <textarea
                    value={z.narrativePromise}
                    onChange={(e) =>
                      onUpdateZone(z.id, { narrativePromise: e.target.value })
                    }
                    placeholder="Promessa narrativa"
                    rows={2}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
                  />
                  <div className="flex items-center gap-2">
                    {(["apertura", "sviluppo", "climax"] as ZoneFunction[]).map(
                      (fn) => (
                        <button
                          key={fn}
                          type="button"
                          onClick={() => onUpdateZone(z.id, { function: fn })}
                          className={cn(
                            "h-7 px-3 rounded-full text-[10px] font-medium transition-colors border",
                            z.function === fn
                              ? "bg-foreground text-background border-foreground"
                              : "border-border text-muted-foreground hover:text-foreground",
                          )}
                          title={ZONE_FUNCTION_HINT[fn]}
                        >
                          {ZONE_FUNCTION_LABEL[fn]}
                        </button>
                      ),
                    )}
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {countByZone(z.id)} POI
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveZone(z.id)}
                  className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Rimuovi zona"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlanimetriaEditor({
  image,
  pois,
  zones,
  onUpdatePoi,
  onAddPoi,
}: {
  image: string;
  pois: MapPoi[];
  zones: MapZone[];
  onUpdatePoi: (id: string, patch: Partial<MapPoi>) => void;
  onAddPoi: (x?: number, y?: number) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Target: primo POI senza coordinate → riceverà il click
  const nextUnplaced = pois.find((p) => typeof p.planimetriaX !== "number");

  const colorForZone = (zoneId?: string): string => {
    if (!zoneId) return "bg-muted-foreground";
    const idx = zones.findIndex((z) => z.id === zoneId);
    const palette = [
      "bg-sky-500",
      "bg-emerald-500",
      "bg-amber-500",
      "bg-rose-500",
      "bg-violet-500",
    ];
    if (idx === -1) return "bg-muted-foreground";
    return palette[idx % palette.length];
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) return;
    if (draggingId) return;
    if (!nextUnplaced) return; // nessun POI da piazzare: click ignorato
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onUpdatePoi(nextUnplaced.id, { planimetriaX: x, planimetriaY: y });
    setSelectedId(nextUnplaced.id);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onUpdatePoi(draggingId, { planimetriaX: x, planimetriaY: y });
  };

  const placedPois = pois.filter((p) => typeof p.planimetriaX === "number");

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
          Planimetria · {placedPois.length}/{pois.length} piazzati
        </p>
        <p className="text-[11px] text-muted-foreground">
          {nextUnplaced
            ? `Clicca per piazzare: ${nextUnplaced.name}`
            : "Tutti i POI piazzati. Trascina i pin per correggerli."}
        </p>
      </div>
      <div
        className="relative bg-[#F5F1EA] flex items-center justify-center min-h-[360px] p-4 select-none cursor-crosshair"
        onClick={onCanvasClick}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDraggingId(null)}
        onPointerCancel={() => setDraggingId(null)}
      >
        <div ref={wrapperRef} className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Planimetria"
            draggable={false}
            className="max-h-[560px] max-w-full object-contain block pointer-events-none"
          />
          {placedPois.map((p) => (
            <button
              type="button"
              key={p.id}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                setDraggingId(p.id);
                setSelectedId(p.id);
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label={p.name}
              title={p.name}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.3)] ring-2 transition-all",
                colorForZone(p.zoneId),
                selectedId === p.id
                  ? "ring-white ring-offset-2 ring-offset-[#F5F1EA] scale-110"
                  : "ring-white",
                draggingId === p.id
                  ? "cursor-grabbing scale-125"
                  : "cursor-grab hover:scale-110",
              )}
              style={{
                left: `${(p.planimetriaX ?? 0) * 100}%`,
                top: `${(p.planimetriaY ?? 0) * 100}%`,
                touchAction: "none",
              }}
            >
              {pois.findIndex((x) => x.id === p.id) + 1}
            </button>
          ))}
        </div>
      </div>
      {zones.length > 0 && (
        <div className="px-5 py-3 border-t border-border/60 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {zones.map((z, i) => {
            const palette = [
              "bg-sky-500",
              "bg-emerald-500",
              "bg-amber-500",
              "bg-rose-500",
              "bg-violet-500",
            ];
            return (
              <span key={z.id} className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    palette[i % palette.length],
                  )}
                />
                {z.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PoiList({
  pois,
  zones,
  project,
  onUpdatePoi,
  onRemovePoi,
  onAddPoi,
}: {
  pois: MapPoi[];
  zones: MapZone[];
  project: StoredProject | null;
  onUpdatePoi: (id: string, patch: Partial<MapPoi>) => void;
  onRemovePoi: (id: string) => void;
  onAddPoi: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            Punti di interesse · {pois.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddPoi}
          className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
          Aggiungi POI
        </button>
      </div>
      <ul className="divide-y divide-border/60">
        {pois.map((p, idx) => (
          <li key={p.id} className="px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="shrink-0 h-7 w-7 rounded-full bg-foreground text-background text-[11px] font-bold flex items-center justify-center tabular-nums mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0 space-y-2">
                <Input
                  value={p.name}
                  onChange={(e) => onUpdatePoi(p.id, { name: e.target.value })}
                  className="h-9 text-sm font-medium"
                />
                <textarea
                  value={p.description}
                  onChange={(e) =>
                    onUpdatePoi(p.id, { description: e.target.value })
                  }
                  placeholder="Descrizione breve"
                  rows={2}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <div className="inline-flex items-center gap-1.5">
                    <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Zona
                    </Label>
                    <select
                      value={p.zoneId ?? ""}
                      onChange={(e) =>
                        onUpdatePoi(p.id, {
                          zoneId: e.target.value || undefined,
                        })
                      }
                      className="h-7 rounded-md border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    >
                      <option value="">—</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="inline-flex items-center gap-1">
                    <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mr-1">
                      Tipo
                    </Label>
                    {(["indoor", "outdoor"] as PoiType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onUpdatePoi(p.id, { type: t })}
                        className={cn(
                          "h-7 px-2.5 rounded-full text-[10px] font-medium transition-colors border",
                          p.type === t
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t === "indoor" ? "Interno" : "Esterno"}
                      </button>
                    ))}
                  </div>

                  <div className="inline-flex items-center gap-1.5">
                    <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Sosta (min)
                    </Label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={Math.round((p.minStaySeconds ?? 120) / 60)}
                      onChange={(e) =>
                        onUpdatePoi(p.id, {
                          minStaySeconds:
                            Math.max(
                              1,
                              Math.min(30, parseInt(e.target.value, 10) || 1),
                            ) * 60,
                        })
                      }
                      className="h-7 w-16 rounded-md border border-border bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    />
                  </div>

                  {typeof p.planimetriaX === "number" ? (
                    <span className="inline-flex items-center gap-1 text-brand">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                      Piazzato
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Non piazzato</span>
                  )}
                </div>

                <PoiImageUpload
                  value={p.image}
                  onChange={(img) =>
                    onUpdatePoi(p.id, { image: img ?? undefined })
                  }
                  poi={p}
                  project={project}
                />
              </div>
              <button
                type="button"
                onClick={() => onRemovePoi(p.id)}
                className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Rimuovi POI"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PoiImageUpload({
  value,
  onChange,
  poi,
  project,
}: {
  value?: string;
  onChange: (v: string | null) => void;
  poi: MapPoi;
  project: StoredProject | null;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handle = async (f: File) => {
    if (!f.type.startsWith("image/")) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
    onChange(dataUrl);
  };

  const generate = async (style: "illustrazione" | "fotorealistico") => {
    setPickerOpen(false);
    const apiKey = loadApiKeys().llm.openai;
    if (!apiKey) {
      setError("Configura la chiave OpenAI in Impostazioni.");
      return;
    }
    if (!project?.name) {
      setError("Dati progetto mancanti.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-poi-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          style,
          poiName: poi.name,
          poiDescription: poi.description,
          projectName: project.name,
          projectType: project.type,
          city: project.city,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.dataUrl) {
        setError(data.message ?? "Errore generazione immagine.");
        return;
      }
      onChange(data.dataUrl);
    } catch {
      setError("Errore di rete.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Foto POI"
              className="h-14 w-20 object-cover rounded-md border border-border"
            />
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] border border-border hover:bg-muted transition-colors"
            >
              <RefreshCw className="h-3 w-3" strokeWidth={1.8} />
              Cambia
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen((s) => !s)}
              disabled={busy}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.8} />
              ) : (
                <Sparkles className="h-3 w-3" strokeWidth={1.8} />
              )}
              Rigenera AI
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              Rimuovi
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
              Carica foto
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen((s) => !s)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-medium bg-brand/10 text-brand border border-brand/30 hover:bg-brand/20 transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {busy ? (
                <>
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    strokeWidth={1.8}
                  />
                  Genero…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Genera con AI
                </>
              )}
            </button>
          </>
        )}
      </div>

      {pickerOpen && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground mr-1">Stile:</span>
          <button
            type="button"
            onClick={() => generate("fotorealistico")}
            className="inline-flex items-center h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors"
          >
            Fotorealistico
          </button>
          <button
            type="button"
            onClick={() => generate("illustrazione")}
            className="inline-flex items-center h-7 px-3 rounded-full text-[11px] font-medium border border-border hover:bg-muted transition-colors"
          >
            Illustrazione
          </button>
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            className="inline-flex items-center h-7 px-2 rounded-full text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            annulla
          </button>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" strokeWidth={1.8} />
          {error}
        </p>
      )}

      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function GpsEditor({
  pois,
  zones,
  project,
  onUpdatePoi,
  onAssignToNext,
  onAutoCompute,
  autoComputeBusy,
  autoComputeError,
  missingCount,
}: {
  pois: MapPoi[];
  zones: MapZone[];
  project: StoredProject | null;
  onUpdatePoi: (id: string, patch: Partial<MapPoi>) => void;
  onAssignToNext: (lat: number, lng: number) => void;
  onAutoCompute?: () => void | Promise<void>;
  autoComputeBusy?: boolean;
  autoComputeError?: string | null;
  missingCount?: number;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [loading, setLoading] = useState(true);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [zoomTo, setZoomTo] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const onAssignRef = useRef(onAssignToNext);
  onAssignRef.current = onAssignToNext;
  const onUpdateRef = useRef(onUpdatePoi);
  onUpdateRef.current = onUpdatePoi;
  const hasUnplacedRef = useRef(false);
  hasUnplacedRef.current = pois.some((p) => typeof p.lat !== "number");

  const apiKey = loadApiKeys().googleMaps;

  const placedPois = pois.filter((p) => typeof p.lat === "number");
  const nextUnplaced = pois.find((p) => typeof p.lat !== "number");

  // Inizializzazione mappa
  useEffect(() => {
    if (!apiKey) {
      setMapsError(
        "Configura la chiave Google Maps in Impostazioni per usare il GPS.",
      );
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const maps = await loadGoogleMaps(apiKey);
        if (!alive || !mapContainerRef.current) return;

        // Centro iniziale: prima cerca un POI già piazzato, poi geocoding indirizzo,
        // altrimenti centra su Italia
        let center: google.maps.LatLngLiteral = { lat: 41.9, lng: 12.5 };
        let zoom = 6;

        const anchor = placedPois[0];
        if (
          anchor &&
          typeof anchor.lat === "number" &&
          typeof anchor.lng === "number"
        ) {
          center = { lat: anchor.lat, lng: anchor.lng };
          zoom = 17;
        } else if (project?.address || project?.city) {
          const geo = await geocodeAddress(
            apiKey,
            project.address || project.city || "",
          );
          if (geo) {
            center = geo;
            zoom = 16;
          }
        }

        if (!alive || !mapContainerRef.current) return;

        const gmap = new maps.Map(mapContainerRef.current, {
          center,
          zoom,
          mapTypeId: maps.MapTypeId.HYBRID,
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: true,
          clickableIcons: false,
        });

        mapInstanceRef.current = gmap;

        gmap.addListener("click", (e: google.maps.MapMouseEvent) => {
          const ll = e.latLng;
          if (!ll) return;
          // Solo se c'è un POI non ancora piazzato su GPS: assegna. Altrimenti ignora.
          if (!hasUnplacedRef.current) return;
          onAssignRef.current(ll.lat(), ll.lng());
        });

        setLoading(false);
      } catch (err) {
        setMapsError(
          err instanceof Error ? err.message : "Errore caricamento mappa.",
        );
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Sincronizza marker
  useEffect(() => {
    const gmap = mapInstanceRef.current;
    if (!gmap) return;
    const existing = markersRef.current;
    const keep = new Set<string>();

    placedPois.forEach((p, idx) => {
      keep.add(p.id);
      const zoneIdx = zones.findIndex((z) => z.id === p.zoneId);
      const color =
        zoneIdx >= 0 ? ZONE_PALETTE[zoneIdx % ZONE_PALETTE.length] : "#6b7280";
      const position = { lat: p.lat!, lng: p.lng! };
      const orderNum = pois.findIndex((x) => x.id === p.id) + 1 || idx + 1;

      let marker = existing.get(p.id);
      if (!marker) {
        marker = new google.maps.Marker({
          position,
          map: gmap,
          draggable: true,
          label: {
            text: String(orderNum),
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: "600",
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
        marker.addListener("dragend", () => {
          const pos = marker!.getPosition();
          if (!pos) return;
          onUpdateRef.current(p.id, { lat: pos.lat(), lng: pos.lng() });
        });
        existing.set(p.id, marker);
      } else {
        marker.setPosition(position);
        marker.setLabel({
          text: String(orderNum),
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: "600",
        });
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        });
      }
    });

    // Rimuovi marker orfani
    for (const [id, marker] of existing) {
      if (!keep.has(id)) {
        marker.setMap(null);
        existing.delete(id);
      }
    }
  }, [placedPois, pois, zones]);

  // Pan al POI selezionato da zoomTo
  useEffect(() => {
    const gmap = mapInstanceRef.current;
    if (!gmap || !zoomTo) return;
    gmap.panTo(zoomTo);
    if ((gmap.getZoom() ?? 0) < 17) gmap.setZoom(17);
    setZoomTo(null);
  }, [zoomTo]);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
            Mappa GPS · {placedPois.length}/{pois.length} piazzati
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {nextUnplaced
              ? `Click per piazzare: ${nextUnplaced.name}`
              : "Trascina i marker per correggere."}
          </p>
        </div>
        {onAutoCompute && (missingCount ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => void onAutoCompute()}
            disabled={autoComputeBusy}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-medium transition-colors",
              autoComputeBusy
                ? "bg-muted text-muted-foreground cursor-wait"
                : "bg-foreground text-background hover:bg-foreground/90",
            )}
          >
            {autoComputeBusy ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.8} />
                Calcolo…
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" strokeWidth={1.8} />
                Calcola GPS automatico
              </>
            )}
          </button>
        )}
      </div>
      {autoComputeError && (
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
          <AlertCircle
            className="h-3.5 w-3.5 shrink-0 mt-0.5"
            strokeWidth={1.8}
          />
          <span>{autoComputeError}</span>
        </div>
      )}
      {mapsError ? (
        <div className="p-8 flex items-start gap-3">
          <AlertCircle
            className="h-4 w-4 text-destructive shrink-0 mt-0.5"
            strokeWidth={1.8}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Mappa non disponibile</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {mapsError}
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div ref={mapContainerRef} className="w-full h-[520px] bg-muted" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-paper/60 backdrop-blur-sm">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                Carico la mappa…
              </div>
            </div>
          )}
        </div>
      )}
      {zones.length > 0 && !mapsError && (
        <div className="px-5 py-3 border-t border-border/60 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {zones.map((z, i) => (
            <span key={z.id} className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: ZONE_PALETTE[i % ZONE_PALETTE.length],
                }}
              />
              {z.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
