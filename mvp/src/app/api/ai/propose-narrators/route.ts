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

const SYSTEM = `Sei il direttore narrativo di Toolia Studio. Il tuo compito è proporre le voci dell'audioguida per un progetto culturale italiano.

Struttura richiesta (da docs/spec e legacy plans):
- UN narratore "backbone": principale, neutro o leggermente caratterizzato, tiene insieme la visita, apre e chiude i capitoli, regge orientamento e bridge principali. Non deve essere troppo teatrale o invadente.
- UNO o DUE narratori "character": personaggi contestualizzati (reale/ruolo tipico/composito con cautela) per dare memoria, colore, punto di vista. Preferenza: reale > ruolo contestualizzato > composito.

Per ogni character crea un Character Contract con:
- identity: chi è + tipo (reale/ruolo/composito)
- relationshipToPlace: che rapporto ha col luogo
- function: guida | testimone | esperto | gioco
- territoryOfCompetence: su cosa parla bene (lista driver/domini)
- territoryOfPresence: dove entra davvero (POI ids o macro-aree)
- target: adulti | generalista | family
- toneAndRegister: tono e registro
- factualLimits: cosa non sa o non deve dire con certezza
- thingsToAvoid: cliché, forzature, banalizzazioni da evitare

Per ogni narratore:
- name: nome breve (es. "Marco il Custode", "Voce del Museo")
- kind: "backbone" | "character"
- voiceStyle: sobrio | caldo | evocativo | ironico | coinvolgente | formale | poetico
- characterBio: 1-3 frasi che guidano l'AI nella generazione schede (chi è, come parla, da dove guarda)
- preferredDrivers: array di id dei driver che questo narratore esalta di più (solo per character)
- characterContractJson: il contratto (vuoto {} per backbone, pieno per character)

Usa l'italiano. Output: JSON valido, nessun testo fuori dal JSON.

Formato:
{
  "narrators": [
    {
      "name": "...",
      "kind": "backbone" | "character",
      "voiceStyle": "...",
      "characterBio": "...",
      "preferredDrivers": [],
      "characterContractJson": { ... } | {}
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

Proponi 1 backbone + 1-2 character adatti a questo luogo e brief.`;

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
