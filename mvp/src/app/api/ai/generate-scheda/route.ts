import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type Provider = "kimi" | "openai";

interface Body {
  apiKey?: string;
  provider?: Provider;
  language?: string;
  poi?: {
    id: string;
    name: string;
    description?: string;
    minStaySeconds?: number;
  };
  narrator?: {
    id: string;
    name: string;
    kind: string;
    voiceStyle: string;
    characterBio?: string;
    characterContractJson?: Record<string, unknown>;
  };
  semanticBase?: Record<string, unknown>;
  brief?: {
    obiettivo?: string;
    promessaNarrativa?: string;
    tono?: string;
    tipoEsperienza?: string;
    mustTell?: string[];
    avoid?: string[];
  };
  projectName?: string;
}

function buildClient(provider: Provider, apiKey: string): OpenAI {
  if (provider === "kimi") {
    return new OpenAI({ apiKey, baseURL: "https://api.moonshot.ai/v1" });
  }
  return new OpenAI({ apiKey });
}
function modelFor(provider: Provider): string {
  if (provider === "kimi") return "moonshot-v1-128k";
  return "gpt-4o";
}

const SYSTEM = `Sei lo scrittore delle schede audio di Toolia Studio. Genera il TESTO PARLATO per una singola scheda di audioguida italiana a partire da:
- la base di significato del POI (source of truth editoriale)
- il profilo del narratore (voce principale o personaggio)
- il brief editoriale del progetto

Regole di scrittura:
- Italiano parlato, fluente e naturale (non scritto accademico).
- Usa il tono e registro del narratore. Se è un personaggio, parla come quel personaggio (prima persona quando coerente).
- Resta dentro la base di significato: non inventare fatti. Gli "angoli narrativi" sono scegliibili ma i fatti devono venire da verifiedFacts.
- Lunghezza: proporzionale al minStaySeconds del POI (150 parole/minuto come riferimento). Default 60-90 secondi se non specificato.
- Non leggere titoli né fare appelli al "visitatore" diretti ("oggi vi racconto", "benvenuti") a meno che sia un'apertura di percorso.
- Niente suggerimenti visivi ridondanti ("qui davanti a voi", "guardate"): usali solo quando aggiungono valore.
- Rispetta keyMessages, mustTell, evita avoid, mantieni editorialWarnings.
- Chiudi in modo che suoni naturale alla fine (non cliffhanger artificiali).

Output: SOLO JSON valido. Nessun testo fuori.

Formato:
{
  "title": "titolo breve evocativo",
  "scriptText": "testo narrativo unico, italiano parlato"
}`;

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const { apiKey, provider, poi, narrator, semanticBase, projectName } = body;
    if (!apiKey || !provider) {
      return NextResponse.json(
        { error: "missing_api_key", message: "Configura chiave LLM." },
        { status: 400 },
      );
    }
    if (!poi?.id || !narrator?.id) {
      return NextResponse.json({ error: "missing_refs" }, { status: 400 });
    }
    if (!semanticBase || Object.keys(semanticBase).length === 0) {
      return NextResponse.json(
        {
          error: "no_semantic_base",
          message: "Prima genera la base di significato per questo POI.",
        },
        { status: 400 },
      );
    }

    const brief = body.brief ?? {};
    const language = body.language ?? "it";
    const durationTarget = poi.minStaySeconds ?? 75;

    const user = `Progetto: ${projectName ?? "—"} · lingua: ${language}

POI: ${poi.name}${poi.description ? ` — ${poi.description}` : ""}
Durata target: ~${durationTarget} secondi.

NARRATORE: ${narrator.name} (${narrator.kind}) · stile ${narrator.voiceStyle}
${narrator.characterBio ? `Bio: ${narrator.characterBio}` : ""}
${
  narrator.characterContractJson &&
  Object.keys(narrator.characterContractJson).length
    ? `Contract: ${JSON.stringify(narrator.characterContractJson)}`
    : ""
}

BRIEF:
- Obiettivo: ${brief.obiettivo ?? "—"}
- Promessa: ${brief.promessaNarrativa ?? "—"}
- Tono generale: ${brief.tono ?? "—"}
- Tipo esperienza: ${brief.tipoEsperienza ?? "—"}
${brief.mustTell?.length ? `- Must tell: ${brief.mustTell.join(" / ")}` : ""}
${brief.avoid?.length ? `- Avoid: ${brief.avoid.join(" / ")}` : ""}

BASE DI SIGNIFICATO (source of truth):
${JSON.stringify(semanticBase, null, 2)}

Scrivi title + scriptText.`;

    const client = buildClient(provider, apiKey);
    const model = modelFor(provider);

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { title?: string; scriptText?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 502 });
    }
    return NextResponse.json({
      title: parsed.title ?? "",
      scriptText: parsed.scriptText ?? "",
    });
  } catch (err) {
    console.error("[api generate-scheda]", err);
    return NextResponse.json(
      {
        error: "internal",
        message:
          err instanceof Error ? err.message : "Errore generazione scheda",
      },
      { status: 500 },
    );
  }
}
