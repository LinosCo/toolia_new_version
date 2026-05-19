import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { getTenantApiKey, type TenantApiProvider } from "@/lib/tenant-keys";

type Provider = "kimi" | "openai";

interface PoiInput {
  id: string;
  name: string;
  description: string;
  relatedFacts: string[]; // primi 3-5 KBFact content associati via poiRef
}

const SYSTEM = `Sei un curatore di audioguide culturali. Ricevi una lista di POI di un luogo e proponi 3-5 ZONE narrative che raggruppino logicamente i POI. Ogni zona deve avere:
- un nome evocativo ma chiaro
- una promessa narrativa (cosa il visitatore scopre in quella zona)
- una funzione narrativa: "apertura" (inizio), "sviluppo" (sviluppo centrale), "climax" (momento più forte), "chiusura" (chiusura)

Le zone sono raggruppamenti narrativi, non geografici rigidi. Più POI possono essere nella stessa zona.`;

const USER = (
  projectName: string,
  type: string | undefined,
  pois: PoiInput[],
) =>
  `Progetto: ${projectName}${type ? ` (${type})` : ""}

POI disponibili:
${pois
  .map(
    (p, i) =>
      `${i + 1}. id=${p.id} · "${p.name}" — ${p.description.slice(0, 200)}${
        p.relatedFacts.length
          ? `\n   Fatti rilevanti: ${p.relatedFacts.slice(0, 3).join(" · ")}`
          : ""
      }`,
  )
  .join("\n")}

Proponi 3-5 zone narrative che coprano tutti i POI. Ogni POI va assegnato a UNA sola zona.

Rispondi in JSON:
{
  "zones": [
    {
      "name": "nome zona",
      "narrativePromise": "cosa si scopre in questa zona (1 frase)",
      "function": "apertura" | "sviluppo" | "climax" | "chiusura",
      "poiIds": ["id1", "id2", ...]
    }
  ]
}

Regole:
- Almeno UNA zona "apertura" (inizio visita, punti di ingresso/orientamento)
- Almeno UNA zona "climax" (i punti più forti del progetto)
- Ogni POI in una sola zona. Tutti i POI coperti.`;

function buildClient(provider: Provider, apiKey: string): OpenAI {
  if (provider === "kimi") {
    return new OpenAI({ apiKey, baseURL: "https://api.moonshot.ai/v1" });
  }
  return new OpenAI({ apiKey });
}

function modelFor(provider: Provider): string {
  return provider === "kimi" ? "moonshot-v1-128k" : "gpt-4o-mini";
}

export async function POST(req: NextRequest) {
  // Auth + tenant resolution
  let tenantId: string;
  try {
    const user = await getSessionUser();
    tenantId = user.tenantId;
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }

  try {
    const body = await req.json();
    const {
      apiKey: bodyApiKey,
      provider,
      projectName,
      type,
      pois,
    }: {
      apiKey?: string;
      provider?: Provider;
      projectName?: string;
      type?: string;
      pois?: PoiInput[];
    } = body;

    if (!provider) {
      return NextResponse.json(
        {
          error: "missing_api_key",
          message: "Configura una chiave LLM in Impostazioni.",
        },
        { status: 400 },
      );
    }
    if (!projectName || !Array.isArray(pois) || pois.length < 2) {
      return NextResponse.json(
        {
          error: "not_enough_pois",
          message: "Servono almeno 2 POI per proporre zone.",
        },
        { status: 400 },
      );
    }

    // Priority: server key > body key (transitional fallback)
    const serverKey = await getTenantApiKey(tenantId, provider as TenantApiProvider);
    const apiKey = serverKey ?? bodyApiKey;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "missing_api_key",
          message: `Nessuna chiave configurata per ${provider}`,
        },
        { status: 400 },
      );
    }

    const client = buildClient(provider, apiKey);
    const completion = await client.chat.completions.create({
      model: modelFor(provider),
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: USER(projectName, type, pois) },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }
    const parsed = JSON.parse(raw);

    const allowedFn = new Set(["apertura", "sviluppo", "climax", "chiusura"]);
    const poiIds = new Set(pois.map((p) => p.id));

    const zones = Array.isArray(parsed.zones)
      ? parsed.zones
          .map(
            (z: {
              name?: string;
              narrativePromise?: string;
              function?: string;
              poiIds?: unknown[];
            }) => {
              const name = typeof z.name === "string" ? z.name.trim() : "";
              if (!name) return null;
              return {
                name,
                narrativePromise:
                  typeof z.narrativePromise === "string"
                    ? z.narrativePromise.trim()
                    : "",
                function: allowedFn.has(z.function as string)
                  ? (z.function as string)
                  : "sviluppo",
                poiIds: Array.isArray(z.poiIds)
                  ? (z.poiIds as unknown[])
                      .filter(
                        (x): x is string =>
                          typeof x === "string" && poiIds.has(x),
                      )
                      .slice(0, 30)
                  : [],
              };
            },
          )
          .filter(Boolean)
      : [];

    return NextResponse.json({ zones });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "ai_failed", message: msg },
      { status: 500 },
    );
  }
}
