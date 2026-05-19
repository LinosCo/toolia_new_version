import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { getTenantApiKey } from "@/lib/tenant-keys";
import OpenAI from "openai";

export const maxDuration = 300; // 5 min per batch grandi

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface BulkRequestBody {
  poiIds: string[];
  narratorIds: string[];
  language?: string;
  skipExistingSemantic?: boolean;
  skipExistingSchede?: boolean;
}

// ─── Concurrency helper ───────────────────────────────────────────────────────

async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  const running = new Set<Promise<void>>();
  for (const task of tasks) {
    const p = task().then((r) => {
      results.push(r);
    });
    const tracked = p.finally(() => running.delete(tracked));
    running.add(tracked);
    if (running.size >= concurrency) {
      await Promise.race(running);
    }
  }
  await Promise.all(running);
  return results;
}

// ─── LLM helpers (same logic as individual routes) ───────────────────────────

type Provider = "kimi" | "openai";

function buildOpenAIClient(provider: Provider, apiKey: string): OpenAI {
  if (provider === "kimi") {
    return new OpenAI({ apiKey, baseURL: "https://api.moonshot.ai/v1" });
  }
  return new OpenAI({ apiKey });
}

function modelFor(provider: Provider): string {
  return provider === "kimi" ? "moonshot-v1-128k" : "gpt-4o";
}

// ─── System prompts (copie dai route AI per evitare fetch interno) ────────────

const SYSTEM_SEMANTIC_BASE = `Sei il redattore editoriale di Toolia Studio. Produci la BASE DI SIGNIFICATO (semantic content base) per un POI di un progetto culturale italiano.

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

const SYSTEM_SCHEDA = `Sei lo scrittore delle schede audio di Toolia Studio. Genera il TESTO PARLATO per una singola scheda di audioguida italiana a partire da:
- la base di significato del POI (source of truth editoriale)
- il profilo del narratore (voce principale o personaggio)
- il brief editoriale del progetto

Regole di scrittura:
- Italiano parlato, fluente e naturale (non scritto accademico).
- Usa il tono e registro del narratore. Se è un personaggio, parla come quel personaggio (prima persona quando coerente).
- Resta dentro la base di significato: non inventare fatti. Gli "angoli narrativi" sono scegliibili ma i fatti devono venire da verifiedFacts.
- Lunghezza: proporzionale al minStaySeconds del POI (150 parole/minuto come riferimento). Default 60-90 secondi se non specificato.
- Non leggere titoli né fare appelli al "visitatore" diretti ("oggi vi racconto", "benvenuti") a meno che sia un'apertura di percorso.
- Niente suggerimenti visivi ridondanti ("qui davanti a voi", "guardate"): usali solo quando aggiungono valore.
- Rispetta keyMessages, mustTell, evita avoid, mantieni editorialWarnings.
- Chiudi in modo che suoni naturale alla fine (non cliffhanger artificiali).

Output: SOLO JSON valido. Nessun testo fuori.

