import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface Body {
  apiKey?: string;
  provider?: "openai";
  name?: string;
  kind?: "backbone" | "character";
  bio?: string;
  identity?: string;
  toneAndRegister?: string;
  placeName?: string;
  placeType?: string;
}

// Genera un ritratto stilizzato coerente con la bio narrativa.
// Usa OpenAI Images (gpt-image-1, fallback a dall-e-3).
export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const { apiKey, name, kind, bio, identity, toneAndRegister } = body;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "missing_api_key",
          message: "Configura chiave OpenAI in Impostazioni.",
        },
        { status: 400 },
      );
    }
    if (!name) {
      return NextResponse.json({ error: "missing_name" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });

    const descriptor =
      kind === "character"
        ? `${identity ?? ""}${toneAndRegister ? `, tono ${toneAndRegister}` : ""}`
        : "voce narrante neutra e accogliente";

    const placeDescriptor = body.placeName
      ? `per un'audioguida di ${body.placeName}${body.placeType ? ` (${body.placeType})` : ""}`
      : "per un'audioguida culturale italiana";

    const prompt = `Ritratto editoriale stilizzato di un narratore audioguida ${placeDescriptor}.

PERSONAGGIO: ${name}. ${descriptor}.

BIO: ${bio ?? "—"}

STILE VISIVO:
- Illustrazione editoriale raffinata, stile mezzo-busto a tre quarti
- Palette calda e sobria: terra di Siena, ocra, seppia, grigi caldi
- Sfondo neutro beige/carta antica, sfumato
- Espressione gentile, sguardo verso la fotocamera
- Luce morbida, texture leggera da stampa
- Assenza di testo, loghi, watermark
- Composizione centrata, nessuna cornice
- Formato quadrato

NON USARE: fotorealismo spinto, tratti caricaturali, stile cartoon infantile, outfit moderni vistosi, AI-art aesthetic generica.`;

    let response;
    try {
      response = await client.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        n: 1,
      });
    } catch (err) {
      console.warn(
        "[generate-narrator-portrait] gpt-image-1 failed, fallback dall-e-3",
        err,
      );
      response = await client.images.generate({
        model: "dall-e-3",
        prompt,
        size: "1024x1024",
        quality: "standard",
        n: 1,
      });
    }

    const img = response.data?.[0];
    if (!img) {
      return NextResponse.json({ error: "no_image" }, { status: 502 });
    }

    // Alcuni modelli ritornano b64_json, altri url
    let dataUrl: string | null = null;
    if (img.b64_json) {
      dataUrl = `data:image/png;base64,${img.b64_json}`;
    } else if (img.url) {
      const imgRes = await fetch(img.url);
      const buf = await imgRes.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      dataUrl = `data:image/png;base64,${b64}`;
    }
    if (!dataUrl) {
      return NextResponse.json({ error: "no_image_data" }, { status: 502 });
    }

    return NextResponse.json({ portraitUrl: dataUrl });
  } catch (err) {
    console.error("[api generate-narrator-portrait]", err);
    return NextResponse.json(
      {
        error: "internal",
        message:
          err instanceof Error ? err.message : "Errore generazione ritratto",
      },
      { status: 500 },
    );
  }
}
