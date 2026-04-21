import { mockProjects, type ProjectType } from "./mock-projects";
import {
  idbGet,
  idbSet,
  idbDelete,
  SOURCES_STORE,
  KB_STORE,
  BRIEF_STORE,
  MAP_STORE,
} from "./idb-store";

export interface StoredProject {
  id: string;
  name: string;
  type: ProjectType | null;
  coverImage?: string;
  address?: string;
  mapsLink?: string;
  city?: string;
  createdAt: string;
}

export type Importance = "primaria" | "secondaria" | "contesto";
export type Reliability = "alta" | "media" | "bassa";
export type ImageRole = "hero-progetto" | "foto-poi" | "riferimento-ai";

export type AiImageStyle = "illustrazione" | "fotorealistico";

export interface ImageItem {
  id: string;
  dataUrl: string;
  role: ImageRole;
  description?: string;
  poiRef?: number; // planimetriaPoi.n
  aiGenerated?: boolean;
  aiStyle?: AiImageStyle;
  autoMatched?: boolean;
}

export interface UploadedDocument {
  id: string;
  name: string; // nome file originale
  title?: string; // titolo umano-leggibile, editabile
  size: number;
  pages: number;
  text: string;
  addedAt: string;
  importance: Importance;
  reliability: Reliability;
  poiRef?: number;
}

export interface PlanimetriaPoi {
  n: number;
  name: string;
  description: string;
  x: number; // 0..1
  y: number; // 0..1
}

export interface WebsiteSource {
  url: string;
  scrapedAt: string;
  title?: string;
  text: string; // testo integrale editabile
  importance: Importance;
  reliability: Reliability;
}

export type RespondentRole =
  | "gestore"
  | "curatore"
  | "direttore"
  | "guida"
  | "proprietario"
  | "altro";

export interface InterviewQA {
  id: string;
  question: string;
  answer: string;
}

export type InterviewMode = "qa" | "trascrizione";

export interface InterviewSource {
  mode: InterviewMode; // default "qa"
  respondent: {
    name: string;
    role: RespondentRole;
    roleLabel?: string; // se role = "altro"
  };
  qa: InterviewQA[]; // usato se mode === "qa"
  transcriptText?: string; // usato se mode === "trascrizione"
  transcriptFileName?: string;
  importance: Importance;
  reliability: Reliability;
  questionsGeneratedAt?: string;
}

export interface ProjectSources {
  logo?: string;
  images: ImageItem[];
  planimetria?: string;
  planimetriaPoi?: PlanimetriaPoi[];
  website?: WebsiteSource;
  documents: UploadedDocument[];
  interview?: InterviewSource;
}

export type KBCategory = "solido" | "interpretazione" | "memoria" | "ipotesi";

export type KBSourceKind = "sito" | "documento" | "intervista" | "manuale";

export interface KBSourceRef {
  kind: KBSourceKind;
  id?: string; // id documento o id qa
  label?: string; // es. "Intervista · Gestore" / "Guida PDF"
}