Formato:
{
  "title": "titolo breve evocativo",
  "scriptText": "testo narrativo unico, italiano parlato"
}`;

// ─── Conteggio parole → secondi ───────────────────────────────────────────────

function wordsToSeconds(text: string, wpm = 150): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((words / wpm) * 60);
}

// ─── Tipi briefContext ────────────────────────────────────────────────────────

interface BriefContext {
  obiettivo?: string;
  promessaNarrativa?: string;
  tono?: string;
  tipoEsperienza?: string;
  mustTell?: string[];
  avoid?: string[];
  verify?: string[];
  visitorQuestions?: {
    pratiche?: string[];
    curiosita?: string[];
    approfondimento?: string[];
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);

    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
      select: { id: true, name: true },
    });
    if (!project) {
      return new Response("Not found", { status: 404 });
    }

    const body: BulkRequestBody = await req.json();
    const language = body.language ?? "it";
    const skipExistingSemantic = body.skipExistingSemantic ?? true;
    const skipExistingSchede = body.skipExistingSchede ?? true;

    if (!body.poiIds?.length || !body.narratorIds?.length) {
      return new Response(
        JSON.stringify({ error: "missing_ids" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Risolvi il provider — prova openai, poi kimi
    let provider: Provider | null = null;
    let apiKey: string | null = null;
    for (const p of ["openai", "kimi"] as Provider[]) {
      const k = await getTenantApiKey(user.tenantId, p);
      if (k) { provider = p; apiKey = k; break; }
    }
    if (!provider || !apiKey) {
      return new Response(
        JSON.stringify({ error: "missing_api_key" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const llmProvider: Provider = provider;
    const llmKey: string = apiKey;

    // Carica tutto il contesto del progetto in una volta
    const [
      poisRaw,
      narratorsRaw,
      kbFactsRaw,
      briefRow,
      driversRaw,
    ] = await Promise.all([
      prisma.pOI.findMany({
        where: { projectId: id, id: { in: body.poiIds } },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          zoneId: true,
          minStaySeconds: true,
          semanticBaseJson: true,
          zone: { select: { name: true, function: true } },
        },
      }),
      prisma.narratorProfile.findMany({
        where: { projectId: id, id: { in: body.narratorIds } },
        select: {
          id: true,
          name: true,
          kind: true,
          voiceStyle: true,
          characterBio: true,
          characterContractJson: true,
        },
      }),
      prisma.kBFact.findMany({
        where: { projectId: id, approved: true },
        select: {
          content: true,
          category: true,
          importance: true,
          reliability: true,
          poiRef: true,
        },
        take: 60,
      }),
      prisma.brief.findFirst({
        where: { projectId: id },
        select: { contenutoJson: true },
      }),
      prisma.driver.findMany({
        where: { projectId: id },
        select: { id: true, name: true, domain: true },
        take: 15,
      }),
    ]);

    const briefCtx = (briefRow?.contenutoJson ?? {}) as BriefContext;
    const kbFacts = kbFactsRaw.map((f) => ({
      content: f.content,
      category: f.category as string,
      importance: f.importance as string,
      reliability: f.reliability as string,
      poiRef: f.poiRef ?? null,
    }));

    const client = buildOpenAIClient(llmProvider, llmKey);
    const model = modelFor(llmProvider);

    // SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: object) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
            );
          } catch {
            // controller già chiuso
          }
        };

        let errorCount = 0;

        try {
          // ── FASE 1: Basi semantiche ──────────────────────────────────────

          const poisNeedingSemantic = poisRaw.filter((poi) => {
            if (!skipExistingSemantic) return true;
            const sb = poi.semanticBaseJson as Record<string, unknown> | null;
            return !sb || Object.keys(sb).length === 0;
          });

          const semanticTotal = poisNeedingSemantic.length;
          let semanticCompleted = 0;

          send({
            type: "started",
            totalSteps: semanticTotal + body.poiIds.length * body.narratorIds.length,
          });

          // Mappa in-memory delle basi (include anche quelle già esistenti)
          const semanticBaseMap = new Map<string, Record<string, unknown>>();
          for (const poi of poisRaw) {
            const sb = poi.semanticBaseJson as Record<string, unknown> | null;
            if (sb && Object.keys(sb).length > 0) {
              semanticBaseMap.set(poi.id, sb);
            }
          }

          const semanticTasks = poisNeedingSemantic.map((poi) => async () => {
            try {
              const userPrompt = `Progetto: ${project.name}

POI:
- [${poi.id}] ${poi.name} (${poi.type})${poi.zone ? ` · zona ${poi.zone.name} (${poi.zone.function ?? ""})` : ""}
- Descrizione: ${poi.description ?? "—"}

BRIEF:
- Obiettivo: ${briefCtx.obiettivo ?? "—"}
- Promessa: ${briefCtx.promessaNarrativa ?? "—"}
- Tipo esperienza: ${briefCtx.tipoEsperienza ?? "—"}
- Tono: ${briefCtx.tono ?? "—"}
${briefCtx.mustTell?.length ? `- Must tell: ${briefCtx.mustTell.join(" / ")}` : ""}
${briefCtx.avoid?.length ? `- Avoid: ${briefCtx.avoid.join(" / ")}` : ""}
${briefCtx.verify?.length ? `- Verify: ${briefCtx.verify.join(" / ")}` : ""}

DRIVER (${driversRaw.length}):
${driversRaw.map((d) => `- ${d.name} (${d.domain})`).join("\n")}

FATTI KB (${kbFacts.length}, rilevanti per questo POI e generali):
${kbFacts.map((f) => `- [${f.category}·${f.importance}·${f.reliability}] ${f.content}`).join("\n")}

DOMANDE VISITATORE PREVISTE:
${[
  ...(briefCtx.visitorQuestions?.pratiche ?? []),
  ...(briefCtx.visitorQuestions?.curiosita ?? []),
  ...(briefCtx.visitorQuestions?.approfondimento ?? []),
]
  .map((q) => `- ${q}`)
  .join("\n") || "—"}

