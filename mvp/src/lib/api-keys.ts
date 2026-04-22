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
