import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM = `Sei un esperto di identificazione architettonica. Ricevi una foto di un luogo culturale e una lista di punti di interesse (POI) con nome e descrizione. Devi dire a quale POI la foto corrisponde, oppure se non corrisponde a nessuno.
Se la foto è un dettaglio stretto (es. un affresco, un oggetto) classificala come "riferimento-ai" invece che "foto-poi".`;

type PoiInput = { n: number; name: string; description: string };

const PROMPT = (pois: PoiInput[]) => `Lista dei POI del luogo:
${pois
  .sort((a, b) => a.n - b.n)
  .map((p) => `${p.n}. ${p.name} — ${p.description.slice(0, 200)}`)
  .join("\n")}

Guarda la foto e rispondi in JSON:
{
  "suggestedRole": "foto-poi" | "riferimento-ai",
  "poiN": numero del POI più probabile (1, 2, ...) oppure null se nessuno
  "confidence": "alta" | "media" | "bassa",
  "shortDescription": "breve descrizione di cosa è visibile nella foto (max 100 caratteri)",
  "reasoning": "una frase che spiega la scelta"
}

Regole:
- "foto-poi" se la foto mostra l'ambiente/l'oggetto nel suo complesso, come in un carousel pubblico
- "riferimento-ai" se è un dettaglio ravvicinato utile all'AI ma meno utile al visitatore
- "poiN": null solo se la foto davvero non corrisponde a nulla (es. foto di una persona, una brochure, un edificio diverso)`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, imageDataUrl, pois } = body;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "missing_api_key",
          message: "Configura la chiave OpenAI in Impostazioni.",
        },
        { status: 400 },
      );
    }
    if (!imageDataUrl || !Array.isArray(pois) || pois.length === 0) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT(pois) },
            {
              type: "image_url",
              image_url: { url: imageDataUrl, detail: "auto" },
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

    const allowedRoles = new Set(["foto-poi", "riferimento-ai"]);
    const allowedConfidence = new Set(["alta", "media", "bassa"]);

    const poiN =
      typeof parsed.poiN === "number" && parsed.poiN > 0 ? parsed.poiN : null;

    return NextResponse.json({
      suggestedRole: allowedRoles.has(parsed.suggestedRole)
        ? parsed.suggestedRole
        : "foto-poi",
      poiN,
      confidence: allowedConfidence.has(parsed.confidence)
        ? parsed.confidence
        : "media",
      shortDescription:
        typeof parsed.shortDescription === "string"
          ? parsed.shortDescription.slice(0, 120)
          : "",
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "ai_failed", message: msg },
      { status: 500 },
    );
  }
}