export interface KBFact {
  id: string;
  content: string;
  category: KBCategory;
  importance: Importance;
  reliability: Reliability;
  poiRef?: number;
  sourceRef: KBSourceRef;
  approved: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectKB {
  facts: KBFact[];
  lastExtractedAt?: string;
}

/* ========================= BRIEF ========================== */

export type BriefTone =
  | "sobrio-autorevole"
  | "colloquiale-caldo"
  | "evocativo"
  | "ironico";

export type FamilyEta = "3-6" | "6-10" | "10-14";
export type FamilyModalita =
  | "investigativo"
  | "avventura"
  | "caccia-tesoro"
  | "osservazione";

export interface FamilyModeConfig {
  enabled: boolean;
  mascotName?: string;
  etaTarget?: FamilyEta;
  tonoFamily?: string;
  modalitaGioco?: FamilyModalita;
}

/* ========================== MAP / LUOGO ========================== */

export type SpatialMode = "gps" | "indoor" | "hybrid";
export type PoiType = "indoor" | "outdoor";
export type ZoneFunction = "opening" | "development" | "climax" | "closure";

export interface MapPoi {
  id: string;
  name: string;
  description: string;
  lat?: number;
  lng?: number;
  type?: PoiType;
  minStaySeconds?: number;
  zoneId?: string;
  order: number;
  // Riferimenti alle fonti
  fromPlanimetriaN?: number;
  // Riferimento x,y sulla planimetria (0..1) per l'auto-distribuzione
  planimetriaX?: number;
  planimetriaY?: number;
}

export interface MapZone {
  id: string;
  name: string;
  narrativePromise: string;
  function: ZoneFunction;
  order: number;
}

export interface MapAnchor {
  poiId: string;
  lat: number;
  lng: number;
  planimetriaX: number;
  planimetriaY: number;
}

export interface ProjectMap {
  spatialMode: SpatialMode;
  centerLat?: number;
  centerLng?: number;
  pois: MapPoi[];
  zones: MapZone[];
  anchors: MapAnchor[]; // 2 punti di riferimento per mappatura planimetria ↔ GPS
  updatedAt?: string;
}

export function emptyMap(): ProjectMap {
  return {
    spatialMode: "hybrid",
    pois: [],
    zones: [],
    anchors: [],
  };
}

export function inferSpatialMode(
  projectType: string | null | undefined,
): SpatialMode {
  if (!projectType) return "hybrid";
  if (
    projectType === "museo" ||
    projectType === "villa" ||
    projectType === "cantina"
  ) {
    return "indoor";
  }
  if (
    projectType === "parco" ||
    projectType === "citta" ||
    projectType === "territorio"
  ) {
    return "gps";
  }
  return "hybrid";
}

export interface VisitorQuestionsGroups {
  pratiche: string[]; // parcheggio, orari, servizi
  curiosita: string[]; // "perché quella pietra è nera?"
  approfondimento: string[]; // domande per chi vuole più contesto
}

export interface CriterioAmmissibilita {
  inclusione: string[]; // regole esplicite: cosa può entrare nelle schede
  esclusione: string[]; // regole esplicite: cosa NON entra (più duro di `avoid`)
}

export interface PolicyFonti {
  schede: string; // es. "evidence obbligatoria, intent come filtro stilistico"
  chatbot: string; // es. "solo fatti affidabilità alta"
  zone: string; // es. "mix intent + evidence spaziale"
  driver: string; // es. "incrocio intent + evidence"
}

export type TipoEsperienza =
  | "didattico"
  | "contemplativo"
  | "avventuroso"
  | "emozionale"
  | "immersivo";

export interface ProjectBrief {
  // Identità esperienza
  obiettivo: string; // outcome per il visitatore
  obiettivoCliente: string; // outcome business per l'ente/cliente
  tipoEsperienza: TipoEsperienza;
  promessaNarrativa: string;
  target: string;
  percezioneDaLasciare: string;
  durataMinuti: number;

  // Mandato editoriale (AI-generated, read-only)
  mandatoEditoriale: string;

  // Voce
  tono: BriefTone;
  sensibilita: string[];
  vincoliBrand: string[];

  // Griglia editoriale
  mustTell: string[];
  niceToTell: string[];
  avoid: string[];
  verify: string[];

  // Criterio ammissibilità narrativa
  criterioAmmissibilita: CriterioAmmissibilita;

  // Policy d'uso fonti per task
  policyFonti: PolicyFonti;

  // Visitor questions strutturate
  visitorQuestions: VisitorQuestionsGroups;

  // Family
  familyMode: FamilyModeConfig;

