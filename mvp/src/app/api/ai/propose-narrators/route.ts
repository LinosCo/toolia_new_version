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
    mustTell?: string[];
    avoid?: string[];
    familyModeEnabled?: boolean;
  };
  drivers?: { id: string; name: string; domain: string; description: string }[];
  personas?: {
    id: string;
    name: string;
    motivation: string;
    payoff: string;
  }[];
  pois?: { id: string; name: string; description: string }[];
  voices?: {
    voice_id: string;
    name: string;
    gender?: string;
    age?: string;
    accent?: string;
    description?: string;
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

const SYSTEM = `Sei il direttore narrativo di Toolia Studio. Il tuo compito è proporre le voci dell'audioguida per un progetto culturale italiano, RIEMPIENDO OGNI CAMPO. L'operatore non compila manualmente: tu fai tutto il lavoro editoriale.

Struttura richiesta (da docs/spec e legacy plans):
- UN narratore "backbone": principale, neutro o leggermente caratterizzato, tiene insieme la visita, apre e chiude i capitoli, regge orientamento e bridge principali. Non troppo teatrale o invadente.
- UNO o DUE narratori "character": personaggi contestualizzati (reale/ruolo tipico/composito con cautela) per dare memoria, colore, punto di vista. Preferenza: reale > ruolo contestualizzato > composito.

OGNI narratore DEVE avere:
- name: nome breve e memorabile (es. "Marco il Custode", "Voce del Museo")
- kind: "backbone" | "character"
- voiceStyle: UNO tra sobrio-autorevole | coinvolgente | caldo | evocativo | ironico | formale | poetico
- characterBio: 2-4 frasi in italiano. Chi è, come parla, da dove guarda, il suo angolo preferito. Guida l'AI nella generazione schede.
- preferredDrivers: array di driver ID (dall'elenco DRIVER che ti do) su cui questo narratore esalta di più. MINIMO 1, MASSIMO 3. USA ESATTAMENTE GLI ID che trovi in [...]. Il backbone prende i driver più centrali del progetto; i character si specializzano sui driver che gli calzano.
- voiceId: ID ESATTO di una voce dall'elenco VOCI DISPONIBILI che ti fornisco. Scegli in base a: tono narratore (caldo/sobrio/ironico/evocativo), genere coerente con la bio (uomo/donna), età, accento italiano quando possibile. Se non ci sono voci italiane usa "multilingual" o neutra. Voci diverse per narratori diversi (backbone e character non devono avere la stessa).
- voiceModel: sempre "elevenlabs" se assegni un voiceId
- characterContractJson: oggetto JSON. Per il BACKBONE riempi almeno {toneAndRegister, factualLimits, thingsToAvoid}. Per i CHARACTER riempi TUTTI i campi sotto.

Character Contract completo (per kind=character):
{
  "identity": "chi è + tipo (reale/ruolo contestualizzato/composito)",
  "function": "guida" | "testimone" | "esperto" | "gioco",
  "relationshipToPlace": "che rapporto ha col luogo",
  "territoryOfCompetence": "su cosa parla bene (domini e temi)",
  "territoryOfPresence": ["poi_id_1", "poi_id_2"],
  "target": "adulti" | "generalista" | "family",
  "toneAndRegister": "tono e registro concreti",
  "factualLimits": "cosa non sa o non deve dire con certezza",
  "thingsToAvoid": "cliché, forzature, banalizzazioni da evitare"
}

Per territoryOfPresence USA ESATTAMENTE gli ID POI che trovi nell'elenco POI. Se il personaggio vive/lavora ovunque, includi un sottoinsieme coerente (non vuoto). Se non hai info sufficienti, lista i primi 3 POI più rilevanti al suo ruolo.

Usa l'italiano. Output: SOLO JSON valido, nessun testo fuori dal JSON.

Formato ESATTO:
{
  "narrators": [
    {
      "name": "...",
      "kind": "backbone" | "character",
      "voiceStyle": "...",
      "characterBio": "...",
      "preferredDrivers": ["driver_id_1", "driver_id_2"],
      "voiceId": "elevenlabs_voice_id",
      "voiceModel": "elevenlabs",
      "characterContractJson": { ... }
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
    const personas = (body.personas ?? []).slice(0, 10);
    const pois = (body.pois ?? []).slice(0, 30);
    const voices = (body.voices ?? []).slice(0, 40);

    const user = `Progetto: ${projectName}${type ? ` · tipo ${type}` : ""}${
      city ? ` · ${city}` : ""
    }

BRIEF
- Obiettivo: ${brief.obiettivo ?? "—"}
- Promessa: ${brief.promessaNarrativa ?? "—"}
- Target: ${brief.target ?? "—"}
- Tipo esperienza: ${brief.tipoEsperienza ?? "—"}
- Tono: ${brief.tono ?? "—"}
${brief.mustTell?.length ? `- Must tell: ${brief.mustTell.join(" / ")}` : ""}
${brief.avoid?.length ? `- Avoid: ${brief.avoid.join(" / ")}` : ""}
${brief.familyModeEnabled ? "- Family mode: ATTIVO — considera un narratore kids-friendly o personaggio ricorrente family" : ""}

DRIVER (${drivers.length})
${drivers.map((d) => `- [${d.id}] ${d.name} (${d.domain}): ${d.description}`).join("\n")}

PERSONAS (${personas.length})
${personas.map((p) => `- ${p.name} → ${p.payoff}: ${p.motivation}`).join("\n")}

POI (${pois.length}, campione):
${pois
  .slice(0, 10)
  .map((p) => `- [${p.id}] ${p.name}: ${p.description}`)
  .join("\n")}

VOCI DISPONIBILI (${voices.length}) — scegli voiceId ESATTAMENTE da questa lista:
${voices.map((v) => `- ${v.voice_id} · ${v.name}${v.gender ? ` · ${v.gender}` : ""}${v.age ? ` · ${v.age}` : ""}${v.accent ? ` · ${v.accent}` : ""}${v.description ? ` · ${v.description}` : ""}`).join("\n")}

Proponi 1 backbone + 1-2 character adatti a questo luogo e brief. Per ogni narratore ASSEGNA una voiceId dall'elenco sopra, coerente con la bio e il genere. Narratori diversi → voci diverse.`;

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
    let parsed: { narrators?: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "L'AI ha prodotto JSON non valido." },
        { status: 502 },
      );
    }

    const narrators = Array.isArray(parsed.narrators) ? parsed.narrators : [];
    return NextResponse.json({ narrators });
  } catch (err) {
    console.error("[api propose-narrators]", err);
    return NextResponse.json(
      {
        error: "internal",
        message:
          err instanceof Error ? err.message : "Errore generazione narratori",
      },
      { status: 500 },
    );
  }
}
