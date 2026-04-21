import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type Provider = "kimi" | "openai";

interface KbFactInput {
  content: string;
  category: "solido" | "interpretazione" | "memoria" | "ipotesi";
  importance: "primaria" | "secondaria" | "contesto";
  reliability: "alta" | "media" | "bassa";
  poiRef?: number;
  sourceKind: "sito" | "documento" | "intervista" | "manuale";
}

const SYSTEM = `Sei un editor senior di audioguide culturali.
Leggi una knowledge base di fatti approvati e proponi il BRIEF EDITORIALE del progetto.
Il brief è la direzione editoriale che guiderà tutti gli output del progetto: app visitatore, brochure, podcast, articoli.
Seguirai queste regole (dalla spec Toolia):
- l'Intervista orienta la rilevanza narrativa (cosa raccontare)
- le Fonti scritte governano la validità fattuale (cosa asserire)
- ogni fatto "memoria" va raccontato in tono cauto ("si narra…")
- ogni fatto "ipotesi" entra in "verify" finché non confermato
- "must_tell" sono storie identitarie del progetto, "nice_to_tell" arricchimenti, "avoid" da non toccare`;

function weightOf(importance: string, reliability: string): number {
  const i = importance === "primaria" ? 3 : importance === "secondaria" ? 2 : 1;
  const r = reliability === "alta" ? 3 : reliability === "media" ? 2 : 1;
  return i * r;
}

