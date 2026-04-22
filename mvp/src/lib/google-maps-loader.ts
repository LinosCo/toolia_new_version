declare global {
  interface Window {
    google?: typeof google;
    __toolia_maps_loader?: Promise<typeof google.maps>;
  }
}

export function loadGoogleMaps(apiKey: string): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Maps loader non disponibile (SSR)"),
    );
  }
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (window.__toolia_maps_loader) return window.__toolia_maps_loader;

  window.__toolia_maps_loader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-toolia-maps="1"]',
    );
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.google?.maps) resolve(window.google.maps);
        else reject(new Error("google.maps non definito dopo il load"));
      });
      existing.addEventListener("error", () =>
        reject(new Error("Errore caricamento Google Maps")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=it`;
    s.async = true;
    s.defer = true;
    s.dataset.touliaMaps = "1";
    s.onload = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error("google.maps non definito"));
    };
    s.onerror = () => reject(new Error("Errore caricamento Google Maps"));
    document.head.appendChild(s);
  });
  return window.__toolia_maps_loader;
}

export async function geocodeAddress(
  apiKey: string,
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=it`,
    );
    const json = await res.json();
    const loc = json?.results?.[0]?.geometry?.location;
    if (loc?.lat && loc?.lng) return { lat: loc.lat, lng: loc.lng };
    return null;
  } catch {
    return null;
  }
}

/**
 * Calcola lat/lng plausibili per un POI a partire dalle sue coord planimetria (0-1)
 * e un centro geografico. Assume un bbox rettangolare attorno al centro.
 * Y invertito: planimetriaY=0 (alto disegno) → lat massima (nord).
 */
export function planimetriaToLatLng(
  center: { lat: number; lng: number },
  planimetriaX: number,
  planimetriaY: number,
  bboxMeters = 300,
): { lat: number; lng: number } {
  const metersPerDegLat = 111000;
  const metersPerDegLng = 111000 * Math.cos((center.lat * Math.PI) / 180);
  const deltaLat = bboxMeters / metersPerDegLat;
  const deltaLng = bboxMeters / Math.max(1, metersPerDegLng);
  return {
    lat: center.lat - (planimetriaY - 0.5) * deltaLat,
    lng: center.lng + (planimetriaX - 0.5) * deltaLng,
  };
}

/**
 * Disposizione a griglia attorno al centro per POI senza planimetria.
 * Usa step di ~50m, colonne 5.
 */
export function gridLatLng(
  center: { lat: number; lng: number },
  orderIndex: number,
  stepMeters = 50,
  cols = 5,
): { lat: number; lng: number } {
  const row = Math.floor(orderIndex / cols);
  const col = orderIndex % cols;
  const metersPerDegLat = 111000;
  const metersPerDegLng = 111000 * Math.cos((center.lat * Math.PI) / 180);
  return {
    lat: center.lat + (row - 2) * (stepMeters / metersPerDegLat),
    lng: center.lng + (col - 2) * (stepMeters / Math.max(1, metersPerDegLng)),
  };
}
