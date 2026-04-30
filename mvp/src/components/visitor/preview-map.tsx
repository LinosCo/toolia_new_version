"use client";

import { useEffect, useRef, useState } from "react";
import { loadApiKeys } from "@/lib/api-keys";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { MapPin, Loader2 } from "lucide-react";

type Poi = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
};

interface PreviewMapProps {
  pois: Poi[];
  projectId: string;
  /** Sequenza ordinata di POI ID che compone il percorso. Se passata, marker numerati e polyline. */
  pathOrder?: string[];
  /** ID del POI attualmente attivo (es. nella scheda) — viene evidenziato. */
  activePoiId?: string;
  /** Override dell'aspect ratio (default 16/10). */
  aspect?: string;
  onSelect?: (poiId: string) => void;
}

export function PreviewMap({
  pois,
  projectId,
  pathOrder,
  activePoiId,
  aspect,
  onSelect,
}: PreviewMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [hasKey] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    return !!loadApiKeys().googleMaps;
  });

  useEffect(() => {
    const key = loadApiKeys().googleMaps;
    if (!key) return;
    if (!ref.current) return;

    let alive = true;
    (async () => {
      try {
        const maps = await loadGoogleMaps(key);
        if (!alive || !ref.current) return;

        const geo = pois.filter(
          (p): p is Poi & { lat: number; lng: number } =>
            typeof p.lat === "number" && typeof p.lng === "number",
        );
        if (geo.length === 0) {
          setReady(true);
          return;
        }

        const center = {
          lat: geo.reduce((a, p) => a + p.lat, 0) / geo.length,
          lng: geo.reduce((a, p) => a + p.lng, 0) / geo.length,
        };

        const map = new maps.Map(ref.current, {
          center,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });

        const bounds = new maps.LatLngBounds();
        const ordered = pathOrder
          ? (pathOrder
              .map((id) => geo.find((g) => g.id === id))
              .filter(Boolean) as Array<Poi & { lat: number; lng: number }>)
          : geo;

        // Polyline tra i POI dell'ordine
        if (pathOrder && ordered.length > 1) {
          new maps.Polyline({
            path: ordered.map((p) => ({ lat: p.lat, lng: p.lng })),
            geodesic: true,
            strokeColor: "#b85a2b",
            strokeOpacity: 0.85,
            strokeWeight: 3,
            map,
          });
        }

        // Marker
        const markersList = pathOrder ? ordered : geo;
        markersList.forEach((p, idx) => {
          const isActive = p.id === activePoiId;
          const label = pathOrder
            ? {
                text: String(idx + 1),
                color: "#fff",
                fontWeight: "600",
                fontSize: "13px",
              }
            : null;
          const marker = new maps.Marker({
            position: { lat: p.lat, lng: p.lng },
            map,
            label: label ?? undefined,
            title: p.name,
            zIndex: isActive ? 1000 : 1,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: isActive ? 18 : 14,
              fillColor: isActive ? "#1f1f1f" : "#b85a2b",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: isActive ? 3 : 2,
            },
          });
          bounds.extend({ lat: p.lat, lng: p.lng });
          if (onSelect) {
            marker.addListener("click", () => onSelect(p.id));
          } else {
            marker.addListener("click", () => {
              window.location.href = `/v/${projectId}/poi/${p.id}`;
            });
          }
        });
        if (markersList.length > 1) map.fitBounds(bounds, 60);

        setReady(true);
      } catch {
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pois, projectId, pathOrder, activePoiId, onSelect]);

  if (hasKey === false) {
    return (
      <div className="rounded-3xl border border-dashed border-border/70 bg-muted/30 p-10 text-center">
        <MapPin
          className="h-6 w-6 mx-auto mb-3 text-muted-foreground"
          strokeWidth={1.6}
        />
        <p className="text-sm text-muted-foreground">
          Inserisci una chiave Google Maps in Impostazioni per vedere la mappa.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border border-border/60 bg-muted ${
        aspect ?? "aspect-[16/10] md:aspect-[21/9]"
      }`}
    >
      <div ref={ref} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