  generatedAt?: string;
  updatedAt?: string;
}

const PROJECTS_KEY = "toolia-projects";

function legacySourcesKey(projectId: string) {
  return `toolia-project-${projectId}-sources`;
}

function progressKey(projectId: string) {
  return `toolia-project-${projectId}-progress`;
}

export type TopStep = "fonti" | "brief" | "luogo";

export interface ProjectProgress {
  currentStep: TopStep;
  fontiSubStep: number; // 0..5 (cambierà con la ristrutturazione fonti)
}

export function loadProgress(projectId: string): ProjectProgress {
  if (typeof window === "undefined") {
    return { currentStep: "fonti", fontiSubStep: 0 };
  }
  try {
    const raw = localStorage.getItem(progressKey(projectId));
    if (!raw) return { currentStep: "fonti", fontiSubStep: 0 };
    const p = JSON.parse(raw);
    const step: TopStep =
      p.currentStep === "luogo"
        ? "luogo"
        : p.currentStep === "brief"
          ? "brief"
          : "fonti";
    return {
      currentStep: step,
      fontiSubStep:
        typeof p.fontiSubStep === "number"
          ? Math.max(0, Math.min(7, p.fontiSubStep))
          : 0,
    };
  } catch {
    return { currentStep: "fonti", fontiSubStep: 0 };
  }
}

export function saveProgress(
  projectId: string,
  patch: Partial<ProjectProgress>,
) {
  try {
    const current = loadProgress(projectId);
    const next = { ...current, ...patch };
    localStorage.setItem(progressKey(projectId), JSON.stringify(next));
  } catch {
    // silent
  }
}

export function loadProjects(): StoredProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function loadProject(id: string): StoredProject | undefined {
  const stored = loadProjects().find((p) => p.id === id);
  if (stored) return stored;
  const mock = mockProjects.find((p) => p.id === id);
  if (mock) {
    return {
      id: mock.id,
      name: mock.name,
      type: mock.type,
      coverImage: mock.coverImage,
      address: mock.address,
      mapsLink: mock.mapsLink,
      city: mock.location,
      createdAt: mock.updatedAt,
    };
  }
  return undefined;
}

function newId(prefix = "s"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeImages(raw: unknown): ImageItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry): ImageItem => {
    if (typeof entry === "string") {
      return { id: newId("i"), dataUrl: entry, role: "foto-poi" };
    }
    const e = entry as Partial<ImageItem> & { role?: string };
    // Migrazione dai ruoli legacy
    const legacyMap: Record<string, ImageRole> = {
      galleria: "foto-poi",
      "riferimento-poi": "riferimento-ai",
      copertina: "hero-progetto",
    };
    const roleRaw = e.role ?? "foto-poi";
    const role: ImageRole =
      (legacyMap[roleRaw] as ImageRole | undefined) ??
      (["hero-progetto", "foto-poi", "riferimento-ai"].includes(roleRaw)
        ? (roleRaw as ImageRole)
        : "foto-poi");
    return {
      id: e.id ?? newId("i"),
      dataUrl: e.dataUrl ?? "",
      role,
      description: e.description,
      poiRef: e.poiRef,
      aiGenerated: (e as ImageItem).aiGenerated,
      aiStyle: (e as ImageItem).aiStyle,
      autoMatched: (e as ImageItem).autoMatched,
    };
  });
}

function stripExtension(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

function normalizeDocuments(raw: unknown): UploadedDocument[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const e = entry as Partial<UploadedDocument>;
    const name = e.name ?? "documento";
    return {
      id: e.id ?? newId("d"),
      name,
      title: e.title ?? stripExtension(name),
      size: e.size ?? 0,
      pages: e.pages ?? 1,
      text: e.text ?? "",
      addedAt: e.addedAt ?? new Date().toISOString(),
      importance: (e.importance ?? "secondaria") as Importance,
      reliability: (e.reliability ?? "media") as Reliability,
      poiRef: e.poiRef,
    };
  });
}

function normalizeWebsite(raw: unknown): WebsiteSource | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Partial<WebsiteSource> & {
    pages?: { text: string; title?: string; url: string }[];
    totalWords?: number;
  };
  // migrazione da shape vecchia (pages[])
  const legacyText = r.pages?.map((p) => p.text).join("\n\n");
  const title = r.title ?? r.pages?.[0]?.title;
  const url = r.url ?? r.pages?.[0]?.url ?? "";
  const text = r.text ?? legacyText ?? "";
  if (!url && !text) return undefined;
  return {
    url,
    scrapedAt: r.scrapedAt ?? new Date().toISOString(),
    title,
    text,
    importance: (r.importance ?? "secondaria") as Importance,
    reliability: (r.reliability ?? "media") as Reliability,
  };
}

function normalizeInterview(raw: unknown): InterviewSource | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Partial<InterviewSource>;
  if (!r.respondent && !r.qa && !r.transcriptText) return undefined;
  return {
    mode: (r.mode === "trascrizione" ? "trascrizione" : "qa") as InterviewMode,
    transcriptText: r.transcriptText,
    transcriptFileName: r.transcriptFileName,
    respondent: {
      name: r.respondent?.name ?? "",
      role: (r.respondent?.role ?? "gestore") as RespondentRole,
      roleLabel: r.respondent?.roleLabel,
    },
    qa: Array.isArray(r.qa)
      ? r.qa.map((q) => ({
          id: q.id ?? newId("q"),
          question: q.question ?? "",
          answer: q.answer ?? "",
        }))
      : [],
    importance: (r.importance ?? "primaria") as Importance,
    reliability: (r.reliability ?? "alta") as Reliability,
    questionsGeneratedAt: r.questionsGeneratedAt,
  };
}

function normalizeSources(
  raw: Partial<ProjectSources> | undefined,
): ProjectSources {
  if (!raw) return { images: [], documents: [] };
  return {
    logo: raw.logo,
    images: normalizeImages(raw.images),
    planimetria: raw.planimetria,
    planimetriaPoi: raw.planimetriaPoi,
    website: normalizeWebsite(raw.website),
    documents: normalizeDocuments(raw.documents),
    interview: normalizeInterview(raw.interview),
  };
}

