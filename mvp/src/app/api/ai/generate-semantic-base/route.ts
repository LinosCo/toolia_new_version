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
    zoneId?: string;
    zoneName?: string;
    zoneFunction?: string;
  };
  projectName?: string;
  brief?: {
    obiettivo?: string;
    promessaNarrativa?: string;
    tono?: string;
    tipoEsperienza?: string;
    mustTell?: string[];
    avoid?: string[];
    verify?: string[];
  };
  kbFacts?: {
    content: string;
    category: string;
    importance: string;
    reliability: string;
    poiRef?: number | null;
  }[];
  drivers?: { id: string; name: string; domain: string }[];
  visitorQuestions?: {
    pratiche?: string[];
    curiosita?: string[];
    approfondimento?: string[];
  };
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

const SYSTEM = `Sei il redattore editoriale di Toolia Studio. Produci la BASE DI SIGNIFICATO (semantic content base) per un POI di un progetto culturale italiano.

La base di significato è un oggetto JSON intermedio, editoriale e controllato, da cui TUTTE le schede audio derivate (per narratore / lingua) prendono il contenuto. Errore corretto qui = tutte le schede restano corrette.

La base contiene:
- identity: chi/cosa è, tipo, ruolo nella visita
- grounding: dove siamo, cosa accade in questo punto, perché conta
- keyMessages: 3-5 cose che DEVONO arrivare al visitatore (bullet)
- verifiedFacts: 3-8 fatti verificabili rilevanti (con categoria: solido/interpretazione/memoria/ipotesi)
- narrativeAngles: 2-4 angoli narrativi possibili (storia/arte/natura/memoria...)
- editorialWarnings: cautele, sensibilità, cose da non banalizzare
- deliveryConstraints: indicazioni su osservazione/cammino/tecnico/visuale (array di stringhe)
- visualAffordances: dettagli visivi forti, visual anchor rilevanti
- questionSurfaces: domande probabili al visitatore (array di stringhe brevi)
- expansionPotential: cosa può diventare approfondimento (deep-dive)

Regole:
- Italiano piano ma curato.
- Non fabbricare fatti: se non trovi fatto attestato tra kbFacts, mettilo come "interpretazione" o "ipotesi" con cautela.
- keyMessages devono essere compatibili con il brief (obiettivo, tono, mustTell).
- deliveryConstraints: pensa se questo POI richiede osservazione precisa, funziona camminando, è troppo tecnico, troppo visuale.

Output: SOLO JSON valido. Nessun testo fuori.

Formato:
{
  "identity": "...",
  "grounding": "...",
  "keyMessages": ["...", "..."],
  "verifiedFacts": [
    {"category": "solido", "content": "..."}
  ],
  "narrativeAngles": ["...", "..."],
  "editorialWarnings": ["..."],
  "deliveryConstraints": ["..."],
  "visualAffordances": ["..."],
  "questionSurfaces": ["..."],
  "expansionPotential": ["..."]
}`;

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const { apiKey, provider, poi, projectName } = body;
    if (!apiKey || !provider) {
      return NextResponse.json(
        {
          error: "missing_api_key",
          message: "Configura una chiave LLM in Impostazioni.",
        },
        { status: 400 },
      );
    }
    if (!poi?.id || !poi?.name) {
      return NextResponse.json({ error: "missing_poi" }, { status: 400 });
    }

    const brief = body.brief ?? {};
    const drivers = (body.drivers ?? []).slice(0, 15);
    const facts = (body.kbFacts ?? []).slice(0, 60);
    const vq = body.visitorQuestions ?? {};

    const user = `Progetto: ${projectName ?? "—"}

POI:
- [${poi.id}] ${poi.name} (${poi.type ?? "—"})${poi.zoneName ? ` · zona ${poi.zoneName} (${poi.zoneFunction ?? ""})` : ""}
- Descrizione: ${poi.description ?? "—"}

BRIEF:
- Obiettivo: ${brief.obiettivo ?? "—"}
- Promessa: ${brief.promessaNarrativa ?? "—"}
- Tipo esperienza: ${brief.tipoEsperienza ?? "—"}
- Tono: ${brief.tono ?? "—"}
${brief.mustTell?.length ? `- Must tell: ${brief.mustTell.join(" / ")}` : ""}
${brief.avoid?.length ? `- Avoid: ${brief.avoid.join(" / ")}` : ""}
${brief.verify?.length ? `- Verify: ${brief.verify.join(" / ")}` : ""}

DRIVER (${drivers.length}):
${drivers.map((d) => `- ${d.name} (${d.domain})`).join("\n")}

FATTI KB (${facts.length}, rilevanti per questo POI e generali):
${facts.map((f) => `- [${f.category}·${f.importance}·${f.reliability}] ${f.content}`).join("\n")}

DOMANDE VISITATORE PREVISTE:
${[...(vq.pratiche ?? []), ...(vq.curiosita ?? []), ...(vq.approfondimento ?? [])].map((q) => `- ${q}`).join("\n") || "—"}

Genera la base di significato per questo POI.`;

    const client = buildClient(provider, apiKey);
    const model = modelFor(provider);

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "AI JSON non valido." },
        { status: 502 },
      );
    }
    return NextResponse.json({ semanticBase: parsed });
  } catch (err) {
    console.error("[api generate-semantic-base]", err);
    return NextResponse.json(
      {
        error: "internal",
        message: err instanceof Error ? err.message : "Errore generazione base",
      },
      { status: 500 },
    );
  }
}
