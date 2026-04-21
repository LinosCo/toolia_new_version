"use client";

import { useEffect, useState } from "react";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { loadApiKeys } from "@/lib/api-keys";

interface ResolveResult {
  lat?: number;
  lng?: number;
  place?: string;
  error?: string;
  status?: number;
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

function extractCity(components: AddressComponent[]): string | undefined {
  const types = [
    "locality",
    "administrative_area_level_3",
    "administrative_area_level_2",
    "postal_town",
  ];
  for (const t of types) {
    const comp = components.find((c) => c.types.includes(t));
    if (comp) return comp.long_name;
  }
  return undefined;
}

export function MapsPreview({
  link,
  onResolved,
}: {
  link: string;
  onResolved?: (info: {
    address?: string;
    city?: string;
    lat?: number;
    lng?: number;
  }) => void;
}) {
  const [apiKey, setApiKey] = useState<string>("");
  const [data, setData] = useState<ResolveResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setApiKey(loadApiKeys().googleMaps);
  }, []);

  // Reverse geocode when we have coords
  useEffect(() => {
    if (!apiKey || !data?.lat || !data?.lng || !onResolved) return;
    let cancelled = false;
    fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${data.lat},${data.lng}&key=${apiKey}&language=it`,
    )
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const result = json?.results?.[0];
        const formatted: string | undefined = result?.formatted_address;
        const city = result?.address_components
          ? extractCity(result.address_components)
          : undefined;
        onResolved({
          address: formatted,
          city,
          lat: data.lat,
          lng: data.lng,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiKey, data?.lat, data?.lng, onResolved]);

  useEffect(() => {
    if (!link || link.length < 10) {
      setData(null);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/maps/resolve?url=${encodeURIComponent(link)}`,
          { signal: controller.signal },
        );
        const json = await res.json();
        setData(json);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 700);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [link]);

  if (!link) return null;

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 flex items-start gap-3">
        <AlertCircle
          className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5"
          strokeWidth={1.8}
        />
        <div className="text-xs text-muted-foreground">
          Per vedere l&apos;anteprima, salva la chiave{" "}
          <span className="text-foreground font-medium">Google Maps</span> in
          Impostazioni → Chiavi API.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 aspect-[16/9] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
        <span className="text-xs">Individuo la posizione…</span>
      </div>
    );
  }

  if (!data || data.error) {
    if (data?.error === "short_link") {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5"
              strokeWidth={1.8}
            />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">
                Link abbreviato
              </span>{" "}
              — per l&apos;anteprima serve il link completo. Apri il link, poi
              copia l&apos;URL completo dalla barra del browser e incollalo qui.
            </div>
          </div>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-foreground text-background text-xs font-medium hover:bg-foreground/90 transition-colors"
          >
            Apri nel browser
          </a>
        </div>
      );
    }
    const msg =
      data?.error === "invalid_link"
        ? "Link non valido o scaduto. Copia di nuovo da Google Maps."
        : "Non riesco a risolvere questo link. Verifica che sia un link di Google Maps valido.";
    return (
      <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/[0.03] p-4 flex items-start gap-3">
        <AlertCircle
          className="h-4 w-4 text-destructive shrink-0 mt-0.5"
          strokeWidth={1.8}
        />
        <div className="text-xs text-muted-foreground">{msg}</div>
      </div>
    );
  }

  const query =
    data.lat !== undefined && data.lng !== undefined
      ? `${data.lat},${data.lng}`
      : data.place;

  if (!query) return null;

  const src = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(
    query,
  )}&zoom=15`;

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <iframe
          src={src}
          width="100%"
          height="240"
          style={{ border: 0, display: "block" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          title="Anteprima posizione"
        />
      </div>
      <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <MapPin className="h-3 w-3" strokeWidth={1.8} />
        {data.place
          ? data.place
          : `${data.lat?.toFixed(5)}, ${data.lng?.toFixed(5)}`}
      </p>
    </div>
  );
}
