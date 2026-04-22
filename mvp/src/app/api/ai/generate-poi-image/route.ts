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

    // gpt-image-1.5 è il modello corrente (Apr 2025+, successore di gpt-image-1 e dall-e-3).
    // Se la chiamata fallisce (organizzazione non verificata o modello non disponibile),
    // fallback automatico a gpt-image-1 e poi dall-e-3.
    const attemptModels = ["gpt-image-1.5", "gpt-image-1", "dall-e-3"] as const;
    let b64: string | undefined;
    let usedModel: string | undefined;
    let lastErr: unknown = null;

    for (const m of attemptModels) {
      try {
        const params: Parameters<typeof client.images.generate>[0] = {
          model: m,
          prompt,
          n: 1,
          // gpt-image usa "1024x1024"/"1024x1536"/"1536x1024"; dall-e-3 usa "1024x1024"/"1024x1792"
          size: "1024x1024",
        };
        // dall-e-3 accetta response_format; gpt-image-1.x restituisce sempre b64
        if (m === "dall-e-3") {
          (params as unknown as Record<string, unknown>).response_format =
            "b64_json";
          (params as unknown as Record<string, unknown>).quality = "standard";
        } else {
          (params as unknown as Record<string, unknown>).quality = "high";
        }
        const result = (await client.images.generate(params)) as {
          data?: { b64_json?: string; url?: string }[];
        };
        b64 = result.data?.[0]?.b64_json ?? undefined;
        if (b64) {
          usedModel = m;
          break;
        }
      } catch (err) {
        lastErr = err;
        continue;
      }
    }

    if (!b64) {
      const msg =
        lastErr instanceof Error
          ? lastErr.message
          : "nessun modello disponibile";
      return NextResponse.json(
        {
          error: "generation_failed",
          message: `L'AI non ha restituito un'immagine (${msg}). Verifica la chiave OpenAI e l'abilitazione del modello immagini.`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      dataUrl: `data:image/png;base64,${b64}`,
      model: usedModel,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "ai_failed", message: msg },
      { status: 500 },
    );
  }
}
