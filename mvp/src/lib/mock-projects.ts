export type ProjectType =
  | "villa"
  | "museo"
  | "cantina"
  | "citta"
  | "parco"
  | "territorio"
  | "altro";
export type ProjectStatus = "draft" | "in_progress" | "published";

export interface MockProject {
  id: string;
  name: string;
  client: string;
  location: string;
  type: ProjectType;
  status: ProjectStatus;
  completedSteps: number; // 0 — 6
  languages: string[];
  updatedAt: string; // ISO date
  coverGradient: [string, string];
  coverImage?: string;
  address?: string;
  mapsLink?: string;
}

export const mockProjects: MockProject[] = [
  {
    id: "rotonda",
    name: "Villa La Rotonda",
    client: "Fondazione Palladio",
    location: "Vicenza",
    type: "villa",
    status: "in_progress",
    completedSteps: 4,
    languages: ["it", "en"],
    updatedAt: "2026-04-16T10:22:00Z",
    coverGradient: ["#D9A578", "#8B5A3C"],
    coverImage: "/progetti/villa-rotonda.webp",
  },
  {
    id: "museo-risorgimento",
    name: "Museo del Risorgimento",
    client: "Comune di Torino",
    location: "Torino",
    type: "museo",
    status: "published",
    completedSteps: 6,
    languages: ["it", "en", "fr"],
    updatedAt: "2026-04-14T08:45:00Z",
    coverGradient: ["#B3724A", "#4A2B1C"],
    coverImage: "/progetti/palazzo-carignano.webp",
  },
  {
    id: "antinori",
    name: "Cantina Antinori nel Chianti Classico",
    client: "Marchesi Antinori",
    location: "Bargino",
    type: "cantina",
    status: "draft",
    completedSteps: 2,
    languages: ["it", "en"],
    updatedAt: "2026-04-18T17:03:00Z",
    coverGradient: ["#C47C63", "#5C2F24"],
    coverImage: "/progetti/antinori-chianti.webp",
  },
  {
    id: "molina",
    name: "Parco delle Cascate di Molina",
    client: "Pro Loco Molina",
    location: "Fumane",
    type: "parco",
    status: "published",
    completedSteps: 6,
    languages: ["it", "en", "de"],
    updatedAt: "2026-04-11T14:10:00Z",
    coverGradient: ["#A6B38A", "#3E5142"],
    coverImage: "/progetti/cascate-molina.webp",
  },
  {
    id: "ghetto-venezia",
    name: "Ghetto Ebraico di Venezia",
    client: "Museo Ebraico di Venezia",
    location: "Venezia",
    type: "citta",
    status: "in_progress",
    completedSteps: 5,
    languages: ["it", "en", "he"],
    updatedAt: "2026-04-17T19:30:00Z",
    coverGradient: ["#C69B6D", "#594333"],
    coverImage: "/progetti/ghetto-venezia.webp",
  },
  {
    id: "casino-caccia",
    name: "Casino di Caccia dei Farnese",
    client: "Reggia di Colorno",
    location: "Colorno",
    type: "parco",
    status: "draft",
    completedSteps: 1,
    languages: ["it"],
    updatedAt: "2026-04-18T09:15:00Z",
    coverGradient: ["#B59A74", "#4C3826"],
    coverImage: "/progetti/reggia-colorno.webp",
  },
];

export const projectTypeLabel: Record<ProjectType, string> = {
  villa: "Villa",
  museo: "Museo",
  cantina: "Cantina",
  citta: "Città",
  parco: "Parco",
  territorio: "Territorio",
  altro: "Altro",
};

export const projectStatusLabel: Record<ProjectStatus, string> = {
  draft: "Bozza",
  in_progress: "In lavorazione",
  published: "Pubblicato",
};
