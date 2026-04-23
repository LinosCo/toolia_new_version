import { NextResponse } from "next/server";
import { getSessionUser, handleAuthError } from "@/lib/rbac";

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  preview_url?: string;
  language?: string;
}

// Endpoint server-side: legge la chiave ElevenLabs dall'env e ritorna l'elenco
// voci. Evita di esporre la chiave al client.
export async function GET() {
  try {
    await getSessionUser();
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "no_key",
        message: "ELEVENLABS_API_KEY non configurata nel server.",
        voices: [],
      },
      { status: 200 },
    );
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        {
          error: "elevenlabs_error",
          status: res.status,
          message: `ElevenLabs ha risposto ${res.status}`,
          voices: [],
        },
        { status: 200 },
      );
    }
    const data = (await res.json()) as { voices?: ElevenLabsVoice[] };
    const voices = (data.voices ?? []).map((v) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category,
      labels: v.labels,
      preview_url: v.preview_url,
      language: v.language,
    }));
    return NextResponse.json({ voices });
  } catch (err) {
    console.error("[api elevenlabs voices]", err);
    return NextResponse.json(
      {
        error: "fetch_failed",
        message:
          err instanceof Error ? err.message : "Errore chiamata ElevenLabs",
        voices: [],
      },
      { status: 200 },
    );
  }
}
