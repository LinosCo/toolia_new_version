import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/* ============================================================
   PASS 1 — Descrizione generale del disegno
   ============================================================ */

const DESCRIPTION_PROMPT = `Sei un analista spaziale. Ti viene fornita una planimetria, mappa, floorplan, ortofoto o disegno di un sito culturale.

Genera una descrizione testuale RICCA del disegno (150-400 parole). Includi:
- tipo di disegno (planimetria, mappa, ortofoto, schema)
- orientamento, rosa dei venti, scala se visibili
- ambienti principali osservabili nel disegno
- percorsi, frecce, accessi, barriere
- simboli e loro significato

NON enumerare la legenda. NON trascrivere la lista dei punti numerati. Descrivi il disegno in prosa generica.

Rispondi esclusivamente in JSON:
{ "description": "..." }

Se l'immagine non è leggibile: { "description": "Immagine non riconoscibile come planimetria o mappa." }`;

/* ============================================================
   PASS 2 — Estrazione esaustiva di OGNI punto della legenda
   ============================================================ */

const LEGEND_PROMPT = `Sei un OCR esperto. Ti viene fornita una planimetria/mappa di un sito culturale che contiene una LEGENDA con punti numerati.

La legenda può trovarsi:
- nel margine sinistro
- nel margine destro
- in basso
- su più colonne

Il formato tipico è:
"01 - Fossato   Descrizione del fossato..."
"1. Torre   Descrizione della torre..."
"#5 Sala delle Armi: testo..."

COMPITO: trascrivere OGNI voce della legenda. Se vedi N numeri, produci ESATTAMENTE N oggetti nell'array. Non raggruppare, non sintetizzare, non saltare.

Per OGNI voce:
- "number": il numero originale (intero)
- "name": il nome del punto, PULITO. Togli prefissi numerici ("01 - Fossato" → "Fossato"). Togli trattini/puntini iniziali.
- "description": il TESTO COMPLETO della descrizione associata, trascritto LETTERALMENTE, senza abbreviare. Se non c'è testo descrittivo, stringa vuota. MAI inventare.

Se non ci sono numeri MA ci sono etichette testuali su ambienti (es. "Sala delle Armi" scritto direttamente sulla mappa), elenca quelle con number = null.

Non scartare voci come "Strada" o "Porta" se sono nella legenda ufficiale.

Rispondi ESCLUSIVAMENTE in JSON:
{
  "items": [
    { "number": 1, "name": "Fossato", "description": "Fossato perimetrale largo 4m..." },
    { "number": 2, "name": "Tetto", "description": "Tetto della struttura centrale..." }
  ]
}

Se non trovi alcuna legenda o etichetta:
{ "items": [] }

Niente testo fuori dal JSON. Niente markdown.`;

type Hint = { name: string; description: string };

async function callVision(
  client: OpenAI,
  imageDataUrl: string,
  prompt: string,
  maxTokens: number,
): Promise<string | null> {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.1,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: imageDataUrl, detail: "high" },
          },
        ],
      },
    ],
  });
  return completion.choices[0]?.message?.content ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, apiKey } = await req.json();
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json({ error: "missing image" }, { status: 400 });
    }
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        {
          error: "missing_api_key",
          message: "Configura la chiave OpenAI in Impostazioni",
        },
        { status: 400 },
      );
    }

    const client = new OpenAI({ apiKey });

    // Parallelizza le due chiamate Vision per ridurre latenza
    const [descRaw, legendRaw] = await Promise.all([
      callVision(client, imageDataUrl, DESCRIPTION_PROMPT, 2000),
      callVision(client, imageDataUrl, LEGEND_PROMPT, 8000),
    ]);

    if (!descRaw && !legendRaw) {
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }

    // PASS 1 — parse description
    let description = "";
    if (descRaw) {
      try {
        const d = JSON.parse(descRaw);
        description = typeof d.description === "string" ? d.description : "";
      } catch {
        // ignore, description resta vuota
      }
    }

    // PASS 2 — parse legend items
    let spatialHints: Hint[] = [];
    if (legendRaw) {
      try {
        const l = JSON.parse(legendRaw);
        const items = Array.isArray(l.items) ? l.items : [];
        spatialHints = items
          .map((it: unknown): Hint | null => {
            if (!it || typeof it !== "object") return null;
            const o = it as { name?: unknown; description?: unknown };
            const name = typeof o.name === "string" ? o.name.trim() : "";
            if (!name) return null;
            const desc =
              typeof o.description === "string" ? o.description.trim() : "";
            return { name, description: desc };
          })
          .filter((h: Hint | null): h is Hint => h !== null)
          // dedup per name case-insensitive
          .filter(
            (h: Hint, i: number, arr: Hint[]) =>
              arr.findIndex(
                (x) => x.name.toLowerCase() === h.name.toLowerCase(),
              ) === i,
          );
      } catch {
        // legend parsing failed, spatialHints rimane []
      }
    }

    // Fallback finale: se comunque 0 hints, prova a estrarre pattern "01 - Nome" dalla description
    if (spatialHints.length === 0 && description) {
      const pattern =
        /(?:^|[\s'"(,])0*(\d{1,3})\s*[-–—.:)]\s*([^,'"\n]{2,80})/g;
      const found = new Map<string, Hint>();
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(description)) !== null) {
        const name = match[2]
          .trim()
          .replace(/[.,;:'"]+$/, "")
          .trim();
        if (!name || name.length < 2) continue;
        const key = name.toLowerCase();
        if (!found.has(key)) {
          found.set(key, { name, description: "" });
        }
      }
      if (found.size >= 2) {
        spatialHints = Array.from(found.values());
      }
    }

    return NextResponse.json({ description, spatialHints });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "ai_failed", message: msg },
      { status: 500 },
    );
  }
}
