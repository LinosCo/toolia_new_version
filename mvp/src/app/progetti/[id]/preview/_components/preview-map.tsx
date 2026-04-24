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

export function PreviewMap({
  pois,
  projectId,
  onSelect,
}: {
  pois: Poi[];
  projectId: string;
  onSelect?: (poiId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const key = loadApiKeys().googleMaps;
    setHasKey(!!key);
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
        geo.forEach((p, idx) => {
          const marker = new maps.Marker({
            position: { lat: p.lat, lng: p.lng },
            map,
            label: {
              text: String(idx + 1),
              color: "#fff",
              fontWeight: "600",
              fontSize: "13px",
            },
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: "#b85a2b",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            },
          });
          bounds.extend({ lat: p.lat, lng: p.lng });
          if (onSelect) {
            marker.addListener("click", () => onSelect(p.id));
          } else {
            marker.addListener("click", () => {
              window.location.href = `/progetti/${projectId}/preview/poi/${p.id}`;
            });
          }
        });
        if (geo.length > 1) map.fitBounds(bounds, 60);

        setReady(true);
      } catch {
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pois, projectId, onSelect]);

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
    <div className="relative aspect-[16/10] md:aspect-[21/9] rounded-3xl overflow-hidden border border-border/60 bg-muted">
      <div ref={ref} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
