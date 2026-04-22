import { mockProjects, type ProjectType } from "./mock-projects";
import {
  idbGet,
  idbSet,
  idbDelete,
  SOURCES_STORE,
  KB_STORE,
  BRIEF_STORE,
  MAP_STORE,
  DRIVERS_STORE,
} from "./idb-store";
import { loadApiKeys, saveAllApiKeys, type ApiKeysStore } from "./api-keys";

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

export interface SpatialHint {
  name: string; // nome dello spunto (es. "Fossato", "Trincea")
  description: string; // descrizione estesa letta accanto al punto sulla planimetria
}

export interface PlanimetriaSource {
  image: string; // dataURL o URL dell'immagine della planimetria
  description: string; // descrizione ricca (AI Vision) del disegno: piani, ambienti, etichette visibili, percorsi
  spatialHints: SpatialHint[]; // punti osservati nel disegno (nome + descrizione). NO coordinate. Serviranno nello Step Luogo come spunti cross-source.
  importance: Importance;
  reliability: Reliability;
  analyzedAt?: string; // ultima analisi Vision
}

/** @deprecated shape vecchia: solo per lettura/migrazione da localStorage/IndexedDB esistente. */
export interface LegacyPlanimetriaPoi {
  n: number;
  name: string;
  description?: string;
  x: number;
  y: number;
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
  planimetria?: PlanimetriaSource;
  website?: WebsiteSource;
  documents: UploadedDocument[];
  interview?: InterviewSource;
}

export type KBCategory = "solido" | "interpretazione" | "memoria" | "ipotesi";

export type KBSourceKind =
  | "sito"
  | "documento"
  | "intervista"
  | "planimetria"
  | "manuale";

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
  // Firma stabile delle fonti al momento dell'ultima estrazione. Se cambia → KB stale.
  extractedSignature?: string;
}

/**
 * Firma deterministica delle fonti testuali. Cambia se l'utente modifica
 * qualsiasi contenuto rilevante per l'estrazione KB.
 */
export function sourcesSignature(s: ProjectSources): string {
  const parts: string[] = [];
  if (s.planimetria?.image) {
    parts.push(
      `plan:${s.planimetria.description.length}:${s.planimetria.spatialHints.length}:${s.planimetria.importance}:${s.planimetria.reliability}:${s.planimetria.analyzedAt ?? ""}`,
    );
    s.planimetria.spatialHints.forEach((h) => {
      parts.push(`hint:${h.name.length}:${h.description.length}`);
    });
  }
  if (s.website?.text) {
    parts.push(
      `web:${s.website.url}:${s.website.text.length}:${s.website.importance}:${s.website.reliability}`,
    );
  }
  s.documents.forEach((d) => {
    parts.push(`doc:${d.id}:${d.text.length}:${d.importance}:${d.reliability}`);
  });
  if (s.interview) {
    const iv = s.interview;
    if (iv.mode === "trascrizione") {
      parts.push(
        `int:transcript:${(iv.transcriptText ?? "").length}:${iv.importance}:${iv.reliability}`,
      );
    } else {
      const answered = iv.qa.filter((q) => q.answer.trim());
      parts.push(
        `int:qa:${answered.length}:${answered.reduce((acc, q) => acc + q.answer.length, 0)}:${iv.importance}:${iv.reliability}`,
      );
    }
  }
  return parts.join("|");
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
export type ZoneFunction = "apertura" | "sviluppo" | "climax";

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
  image?: string; // dataURL foto POI (sfondo scheda nell'app visitatore)
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

function normalizeSpatialHints(raw: unknown): SpatialHint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((h): SpatialHint | null => {
      // Shape legacy: stringa → {name, description:""}
      if (typeof h === "string") {
        const trimmed = h.trim();
        if (!trimmed) return null;
        return { name: trimmed, description: "" };
      }
      if (h && typeof h === "object") {
        const o = h as Partial<SpatialHint>;
        const name = typeof o.name === "string" ? o.name.trim() : "";
        if (!name) return null;
        return {
          name,
          description:
            typeof o.description === "string" ? o.description.trim() : "",
        };
      }
      return null;
    })
    .filter((h): h is SpatialHint => h !== null);
}

