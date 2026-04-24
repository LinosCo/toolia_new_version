"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import type { VisitorData } from "../visitor-types";

type Message =
  | { role: "assistant"; text: string; source?: string }
  | { role: "user"; text: string };

export function ChatbotFab({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<VisitorData | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || data) return;
    (async () => {
      const res = await fetch(`/api/projects/${projectId}/visitor-data`, {
        cache: "no-store",
      });
      if (res.ok) {
        const d: VisitorData = await res.json();
        setData(d);
        if (messages.length === 0) {
          setMessages([
            {
              role: "assistant",
              text: `Ciao — sono l'assistente di ${d.project.name}. Posso rispondere a domande sul luogo o suggerirti cosa vedere.`,
            },
          ]);
        }
      }
    })();
  }, [open, data, projectId, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const ask = () => {
    const q = input.trim();
    if (!q || !data) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);

    // Pack matching semplice: cerca match in triggerQuestions (insensitive)
    const normalized = q.toLowerCase();
    const qaList = data.assistantQA ?? [];
    const scored = qaList
      .map((qa) => {
        const triggers = (qa.triggerQuestions ?? []).map((t) =>
          t.toLowerCase(),
        );
        const hit = triggers.some(
          (t) => normalized.includes(t) || t.includes(normalized),
        );
        // keyword match
        const words = normalized.split(/\s+/).filter((w) => w.length > 3);
        const keywordMatch = words.reduce((n, w) => {
          const inTriggers = triggers.some((t) => t.includes(w));
          const inAnswer = qa.verifiedAnswer.toLowerCase().includes(w);
          return n + (inTriggers ? 2 : 0) + (inAnswer ? 1 : 0);
        }, 0);
        return { qa, score: (hit ? 10 : 0) + keywordMatch };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (best && best.score > 0) {
      const poi = data.pois.find((p) => p.id === best.qa.poiId);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: best.qa.verifiedAnswer,
          source: poi ? poi.name : "Informazione generale",
        },
      ]);
      if (best.qa.extendedAnswer) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: best.qa.extendedAnswer as string },
        ]);
      }
    } else {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Non ho una risposta verificata per questa domanda. Prova a chiedere di un luogo specifico o scegli un itinerario per iniziare la visita.",
        },
      ]);
    }
  };

  return (
    <>
      {/* FAB button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="absolute bottom-4 right-4 z-40 h-14 w-14 rounded-full bg-foreground text-background shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Apri assistente"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="absolute bottom-4 right-4 z-40 w-[min(92vw,400px)] h-[min(80vh,620px)] rounded-3xl bg-card border border-border/70 shadow-2xl flex flex-col overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b border-border/60 bg-foreground text-background">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-background/15 flex items-center justify-center">
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
              </div>
              <div>
                <p className="font-heading italic text-lg leading-tight">
                  Assistente
                </p>
                <p className="text-[10px] uppercase tracking-[0.22em] opacity-70">
                  Risponde sul luogo
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-full hover:bg-background/10 flex items-center justify-center"
              aria-label="Chiudi assistente"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-foreground text-background rounded-tr-sm"
                      : "bg-accent/60 text-foreground rounded-tl-sm"
                  }`}
                >
                  {m.text}
                  {m.role === "assistant" && m.source && (
                    <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Da: {m.source}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
            className="p-3 border-t border-border/60 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Chiedi qualcosa…"
              className="flex-1 h-10 px-4 rounded-full border border-border bg-background text-sm focus:outline-none focus:border-foreground/40"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
