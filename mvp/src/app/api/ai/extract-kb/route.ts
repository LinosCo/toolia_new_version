import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM = `Sei un analista di contenuti culturali. Trasformi fonti grezze (sito, documenti, intervista) in una lista di FATTI ATOMICI classificati.
Ogni fatto è una frase autoconsistente, breve (10-40 parole), riferibile a una sola affermazione.
Nessuna interpretazione personale: se un'affermazione è un'ipotesi o una tradizione, va classificata come tale, non spacciata per certa.`;

type Category = "solido" | "interpretazione" | "memoria" | "ipotesi";
type SourceKind = "sito" | "documento" | "intervista" | "manuale";

type InputSource =
  | {
      kind: "sito";
      text: string;
      importance: string;
      reliability: string;
    }
  | {
      kind: "documento";
      id: string;
      name: string;
      text: string;
      importance: string;
      reliability: string;
      poiRef?: number;
    }
  | {
      kind: "intervista";
      mode?: "qa" | "trascrizione";
      respondentLabel: string;
      qa?: { id: string; question: string; answer: string }[];
      transcriptText?: string;
      importance: string;
      reliability: string;
    };

function weightOf(importance: string, reliability: string): number {
  const i = importance === "primaria" ? 3 : importance === "secondaria" ? 2 : 1;
  const r = reliability === "alta" ? 3 : reliability === "media" ? 2 : 1;
  return i * r;
}

const PROMPT = (payload: {
  projectName: string;
  type?: string;
  city?: string;
  poi?: { n: number; name: string }[];
  sources: InputSource[];
}) => {
  const parts: string[] = [];
  parts.push(
    `Luogo: ${payload.projectName}${payload.type ? ` (${payload.type})` : ""}${payload.city ? ` — ${payload.city}` : ""}`,
  );
  if (payload.poi?.length) {
    parts.push(
      `POI conosciuti:\n${payload.poi
        .slice()
        .sort((a, b) => a.n - b.n)
        .map((p) => `- ${p.n}. ${p.name}`)
        .join("\n")}`,
    );
  }
  payload.sources.forEach((s) => {
    const w = weightOf(s.importance, s.reliability);
    if (s.kind === "sito") {
      parts.push(
        `[FONTE · peso ${w}/9] sito · importanza=${s.importance} · affidabilità=${s.reliability}\nsourceId=sito\n${s.text.slice(0, 7000)}`,
      );
    } else if (s.kind === "documento") {
      parts.push(
        `[FONTE · peso ${w}/9] documento "${s.name}" · importanza=${s.importance} · affidabilità=${s.reliability}${s.poiRef ? ` · poiRef=${s.poiRef}` : ""}\nsourceId=${s.id}\n${s.text.slice(0, 6000)}`,
      );
    } else {
      const body =
        s.mode === "trascrizione"
          ? (s.transcriptText ?? "").slice(0, 8000)
          : (s.qa ?? [])
              .filter((q) => q.answer.trim())
              .map((q) => `Q: ${q.question}\nA: ${q.answer}\n[qaId=${q.id}]`)
              .join("\n\n");
      parts.push(
        `[FONTE · peso ${w}/9] intervista a ${s.respondentLabel} · importanza=${s.importance} · affidabilità=${s.reliability} · modalità=${s.mode ?? "qa"}\nsourceId=intervista\n${body}`,
      );
    }
  });
  return `Ecco tutte le fonti disponibili:

${parts.join("\n\n---\n\n")}

Genera una lista di FATTI ATOMICI (${payload.sources.length > 3 ? "40-80" : "20-50"} fatti totali). Per ogni fatto:
- "content": una frase autoconsistente 10-40 parole
- "category": una tra "solido" (fatto verificato, tono assertivo) | "interpretazione" (lettura plausibile non certa) | "memoria" (tradizione locale o racconto personale dall'intervista) | "ipotesi" (interessante ma non solida, da verificare)
- "sourceKind": "sito" | "documento" | "intervista"
- "sourceId": l'id indicato sopra (per documento il nome, per intervista il qaId specifico, per sito "sito")
- "poiRef": numero POI se il fatto riguarda un POI specifico, altrimenti null

Rispondi ESCLUSIVAMENTE in JSON:
{
  "facts": [
    { "content": "...", "category": "solido", "sourceKind": "documento", "sourceId": "forte-storia.pdf", "poiRef": 3 },
    ...
  ]
}

Regole:
- Fatti dall'intervista → probabilmente "memoria" o "solido" (se il gestore riporta dati oggettivi)
- Fatti dal sito → tipicamente "solido" ma verifica tono
- Fatti con affidabilità bassa della fonte → categoria "ipotesi" se il contenuto suona incerto
- Non duplicare fatti identici tra fonti
- Ignora cookie, privacy, navigazione, meta del sito
- Italiano, fatti concreti, niente frasi da brochure generiche

Peso delle fonti (importanza × affidabilità, 1–9):
- Peso 9 (primaria + alta) → fonte autorevole, estrai molti fatti, categoria prevalente "solido"
- Peso 6-7 → fonte importante, estrai con cura
- Peso 3-4 → secondaria, usa per arricchire ma non dominante
- Peso 1-2 → contesto/bassa affidabilità, minimo numero di fatti, spingili verso "ipotesi"
Quando due fonti contraddicono, PREFERISCI la fonte di peso maggiore; se pesi simili, estrai entrambi i fatti e mantienili come "interpretazione" con reciproco conflitto narrativo.`;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      apiKey,
      projectName,
      type,
      city,
      poi,
      sources,
    }: {
      apiKey?: string;
      projectName?: string;
      type?: string;
      city?: string;
      poi?: { n: number; name: string }[];
      sources?: InputSource[];
    } = body;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "missing_api_key",
          message: "Configura la chiave OpenAI in Impostazioni.",
        },
        { status: 400 },
      );
    }
    if (!projectName) {
      return NextResponse.json({ error: "missing_project" }, { status: 400 });
    }
    if (!Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json(
        {
          error: "no_sources",
          message:
            "Carica almeno una fonte (sito, documento o intervista) prima di estrarre la Knowledge Base.",
        },
        { status: 400 },
      );
    }

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: PROMPT({
            projectName,
            type,
            city,
            poi,
            sources,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }
    const parsed = JSON.parse(raw);
    const facts: unknown[] = Array.isArray(parsed.facts) ? parsed.facts : [];

    const allowedCategories: Category[] = [
      "solido",
      "interpretazione",
      "memoria",
      "ipotesi",
    ];
    const allowedKinds: SourceKind[] = [
      "sito",
      "documento",
      "intervista",
      "manuale",
    ];

    const clean = facts
      .map((f, i) => {
        const x = f as {
          content?: string;
          category?: string;
          sourceKind?: string;
          sourceId?: string;
          poiRef?: number | null;
        };
        const content = typeof x.content === "string" ? x.content.trim() : "";
        if (!content) return null;
        const category: Category = allowedCategories.includes(
          x.category as Category,
        )
          ? (x.category as Category)
          : "interpretazione";
        const sourceKind: SourceKind = allowedKinds.includes(
          x.sourceKind as SourceKind,
        )
          ? (x.sourceKind as SourceKind)
          : "documento";
        return {
          index: i,
          content,
          category,
          sourceKind,
          sourceId: typeof x.sourceId === "string" ? x.sourceId : undefined,
          poiRef:
            typeof x.poiRef === "number" && x.poiRef > 0 ? x.poiRef : undefined,
        };
      })
      .filter((x) => x !== null);

    return NextResponse.json({ facts: clean });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "ai_failed", message: msg },
      { status: 500 },
    );
  }
}