function loadLegacySources(projectId: string): ProjectSources | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(legacySourcesKey(projectId));
    if (!raw) return undefined;
    return normalizeSources(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export async function loadSources(projectId: string): Promise<ProjectSources> {
  if (typeof window === "undefined") return { images: [], documents: [] };
  try {
    const parsed = await idbGet<ProjectSources>(SOURCES_STORE, projectId);
    if (parsed) return normalizeSources(parsed);
    const legacy = loadLegacySources(projectId);
    if (legacy) {
      try {
        await idbSet(SOURCES_STORE, projectId, legacy);
        localStorage.removeItem(legacySourcesKey(projectId));
      } catch {
        // lasciamo il legacy finché la migrazione riesce
      }
      return legacy;
    }
    return { images: [], documents: [] };
  } catch {
    return { images: [], documents: [] };
  }
}

export async function saveSources(
  projectId: string,
  sources: ProjectSources,
): Promise<{ ok: true } | { ok: false; reason: "quota" | "unknown" }> {
  try {
    await idbSet(SOURCES_STORE, projectId, sources);
    return { ok: true };
  } catch (err) {
    const quota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        err.code === 22);
    return { ok: false, reason: quota ? "quota" : "unknown" };
  }
}

export async function deleteSources(projectId: string): Promise<void> {
  try {
    await idbDelete(SOURCES_STORE, projectId);
  } catch {
    // silent
  }
  try {
    await idbDelete(KB_STORE, projectId);
  } catch {
    // silent
  }
  try {
    await idbDelete(BRIEF_STORE, projectId);
  } catch {
    // silent
  }
  try {
    await idbDelete(MAP_STORE, projectId);
  } catch {
    // silent
  }
  try {
    localStorage.removeItem(legacySourcesKey(projectId));
  } catch {
    // silent
  }
}

export async function loadKB(projectId: string): Promise<ProjectKB> {
  if (typeof window === "undefined") return { facts: [] };
  try {
    const raw = await idbGet<ProjectKB>(KB_STORE, projectId);
    if (!raw) return { facts: [] };
    return {
      facts: Array.isArray(raw.facts) ? raw.facts : [],
      lastExtractedAt: raw.lastExtractedAt,
    };
  } catch {
    return { facts: [] };
  }
}

export async function saveKB(
  projectId: string,
  kb: ProjectKB,
): Promise<{ ok: true } | { ok: false; reason: "unknown" }> {
  try {
    await idbSet(KB_STORE, projectId, kb);
    return { ok: true };
  } catch {
    return { ok: false, reason: "unknown" };
  }
}

export function emptyBrief(): ProjectBrief {
  return {
    obiettivo: "",
    obiettivoCliente: "",
    tipoEsperienza: "didattico",
    promessaNarrativa: "",
    target: "",
    percezioneDaLasciare: "",
    durataMinuti: 75,
    mandatoEditoriale: "",
    tono: "sobrio-autorevole",
    sensibilita: [],
    vincoliBrand: [],
    mustTell: [],
    niceToTell: [],
    avoid: [],
    verify: [],
    criterioAmmissibilita: { inclusione: [], esclusione: [] },
    policyFonti: { schede: "", chatbot: "", zone: "", driver: "" },
    visitorQuestions: { pratiche: [], curiosita: [], approfondimento: [] },
    familyMode: { enabled: false },
  };
}

function normalizeBrief(raw: Partial<ProjectBrief> | undefined): ProjectBrief {
  const base = emptyBrief();
  if (!raw) return base;
  // Backward-compat: visitorQuestions array legacy → metti in "curiosita"
  let vq: VisitorQuestionsGroups = base.visitorQuestions;
  if (Array.isArray(raw.visitorQuestions)) {
    vq = {
      pratiche: [],
      curiosita: raw.visitorQuestions as unknown as string[],
      approfondimento: [],
    };
  } else if (raw.visitorQuestions && typeof raw.visitorQuestions === "object") {
    vq = {
      pratiche: Array.isArray(raw.visitorQuestions.pratiche)
        ? raw.visitorQuestions.pratiche
        : [],
      curiosita: Array.isArray(raw.visitorQuestions.curiosita)
        ? raw.visitorQuestions.curiosita
        : [],
      approfondimento: Array.isArray(raw.visitorQuestions.approfondimento)
        ? raw.visitorQuestions.approfondimento
        : [],
    };
  }
  return {
    ...base,
    ...raw,
    visitorQuestions: vq,
    criterioAmmissibilita: {
      inclusione: raw.criterioAmmissibilita?.inclusione ?? [],
      esclusione: raw.criterioAmmissibilita?.esclusione ?? [],
    },
    policyFonti: {
      schede: raw.policyFonti?.schede ?? "",
      chatbot: raw.policyFonti?.chatbot ?? "",
      zone: raw.policyFonti?.zone ?? "",
      driver: raw.policyFonti?.driver ?? "",
    },
    familyMode: raw.familyMode ?? base.familyMode,
  };
}

