import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type Provider = "kimi" | "openai";
type SpatialMode = "gps" | "indoor" | "hybrid";
type ZoneFunction = "apertura" | "sviluppo" | "climax";

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
    mustTell?: string[];
    niceToTell?: string[];
    avoid?: string[];
  };
  planimetriaDescription?: string;
  spatialHints?: { name: string; description: string }[];
  facts?: {
    content: string;
    category: string;
    importance: string;
    reliability: string;
    sourceKind: string;
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

const SYSTEM = `Sei l'assistente spaziale di Toolia Studio. Il tuo compito è proporre la modellazione del luogo fisico a partire dalle fonti già acquisite.
Devi applicare la regola invariante: "quando narrazione e spazio fisico sono in conflitto, vince lo spazio". Non inventare ambienti non supportati dalle fonti.
Ogni POI proposto deve avere evidenza testuale: uno hint spaziale, un passaggio nella descrizione della planimetria, o un fatto KB specifico.`;

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

    const hints = body.spatialHints ?? [];
    const planDesc = (body.planimetriaDescription ?? "").slice(0, 6000);
    const brief = body.brief ?? {};
    const factsRaw = body.facts ?? [];

    // Prioritizza fatti con contenuto spaziale: cerca keyword semplici
    const spatialKeywords =
      /(sala|torre|cortile|giardin|fossat|stanza|cappella|corridoio|scala|ingresso|uscita|porta|finestra|mura|bastion|cammin|piazz|sotterran|cantina|magazzin|polveri|caseremette|trincea|fucileri|vedett|caponier|itinerari|percors|zona|area|luogo|edificio|facciata|terrazz|balcone|scuderie)/i;
    const spatialFacts = factsRaw.filter((f) =>
      spatialKeywords.test(f.content),
    );
    const otherFacts = factsRaw.filter((f) => !spatialKeywords.test(f.content));
    // Ordina per peso (importanza × affidabilità implicito nel prompt)
    const factsCapped = [
      ...spatialFacts.slice(0, 80),
      ...otherFacts.slice(0, 30),
    ];

    const hintsBlock = hints.length
      ? hints
          .map((h, i) =>
            h.description
              ? `${i + 1}. ${h.name} — ${h.description}`
              : `${i + 1}. ${h.name}`,
          )
          .join("\n")
      : "(nessuno spunto spaziale dalla planimetria)";

    const factsBlock = factsCapped.length
      ? factsCapped.map((f) => `- [${f.category}] ${f.content}`).join("\n")
      : "(nessun fatto KB rilevante)";

    const briefBlock = `
- Obiettivo visitatore: ${brief.obiettivo ?? "—"}
- Promessa narrativa: ${brief.promessaNarrativa ?? "—"}
- Target: ${brief.target ?? "—"}
- Tipo esperienza: ${brief.tipoEsperienza ?? "—"}
- Must tell: ${(brief.mustTell ?? []).join(" · ") || "—"}
- Nice to tell: ${(brief.niceToTell ?? []).join(" · ") || "—"}
- Avoid: ${(brief.avoid ?? []).join(" · ") || "—"}`.trim();

    const user = `Luogo: ${projectName}${type ? ` (${type})` : ""}${city ? ` — ${city}` : ""}

==========================================================
BRIEF EDITORIALE
==========================================================
${briefBlock}

==========================================================
SPUNTI SPAZIALI DALLA PLANIMETRIA
==========================================================
${hintsBlock}

==========================================================
DESCRIZIONE PLANIMETRIA / MAPPA
==========================================================
${planDesc || "(nessuna descrizione)"}

==========================================================
FATTI KB RILEVANTI PER LO SPAZIO (selezione)
==========================================================
${factsBlock}

==========================================================
COMPITO
==========================================================

Produci una proposta di modellazione spaziale per questo luogo. Output in JSON:

{
  "spatialMode": "gps" | "indoor" | "hybrid",
  "spatialModeReason": "frase breve",
  "zones": [
    {
      "name": "...",
      "narrativePromise": "...",
      "function": "apertura" | "sviluppo" | "climax",
      "reasoning": "perché questa zona esiste basandoti su fonti"
    }
  ],
  "pois": [
    {
      "name": "...",
      "description": "2-3 frasi che descrivono il POI, ricavate da KB/hints",
      "zoneSuggested": "nome della zona proposta",
      "minStaySeconds": 120,
      "evidence": "passaggio di testo dalle fonti che giustifica il POI"
    }
  ]
}

REGOLE CRITICHE:

1) **spatialMode**: scegli in base al tipo di luogo:
   - "indoor": musei, palazzi, ville, siti con planimetria interna e ambienti chiusi
   - "gps": parchi, percorsi urbani, territori, siti all'aperto senza planimetria dettagliata
   - "hybrid": siti con sia esterni che interni rilevanti (es. forti con ortofoto + ambienti interni)

2) **zones OBBLIGATORIE**: DEVI produrre da 2 a 4 zone. L'array non può essere vuoto.
   Come ricavarle: incrocia la promessa narrativa del brief con la distribuzione spaziale dei POI suggeriti.
   Esempi validi per un forte militare:
   - "Accoglienza e approccio" (apertura): dove il visitatore arriva e si orienta
   - "Cuore difensivo" (sviluppo): i punti chiave della funzione militare
   - "Vista e prospettiva" (climax): il punto culminante memorabile
   Ogni zona ha: name, narrativePromise, function ("apertura" | "sviluppo" | "climax"), reasoning.

3) **pois — REGOLA FERREA DI COPERTURA**:

   **Step A — Spunti planimetria SEMPRE inclusi**: OGNI spunto spaziale della planimetria (nome elencato sopra) DEVE diventare un POI. Nessuna esclusione, nessun accorpamento. Se la planimetria elenca 13 spunti, i primi 13 POI sono quelli, nello stesso ordine. Usa come "description" il testo descrittivo dello spunto, arricchito dai fatti KB correlati. Usa come "evidence" il nome dello spunto.

   **Step B — POI aggiuntivi da KB**: DOPO aver incluso tutti gli spunti planimetria, aggiungi ulteriori POI ricavati ESCLUSIVAMENTE dai fatti KB. Cerca attivamente nei fatti KB menzioni di ambienti/luoghi specifici che non compaiono già come spunti planimetria. Pattern da cercare:
   - "nella sala X" / "al piano superiore" / "sotto la torre"
   - "il cortile interno" / "la cappella di..."
   - "punto di osservazione" / "affaccio sul..."
   - "era presente anche..." / "un altro..."
   Ogni POI aggiuntivo DEVE avere evidence = citazione letterale dal fatto KB (10-25 parole).

   **Obiettivo finale**: il totale POI = numero_hints_planimetria + almeno 3-8 POI aggiuntivi da KB. Se gli hints sono 13, punta a 16-20 POI totali. NON accorpare hints redundanti: anche se "Fucileria" e "Mitragliatrice" sembrano simili, sono 2 POI distinti perché stanno in punti diversi della planimetria.

4) Ogni POI DEVE avere:
   - "name" pulito (3-4 parole max)
   - "description" sintesi di 2-3 frasi dalle fonti (non copia-incolla)
   - "zoneSuggested" = esatto "name" di una zona sopra
   - "minStaySeconds" stima sosta: passaggio 60-90s, osservazione 120-180s, punto focale 240-360s
   - "evidence" passaggio breve (10-25 parole) dalle fonti che giustifica questo POI. Senza evidence il POI NON va prodotto.

5) Italiano, risposta SOLO JSON con esattamente i campi mostrati. Niente markdown. Niente commenti fuori dal JSON.`;

    const client = buildClient(provider, apiKey);
    const completion = await client.chat.completions.create({
      model: modelFor(provider),
      temperature: 0.4,
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

    let parsed: {
      spatialMode?: string;
      spatialModeReason?: string;
      zones?: unknown[];
      pois?: unknown[];
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "Risposta LLM non valida." },
        { status: 502 },
      );
    }

    const allowedModes: SpatialMode[] = ["gps", "indoor", "hybrid"];
    const spatialMode: SpatialMode = allowedModes.includes(
      parsed.spatialMode as SpatialMode,
    )
      ? (parsed.spatialMode as SpatialMode)
      : "hybrid";

    const allowedFns: ZoneFunction[] = ["apertura", "sviluppo", "climax"];
    const zones = Array.isArray(parsed.zones)
      ? parsed.zones
          .map((z: unknown) => {
            if (!z || typeof z !== "object") return null;
            const o = z as {
              name?: unknown;
              narrativePromise?: unknown;
              function?: unknown;
              reasoning?: unknown;
            };
            const name = typeof o.name === "string" ? o.name.trim() : "";
            if (!name) return null;
            return {
              name,
              narrativePromise:
                typeof o.narrativePromise === "string"
                  ? o.narrativePromise.trim()
                  : "",
              function: allowedFns.includes(o.function as ZoneFunction)
                ? (o.function as ZoneFunction)
                : "sviluppo",
              reasoning:
                typeof o.reasoning === "string" ? o.reasoning.trim() : "",
            };
          })
          .filter((z): z is NonNullable<typeof z> => z !== null)
      : [];

    const pois = Array.isArray(parsed.pois)
      ? parsed.pois
          .map((p: unknown) => {
            if (!p || typeof p !== "object") return null;
            const o = p as {
              name?: unknown;
              description?: unknown;
              zoneSuggested?: unknown;
              minStaySeconds?: unknown;
              evidence?: unknown;
            };
            const name = typeof o.name === "string" ? o.name.trim() : "";
            if (!name) return null;
            const minStay =
              typeof o.minStaySeconds === "number"
                ? Math.max(30, Math.min(1800, Math.round(o.minStaySeconds)))
                : 120;
            return {
              name,
              description:
                typeof o.description === "string" ? o.description.trim() : "",
              zoneSuggested:
                typeof o.zoneSuggested === "string"
                  ? o.zoneSuggested.trim()
                  : "",
              minStaySeconds: minStay,
              evidence: typeof o.evidence === "string" ? o.evidence.trim() : "",
            };
          })
          .filter((p): p is NonNullable<typeof p> => p !== null)
      : [];

    return NextResponse.json({
      spatialMode,
      spatialModeReason:
        typeof parsed.spatialModeReason === "string"
          ? parsed.spatialModeReason
          : "",
      zones,
      pois,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "ai_failed", message: msg },
      { status: 500 },
    );
  }
}
