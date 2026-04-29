export type VisitorPOI = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
  planimetriaX: number | null;
  planimetriaY: number | null;
  minStaySeconds: number;
  orderIndex: number;
  zone: {
    id: string;
    name: string;
    function: string;
    order: number;
    color: string | null;
  } | null;
};

export type VisitorNarrator = {
  id: string;
  name: string;
  kind: string;
  voiceStyle: string;
  language: string;
  characterBio: string | null;
  voiceModel: string | null;
  voiceId: string | null;
  portraitUrl: string | null;
  preferredDrivers: string[];
};

export type VisitorPath = {
  id: string;
  name: string;
  description: string;
  durationTargetMinutes: number | null;
  poiOrderJson: unknown;
  corePoiIds: string[];
  narratorId: string | null;
  themeFocus: string | null;
  chaptersJson: unknown;
  bridgesJson: unknown;
};

export type VisitorScheda = {
  id: string;
  poiId: string;
  narratorId: string;
  language: string;
  title: string;
  scriptText: string;
  durationEstimateSeconds: number | null;
  isCore: boolean;
  isDeepDive: boolean;
  semanticBaseJson: unknown;
  audio: {
    fileUrl: string;
    durationSeconds: number;
    isStale: boolean;
  } | null;
};

export type VisitorDriver = {
  id: string;
  name: string;
  domain: string;
  description: string;
  narrativeValue: string;
  isPrimary: boolean;
};

export type VisitorPersona = {
  id: string;
  name: string;
  motivation: string;
  payoff: string;
  preferredDuration: string;
};

export type VisitorQA = {
  id: string;
  poiId: string | null;
  scope: string;
  triggerQuestions: string[];
  verifiedAnswer: string;
  extendedAnswer: string | null;
};

export type VisitorFamilyMission = {
  id: string;
  poiId: string;
  missionType: string;
  kidMissionBrief: string;
  clue: string | null;
  hintLadderJson: unknown;
  reward: string | null;
  characterCue: string | null;
  visualCue: string | null;
  durationSeconds: number;
};

export type VisitorProject = {
  id: string;
  name: string;
  type: string;
  status: string;
  languages: string[];
  coverImage: string | null;
  address: string | null;
  city: string | null;
  familyMode: {
    enabled: boolean;
    mascotName?: string | null;
    etaTarget?: string | null;
  };
  brief: {
    tipoEsperienza: string | null;
  };
};

export type VisitorData = {
  project: VisitorProject;
  pois: VisitorPOI[];
  narrators: VisitorNarrator[];
  paths: VisitorPath[];
  schede: VisitorScheda[];
  drivers: VisitorDriver[];
  personas: VisitorPersona[];
  assistantQA: VisitorQA[];
  familyMissions: VisitorFamilyMission[];
};

export type ComposedItineraryItem = {
  order: number;
  poi: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    lat: number | null;
    lng: number | null;
    zone: string | null;
  };
  scheda: {
    id: string;
    title: string;
    narratorId: string;
    durationSeconds: number;
    audio: { url: string; durationSeconds: number } | null;
  } | null;
  isCore: boolean;
  score: number;
};

export type ComposedItinerary = {
  visit: {
    narratorId: string | null;
    language: string;
    familyMode: boolean;
    durationRequestedMinutes: number;
    durationActualSeconds: number;
    tone: string | null;
    poiCount: number;
  };
  itinerary: ComposedItineraryItem[];
};
