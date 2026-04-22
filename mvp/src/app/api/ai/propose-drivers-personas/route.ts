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
    obiettivoCliente?: string;
    promessaNarrativa?: string;
    target?: string;
    tipoEsperienza?: string;
    tono?: string;
    mustTell?: string[];
    niceToTell?: string[];
    avoid?: string[];
    familyModeEnabled?: boolean;
  };
  facts?: {
    content: string;
    category: string;
    importance: string;
    reliability: string;
  }[];
  pois?: {
    id: string;
    name: string;
    description: string;
    zoneId?: string;
    type?: string;
  }[];
  zones?: { id: string; name: string; narrativePromise: string }[];
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

const SYSTEM = `Sei il progettista editoriale di Toolia Studio. Il tuo compito è definire il motore di personalizzazione del progetto: driver narrativi interni, personas realistiche, matrice di pesi driver×persona, lenti editoriali, regole di continuità narrativa, regole di dominanza, modello di inferenza del wizard visitatore, regole di attivazione family mode, modello dei segnali visitor-facing e regole di interazione del wizard.

Regole ferme:
- I driver non sono tag: sono leve narrative profonde che cambiano cosa e come raccontiamo.
- Le personas sono progetto-specifiche: emergono dal luogo, non da un catalogo universale. Non si mostrano mai al visitatore.
- Il visitatore interagisce solo con segnali semplici (passioni, modalità, durata, contesto, gruppo, obiettivi). La classificazione interna non è mai esposta.
- Family mode = modalità di fruizione, non persona separata.
- La personalizzazione decide l'accento; la composizione resta autoriale.`;

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
    const factsCapped = (body.facts ?? []).slice(0, 100);
    const pois = body.pois ?? [];
    const zones = body.zones ?? [];

    const factsBlock = factsCapped.length
      ? factsCapped
          .map((f) => `- [${f.category}] ${f.content}`)
          .join("\n")
          .slice(0, 8000)
      : "(nessun fatto KB)";

    const poisBlock = pois.length
      ? pois
          .slice(0, 25)
          .map(
            (p) =>
              `- ${p.name}${p.description ? ` — ${p.description.slice(0, 120)}` : ""}`,
          )
          .join("\n")
      : "(nessun POI)";

    const zonesBlock = zones.length
      ? zones
          .map(
            (z) =>
              `- ${z.name}${z.narrativePromise ? ` (${z.narrativePromise})` : ""}`,
          )
          .join("\n")
      : "(nessuna zona)";

    const briefBlock = `
- Obiettivo visitatore: ${brief.obiettivo ?? "—"}
- Obiettivo cliente: ${brief.obiettivoCliente ?? "—"}
- Promessa narrativa: ${brief.promessaNarrativa ?? "—"}
- Target: ${brief.target ?? "—"}
- Tipo esperienza: ${brief.tipoEsperienza ?? "—"}
- Tono: ${brief.tono ?? "—"}
- Must tell: ${(brief.mustTell ?? []).join(" · ") || "—"}
- Nice to tell: ${(brief.niceToTell ?? []).join(" · ") || "—"}
- Avoid: ${(brief.avoid ?? []).join(" · ") || "—"}
- Family mode richiesto: ${brief.familyModeEnabled ? "sì" : "no"}`.trim();

    const user = `Luogo: ${projectName}${type ? ` (${type})` : ""}${city ? ` — ${city}` : ""}

==========================================================
BRIEF EDITORIALE
==========================================================
${briefBlock}

==========================================================
POI del luogo (mappa logica)
==========================================================
${poisBlock}

==========================================================
ZONE narrative
==========================================================
${zonesBlock}

==========================================================
FATTI KB (campione pesato)
==========================================================
${factsBlock}

==========================================================
COMPITO
==========================================================

Produci TUTTI gli artefatti dello Step 3 in un JSON unico. Struttura obbligatoria:

{
  "drivers": [
    {
      "name": "...",
      "domain": "storia|arte|architettura|natura|produzione|tecnica|spiritualita|antropologia|...",
      "description": "2-3 frasi che spiegano il driver",
      "narrativeValue": "perché interessa un visitatore reale",
      "enabledContentTypes": ["scheda storica", "aneddoto", "confronto visivo", ...]
    }
  ],
  "personas": [
    {
      "name": "...",
      "motivation": "perché un profilo così viene a questo luogo",
      "payoff": "meraviglia|conoscenza|emozione|scoperta",
      "preferredDuration": "breve|media|lunga",
      "preferredExperience": ["contemplativo", "dinamico", ...],
      "validityNotes": "test validità: perché questa persona è plausibile qui e cosa cambia nel racconto",
      "suggestedDriverIndexes": [indice_driver, ...]
    }
  ],
  "matrix": [
    { "driverIndex": 0, "personaIndex": 0, "weight": 0-10 },
    ...
  ],
  "lenses": [
    {
      "name": "Nome lente (es. Storia per famiglia)",
      "personaIndex": 0,
      "primaryDriverIndex": 0,
      "secondaryDriverIndexes": [1, 3],
      "description": "come questa lente si esprime nelle schede"
    }
  ],
  "continuityRules": [
    {
      "type": "compatibility|anti-collage|dominance",
      "rule": "descrizione in linguaggio naturale"
    }
  ],
  "dominanceRules": {
    "maxSecondaryDrivers": 1-3,
    "minDominanceScore": 0-1,
    "blendThreshold": 0-1
  },
  "inferenceModel": {
    "passioneWeight": 0-1,
    "modalitaWeight": 0-1,
    "durataWeight": 0-1,
    "contestoWeight": 0-1,
    "gruppoWeight": 0-1,
    "obiettivoWeight": 0-1,
    "dominantThreshold": 0-1
  },
  "familyTriggerRules": {
    "enabled": true|false,
    "triggerSignals": ["gruppo:famiglia", "richiesta:gioco", ...],
    "triggerDescription": "quando e perché attivare il family mode per questo luogo"
  },
  "visitorSignalModel": {
    "passioni": ["passione contestuale al luogo", ...],
    "modalitaFruizione": ["rapido", "profondo", "essenziale", "ricco", "contemplativo", "dinamico"],
    "durataOptions": ["30 minuti", "1 ora", "2 ore o più"],
    "contestoOptions": ["visita singola", "evento", "gita scolastica", ...],
    "gruppoOptions": ["solo", "coppia", "famiglia", "amici", "scolaresca"],
    "obiettiviOptions": ["svago", "studio", "fotografia", ...]
  },
  "wizardInteractionRules": {
    "minSelectionsRequired": 2,
    "maxPointsTotal": 10,
    "maxPointsPerOption": 5,
    "forceRanking": true
  }
}

REGOLE DI QUALITÀ:

1) **Drivers**: 3-6. Devono essere leve profonde che generano angoli narrativi diversi (storia, identità, tecnica, sensorialità, collegamenti…). Non scrivere categorie generiche ("cultura", "arte"): ogni driver deve avere un taglio riconoscibile nel luogo specifico.

2) **Personas**: 3-5 personas. Ogni persona deve:
   - emergere dal luogo (non dal marketing generico)
   - essere plausibile (visitatori reali di quel tipo di sito)
   - produrre un'esperienza distinta (validityNotes deve spiegare come)
   - non sovrapporsi troppo ad altre personas
   - coprire range diversi di payoff e durata
   Il campo \`suggestedDriverIndexes\` è l'indice (0-based) dei driver sopra che sono dominanti per questa persona (1-3 driver ciascuna).

3) **matrix**: includi un peso (0-10) per OGNI coppia driverXpersona. 0 = irrilevante, 5 = neutro, 10 = dominante. La matrice deve essere coerente con suggestedDriverIndexes.

4) **lenses**: 4-8 lenti editoriali. Una lente = coppia persona+driver primario + driver secondari facoltativi. Scegli combinazioni realistiche: non tutte le persona×driver producono lenti utili.

5) **continuityRules**: 5-10 regole in lingua naturale. Mix di type:
   - "compatibility": quali driver/personas si mescolano bene
   - "anti-collage": combinazioni che producono visita frammentata
   - "dominance": come scegliere la dominante in profili misti

6) **dominanceRules**: parametri numerici realistici per il motore.

7) **inferenceModel**: i sei pesi (passione/modalità/durata/contesto/gruppo/obiettivo) DEVONO sommare a circa 1.0. Bilancia in base a cosa conta di più per questo luogo: per un museo storico la passione pesa di più; per un parco all'aperto la modalità/gruppo; per uno spazio ibrido equilibra.

8) **familyTriggerRules**: se il brief chiede family mode o se il luogo è naturalmente adatto a famiglie, attiva. triggerSignals sono chiavi:valori ("gruppo:famiglia", "eta:bambini", "richiesta:gioco").

9) **visitorSignalModel**: "passioni" DEVE essere contestuale al luogo (non universale). Es. per un forte militare: "storia militare", "tecnica costruttiva", "paesaggio e strategia", "memoria locale". Le altre liste sono standard (modalità/durata/contesto/gruppo/obiettivi).

10) **wizardInteractionRules**: parametri che evitano profili piatti.

Risposta solo JSON, italiano, niente markdown fuori JSON.`;

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

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "Risposta LLM non valida." },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "ai_failed", message: msg },
      { status: 500 },
    );
  }
}
