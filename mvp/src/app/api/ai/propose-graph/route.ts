import { NextResponse } from "next/server";
import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { getTenantApiKey, type TenantApiProvider } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import OpenAI from "openai";

export const maxDuration = 120;

const SYSTEM_PROMPT = `Sei un planner di percorsi per audioguide AI di siti culturali.

Dato un set di POI (con coordinate planimetria normalizzate 0-1 oppure lat/lng) e una descrizione del luogo, identifica:

NODI TOPOLOGICI: punti di controllo del movimento. 4 tipi:
- "accesso" — ingressi e uscite del sito
- "bivio" — punti dove i percorsi si dividono
- "transizione" — passaggi fra zone narrative diverse
- "rientro" — punti dove un percorso ramificato torna sul backbone principale

SEGMENTI: collegamenti fra nodi. 4 tipi:
- "passaggio" — tratto lineare standard
- "ramo" — deviazione opzionale
- "loop" — anello che torna al punto di partenza
- "connessione" — collegamento fra zone distanti

REGOLE FERREE:
- NON inventare connessioni implausibili dato il layout
- Privilegia la verità fisica del luogo sulla narrazione
- POI possono coincidere con un nodo (assegnando POI.nodeId nel frontend) oppure vivere lungo un segmento (Segment.poiIds)
- Tempo di percorrenza in secondi: stima realistica (~60-180s per segmento interno, 120-600s per segmento esterno)
- Segmenti bidirezionali di default; esplicita bidirectional:false solo se uni-direzionale (es. scale a senso unico)
- Coordinate dei nodi: usa lo stesso sistema dei POI (lat/lng se outdoor, planimetriaX/Y normalizzati 0-1 se indoor)

Output JSON con tempId interni (poi mappati nel frontend):
{
  "nodes": [
    {
      "tempId": "n1",
      "kind": "accesso",
      "lat": null,
      "lng": null,
      "planimetriaX": 0.1,
      "planimetriaY": 0.5,
      "label": "Ingresso principale",
      "orderIndex": 0
    }
  ],
  "segments": [
    {
      "tempId": "s1",
      "fromTempId": "n1",
      "toTempId": "n2",
      "kind": "passaggio",
      "traversalSec": 60,
      "detourCost": 0,
      "poiIds": ["poi_id_1"],
      "bidirectional": true,
      "label": "Atrio → Sala armi"
    }
  ]
}

Restituisci SOLO il JSON, niente markdown, niente commenti, niente preambolo.`;

interface PoiData {
  id: string;
  name: string;
  planimetriaX?: number | null;
  planimetriaY?: number | null;
  lat?: number | null;
  lng?: number | null;
}

interface Body {
  projectId: string;
  poiIds?: string[];
  poisData: PoiData[];
  description?: string;
  provider?: TenantApiProvider;
  apiKey?: string;
}

export async function POST(req: Request) {
  let tenantId: string;
  try {
    const user = await getSessionUser();
    tenantId = user.tenantId;
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }

  const body: Body = await req.json();
  if (!Array.isArray(body.poisData) || body.poisData.length === 0) {
    return NextResponse.json({ error: "missing_pois" }, { status: 400 });
  }

  const provider = (body.provider ?? "openai") as TenantApiProvider;
  const serverKey = await getTenantApiKey(tenantId, provider);
  const apiKey = serverKey ?? body.apiKey;
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_api_key", message: `Nessuna chiave configurata per ${provider}` },
      { status: 400 },
    );
  }

  const userPrompt = `POI del progetto (id, nome, posizione):
${body.poisData.map((p) => {
  const planim =
    p.planimetriaX != null && p.planimetriaY != null
      ? `planim: ${p.planimetriaX.toFixed(3)},${p.planimetriaY.toFixed(3)}`
      : "planim: -";
  const gps =
    p.lat != null && p.lng != null
      ? `GPS: ${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
      : "GPS: -";
  return `- ${p.id} "${p.name}" — ${planim} — ${gps}`;
}).join("\n")}

${body.description ? `\nDescrizione del luogo:\n${body.description}` : ""}

Proponi il grafo di nodi e segmenti per la navigazione del visitatore.`;

  const client = new OpenAI({ apiKey });
  const model = "gpt-4o";

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: "json_object" },
    });

    await logLlmCall({
      tenantId,
      projectId: body.projectId ?? null,
      operation: "propose-graph",
      provider: "openai",
      model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "no_response" }, { status: 500 });
    }

    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.segments)) {
        return NextResponse.json(
          { error: "invalid_response_shape", received: parsed },
          { status: 500 },
        );
      }
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json(
        { error: "invalid_json", raw: content },
        { status: 500 },
      );
    }
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "llm_error", message: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