function buildPrompt(ctx: {
  projectName: string;
  type?: string;
  city?: string;
  facts: KbFactInput[];
  hasFamilyMode?: boolean;
}): string {
  const byCat = {
    solido: ctx.facts.filter((f) => f.category === "solido"),
    interpretazione: ctx.facts.filter((f) => f.category === "interpretazione"),
    memoria: ctx.facts.filter((f) => f.category === "memoria"),
    ipotesi: ctx.facts.filter((f) => f.category === "ipotesi"),
  };

  const renderCat = (list: KbFactInput[]) =>
    list
      .slice()
      .sort(
        (a, b) =>
          weightOf(b.importance, b.reliability) -
          weightOf(a.importance, a.reliability),
      )
      .map(
        (f, i) =>
          `${i + 1}. [${f.sourceKind}·peso ${weightOf(f.importance, f.reliability)}/9] ${f.content}`,
      )
      .join("\n");

  return `Progetto: ${ctx.projectName}${ctx.type ? ` (${ctx.type})` : ""}${ctx.city ? ` — ${ctx.city}` : ""}

KNOWLEDGE BASE (${ctx.facts.length} fatti approvati):

## Fatti solidi (${byCat.solido.length})
${renderCat(byCat.solido) || "—"}

## Interpretazioni (${byCat.interpretazione.length})
${renderCat(byCat.interpretazione) || "—"}

## Memorie / tradizioni (${byCat.memoria.length})
${renderCat(byCat.memoria) || "—"}

## Ipotesi da verificare (${byCat.ipotesi.length})
${renderCat(byCat.ipotesi) || "—"}

Genera il BRIEF EDITORIALE in formato JSON. Ogni campo deve essere concreto e ancorato ai fatti, non frasi generiche da brochure.

{
  "obiettivo": "cosa deve portarsi a casa il visitatore (una frase, max 180 caratteri)",
  "obiettivoCliente": "outcome business per l'ente/cliente (non per il visitatore). Es: 'aumentare visite estive', 'posizionare come meta culturale di qualità', 'valorizzare patrimonio verso il pubblico internazionale' (max 180 caratteri)",
  "tipoEsperienza": "UNO tra: didattico (apprendimento strutturato) | contemplativo (osservazione, silenzio, riflessione) | avventuroso (esplorazione attiva, scoperta) | emozionale (impatto sensoriale, pathos) | immersivo (perdersi nel luogo, ambienti sensoriali). Scegli il più adatto al materiale e al luogo.",
  "promessaNarrativa": "frase-manifesto del progetto, tono forte, identitaria (max 140 caratteri)",
  "target": "profilo visitatore tipico, specifico al luogo e al materiale disponibile (max 200 caratteri)",
  "percezioneDaLasciare": "impressione finale che si vuole lasciare, una frase (max 180 caratteri)",
  "durataMinuti": numero intero tra 30 e 180 coerente col luogo,

  "mandatoEditoriale": "UNA frase-sintesi che riassume il brief in 2-3 righe, usabile come intro/press/email. Formula tipo: 'Questo progetto racconta X per Y, con tono Z, focus su W, evitando K' (max 300 caratteri)",

  "tono": "UNO tra: sobrio-autorevole | colloquiale-caldo | evocativo | ironico. Scegli il più adatto al materiale raccolto.",
  "sensibilita": ["lista di 0-3 temi politici/culturali/storici da trattare con cautela, specifici al luogo"],
  "vincoliBrand": ["lista di 0-3 vincoli di linguaggio o positioning (es. 'non enfatizzare aspetti militari gloriosi', 'usare toponomastica locale')"],

  "mustTell": ["2-4 storie IDENTITARIE del progetto che devono apparire in ogni output. Ogni storia è una frase concreta con angolo narrativo, non un tema astratto. Es: 'La notte del 14 agosto 1916 quando...'"],
  "niceToTell": ["3-6 elementi interessanti ma non centrali, arricchiscono se c'è tempo"],
  "avoid": ["2-4 argomenti/toni da NON toccare: polemiche irrisolte, dettagli tecnici troppo pesanti, stereotipi, claim non verificati"],
  "verify": ["lista di claim/fatti che richiedono verifica prima di pubblicare. PRECOMPILA ciascuna ipotesi della knowledge base come elemento da verificare"],

  "criterioAmmissibilita": {
    "inclusione": ["2-4 regole esplicite di cosa PUÒ entrare nelle schede. Es: 'ogni fatto deve avere fonte citabile', 'riferimenti storici supportati da documenti'"],
    "esclusione": ["2-4 regole esplicite di cosa NON entra MAI. Es: 'nessun claim speculativo sui motivi di battaglie', 'niente dati biografici non verificati'"]
  },

  "policyFonti": {
    "schede": "frase che definisce il peso fonti nella generazione schede. Es: 'evidence obbligatoria, intervista per colore narrativo, sito come contesto'",
    "chatbot": "frase sul peso fonti nel chatbot. Es: 'solo fatti ad affidabilità alta; ipotesi escluse'",
    "zone": "frase sul peso fonti nella definizione zone. Es: 'intervista e documenti per promessa narrativa, planimetria per confini fisici'",
    "driver": "frase sul peso fonti nella definizione driver narrativi. Es: 'intervista prevale per identità, documenti per temi storici'"
  },

  "visitorQuestions": {
    "pratiche": ["2-5 domande logistiche tipiche: parcheggio, orari, biglietti, accessibilità, bagni, durata visita"],
    "curiosita": ["3-6 domande di curiosità spontanea che nascono in situ: 'perché quella pietra è nera?', 'chi viveva qui davvero?'"],
    "approfondimento": ["2-4 domande per visitatori che vogliono più contesto: temi storici complessi, figure minori, connessioni con altri luoghi"]
  }${
    ctx.hasFamilyMode
      ? `,

  "familyMode": {
    "enabled": true,
    "mascotName": "nome suggerito per il compagno animato (es. 'Pepo il gatto del forte')",
    "etaTarget": "UNO tra: 3-6 | 6-10 | 10-14",
    "tonoFamily": "descrizione breve del tono family (max 100 caratteri)",
    "modalitaGioco": "UNO tra: investigativo | avventura | caccia-tesoro | osservazione"
  }`
      : ""
  }
}

Rispondi ESCLUSIVAMENTE in JSON valido, niente testo fuori dal JSON. Italiano.`;
}

function buildClient(provider: Provider, apiKey: string): OpenAI {
  if (provider === "kimi") {
    return new OpenAI({
      apiKey,
      baseURL: "https://api.moonshot.ai/v1",
    });
  }
  return new OpenAI({ apiKey });
}

