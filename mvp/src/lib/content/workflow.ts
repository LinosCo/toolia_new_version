export type DraftStatus = "draft" | "in_review" | "client_review" | "published" | "archived";
export type Role = "Admin" | "Editor" | "Reviewer" | "ClientViewer" | "ClientEditor";

export interface Transition {
  to: DraftStatus;
  label: string;
  roles: Role[];
}

// UNA sola macchina di stato, role-gated. Guida sia l'API sia i pulsanti UI.
const TRANSITIONS: Record<DraftStatus, Transition[]> = {
  draft: [
    { to: "in_review", label: "Manda in revisione", roles: ["Admin", "Editor"] },
    { to: "archived", label: "Archivia", roles: ["Admin", "Editor"] },
  ],
  in_review: [
    { to: "client_review", label: "Manda al cliente", roles: ["Admin", "Editor", "Reviewer"] },
    { to: "published", label: "Pubblica", roles: ["Admin", "Reviewer"] },
    { to: "draft", label: "Rimanda in bozza", roles: ["Admin", "Editor"] },
    { to: "archived", label: "Archivia", roles: ["Admin", "Editor"] },
  ],
  client_review: [
    { to: "published", label: "Pubblica", roles: ["Admin", "Reviewer"] },
    { to: "in_review", label: "Richiedi modifiche", roles: ["Admin", "Editor", "Reviewer", "ClientEditor"] },
    { to: "archived", label: "Archivia", roles: ["Admin", "Editor"] },
  ],
  published: [
    { to: "archived", label: "Archivia", roles: ["Admin", "Editor"] },
  ],
  archived: [
    { to: "draft", label: "Ripristina", roles: ["Admin", "Editor"] },
  ],
};

/** Transizioni consentite da uno stato per un dato ruolo (con label per la UI). */
export function allowedTransitions(from: DraftStatus, role: Role): Transition[] {
  return (TRANSITIONS[from] ?? []).filter((t) => t.roles.includes(role));
}

/** Una transizione from->to è consentita per il ruolo? */
export function canTransition(role: Role, from: DraftStatus, to: DraftStatus): boolean {
  return allowedTransitions(from, role).some((t) => t.to === to);
}
