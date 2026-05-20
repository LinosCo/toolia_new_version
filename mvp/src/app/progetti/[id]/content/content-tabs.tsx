"use client";

import { useState } from "react";
import { RetrievalPlayground } from "./retrieval-playground";
import { GeneratePanel } from "./generate-panel";
import { DraftList } from "./draft-list";
import { DraftCalendar } from "./draft-calendar";

const TABS = [
  { key: "studio", label: "Studio", desc: "Gestisci i contenuti e il loro stato" },
  { key: "genera", label: "Genera", desc: "Crea nuovi contenuti dalla KB" },
  { key: "calendario", label: "Calendario", desc: "Pianifica le pubblicazioni" },
] as const;

export function ContentTabs({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("studio");
  return (
    <div>
      <nav className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} title={t.desc}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "studio" && <DraftList projectId={projectId} />}
      {tab === "genera" && (
        <div className="space-y-8">
          <RetrievalPlayground projectId={projectId} />
          <GeneratePanel projectId={projectId} />
        </div>
      )}
      {tab === "calendario" && <DraftCalendar projectId={projectId} />}
    </div>
  );
}