function modelFor(provider: Provider): string {
  if (provider === "kimi") return "moonshot-v1-128k";
  return "gpt-4o";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      apiKey,
      provider,
      projectName,
      type,
      city,
      facts,
      hasFamilyMode,
    }: {
      apiKey?: string;
      provider?: Provider;
      projectName?: string;
      type?: string;
      city?: string;
      facts?: KbFactInput[];
      hasFamilyMode?: boolean;
    } = body;

    if (!apiKey || !provider) {
      return NextResponse.json(
        {
          error: "missing_api_key",
          message: "Configura una chiave LLM (Kimi o OpenAI) in Impostazioni.",
        },
        { status: 400 },
      );
    }
    if (!projectName || !Array.isArray(facts) || facts.length < 5) {
      return NextResponse.json(
        {
          error: "not_enough_facts",
          message:
            "Servono almeno 10 fatti approvati per generare un brief significativo. Torna alla Knowledge Base per approvarne altri.",
        },
        { status: 400 },
      );
    }

    const user = buildPrompt({
      projectName,
      type,
      city,
      facts,
      hasFamilyMode,
    });

    const client = buildClient(provider, apiKey);
    const completion = await client.chat.completions.create({
      model: modelFor(provider),
      temperature: 0.6,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "invalid_json", message: "Risposta LLM non valida." },
        { status: 502 },
      );
    }

    const allowedTones = new Set([
      "sobrio-autorevole",
      "colloquiale-caldo",
      "evocativo",
      "ironico",
    ]);
    const allowedTipoEsperienza = new Set([
      "didattico",
      "contemplativo",
      "avventuroso",
      "emozionale",
      "immersivo",
    ]);
    const allowedEta = new Set(["3-6", "6-10", "10-14"]);
    const allowedModalita = new Set([
      "investigativo",
      "avventura",
      "caccia-tesoro",
      "osservazione",
    ]);

    const asArr = (v: unknown): string[] =>
      Array.isArray(v)
        ? v
            .map((x) => (typeof x === "string" ? x.trim() : ""))
            .filter((x) => x.length > 0)
        : [];

    const asStr = (v: unknown, fallback = ""): string =>
      typeof v === "string" ? v.trim() : fallback;

    const brief = {
      obiettivo: asStr(parsed.obiettivo),
      obiettivoCliente: asStr(parsed.obiettivoCliente),
      tipoEsperienza: allowedTipoEsperienza.has(parsed.tipoEsperienza)
        ? parsed.tipoEsperienza
        : "didattico",
      promessaNarrativa: asStr(parsed.promessaNarrativa),
      target: asStr(parsed.target),
      percezioneDaLasciare: asStr(parsed.percezioneDaLasciare),
      durataMinuti:
        typeof parsed.durataMinuti === "number"
          ? Math.min(240, Math.max(15, Math.round(parsed.durataMinuti)))
          : 75,
      mandatoEditoriale: asStr(parsed.mandatoEditoriale),
      tono: allowedTones.has(parsed.tono) ? parsed.tono : "sobrio-autorevole",
      sensibilita: asArr(parsed.sensibilita).slice(0, 5),
      vincoliBrand: asArr(parsed.vincoliBrand).slice(0, 5),
      mustTell: asArr(parsed.mustTell).slice(0, 6),
      niceToTell: asArr(parsed.niceToTell).slice(0, 10),
      avoid: asArr(parsed.avoid).slice(0, 8),
      verify: asArr(parsed.verify).slice(0, 20),
      criterioAmmissibilita: {
        inclusione: asArr(parsed.criterioAmmissibilita?.inclusione).slice(0, 6),
        esclusione: asArr(parsed.criterioAmmissibilita?.esclusione).slice(0, 6),
      },
      policyFonti: {
        schede: asStr(parsed.policyFonti?.schede),
        chatbot: asStr(parsed.policyFonti?.chatbot),
        zone: asStr(parsed.policyFonti?.zone),
        driver: asStr(parsed.policyFonti?.driver),
      },
      visitorQuestions: {
        pratiche: asArr(parsed.visitorQuestions?.pratiche).slice(0, 8),
        curiosita: asArr(parsed.visitorQuestions?.curiosita).slice(0, 10),
        approfondimento: asArr(parsed.visitorQuestions?.approfondimento).slice(
          0,
          8,
        ),
      },
      familyMode: hasFamilyMode
        ? {
            enabled: true,
            mascotName: asStr(parsed.familyMode?.mascotName) || undefined,
            etaTarget: allowedEta.has(parsed.familyMode?.etaTarget)
              ? parsed.familyMode.etaTarget
              : undefined,
            tonoFamily: asStr(parsed.familyMode?.tonoFamily) || undefined,
            modalitaGioco: allowedModalita.has(parsed.familyMode?.modalitaGioco)
              ? parsed.familyMode.modalitaGioco
              : undefined,
          }
        : { enabled: false },
    };

    return NextResponse.json({ brief });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: "ai_failed", message: msg },
      { status: 500 },
    );
  }
}
