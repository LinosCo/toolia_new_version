import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type Provider = "kimi" | "openai";

interface Body {
  apiKey?: string;
  provider?: Provider;
  path?: {
    id: string;
    name: string;
    description?: string;
    themeFocus?: string;
  };
  poiOrder?: {
    id: string;
    name: string;
    description?: string;
    zoneId?: string;
  }[];
  narrator?: {
    name: string;
    voiceStyle: string;
    characterBio?: string;
  };
  brief?: {
    tono?: string;
    promessaNarrativa?: string;
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

const SYSTEM = `Sei lo scrittore dei raccordi di Toolia Studio. Per un percorso definito come sequenza di POI, produci un "bridge" per ogni coppia consecutiva (POI[i] → POI[i+1]).

Ogni bridge ha tre layer:
1. navigation: istruzione di movimento breve e chiara (landmark-based quando la geometria non basta). 1-2 frasi.
2. body: raccordo narrativo principale — tiene il filo, spiega il senso del passaggio dal POI corrente al successivo. 2-4 frasi.
3. lensAccent: modulo opzionale, 1-2 frasi che aggiungono sfumatura del tono generale del progetto. Lascia vuoto se non aggiunge valore.

Regole:
- Italiano parlato, coerente con narratore e tono.
- Ogni bridge deve dare continuità: senza, le schede restano monologhi sconnessi.
- Non ripetere ciò che il visitatore ha appena sentito al POI corrente.
- Non anticipare troppo il POI successivo: prepara, non spoiler.

Output: SOLO JSON valido.

Formato:
{
  "bridges": [
    {
      "fromPoiId": "...",
      "toPoiId": "...",
      "navigation": "...",
      "body": "...",
      "lensAccent": "..."
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const { apiKey, provider, path, poiOrder, narrator, projectName } = body;
    if (!apiKey || !provider) {
      return NextResponse.json({ error: "missing_api_key" }, { status: 400 });
    }
    if (!path?.id || !Array.isArray(poiOrder) || poiOrder.length < 2) {
      return NextResponse.json(
        { error: "need_at_least_2_pois" },
        { status: 400 },
      );
    }

    const user = `Progetto: ${projectName ?? "—"}
Percorso: ${path.name}${path.themeFocus ? ` · ${path.themeFocus}` : ""}
${path.description ?? ""}

NARRATORE: ${narrator?.name ?? "—"} · stile ${narrator?.voiceStyle ?? "—"}
${narrator?.characterBio ?? ""}

TONO BRIEF: ${body.brief?.tono ?? "—"}
PROMESSA: ${body.brief?.promessaNarrativa ?? "—"}

ORDINE POI (${poiOrder.length}):
${poiOrder.map((p, i) => `${i + 1}. [${p.id}] ${p.name}${p.description ? ` — ${p.description}` : ""}`).join("\n")}

Genera ${poiOrder.length - 1} bridge (uno per ogni transizione POI[i]→POI[i+1]).`;

    const client = buildClient(provider, apiKey);
    const model = modelFor(provider);

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { bridges?: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 502 });
    }
    return NextResponse.json({
      bridges: Array.isArray(parsed.bridges) ? parsed.bridges : [],
    });
  } catch (err) {
    console.error("[api generate-bridges]", err);
    return NextResponse.json(
      {
        error: "internal",
        message: err instanceof Error ? err.message : "Errore",
      },
      { status: 500 },
    );
  }
}
