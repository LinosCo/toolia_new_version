import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

function buildPrompt(input: {
  style: "illustrazione" | "fotorealistico";
  poiName: string;
  poiDescription?: string;
  projectName: string;
  projectType?: string;
  city?: string;
}): string {
  const { style, poiName, poiDescription, projectName, projectType, city } =
    input;

  const base = `Punto di interesse: "${poiName}".
${poiDescription ? `Descrizione: ${poiDescription}` : ""}
Fa parte di "${projectName}"${projectType ? `, un ${projectType}` : ""}${city ? ` a ${city}, Italia` : ""}.`;

  if (style === "fotorealistico") {
    return `Fotografia architettonica professionale del seguente soggetto.
${base}

Stile: fotografia reale ad alta qualità, luce naturale del tardo pomeriggio, dettagli architettonici nitidi, atmosfera realistica. Nessun watermark, nessun testo, nessuna persona nell'inquadratura. Composizione pulita, inquadratura fissa.`;
  }

  return `Illustrazione editoriale architettonica del seguente soggetto.
${base}

Stile: illustrazione disegnata a mano, tonalità terra (ocra, terracotta, grigio caldo), linee eleganti e misurate, atmosfera raccolta. Stile editoriale minimale. Nessun testo, nessuna persona. Concentrati sui dettagli architettonici e sul contesto del luogo.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      apiKey,
      style,
      poiName,
      poiDescription,
      projectName,
      projectType,
      city,
    } = body;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "missing_api_key",
          message: "Configura la chiave OpenAI in Impostazioni.",
        },
        { status: 400 },
      );
    }
    if (!poiName || !projectName) {
      return NextResponse.json(
        { error: "missing_fields", message: "Dati POI mancanti." },
        { status: 400 },
      );
    }

    const prompt = buildPrompt({
      style: style === "fotorealistico" ? "fotorealistico" : "illustrazione",
      poiName,
      poiDescription,
      projectName,
      projectType,
      city,
    });

    const client = new OpenAI({ apiKey });
    const result = await client.images.generate({
      model: "dall-e-3",
      prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
      response_format: "b64_json",
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json(
        {
          error: "empty_response",
          message: "DALL-E non ha restituito immagine.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      dataUrl: `data:image/png;base64,${b64}`,
      revisedPrompt: result.data?.[0]?.revised_prompt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "ai_failed", message: msg },
      { status: 500 },
    );
  }
}
