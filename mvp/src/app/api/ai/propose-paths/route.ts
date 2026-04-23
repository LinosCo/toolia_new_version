import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type Provider = "kimi" | "openai";

interface Body {
  apiKey?: string;
  provider?: Provider;
  projectName?: string;
  type?: string;
  city?: string;
  brief?: {
    obiettivo?: string;
    promessaNarrativa?: string;
    target?: string;
    tipoEsperienza?: string;
    tono?: string;
    durataMinuti?: number;
  };
  drivers?: { id: string; name: string; domain: string }[];
  zones?: {
    id: string;
    name: string;
    function: string;
    narrativePromise?: string;
  }[];
  pois?: {
    id: string;
    name: string;
    description: string;
    zoneId?: string;
    minStaySeconds?: number;
  }[];
  narrators?: {
    id: string;
    name: string;
    kind: string;
    voiceStyle: string;
    characterBio?: string;
    preferredDrivers?: string[];
  }[];
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

const SYSTEM = `Sei il direttore di produzione di Toolia Studio. Proponi 2-3 percorsi di visita per un progetto culturale italiano, RIEMPIENDO OGNI CAMPO. L'operatore non compila: tu fai tutto.

Ogni percorso deve essere un itinerario tematico coerente con brief + driver. Tipicamente:
- Uno "tour completo" (tutti o quasi i POI, durata lunga)
- Uno "rapido" (POI essenziali, 30-45 min)
- Opzionale: tematico (es. "Solo architettura", "Percorso sensoriale")

Per ogni percorso produci:
- name: breve e parlante (es. "Tour completo", "Percorso rapido", "Sulle tracce dei ...")
- description: 2-3 frasi. Cosa offre, a chi si rivolge, cosa lascia.
- durationTargetMinutes: numero realistico (usa minStaySeconds dei POI × POI inclusi + 1-2 min camminata tra POI)
- themeFocus: breve tag tematico (es. "visione generale", "sintesi per chi ha poco tempo", "approfondimento naturalistico")
- narratorId: id ESATTO del narratore più adatto dalla lista NARRATORI che ti do (backbone di default, character solo se il percorso ha un taglio chiaro dal suo territorio)
- poiOrder: array di POI id nell'ordine di visita. Usa ESATTAMENTE gli id dall'elenco POI. Ordina in base a zone (apertura→sviluppo→climax→chiusura quando disponibile) e coerenza narrativa.
- corePoiIds: sottoinsieme di poiOrder marcato come ESSENZIALE. Da mantenere sempre anche se il visitatore ha poco tempo. Regola: includi i POI della fase climax + 1-2 di apertura. I POI di sviluppo tipicamente sono opzionali. Minimo 2, massimo metà del percorso.
- chapters: array di capitoli narrativi. Ogni capitolo:
  {
    "id": "ch1",
    "name": "Introduzione" | "Sviluppo" | "Climax" | "Chiusura" (o nome personalizzato evocativo),
    "function": "apertura" | "sviluppo" | "climax" | "chiusura",
    "poiIds": ["poi_id_1", "poi_id_2"],
    "description": "1 frase: cosa prepara/porta/rivela"
  }
  La somma dei poiIds dei capitoli DEVE coprire tutti i POI in poiOrder, senza duplicati, nello stesso ordine.

Regole:
- Se non ci sono abbastanza POI per un percorso breve, includi meno capitoli (minimo 2: apertura + chiusura).
- Warn se un percorso ha meno di 2 POI (ma produci comunque).
- Ogni percorso è indipendente: può includere sottoinsiemi diversi di POI.
- Narratore: se disponibile backbone, default. Se c'è un character con territorio coerente col tema, usalo.

Usa italiano. Output: SOLO JSON valido, niente testo fuori.

Formato:
{
  "paths": [
    {
      "name": "...",
      "description": "...",
      "durationTargetMinutes": 60,
      "themeFocus": "...",
      "narratorId": "...",
      "poiOrder": ["poi_1", "poi_2"],
      "corePoiIds": ["poi_1"],
      "chapters": [
        { "id": "ch1", "name": "...", "function": "apertura", "poiIds": ["poi_1"], "description": "..." }
      ]
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const { apiKey, provider, projectName, type, city } = body;
    if (!apiKey || !provider) {
      return NextResponse.json(
        {
          error: "missing_api_key",
          message: "Configura una chiave LLM in Impostazioni.",
        },
        { status: 400 },
      );
    }
    if (!projectName) {
      return NextResponse.json({ error: "missing_project" }, { status: 400 });
    }

    const brief = body.brief ?? {};
    const drivers = (body.drivers ?? []).slice(0, 20);
    const zones = (body.zones ?? []).slice(0, 10);
    const pois = (body.pois ?? []).slice(0, 40);
    const narrators = (body.narrators ?? []).slice(0, 10);

    if (pois.length === 0) {
      return NextResponse.json(
        { error: "no_pois", message: "Servono POI nello Step Luogo." },
        { status: 400 },
      );
    }
    if (narrators.length === 0) {
      return NextResponse.json(
        { error: "no_narrators", message: "Prima crea almeno un narratore." },
        { status: 400 },
      );
    }

    const user = `Progetto: ${projectName}${type ? ` · tipo ${type}` : ""}${
      city ? ` · ${city}` : ""
    }

BRIEF
- Obiettivo: ${brief.obiettivo ?? "—"}
- Promessa: ${brief.promessaNarrativa ?? "—"}
- Target: ${brief.target ?? "—"}
- Tipo esperienza: ${brief.tipoEsperienza ?? "—"}
- Tono: ${brief.tono ?? "—"}
- Durata target indicativa: ${brief.durataMinuti ?? "non specificata"} min

DRIVER (${drivers.length})
${drivers.map((d) => `- [${d.id}] ${d.name} (${d.domain})`).join("\n")}

ZONE (${zones.length})
${zones.map((z) => `- [${z.id}] ${z.name} · ${z.function}${z.narrativePromise ? ` — ${z.narrativePromise}` : ""}`).join("\n")}

POI (${pois.length})
${pois.map((p) => `- [${p.id}] ${p.name}${p.zoneId ? ` · zona ${p.zoneId}` : ""} · sosta ${Math.round((p.minStaySeconds ?? 60) / 60)}min: ${p.description}`).join("\n")}

NARRATORI (${narrators.length})
${narrators.map((n) => `- [${n.id}] ${n.name} · ${n.kind} · ${n.voiceStyle}${n.preferredDrivers?.length ? ` · driver: ${n.preferredDrivers.join(",")}` : ""}${n.characterBio ? ` — ${n.characterBio}` : ""}`).join("\n")}

Proponi 2-3 percorsi coerenti con brief + zone + driver. Assegna narratore e organizza in capitoli narrativi.`;

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
    let parsed: { paths?: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "L'AI ha prodotto JSON non valido." },
        { status: 502 },
      );
    }

    const paths = Array.isArray(parsed.paths) ? parsed.paths : [];
    return NextResponse.json({ paths });
  } catch (err) {
    console.error("[api propose-paths]", err);
    return NextResponse.json(
      {
        error: "internal",
        message:
          err instanceof Error ? err.message : "Errore generazione percorsi",
      },
      { status: 500 },
    );
  }
}
