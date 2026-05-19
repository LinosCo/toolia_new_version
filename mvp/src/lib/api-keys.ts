/**
 * @deprecated localStorage-based API keys. Use /api/tenant/api-keys (server-side) instead.
 *
 * Remaining callers that must be migrated in Fase 1:
 *   - src/app/progetti/[id]/fonti/page.tsx
 *   - src/app/progetti/[id]/luogo/page.tsx
 *   - src/app/progetti/[id]/driver/page.tsx
 *   - src/app/progetti/[id]/percorsi/page.tsx
 *   - src/app/progetti/[id]/brief/page.tsx
 *   - src/app/progetti/[id]/schede/page.tsx
 *   - src/app/progetti/nuovo/page.tsx
 *   - src/components/maps-preview.tsx
 *   - src/components/visitor/preview-map.tsx
 *   - src/lib/project-store.ts
 *
 * Will be removed once all callers pass body.apiKey via the server-side tenant key
 * (already supported as fallback in all 17 AI routes + TTS).
 */
export type LlmProvider = "kimi" | "openai" | "anthropic" | "gemini";
export type ServiceKey = "elevenlabs" | "googleMaps";

export interface ApiKeysStore {
  llm: Record<LlmProvider, string>;
  elevenlabs: string;
  googleMaps: string;
}

const STORAGE_KEY = "toolia-api-keys";

const empty: ApiKeysStore = {
  llm: { kimi: "", openai: "", anthropic: "", gemini: "" },
  elevenlabs: "",
  googleMaps: "",
};

export function loadApiKeys(): ApiKeysStore {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      llm: { ...empty.llm, ...(parsed.llm ?? {}) },
      elevenlabs: parsed.elevenlabs ?? "",
      googleMaps: parsed.googleMaps ?? "",
    };
  } catch {
    return empty;
  }
}

export function saveLlmKey(provider: LlmProvider, value: string) {
  const current = loadApiKeys();
  current.llm[provider] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function saveServiceKey(service: ServiceKey, value: string) {
  const current = loadApiKeys();
  current[service] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function saveAllApiKeys(store: ApiKeysStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // silent
  }
}
