import { NextResponse } from "next/server";
import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { getTenantApiKey, type TenantApiProvider } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import OpenAI from "openai";

export const maxDuration = 60;

const SYSTEM_PROMPT = `Sei un editor strategico per audioguide AI di siti culturali.

Dato:
- Brief strategico del progetto (obiettivo, target, tono)
- Knowledge Base verificata (fatti classificati)
- Trascrizione intervista col cliente (se disponibile)

Produci una "Narrative Tension Map" che renda esplicito:

1. mustTell — storie obbligatorie identitarie del progetto (max 5-8)
   Per ognuna: titolo conciso, motivazione editoriale, IDs delle fonti che la supportano

2. niceToTell — elementi interessanti ma non portanti (max 8-12)
   Stessa struttura di mustTell

3. avoid — argomenti che il cliente non vuole o che rischiano fraintendimenti
   Per ognuno: topic, ragione (politica, sensibile, fuori scope, ecc.)

4. verify — claim promettenti ma ancora da confermare con fonti più solide
   Per ognuno: claim, source (fonte che l'ha generata), status: "pending"

5. tensions — conflitti reali fra cosa il cliente vuole spingere e cosa le fonti sostengono
   Per ognuno: clientWants (cosa il cliente vuole enfatizzare), sourcesSay (cosa le fonti effettivamente sostengono), recommendation (come bilanciarli editorialmente)

REGOLE FERREE:
- Ogni mustTell DEVE essere identitario, non opzionale
- AVOID copre argomenti TEMATICI da non trattare (es: "vita sentimentale del committente", "politica locale"), NON regole formali
- VERIFY è per claim che SUONANO bene ma che non hai conferma forte (es: cliente dice "la chiesa è del 1100" ma le fonti dicono "tra 1100 e 1300")
- TENSIONS si applicano quando cliente e fonti hanno priorità diverse — proponi sempre una recommendation editorialmente onesta

Output JSON:
{
  "mustTell": [{"title": "string", "why": "string", "sourceIds": ["fact_id"]}],
  "niceToTell": [{"title": "string", "why": "string", "sourceIds": []}],
  "avoid": [{"topic": "string", "reason": "string"}],
  "verify": [{"claim": "string", "source": "string", "status": "pending"}],
  "tensions": [{"clientWants": "string", "sourcesSay": "string", "recommendation": "string"}]
}

Restituisci SOLO il JSON, niente markdown, niente preambolo.`;

interface Body {
  projectId: string;
  kbFacts: Array<{ id: string; category: string; content: string; reliability: string }>;
  brief?: object;
  interviewTranscript?: string;
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
  if (!Array.isArray(body.kbFacts)) {
    return NextResponse.json({ error: "missing_kb_facts" }, { status: 400 });
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

  // Truncate KB to top 50 facts to keep prompt size reasonable
  const kbForPrompt = body.kbFacts.slice(0, 50);
  const interviewForPrompt = (body.interviewTranscript ?? "").slice(0, 5000);

  const userPrompt = `## Brief del progetto

${JSON.stringify(body.brief ?? {}, null, 2)}

## Knowledge Base (top 50 facts)

${kbForPrompt
  .map((f) => `[${f.id}] (${f.category}, affidabilità: ${f.reliability}) — ${f.content}`)
  .join("\n")}

${interviewForPrompt
  ? `## Trascrizione intervista (estratto)\n\n${interviewForPrompt}`
  : ""}

Produci la Narrative Tension Map secondo le regole.`;

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
      max_tokens: 6000,
      response_format: { type: "json_object" },
    });

    await logLlmCall({
      tenantId,
      projectId: body.projectId ?? null,
      operation: "propose-tension-map",
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
      // Validate shape
      const shape = ["mustTell", "niceToTell", "avoid", "verify", "tensions"];
      for (const k of shape) {
        if (!Array.isArray(parsed[k])) {
          return NextResponse.json(
            { error: "invalid_response_shape", missing: k, raw: parsed },
            { status: 500 },
          );
        }
      }
      return NextResponse.json(parsed);
    } catch (e) {
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