Genera la base di significato per questo POI.`;

              const completion = await client.chat.completions.create({
                model,
                messages: [
                  { role: "system", content: SYSTEM_SEMANTIC_BASE },
                  { role: "user", content: userPrompt },
                ],
                response_format: { type: "json_object" },
                temperature: 0.5,
              });

              const raw = completion.choices[0]?.message?.content ?? "{}";
              const parsed = JSON.parse(raw) as Record<string, unknown>;

              // Persisti (cast ad object per compatibilità con Prisma InputJsonValue)
              await prisma.pOI.update({
                where: { id: poi.id },
                data: { semanticBaseJson: parsed as object },
              });

              semanticBaseMap.set(poi.id, parsed);
            } catch (e) {
              errorCount++;
              send({
                type: "error",
                step: "semantic_base",
                poiId: poi.id,
                error: String(e),
              });
            } finally {
              semanticCompleted++;
              send({
                type: "progress",
                step: "semantic_base",
                poiId: poi.id,
                completed: semanticCompleted,
                total: semanticTotal,
              });
            }
          });

          await withConcurrency(semanticTasks, 5);

          // ── FASE 2: Schede ───────────────────────────────────────────────

          const schedaTotal = body.poiIds.length * body.narratorIds.length;
          let schedaCompleted = 0;

          const schedaTasks: Array<() => Promise<void>> = [];

          for (const poi of poisRaw) {
            const semanticBase = semanticBaseMap.get(poi.id);
            if (!semanticBase || Object.keys(semanticBase).length === 0) {
              // Salta: niente base → incrementa contatori silenziosamente
              for (let _i = 0; _i < body.narratorIds.length; _i++) {
                schedaTasks.push(async () => {
                  schedaCompleted++;
                  send({
                    type: "progress",
                    step: "scheda",
                    poiId: poi.id,
                    completed: schedaCompleted,
                    total: schedaTotal,
                  });
                });
              }
              continue;
            }

            for (const narratorId of body.narratorIds) {
              const capturedPoiId = poi.id;
              const capturedNarratorId = narratorId;

              schedaTasks.push(async () => {
                try {
                  if (skipExistingSchede) {
                    const existing = await prisma.scheda.findFirst({
                      where: {
                        poiId: capturedPoiId,
                        narratorId: capturedNarratorId,
                        language,
                        projectId: id,
                      },
                      select: { id: true },
                    });
                    if (existing) return;
                  }

                  const narrator = narratorsRaw.find(
                    (n) => n.id === capturedNarratorId,
                  );
                  if (!narrator) return;

                  const durationTarget = poi.minStaySeconds ?? 75;

                  const userPrompt = `Progetto: ${project.name} · lingua: ${language}

POI: ${poi.name}${poi.description ? ` — ${poi.description}` : ""}
Durata target: ~${durationTarget} secondi.

NARRATORE: ${narrator.name} (${narrator.kind}) · stile ${narrator.voiceStyle}
${narrator.characterBio ? `Bio: ${narrator.characterBio}` : ""}
${
  narrator.characterContractJson &&
  Object.keys(narrator.characterContractJson as Record<string, unknown>).length
    ? `Contract: ${JSON.stringify(narrator.characterContractJson)}`
    : ""
}

BRIEF:
- Obiettivo: ${briefCtx.obiettivo ?? "—"}
- Promessa: ${briefCtx.promessaNarrativa ?? "—"}
- Tono generale: ${briefCtx.tono ?? "—"}
- Tipo esperienza: ${briefCtx.tipoEsperienza ?? "—"}
${briefCtx.mustTell?.length ? `- Must tell: ${briefCtx.mustTell.join(" / ")}` : ""}
${briefCtx.avoid?.length ? `- Avoid: ${briefCtx.avoid.join(" / ")}` : ""}

BASE DI SIGNIFICATO (source of truth):
${JSON.stringify(semanticBase, null, 2)}

Scrivi title + scriptText.`;

                  const completion = await client.chat.completions.create({
                    model,
                    messages: [
                      { role: "system", content: SYSTEM_SCHEDA },
                      { role: "user", content: userPrompt },
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.7,
                  });

                  const raw = completion.choices[0]?.message?.content ?? "{}";
                  const parsed = JSON.parse(raw) as {
                    title?: string;
                    scriptText?: string;
                  };
                  const title = parsed.title ?? "";
                  const scriptText = parsed.scriptText ?? "";

                  // Persisti scheda — ignora se già esiste (P2002 unique constraint)
                  await prisma.scheda
                    .create({
                      data: {
                        projectId: id,
                        poiId: capturedPoiId,
                        narratorId: capturedNarratorId,
                        language,
                        title,
                        scriptText,
                        durationEstimateSeconds: wordsToSeconds(scriptText),
                        semanticBaseJson: semanticBase as object,
                        status: "draft",
                        version: 1,
                      },
                    })
                    .catch((e: { code?: string }) => {
                      if (e?.code === "P2002") return null; // già esiste
                      throw e;
                    });
                } catch (e) {
                  errorCount++;
                  send({
                    type: "error",
                    step: "scheda",
                    poiId: capturedPoiId,
                    narratorId: capturedNarratorId,
                    error: String(e),
                  });
                } finally {
                  schedaCompleted++;
                  send({
                    type: "progress",
                    step: "scheda",
                    poiId: capturedPoiId,
                    narratorId: capturedNarratorId,
                    completed: schedaCompleted,
                    total: schedaTotal,
                  });
                }
              });
            }
          }

          await withConcurrency(schedaTasks, 5);

          send({
            type: "done",
            semanticBaseCount: semanticCompleted,
            schedaCount: schedaCompleted,
            errors: errorCount,
          });
        } catch (e) {
          errorCount++;
          send({ type: "error", step: "fatal", error: String(e) });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
