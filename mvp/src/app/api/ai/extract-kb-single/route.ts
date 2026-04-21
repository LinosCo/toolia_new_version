import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type Provider = "kimi" | "openai";
type Category = "solido" | "interpretazione" | "memoria" | "ipotesi";
type SourceKind = "sito" | "documento" | "intervista";

interface SourceSito {
  kind: "sito";
  text: string;
  importance: string;
  reliability: string;
}
interface SourceDoc {
  kind: "documento";
  id: string;
  name: string;
  text: string;
  importance: string;
  reliability: string;
  poiRef?: number;
}
interface SourceIntervista {
  kind: "intervista";
  mode?: "qa" | "trascrizione";
  respondentLabel: string;
  qa?: { id: string; question: string; answer: string }[];
  transcriptText?: string;
  importance: string;
  reliability: string;
}
type InputSource = SourceSito | SourceDoc | SourceIntervista;

const SYSTEM = `Sei un analista di contenuti culturali. Estrai da UNA singola fonte la lista più ricca possibile di FATTI ATOMICI classificati.
Ogni fatto è una frase autoconsistente, breve (10-40 parole), riferibile a UNA sola affermazione. Punta alla granularità massima: date, misure, nomi propri, toponimi, numeri, tecniche costruttive, materiali, eventi storici, aneddoti, citazioni del gestore, storie personali, dettagli sensoriali.`;

function weightOf(importance: string, reliability: string): number {
  const i = importance === "primaria" ? 3 : importance === "secondaria" ? 2 : 1;
  const r = reliability === "alta" ? 3 : reliability === "media" ? 2 : 1;
  return i * r;
}

function buildPrompt(
  s: InputSource,
  poi: { n: number; name: string }[] | undefined,
  project: { name: string; type?: string; city?: string },
): { user: string; sourceIdHint: string } {
  const w = weightOf(s.importance, s.reliability);
  const poiBlock =
    poi && poi.length
      ? `POI noti del luogo:\n${poi.map((p) => `${p.n}. ${p.name}`).join("\n")}\n\n`
      : "";

  let body = "";
  let sourceIdHint = "";
  let sourceLabel = "";

  if (s.kind === "sito") {
    sourceIdHint = "sito";
    sourceLabel = "sito web";
    body = s.text.slice(0, 40000);
  } else if (s.kind === "documento") {
    sourceIdHint = s.id;
    sourceLabel = `documento "${s.name}"`;
    body = s.text.slice(0, 40000);
  } else {
    sourceIdHint = "intervista";
    sourceLabel = `intervista a ${s.respondentLabel}`;
    if (s.mode === "trascrizione") {
      body = (s.transcriptText ?? "").slice(0, 40000);
    } else {
      body = (s.qa ?? [])
        .filter((q) => q.answer.trim())
        .map((q) => `Q: ${q.question}\nA: ${q.answer}\n[qaId=${q.id}]`)
        .join("\n\n");
    }
  }

  const user = `Luogo: ${project.name}${project.type ? ` (${project.type})` : ""}${project.city ? ` — ${project.city}` : ""}

${poiBlock}Fonte da analizzare — tipo: ${sourceLabel} · peso ${w}/9 (importanza=${s.importance}, affidabilità=${s.reliability})
sourceId="${sourceIdHint}"

CONTENUTO:
---
${body}
---

Estrai TUTTI i fatti atomici che trovi, anche piccoli dettagli. Se il testo contiene ~2000 parole, punta a 50-80 fatti; se ~4000 parole, 80-150 fatti; se ~8000 parole, 150-250 fatti. NON fermarti prima. Meglio 200 fatti granulari e ripetibili che 40 sintesi — l'utente deciderà quali tenere.

Categorie di fatti da cercare:
- Date, periodi, secoli, anni di costruzione/restauro
- Numeri, misure, capacità, dimensioni (metri, chilogrammi, litri)
- Nomi propri (persone, architetti, committenti, famiglie, imprese)
- Toponimi (luoghi collegati, vie, monti, valli, fiumi)
- Materiali costruttivi (pietre, legni, leghe, tecniche)
- Eventi storici (battaglie, visite illustri, restauri, incidenti)
- Personaggi, figure chiave, aneddoti (un capocantiere, un mulo caduto, una firma sul muro)
- Dettagli architettonici (volte, piazzole, feritoie, corazzature)
- Curiosità, tradizioni locali, leggende, citazioni dirette
- Dati amministrativi (orari, biglietti, gestione attuale)

Per ogni fatto produci:
- "content": frase autoconsistente 10-40 parole
- "category": "solido" | "interpretazione" | "memoria" | "ipotesi"
- "poiRef": numero POI tra quelli noti sopra, oppure null
- "sourceQaId": SOLO se questa fonte è un'intervista in modalità qa e il fatto viene da una domanda specifica, riporta il qaId; altrimenti null

Regole categoria:
- Peso fonte 7-9 + contenuto verificabile → "solido"
- Lettura plausibile ma non definitiva → "interpretazione"
- Tradizione orale, racconto personale dell'intervistato, aneddoto locale → "memoria"
- Incertezza ("forse", "sembra", "si dice"), peso basso → "ipotesi"

Rispondi ESCLUSIVAMENTE in JSON:
{ "facts": [ { "content": "...", "category": "solido", "poiRef": 3, "sourceQaId": null }, ... ] }

Non includere duplicati esatti all'interno di questa stessa estrazione (ma va bene avere fatti simili con sfumature diverse: es. "Il forte ha 380 uomini di guarnigione" e "La guarnigione del 7° reggimento artiglieria da fortezza era di 380 uomini" sono entrambi utili).

Italiano, tono neutro, fatti concreti. Ogni frase del testo originale contiene tipicamente 2-4 fatti atomici: spacchettali tutti. Non sintetizzare, non riassumere — estrai.`;

  return { user, sourceIdHint };
}

