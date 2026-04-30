"use client";

import { useEffect, useRef, useState } from "react";
import useSWR, { mutate, type SWRConfiguration } from "swr";
import {
  loadSources,
  loadBrief,
  loadMap,
  loadDriversPersonas,
  loadKB,
  type ProjectSources,
  type ProjectBrief,
  type ProjectMap,
  type ProjectDriversPersonas,
  type ProjectKB,
} from "@/lib/project-store";

const DEFAULT_OPTS: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateIfStale: true,
  dedupingInterval: 30_000,
};

const jsonFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url} ${res.status}`);
  return res.json();
};

interface ApiProject {
  id: string;
  name: string;
  type: string | null;
  coverImage: string | null;
  address: string | null;
  mapsLink: string | null;
  city: string | null;
  createdAt: string;
  status?: string;
}

export function useProjectMeta(projectId: string | null | undefined) {
  const key = projectId ? `/api/projects/${projectId}` : null;
  return useSWR<{ project: ApiProject }>(key, jsonFetcher, DEFAULT_OPTS);
}

export function useSources(projectId: string | null | undefined) {
  const key = projectId ? ["sources", projectId] : null;
  return useSWR<ProjectSources>(
    key,
    () => loadSources(projectId as string),
    DEFAULT_OPTS,
  );
}

export function useBrief(projectId: string | null | undefined) {
  const key = projectId ? ["brief", projectId] : null;
  return useSWR<ProjectBrief | undefined>(
    key,
    () => loadBrief(projectId as string),
    DEFAULT_OPTS,
  );
}

export function useMap(projectId: string | null | undefined) {
  const key = projectId ? ["map", projectId] : null;
  return useSWR<ProjectMap | undefined>(
    key,
    () => loadMap(projectId as string),
    DEFAULT_OPTS,
  );
}

export function useDrivers(projectId: string | null | undefined) {
  const key = projectId ? ["drivers", projectId] : null;
  return useSWR<ProjectDriversPersonas | undefined>(
    key,
    () => loadDriversPersonas(projectId as string),
    DEFAULT_OPTS,
  );
}

export function useKB(projectId: string | null | undefined) {
  const key = projectId ? ["kb", projectId] : null;
  return useSWR<ProjectKB>(
    key,
    () => loadKB(projectId as string),
    DEFAULT_OPTS,
  );
}

export function useNarrators<T = unknown>(
  projectId: string | null | undefined,
) {
  const key = projectId ? `/api/projects/${projectId}/narrators` : null;
  return useSWR<{ narrators?: T[] }>(key, jsonFetcher, DEFAULT_OPTS);
}

export function usePaths<T = unknown>(projectId: string | null | undefined) {
  const key = projectId ? `/api/projects/${projectId}/paths` : null;
  return useSWR<{ paths?: T[] }>(key, jsonFetcher, DEFAULT_OPTS);
}

export function useSchede<T = unknown>(projectId: string | null | undefined) {
  const key = projectId ? `/api/projects/${projectId}/schede` : null;
  return useSWR<{ schede?: T[] }>(key, jsonFetcher, DEFAULT_OPTS);
}

/**
 * Tiene uno state locale sincronizzato con `source` (es. dato SWR).
 * Quando `source` cambia, riallinea lo state. Setter restituito per editing locale.
 * Centralizza la deroga al rule react-hooks/set-state-in-effect, evitando
 * disable inline sparsi in tutte le pagine step.
 */
export function useSyncedState<T>(
  source: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(source);
  const prevRef = useRef(source);
  useEffect(() => {
    if (!Object.is(prevRef.current, source)) {
      prevRef.current = source;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(source);
    }
  }, [source]);
  return [value, setValue];
}

export function invalidateProjectData(
  projectId: string,
  scope:
    | "sources"
    | "brief"
    | "map"
    | "drivers"
    | "kb"
    | "narrators"
    | "paths"
    | "schede"
    | "project"
    | "all",
) {
  if (scope === "all") {
    mutate(["sources", projectId]);
    mutate(["brief", projectId]);
    mutate(["map", projectId]);
    mutate(["drivers", projectId]);
    mutate(["kb", projectId]);
    mutate(`/api/projects/${projectId}`);
    mutate(`/api/projects/${projectId}/narrators`);
    mutate(`/api/projects/${projectId}/paths`);
    mutate(`/api/projects/${projectId}/schede`);
    return;
  }
  if (scope === "project") {
    mutate(`/api/projects/${projectId}`);
    return;
  }
  if (scope === "narrators" || scope === "paths" || scope === "schede") {
    mutate(`/api/projects/${projectId}/${scope}`);
    return;
  }
  mutate([scope, projectId]);
}