function normalizePlanimetria(
  rawPlanimetria: unknown,
  legacyPoi: unknown,
): PlanimetriaSource | undefined {
  // Caso 1: nessuna planimetria
  if (!rawPlanimetria) return undefined;

  // Caso 2: shape vecchia — planimetria è una stringa (dataURL)
  if (typeof rawPlanimetria === "string") {
    const hints: SpatialHint[] = Array.isArray(legacyPoi)
      ? (legacyPoi as LegacyPlanimetriaPoi[])
          .map((p): SpatialHint | null => {
            const name = typeof p.name === "string" ? p.name.trim() : "";
            if (!name) return null;
            return {
              name,
              description:
                typeof p.description === "string" ? p.description.trim() : "",
            };
          })
          .filter((h): h is SpatialHint => h !== null)
      : [];
    return {
      image: rawPlanimetria,
      description: "",
      spatialHints: hints,
      importance: "primaria",
      reliability: "alta",
    };
  }

  // Caso 3: shape nuova
  if (typeof rawPlanimetria === "object") {
    const r = rawPlanimetria as Partial<PlanimetriaSource>;
    if (!r.image) return undefined;
    return {
      image: r.image,
      description: typeof r.description === "string" ? r.description : "",
      spatialHints: normalizeSpatialHints(r.spatialHints),
      importance: (r.importance ?? "primaria") as Importance,
      reliability: (r.reliability ?? "alta") as Reliability,
      analyzedAt: r.analyzedAt,
    };
  }

  return undefined;
}

