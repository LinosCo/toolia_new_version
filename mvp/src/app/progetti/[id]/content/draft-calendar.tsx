"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type Status = "draft" | "in_review" | "client_review" | "published" | "archived";
interface DraftRow { id: string; title: string; status: Status; scheduledAt: string | null }

const DOT: Record<Status, string> = {
  draft: "bg-muted-foreground", in_review: "bg-amber-500", client_review: "bg-blue-500", published: "bg-emerald-500", archived: "bg-muted-foreground",
};
const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export function DraftCalendar({ projectId }: { projectId: string }) {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/content/drafts`);
      if (res.ok) setDrafts(((await res.json()).drafts as DraftRow[]).filter((d) => d.scheduledAt));
    } finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => {
    const map: Record<string, DraftRow[]> = {};
    for (const d of drafts) {
      if (!d.scheduledAt) continue;
      const k = new Date(d.scheduledAt).toDateString();
      (map[k] ??= []).push(d);
    }
    return map;
  }, [drafts]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear(), month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // 0 = Monday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium capitalize">{monthLabel}</h2>
        <div className="flex gap-1">
          <button onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} className="rounded-lg border border-border p-1.5 hover:bg-muted"><ChevronLeft className="size-4" /></button>
          <button onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} className="rounded-lg border border-border p-1.5 hover:bg-muted"><ChevronRight className="size-4" /></button>
        </div>
      </div>

      {loading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Caricamento…</p>}

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {WEEKDAYS.map((w) => <div key={w} className="bg-background px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">{w}</div>)}
        {cells.map((date, i) => {
          const items = date ? (byDay[date.toDateString()] ?? []) : [];
          const isToday = date && date.toDateString() === new Date().toDateString();
          return (
            <div key={i} className="min-h-[84px] bg-background p-1.5">
              {date && (
                <>
                  <div className={`mb-1 text-[11px] ${isToday ? "font-semibold text-brand" : "text-muted-foreground"}`}>{date.getDate()}</div>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((it) => (
                      <div key={it.id} title={it.title} className="flex items-center gap-1 truncate rounded bg-muted px-1 py-0.5 text-[10px]">
                        <span className={`size-1.5 shrink-0 rounded-full ${DOT[it.status]}`} />
                        <span className="truncate">{it.title}</span>
                      </div>
                    ))}
                    {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3}</div>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