export async function loadBrief(
  projectId: string,
): Promise<ProjectBrief | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = await idbGet<Partial<ProjectBrief>>(BRIEF_STORE, projectId);
    if (!raw) return undefined;
    return normalizeBrief(raw);
  } catch {
    return undefined;
  }
}

export async function saveBrief(
  projectId: string,
  brief: ProjectBrief,
): Promise<{ ok: true } | { ok: false; reason: "unknown" }> {
  try {
    await idbSet(BRIEF_STORE, projectId, {
      ...brief,
      updatedAt: new Date().toISOString(),
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "unknown" };
  }
}

export async function loadMap(
  projectId: string,
): Promise<ProjectMap | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = await idbGet<ProjectMap>(MAP_STORE, projectId);
    if (!raw) return undefined;
    return {
      spatialMode: raw.spatialMode ?? "hybrid",
      centerLat: raw.centerLat,
      centerLng: raw.centerLng,
      pois: Array.isArray(raw.pois) ? raw.pois : [],
      zones: Array.isArray(raw.zones) ? raw.zones : [],
      anchors: Array.isArray(raw.anchors) ? raw.anchors : [],
      updatedAt: raw.updatedAt,
    };
  } catch {
    return undefined;
  }
}

export async function saveMap(
  projectId: string,
  map: ProjectMap,
): Promise<{ ok: true } | { ok: false; reason: "unknown" }> {
  try {
    await idbSet(MAP_STORE, projectId, {
      ...map,
      updatedAt: new Date().toISOString(),
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "unknown" };
  }
}

export function sourcesPayloadSize(sources: ProjectSources): number {
  try {
    return new Blob([JSON.stringify(sources)]).size;
  } catch {
    return 0;
  }
}

export function sourceWeight(
  importance: Importance,
  reliability: Reliability,
): number {
  const i = importance === "primaria" ? 3 : importance === "secondaria" ? 2 : 1;
  const r = reliability === "alta" ? 3 : reliability === "media" ? 2 : 1;
  return i * r; // 1..9
}

export function kbFactsBySourceLabel(
  facts: KBFact[],
  sources: ProjectSources,
): { label: string; count: number; weight: number }[] {
  const buckets = new Map<
    string,
    { label: string; count: number; weight: number }
  >();
  const addBucket = (key: string, label: string, weight: number) => {
    const existing = buckets.get(key);
    if (existing) existing.count++;
    else buckets.set(key, { label, count: 1, weight });
  };
  facts.forEach((f) => {
    switch (f.sourceRef.kind) {
      case "sito": {
        const w = sources.website
          ? sourceWeight(
              sources.website.importance,
              sources.website.reliability,
            )
          : 0;
        addBucket("sito", sources.website?.title ?? "Sito web", w);
        break;
      }
      case "documento": {
        const d = sources.documents.find((x) => x.id === f.sourceRef.id);
        const w = d ? sourceWeight(d.importance, d.reliability) : 0;
        addBucket(
          `doc-${f.sourceRef.id}`,
          d?.title || d?.name || "Documento",
          w,
        );
        break;
      }
      case "intervista": {
        const w = sources.interview
          ? sourceWeight(
              sources.interview.importance,
              sources.interview.reliability,
            )
          : 0;
        const label = `Intervista · ${sources.interview?.respondent.name || sources.interview?.respondent.role || "gestore"}`;
        addBucket("intervista", label, w);
        break;
      }
      case "manuale":
        addBucket("manuale", "Aggiunto manualmente", 9);
        break;
    }
  });
  return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
}

export function sourcesCompletion(sources: ProjectSources): number {
  let score = 0;
  if (sources.planimetria) score++;
  if (sources.website?.text && sources.website.text.length > 30) score++;
  if (sources.documents.length > 0) score++;
  if (
    sources.interview &&
    ((sources.interview.mode === "qa" &&
      sources.interview.qa.some((q) => q.answer.trim())) ||
      (sources.interview.mode === "trascrizione" &&
        (sources.interview.transcriptText?.length ?? 0) > 100))
  )
    score++;
  return score;
}

export function newSourceId(prefix = "s"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
