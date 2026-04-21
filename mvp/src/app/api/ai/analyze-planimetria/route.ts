import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const PROMPT = `Analizza questa planimetria o mappa di un sito culturale.
Contiene:
- Pin numerati (cerchi o marker con numeri 1, 2, 3...) posizionati sopra una mappa/foto aerea/planimetria
- Testi nei margini (di solito a sinistra e/o destra) che descrivono ciascun pin numerato
- I pin nei margini sono collegati ai pin sulla mappa tramite il numero

Per ogni pin numerato che trovi sulla mappa, estrai:
- "n": numero intero del pin
- "name": nome breve del punto (es. "Fossato", "Torre", "Scala")
- "description": descrizione completa come nei margini (testo esteso)
- "x": coordinata X del pin sulla mappa normalizzata 0-1 (0 = bordo sinistro, 1 = bordo destro)
- "y": coordinata Y del pin sulla mappa normalizzata 0-1 (0 = bordo alto, 1 = bordo basso)

Rispondi esclusivamente in formato JSON con questa struttura:
{
  "points": [
    { "n": 1, "name": "...", "description": "...", "x": 0.42, "y": 0.38 },
    { "n": 2, "name": "...", "description": "...", "x": 0.51, "y": 0.42 }
  ]
}

Se non riesci a identificare pin o testi, restituisci {"points": []}.
Non includere testo esplicativo fuori dal JSON.`;

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

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            {
              type: "image_url",
              image_url: { url: imageDataUrl, detail: "high" },
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }

    const parsed = JSON.parse(raw);
    const points = Array.isArray(parsed.points) ? parsed.points : [];

    return NextResponse.json({ points });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "ai_failed", message: msg },
      { status: 500 },
    );
  }
}