function normalizeSources(
  raw: Partial<ProjectSources> | undefined,
): ProjectSources {
  if (!raw) return { images: [], documents: [] };
  const legacyPoi = (
    raw as Partial<ProjectSources> & { planimetriaPoi?: unknown }
  ).planimetriaPoi;
  return {
    logo: raw.logo,
    images: normalizeImages(raw.images),
    planimetria: normalizePlanimetria(raw.planimetria, legacyPoi),
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
      extractedSignature: raw.extractedSignature,
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

function normalizeZoneFunction(raw: unknown): ZoneFunction {
  // Migrazione da nomi inglesi/closure vecchi
  const map: Record<string, ZoneFunction> = {
    apertura: "apertura",
    opening: "apertura",
    sviluppo: "sviluppo",
    development: "sviluppo",
    closure: "sviluppo",
    climax: "climax",
  };
  if (typeof raw !== "string") return "sviluppo";
  return map[raw.toLowerCase()] ?? "sviluppo";
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
      zones: Array.isArray(raw.zones)
        ? raw.zones.map((z) => ({
            ...z,
            function: normalizeZoneFunction(z.function),
          }))
        : [],
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
      case "planimetria": {
        const w = sources.planimetria
          ? sourceWeight(
              sources.planimetria.importance,
              sources.planimetria.reliability,
            )
          : 0;
        addBucket("planimetria", "Planimetria", w);
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
  if (sources.planimetria?.image) score++;
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

/* ============================================================== */
/* ============== STEP 3 — DRIVER E PERSONAS ==================== */
/* ============================================================== */

export type PersonaPayoff =
  | "meraviglia"
  | "conoscenza"
  | "emozione"
  | "scoperta";

export type PersonaPreferredDuration = "breve" | "media" | "lunga";

export type ExperienceMode =
  | "contemplativo"
  | "dinamico"
  | "emotivo"
  | "analitico"
  | "immersivo"
  | "orientamento";

export interface Driver {
  id: string;
  name: string;
  domain: string; // storia / arte / architettura / natura / produzione / ...
  description: string;
  narrativeValue: string; // perché interessa il visitatore
  enabledContentTypes: string[]; // tipi di contenuti che questo driver abilita
  order: number;
}

export interface Persona {
  id: string;
  name: string; // es. "Famiglia esploratrice"
  motivation: string;
  payoff: PersonaPayoff;
  preferredDuration: PersonaPreferredDuration;
  preferredExperience: ExperienceMode[]; // più di uno possibile
  validityNotes: string; // test validità legacy: perché questa persona ha senso qui
  suggestedDriverIds: string[]; // driver principali per questa persona
  order: number;
}

export interface DriverPersonaWeight {
  driverId: string;
  personaId: string;
  weight: number; // 0-10, quanto quel driver pesa per quella persona
}

export interface EditorialLens {
  id: string;
  name: string; // es. "Storia per famiglia"
  personaId: string;
  primaryDriverId: string;
  secondaryDriverIds: string[];
  description: string;
}

export type ContinuityRuleType = "compatibility" | "anti-collage" | "dominance";

export interface NarrativeContinuityRule {
  id: string;
  type: ContinuityRuleType;
  rule: string; // descrizione in linguaggio naturale
}

export interface DominanceRules {
  maxSecondaryDrivers: number; // quante secondarie ammesse (1-3)
  minDominanceScore: number; // 0-1, soglia per dominante
  blendThreshold: number; // 0-1, sopra questo livello il blend è troppo dispersivo
}

export interface InferenceModel {
  passioneWeight: number; // 0-1
  modalitaWeight: number;
  durataWeight: number;
  contestoWeight: number;
  gruppoWeight: number;
  obiettivoWeight: number;
  dominantThreshold: number; // 0-1, soglia che definisce quando un profilo è dominante
}

export interface FamilyTriggerRules {
  enabled: boolean;
  triggerSignals: string[]; // es. ["gruppo:famiglia", "richiesta:gioco", "eta:bambini"]
  triggerDescription: string;
  recommendedPois: string[]; // POI id da evidenziare quando attivato
}

export interface VisitorSignalModel {
  passioni: string[]; // lista passioni rilevanti per il progetto
  modalitaFruizione: string[]; // "rapido" / "profondo" / "essenziale" / "ricco" / ...
  durataOptions: string[]; // es. ["30 min", "1 ora", "2+ ore"]
  contestoOptions: string[]; // es. ["visita singola", "evento", "gita scolastica"]
  gruppoOptions: string[]; // es. ["solo", "coppia", "famiglia", "amici", "scolaresca"]
  obiettiviOptions: string[]; // es. ["svago", "studio", "fotografia"]
}

export interface WizardInteractionRules {
  minSelectionsRequired: number; // es. 2
  maxPointsTotal: number; // es. 10 (punti da distribuire)
  maxPointsPerOption: number; // es. 5 (massimale per singola passione)
  forceRanking: boolean; // forza ordine priorità
}

export interface ProjectDriversPersonas {
  drivers: Driver[];
  personas: Persona[];
  matrix: DriverPersonaWeight[];
  lenses: EditorialLens[];
  continuityRules: NarrativeContinuityRule[];
  dominanceRules: DominanceRules;
  inferenceModel: InferenceModel;
  familyTriggerRules: FamilyTriggerRules;
  visitorSignalModel: VisitorSignalModel;
  wizardInteractionRules: WizardInteractionRules;
  generatedAt?: string;
  updatedAt?: string;
}

export function emptyDriversPersonas(): ProjectDriversPersonas {
  return {
    drivers: [],
    personas: [],
    matrix: [],
    lenses: [],
    continuityRules: [],
    dominanceRules: {
      maxSecondaryDrivers: 2,
      minDominanceScore: 0.5,
      blendThreshold: 0.7,
    },
    inferenceModel: {
      passioneWeight: 0.3,
      modalitaWeight: 0.2,
      durataWeight: 0.15,
      contestoWeight: 0.1,
      gruppoWeight: 0.15,
      obiettivoWeight: 0.1,
      dominantThreshold: 0.5,
    },
    familyTriggerRules: {
      enabled: false,
      triggerSignals: [],
      triggerDescription: "",
      recommendedPois: [],
    },
    visitorSignalModel: {
      passioni: [],
      modalitaFruizione: [],
      durataOptions: [],
      contestoOptions: [],
      gruppoOptions: [],
      obiettiviOptions: [],
    },
    wizardInteractionRules: {
      minSelectionsRequired: 2,
      maxPointsTotal: 10,
      maxPointsPerOption: 5,
      forceRanking: true,
    },
  };
}

function normalizeDriversPersonas(
  raw: Partial<ProjectDriversPersonas> | undefined,
): ProjectDriversPersonas {
  const base = emptyDriversPersonas();
  if (!raw) return base;
  return {
    drivers: Array.isArray(raw.drivers) ? raw.drivers : base.drivers,
    personas: Array.isArray(raw.personas) ? raw.personas : base.personas,
    matrix: Array.isArray(raw.matrix) ? raw.matrix : base.matrix,
    lenses: Array.isArray(raw.lenses) ? raw.lenses : base.lenses,
    continuityRules: Array.isArray(raw.continuityRules)
      ? raw.continuityRules
      : base.continuityRules,
    dominanceRules: { ...base.dominanceRules, ...(raw.dominanceRules ?? {}) },
    inferenceModel: {
      ...base.inferenceModel,
      ...(raw.inferenceModel ?? {}),
    },
    familyTriggerRules: {
      ...base.familyTriggerRules,
      ...(raw.familyTriggerRules ?? {}),
    },
    visitorSignalModel: {
      ...base.visitorSignalModel,
      ...(raw.visitorSignalModel ?? {}),
    },
    wizardInteractionRules: {
      ...base.wizardInteractionRules,
      ...(raw.wizardInteractionRules ?? {}),
    },
    generatedAt: raw.generatedAt,
    updatedAt: raw.updatedAt,
  };
}

export async function loadDriversPersonas(
  projectId: string,
): Promise<ProjectDriversPersonas | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = await idbGet<Partial<ProjectDriversPersonas>>(
      DRIVERS_STORE,
      projectId,
    );
    if (!raw) return undefined;
    return normalizeDriversPersonas(raw);
  } catch {
    return undefined;
  }
}

export async function saveDriversPersonas(
  projectId: string,
  data: ProjectDriversPersonas,
): Promise<{ ok: true } | { ok: false; reason: "unknown" }> {
  try {
    await idbSet(DRIVERS_STORE, projectId, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "unknown" };
  }
}

/* ============================================================== */
/* ================ EXPORT / IMPORT PROGETTI ==================== */
/* ============================================================== */

export interface ProjectBackup {
  project: StoredProject;
  progress: ProjectProgress;
  sources: ProjectSources;
  kb: ProjectKB;
  brief?: ProjectBrief;
  map?: ProjectMap;
  drivers?: ProjectDriversPersonas;
}

export interface ToolialBackup {
  version: 2;
  exportedAt: string;
  projects: ProjectBackup[];
  apiKeys?: ApiKeysStore; // incluse per consentire trasferimento completo tra browser/dispositivi
}

export async function exportAllProjects(): Promise<ToolialBackup> {
  const allProjects = loadProjects();
  const backups: ProjectBackup[] = [];
  for (const p of allProjects) {
    const [sources, kb, brief, map, drivers] = await Promise.all([
      loadSources(p.id),
      loadKB(p.id),
      loadBrief(p.id),
      loadMap(p.id),
      loadDriversPersonas(p.id),
    ]);
    backups.push({
      project: p,
      progress: loadProgress(p.id),
      sources,
      kb,
      brief,
      map,
      drivers,
    });
  }
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    projects: backups,
    apiKeys: loadApiKeys(),
  };
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importProjects(
  raw: unknown,
  mode: "merge" | "replace",
): Promise<ImportResult> {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { imported: 0, skipped: 0, errors: ["JSON non valido"] };
  }
  const rAny = raw as {
    version?: number;
    projects?: unknown;
    apiKeys?: unknown;
  };
  const ver = rAny.version;
  if ((ver !== 1 && ver !== 2) || !Array.isArray(rAny.projects)) {
    return {
      imported: 0,
      skipped: 0,
      errors: ["Formato non riconosciuto"],
    };
  }
  const r: Partial<ToolialBackup> = {
    version: 2,
    exportedAt: "",
    projects: rAny.projects as ProjectBackup[],
    apiKeys:
      rAny.apiKeys && typeof rAny.apiKeys === "object"
        ? (rAny.apiKeys as ApiKeysStore)
        : undefined,
  };

  // Ripristina API keys se presenti (solo backup v2+)
  if (r.apiKeys && typeof r.apiKeys === "object") {
    try {
      saveAllApiKeys(r.apiKeys);
    } catch (e) {
      errors.push(
        `Errore ripristino chiavi API: ${e instanceof Error ? e.message : "unknown"}`,
      );
    }
  }

  const existing = loadProjects();
  const existingById = new Map(existing.map((p) => [p.id, p]));

  let imported = 0;
  let skipped = 0;
  const projectsList = r.projects ?? [];

  for (const b of projectsList) {
    if (!b?.project?.id || !b?.project?.name) {
      skipped++;
      continue;
    }
    const existingP = existingById.get(b.project.id);
    if (existingP && mode === "merge") {
      // merge: non sovrascrive esistente a meno che tutti i dati siano vuoti
      skipped++;
      continue;
    }
    try {
      // Salva metadata progetto in localStorage
      existingById.set(b.project.id, b.project);
      // Progress
      if (b.progress) {
        localStorage.setItem(
          `toolia-project-${b.project.id}-progress`,
          JSON.stringify(b.progress),
        );
      }
      // IndexedDB stores
      if (b.sources) await idbSet(SOURCES_STORE, b.project.id, b.sources);
      if (b.kb) await idbSet(KB_STORE, b.project.id, b.kb);
      if (b.brief) await idbSet(BRIEF_STORE, b.project.id, b.brief);
      if (b.map) await idbSet(MAP_STORE, b.project.id, b.map);
      if (b.drivers) await idbSet(DRIVERS_STORE, b.project.id, b.drivers);
      imported++;
    } catch (e) {
      errors.push(
        `${b.project.name}: ${e instanceof Error ? e.message : "errore salvataggio"}`,
      );
      skipped++;
    }
  }

  // Persisti lista progetti aggiornata
  try {
    localStorage.setItem(
      PROJECTS_KEY,
      JSON.stringify(Array.from(existingById.values())),
    );
  } catch (e) {
    errors.push(
      `Errore salvataggio lista progetti: ${e instanceof Error ? e.message : "unknown"}`,
    );
  }

  // Notifica la UI
  try {
    window.dispatchEvent(new Event("toolia:sources-updated"));
    window.dispatchEvent(new Event("toolia:brief-updated"));
    window.dispatchEvent(new Event("toolia:map-updated"));
    window.dispatchEvent(new Event("toolia:drivers-updated"));
  } catch {
    // SSR safety
  }

  return { imported, skipped, errors };
}
