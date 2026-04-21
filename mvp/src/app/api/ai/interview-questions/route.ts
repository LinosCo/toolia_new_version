import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM = `Sei un editor di audioguide culturali. Prepari un'intervista per il gestore/curatore/direttore di un luogo per raccogliere informazioni che NON si trovano nei documenti ufficiali: aneddoti, scelte editoriali, dettagli sensoriali, storie personali, cose a cui tiene particolarmente.
Le domande devono essere specifiche al luogo (non generiche), aperte (richiedono racconto, non sì/no), una per argomento.`;

const USER_TEMPLATE = (ctx: string) => `Contesto del progetto:
${ctx}

Genera 8 domande da porre all'intervistato. Devono essere:
- specifiche al luogo (usa dettagli dal contesto quando possibile)
- aperte, ricche (non chiuse)
- progettate per far emergere materiale narrativo che NON si trova in brochure ufficiali
- in italiano, tono colloquiale-professionale

Rispondi ESCLUSIVAMENTE in JSON:
{ "questions": ["domanda 1", "domanda 2", ...] }`;

export async function POST(req: NextRequest) {
  try {
    const {
      apiKey,
      projectName,
      type,
      city,
      respondentRole,
      websiteText,
      documentsText,
      poi,
    } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "missing_api_key",
          message: "Configura la chiave OpenAI in Impostazioni.",
        },
        { status: 400 },
      );
    }

    const parts: string[] = [];
    parts.push(
      `Luogo: ${projectName ?? "—"}${type ? ` (${type})` : ""}${city ? ` — ${city}` : ""}`,
    );
    parts.push(`Intervistato: ${respondentRole ?? "gestore"}`);
    if (Array.isArray(poi) && poi.length > 0) {
      parts.push(
        `Punti di interesse noti:\n${poi
          .slice(0, 12)
          .map((p: { n: number; name: string }) => `- ${p.n}. ${p.name}`)
          .join("\n")}`,
      );
    }
    if (websiteText) {
      parts.push(`Estratto dal sito:\n${websiteText.slice(0, 3000)}`);
    }
    if (documentsText) {
      parts.push(`Estratto dai documenti:\n${documentsText.slice(0, 4000)}`);
    }
    const ctx = parts.join("\n\n---\n\n");

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: USER_TEMPLATE(ctx) },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }
    const parsed = JSON.parse(raw);
    const questions: string[] = Array.isArray(parsed.questions)
      ? parsed.questions
          .map((q: unknown) => (typeof q === "string" ? q.trim() : ""))
          .filter((q: string) => q.length > 0)
          .slice(0, 12)
      : [];

    if (questions.length === 0) {
      return NextResponse.json(
        {
          error: "no_questions",
          message: "L'AI non ha prodotto domande. Riprova.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ questions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "ai_failed", message: msg },
      { status: 500 },
    );
  }
}