function buildClient(provider: Provider, apiKey: string): OpenAI {
  if (provider === "kimi") {
    return new OpenAI({
      apiKey,
      baseURL: "https://api.moonshot.ai/v1",
    });
  }
  return new OpenAI({ apiKey });
}

function modelFor(provider: Provider): string {
  if (provider === "kimi") return "moonshot-v1-128k";
  return "gpt-4o";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      apiKey,
      provider,
      projectName,
      type,
      city,
      poi,
      source,
    }: {
      apiKey?: string;
      provider?: Provider;
      projectName?: string;
      type?: string;
      city?: string;
      poi?: { n: number; name: string }[];
      source?: InputSource;
    } = body;

    if (!apiKey || !provider) {
      return NextResponse.json(
        {
          error: "missing_api_key",
          message: "Configura una chiave LLM (Kimi o OpenAI) in Impostazioni.",
        },
        { status: 400 },
      );
    }
    if (!projectName || !source) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const { user, sourceIdHint } = buildPrompt(source, poi, {
      name: projectName,
      type,
      city,
    });

    const client = buildClient(provider, apiKey);
    const completion = await client.chat.completions.create({
      model: modelFor(provider),
      temperature: 0.55,
      max_tokens: 16000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }

    let parsed: { facts?: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "Risposta LLM non valida." },
        { status: 502 },
      );
    }

    const allowedCategories: Category[] = [
      "solido",
      "interpretazione",
      "memoria",
      "ipotesi",
    ];

    const sourceKind: SourceKind = source.kind;

    const facts = Array.isArray(parsed.facts)
      ? parsed.facts
          .map((f: unknown) => {
            const x = f as {
              content?: string;
              category?: string;
              poiRef?: number | null;
              sourceQaId?: string | null;
            };
            if (typeof x.content !== "string" || !x.content.trim()) return null;
            const category: Category = allowedCategories.includes(
              x.category as Category,
            )
              ? (x.category as Category)
              : "interpretazione";
            return {
              content: x.content.trim(),
              category,
              sourceKind,
              sourceId:
                sourceKind === "intervista" && typeof x.sourceQaId === "string"
                  ? x.sourceQaId
                  : sourceIdHint,
              poiRef:
                typeof x.poiRef === "number" && x.poiRef > 0
                  ? x.poiRef
                  : undefined,
            };
          })
          .filter((x) => x !== null)
      : [];

    return NextResponse.json({ facts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "ai_failed", message: msg },
      { status: 500 },
    );
  }
}
