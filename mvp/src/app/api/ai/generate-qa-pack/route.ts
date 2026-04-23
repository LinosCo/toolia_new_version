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
  kbFacts?: {
    content: string;
    category: string;
    importance: string;
    reliability: string;
  }[];
  visitorQuestions?: {
    pratiche?: string[];
    curiosita?: string[];
    approfondimento?: string[];
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

const SYSTEM = `Sei il progettista del chatbot verticale di Toolia Studio. Per un POI specifico produci un pacchetto di Q&A pre-verificate — l'assistant durante la visita risponde attingendo a queste unità quando possibile.

Ogni unità ha:
- triggerQuestions: 2-5 formulazioni probabili (italiano parlato, come le farebbe un visitatore reale)
- verifiedAnswer: risposta breve, fattuale, 2-4 frasi
- extendedAnswer: variante più ricca opzionale, 4-8 frasi
- doNotAnswerBeyond: limiti — cosa non dire con certezza se gli fanno domande collegate
- sessionRelevance: quando proporla (es. "all'arrivo al POI", "se chiede di dettagli architettonici", "se cerca aneddoti")

Produci 5-8 unità per POI, coprendo questi archetipi di domanda (cosa sto guardando / perché conta / chiarimenti su termini / aneddoti / pratiche / connessioni con altri POI).

Regole:
- Rispondi SOLO partendo dai verifiedFacts della semantic base + kbFacts approvati. Non fabbricare.
- Italiano parlato naturale.
- Risposte situate al POI, non generiche.
- Non anticipare contenuti che verrebbero dati nella scheda principale.

Output: SOLO JSON valido.

Formato:
{
  "units": [
    {
      "triggerQuestions": ["...", "..."],
      "verifiedAnswer": "...",
      "extendedAnswer": "...",
      "doNotAnswerBeyond": "...",
      "sessionRelevance": "..."
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const { apiKey, provider, poi, semanticBase, projectName } = body;
    if (!apiKey || !provider) {
      return NextResponse.json({ error: "missing_api_key" }, { status: 400 });
    }
    if (!poi?.id || !poi?.name) {
      return NextResponse.json({ error: "missing_poi" }, { status: 400 });
    }

    const facts = (body.kbFacts ?? []).slice(0, 40);
    const vq = body.visitorQuestions ?? {};

    const user = `Progetto: ${projectName ?? "—"}

POI: ${poi.name}${poi.description ? ` — ${poi.description}` : ""}

BASE SIGNIFICATO:
${JSON.stringify(semanticBase ?? {}, null, 2)}

FATTI KB (${facts.length}):
${facts.map((f) => `- [${f.category}·${f.importance}·${f.reliability}] ${f.content}`).join("\n")}

DOMANDE VISITATORE PREVISTE:
${[...(vq.pratiche ?? []), ...(vq.curiosita ?? []), ...(vq.approfondimento ?? [])].map((q) => `- ${q}`).join("\n") || "—"}

Genera 5-8 unità Q&A.`;

    const client = buildClient(provider, apiKey);
    const model = modelFor(provider);

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { units?: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 502 });
    }
    return NextResponse.json({
      units: Array.isArray(parsed.units) ? parsed.units : [],
    });
  } catch (err) {
    console.error("[api generate-qa-pack]", err);
    return NextResponse.json(
      {
        error: "internal",
        message: err instanceof Error ? err.message : "Errore Q&A",
      },
      { status: 500 },
    );
  }
}
