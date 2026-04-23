import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type Provider = "kimi" | "openai";

interface Body {
  apiKey?: string;
  provider?: Provider;
  poi?: {
    id: string;
    name: string;
    description?: string;
    type?: string;
  };
  semanticBase?: Record<string, unknown>;
  familyMode?: {
    mascotName?: string;
    etaTarget?: string;
    tonoFamily?: string;
    modalitaGioco?: string;
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

const SYSTEM = `Sei il designer della modalità Famiglie di Toolia Studio. Il family mode è un LAYER LUDICO-EDITORIALE che si innesta sul percorso adulto — NON un percorso separato. Per un POI produci 1-2 micro-missioni per bambini 6-10 anni con accompagnatore adulto.

Ogni missione deve essere:
- Breve: 20-120 secondi di attività
- Ancorata a qualcosa di REALE e osservabile nel luogo (non solo fantasia)
- Coerente col tono del brief family
- Proposta DOPO il contenuto adulto (non sostituisce il racconto)

Tipi ammessi:
- poi_observation: osserva/cerca/indovina davanti al POI
- segment: funziona camminando o attraversando
- sync: riallinea bambino e adulto, aiuta il genitore a trasferire qualcosa

Per ogni missione:
{
  "missionType": "poi_observation" | "segment" | "sync",
  "kidMissionBrief": "cosa deve fare il bambino — testo per il narratore kids",
  "clue": "indizio iniziale, breve",
  "hintLadder": ["hint facile", "hint medio", "hint che quasi risolve"],
  "reward": "riconoscimento quando ha risolto (complimento o micro-storia)",
  "familyHandoff": "istruzione breve per il genitore — cosa dire/fare per aiutare",
  "characterCue": "riferimento al personaggio kids/mascotte se presente",
  "visualCue": "dettaglio visivo da cercare (se utile)",
  "durationSeconds": 45
}

Regole:
- La soluzione deve sempre agganciarsi a qualcosa di osservabile nel luogo.
- No domande a trabocchetto; hint progressivi.
- Italiano caldo, immediato, adatto bambini.
- Se POI è troppo complesso/tecnico per kids, proponi UNA SOLA missione semplice di osservazione.

Output: SOLO JSON valido.

Formato:
{
  "missions": [ { ... }, { ... } ]
}`;

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const { apiKey, provider, poi, semanticBase, familyMode, projectName } =
      body;
    if (!apiKey || !provider) {
      return NextResponse.json({ error: "missing_api_key" }, { status: 400 });
    }
    if (!poi?.id || !poi?.name) {
      return NextResponse.json({ error: "missing_poi" }, { status: 400 });
    }

    const user = `Progetto: ${projectName ?? "—"}

POI: ${poi.name}${poi.description ? ` — ${poi.description}` : ""}

BASE SIGNIFICATO:
${JSON.stringify(semanticBase ?? {}, null, 2)}

CONFIG FAMILY MODE:
- Mascotte: ${familyMode?.mascotName ?? "—"}
- Età target: ${familyMode?.etaTarget ?? "6-10"}
- Tono family: ${familyMode?.tonoFamily ?? "—"}
- Modalità gioco: ${familyMode?.modalitaGioco ?? "osservazione"}

Genera 1-2 micro-missioni per bambini su questo POI.`;

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
    let parsed: { missions?: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 502 });
    }
    return NextResponse.json({
      missions: Array.isArray(parsed.missions) ? parsed.missions : [],
    });
  } catch (err) {
    console.error("[api generate-family-missions]", err);
    return NextResponse.json(
      {
        error: "internal",
        message: err instanceof Error ? err.message : "Errore",
      },
      { status: 500 },
    );
  }
}
