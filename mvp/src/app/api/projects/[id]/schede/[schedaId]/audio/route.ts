import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";

// Genera audio TTS via ElevenLabs per una scheda.
// Modello eleven_multilingual_v2 per pronuncia italiana corretta.
// Audio salvato come dataURL base64 nel campo AudioAsset.fileUrl (sposterà su R2 quando pronto).

async function assertScheda(
  projectId: string,
  schedaId: string,
  tenantId: string,
) {
  return prisma.scheda.findFirst({
    where: { id: schedaId, projectId, project: { tenantId } },
    include: { narrator: true },
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; schedaId: string }> },
) {
  try {
    const { id, schedaId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);

    const scheda = await assertScheda(id, schedaId, user.tenantId);
    if (!scheda) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (scheda.status !== "published") {
      return NextResponse.json(
        {
          error: "not_published",
          message:
            "La scheda deve essere pubblicata prima di generare l'audio.",
        },
        { status: 400 },
      );
    }
    if (!scheda.narrator?.voiceId) {
      return NextResponse.json(
        {
          error: "no_voice",
          message: "Il narratore non ha una voce assegnata.",
        },
        { status: 400 },
      );
    }
    if (!scheda.scriptText?.trim()) {
      return NextResponse.json(
        { error: "empty_text", message: "Testo scheda vuoto." },
        { status: 400 },
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "no_api_key", message: "ELEVENLABS_API_KEY non configurata." },
        { status: 500 },
      );
    }

    const voiceId = scheda.narrator.voiceId;
    const model = "eleven_multilingual_v2";

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: scheda.scriptText,
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.1,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: "elevenlabs_error",
          status: res.status,
          message: errText.slice(0, 300),
        },
        { status: 502 },
      );
    }

    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    const dataUrl = `data:audio/mpeg;base64,${b64}`;

    // Stima durata da parole (approssimativa). TTS effettivo è simile.
    const words = scheda.scriptText.trim().split(/\s+/).filter(Boolean).length;
    const durationSeconds = Math.round((words / 150) * 60);

    const audio = await prisma.audioAsset.upsert({
      where: { schedaId },
      create: {
        schedaId,
        fileUrl: dataUrl,
        durationSeconds,
        voiceModel: `elevenlabs/${model}`,
        isStale: false,
      },
      update: {
        fileUrl: dataUrl,
        durationSeconds,
        voiceModel: `elevenlabs/${model}`,
        isStale: false,
      },
      select: {
        id: true,
        fileUrl: true,
        durationSeconds: true,
        voiceModel: true,
        isStale: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ audio });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api schede/[id]/audio POST]", err);
    return NextResponse.json(
      {
        error: "internal",
        message:
          err instanceof Error ? err.message : "Errore generazione audio",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; schedaId: string }> },
) {
  try {
    const { id, schedaId } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const scheda = await assertScheda(id, schedaId, user.tenantId);
    if (!scheda) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await prisma.audioAsset.delete({ where: { schedaId } }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
