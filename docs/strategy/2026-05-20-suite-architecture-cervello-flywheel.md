# Voler.ai Tuner Suite — Architettura: Cervello Condiviso & Content Flywheel

> **Data**: 20 maggio 2026
> **Status**: modello concettuale approvato in conversazione, base per la Fase 2 (CT)
> **Companion**: [decisioni-strategiche](./2026-05-19-decisioni-strategiche.md), [content-tuner-design](./2026-05-19-content-tuner-design.md), [pricing-packaging](./2026-05-20-pricing-packaging.md), [modelli-ai-reference](./2026-05-20-modelli-ai-reference.md)
> **Scope**: come BT e CT (ed ET) si integrano davvero — non due silos con un tubo, ma un cervello condiviso che alimenta un loop che apprende.

---

## 1. La tesi

La divisione BT/CT ha senso **solo se** i prodotti sono vendibili separati *e* valgono di più insieme. Il valore del "insieme" non è la somma di due tool: è un **flywheel** — capire → produrre → distribuire → misurare → capire meglio — che gira su un **cervello condiviso** (dati + capability comuni).

Errore da evitare (il "tubo che perde"): BT esporta un insight, l'operatore apre CT e ricomincia da capo, perdendo l'evidenza. Soluzione: un **layer condiviso** su cui entrambi scrivono e leggono, e un **oggetto-opportunità** (`ProjectTip`) che porta l'evidenza fino alla produzione e ritorno.

---

## 2. Shared Knowledge Layer (a 2 strati)

Il "cervello" condiviso non è un blob uniforme: ha due strati con grado di condivisione diverso.

| Strato | Cosa | Come arriva a CT | Esempi |
|---|---|---|---|
| **Materiale di produzione** (CT consuma *direttamente* per produrre) | la materia grezza dei contenuti | input (RAG, fonti) | KB/fatti, **dati del sito** (output di site-analysis), fonti caricate, BrandSkill |
| **Intelligence di steering** (vive in BT per *decidere*, raggiunge CT come *direzione*) | dove puntare, cosa prioritizzare | brief/priorità/tension, non contenuto grezzo | visibility/gap, competitors, signals, performance/results |

**Principio guida** (dato da deciso): *"cosa fare" vive in BT, "come/cosa dire" vive in CT.* Eccezione utile: il **sito** è prodotto da uno strumento BT (lo scan) ma il suo *contenuto* è materiale grezzo che CT usa davvero (KB, coerenza di tono, refresh copy → cruciale per Web Tuner).

---

## 3. Il flywheel

```
        ┌────────► CAPIRE (BT) ──────► DECIDERE (BT: tips/strategy)
        │            ▲                          │
   MISURARE          │                          ▼
   (BT results)      │                    PRODURRE (CT: il cervello, §6)
        ▲            │                          │
        │            │                          ▼
        └─ ESPERIENZA (ET on-site) ◄── DISTRIBUIRE (CT: connectors)
```

**Bridge di valore — BT → CT** (in gran parte *steering*, + il dato sito come materiale):
1. **Voice-of-customer → angoli & tension map**: una domanda ricorrente (interviste/chatbot/reviews) diventa una serie di contenuti *e* una scheda audioguida. Temi dimostrati, non indovinati.
2. **Gap di posizionamento (SERP/AEO) → brief**: produci dove sei invisibile o dove l'AI cita i competitor.
3. **Personas → narratori/lenti**: targeting reale.
4. **BrandSkill → guardrail di generazione** (voce + visual).

**Bridge di valore — CT → BT** (chiude il loop):
1. **Performance contenuti (GA4/GSC/social/reviews) → results hub**: il contenuto ha spostato il posizionamento?
2. **Engagement (commenti, domande al chatbot generate dai contenuti) → nuovi signal.**
3. **Quali messaggi convertono → raffina personas/strategia.**

**ET nel loop (culturale)**: le domande dei visitatori all'assistant ET diventano signal BT → nuovi contenuti/schede CT. *Il luogo diventa più intelligente a ogni visita.*

---

## 4. Tassonomia moduli — 3 bucket

Regola: **un modulo va nel layer condiviso se più di un prodotto lo usa O se produce un asset del cervello condiviso.** Solo i moduli con un unico consumatore e nessun asset condiviso restano "owned".

| Bucket | Moduli (reali, da `ai-interviewer`) | Package monorepo |
|---|---|---|
| **BT-owned** | interview, chatbot, training, copilot, visibility, site-analysis *(tool; il dato è condiviso)*, competitors, tips *(generazione)*, proactive, signals/reasoning, results | `apps/business-tuner` |
| **CT-owned** | content engine, KB/RAG, lenti/tension, media pipeline, workflow editoriale, calendario + **migrati da BT**: social-hub, cms, media, templates, content, tone | `apps/content-tuner` |
| **SHARED** (capability + dati) | brand distillation → `@voler/brand-voice`; connectors + OAuth → `@voler/connectors`; orchestrazione/publishing → pkg orchestration; **`ProjectTip`** (oggetto-opportunità, §5); **Craft Library** → `@voler/craft` (§7); knowledge layer (KB, signals store, personas, performance/outcome) | `packages/@voler/*` |

> **Cleanup necessario**: i moduli content/social/media oggi in BT (`social-hub, cms, media, templates, content, tone`) **migrano a CT**. Così l'overlap sparisce e il taglio è netto: BT = capire/conversare/decidere/misurare; CT = produrre/distribuire.

---

## 5. `ProjectTip` = l'oggetto-opportunità condiviso (il "Content Brief")

**Scoperta chiave (verificata nel codice BT)**: il "Content Brief" cross-prodotto **esiste già** — è `ProjectTip`. BT ha già il loop completo tip→contenuto→pubblica→misura. Non si inventa: si **generalizza**.

Cosa BT ha già:
- **Generazione** multi-sorgente: `signal-processor` (proattivo/cron, step INSPIRE → `generateTipFromSignal` quando `actionability > 0.7`) + `BrandReportEngine` (on-demand, da GSC/GA/site-crawler/visibility/competitors). LLM strutturato (oggi `gpt-4o`).
- **Entità `ProjectTip`** ricca: categoria/intent/`automationCluster`, scoring (`priority`), evidenza (`ProjectTipEvidence` + `sourceSnapshot`), bozza pubblicabile (`contentDrafts`, `mediaAssets`, `platformTargets`, `schedulePlan`), outcome (`outcomeMetric`). Lifecycle a 4 dimensioni (`status`/`draftStatus`/`routingStatus`/`publishStatus`).
- **Esecuzione**: `AutomationService.triggerRun` → publish interno (Meta/IG/FB/LinkedIn) o `tip-routing-executor` (WordPress/CMS) o n8n (`AutomationTipContextV1` + `TipData`).
- **Attribuzione**: `SignalOutcomeMetric` (funnel) + `TipPerformanceSnapshot` (delta GA4/GSC a T+7/30/90).

Cosa si **generalizza** per la suite:
1. `ProjectTip` diventa **oggetto condiviso**: BT lo genera e lo misura, CT lo produce.
2. Nuovo **target di routing**: "produci in CT" accanto a interno/CMS/n8n.
3. **`TipData` → `ProductionRequest`** generico (rimuove l'accoppiamento BT-only), che CT consuma e a cui restituisce artifact legati al `tipId`.

| Fase del loop | Chi | Cosa |
|---|---|---|
| Genera opportunità (signal→tip, scoring, evidenza, routing) | **BT** | "cosa fare / dove" |
| Oggetto `ProjectTip` (brief + evidenza + attribuzione) | **SHARED** | il contratto |
| Produzione del contenuto | **CT** (il cervello, §6) | "come / cosa dire" |
| Distribuzione | SHARED (connectors) | Meta/LinkedIn/WP/Woo/Brevo |
| Outcome (GA4/GSC/…) | **BT** | misura + ricalibra |

**Livello di automazione (deciso)**: **assistito di default** (tip → Brief precompilato → conferma → CT genera → review → pubblica) + **coda proattiva opt-in** per agenzie/volume. **Mai full-auto di default** (controllo editoriale sacro per cultura/heritage). La "coda Opportunità" prioritizzata è la superficie dove *capire diventa fare*.

---

## 6. Il cervello di produzione di CT (orchestratore a 4 strati)

CT non ha un *generatore* (tip → un prompt → testo): ha un **cervello** che fonde strategia e storytelling senza dispersione, con visione sistemica + competenza verticale.

### Anti-dispersione (3 meccanismi concreti)
1. **Provenienza tracciata**: ogni fatto porta la sua fonte; niente entra anonimo, niente si inventa.
2. **RAG sulla KB verificata**: il contenuto è costruito *dai fatti*, non dalla memoria del modello.
3. **Tension map come contratto**: `mustTell` = deve comparire, `avoid` = non deve, `verify` = da segnalare. È il checklist di non-dispersione (già in Fase 1).

### I 4 strati
```
STRATO 0 — ASSEMBLAGGIO CONTESTO → "Content Context" strutturato e tracciato (provenienza)

STRATO 1 — PIANIFICAZIONE (visione sistemica)  [modello reasoning-strong]
   Ragiona PRIMA di scrivere. Alimentato da DATI × CRAFT:
     DATI (cosa):
       1. ProjectTip                → strategia/obiettivo/KPI (BT)
       2. KB storytelling + tension map + lente + narratore → la materia (CT)
       3. BrandSkill + memoria progetto → voce + coerenza nel tempo
       4. Performance / "cosa funziona" → apprendimento dagli esiti (BT)
       5. Signals topici: autorevoli (grounding) + competitor (differenziazione) (BT)
     CRAFT (come):
       6. Craft Library → playbook storytelling · profili canale · trend di formato (§7)
   → piano: messaggio core, angolo, struttura, fatti in primo piano, cosa NON dire,
     formato/canale che storicamente rende, criterio di successo.

STRATO 2 — PRODUZIONE VERTICALE (competenza estesa)
   Registro di produttori esperti per formato, stesso contesto + piano:
     longform/blog (SEO/AEO) · social per-canale (IG/LinkedIn/X) · scheda audioguida
     (ritmo parlato, TTS-ready) · comunicato · newsletter · direttore media (Mode A/B/C + identity check)
   Ogni produttore = best-practice universale (Craft Library) × firma del brand (BrandSkill) × fatti (KB).
   [modello per formato: Opus longform, Sonnet/Haiku social, multimodale media]

STRATO 3 — GATE DI VERIFICA (qualità + no-loss)
   • copertura mustTell  • grounding di ogni claim sulla KB  • controllo vs signal autorevoli
   • conformità brand voice  • coerenza coi contenuti già pubblicati  • identity-preservation media
   ↳ se fallisce → loop di correzione MIRATO verso lo Strato 2

OUTPUT → artifact legato al tipId → workflow review/approva → pubblica → metriche rientrano (4,5 si aggiornano)
```

### Decisioni di architettura
- **Pipeline strutturata con loop di critica mirati** (NON pienamente agentico): prevedibile, debuggabile, costo controllato, qualità alta.
- **Memoria di progetto**: lo Strato 1 conosce cosa è già stato detto, l'arco narrativo, gli obiettivi, il calendario → coerenza sistemica, niente ripetizioni.
- **Apprendimento dagli esiti in-context** (NON fine-tuning): recupero performance-aware dei top-performer + digest "cosa funziona" generato da BT. Trasparente, economico; i dati restano strutturati per scoring più sofisticati in futuro.
- **Signals: due trattamenti opposti**. Autorevoli = grounding/tempestività/citazione; competitor = differenziazione/gap (mai pappagallare). Recupero topico (non dump), peso per freschezza + credibilità.

---

## 7. Craft Library (competenza universale, suite-level)

Lo storytelling vive su **tre livelli**; i primi due esistono, il terzo (craft) è nuovo:

| Livello | Cos'è | Dove | Stato |
|---|---|---|---|
| Strategia narrativa di progetto | lenti + narratori + tension map | per-progetto | ✅ Fase 1 |
| Storytelling del brand | BrandSkill (firma del cliente) | per-progetto | ✅ esiste |
| **Craft universale** | come si scrive *davvero bene* in un formato/canale | **suite-level, condiviso** | ⛔ da costruire |

La **Craft Library** (`@voler/craft`) è una knowledge base curata, trasversale a tutti i clienti, con tre componenti a dinamica diversa:

| Componente | Contenuto | Dinamica |
|---|---|---|
| **Playbook di storytelling** | strutture narrative per formato (beat di una scheda audioguida; hook→insight→CTA LinkedIn; arco di un comunicato) | **durevole**, curata da redazione Voler |
| **Profili di canale** | specs (lunghezze, aspect ratio), convenzioni (hashtag, tono), pattern d'algoritmo, aspettative audience | **semi-dinamica**, versionata |
| **Trend di formato** | quali formati/stili funzionano ora (il *come*, non il topic) | **volatile**, alimentata live |

> **Regola d'oro**: separare il **craft durevole** (curato, versionato) dai **trend volatili** (alimentati). Mai infilare i trend nei prompt statici: il sistema invecchierebbe in un mese. È anche un **moat**: la libreria migliora per accumulo e si riusa su ogni cliente → parte del valore "tech-enabled service".

Distinzione netta: **Craft Library = universale** ("come si fa un grande carosello"); **BrandSkill = specifico del cliente** ("come parla *questo* brand"). I produttori (Strato 2) fondono i due.

---

## 8. Integrazioni

**Presenti e cablate** (verificate in BT): Meta/IG, LinkedIn, WordPress, WooCommerce, Brevo, GA4, Search Console, n8n, scraping/SEO, brand asset upload.

**Auspicabili** (in ordine di valore per cultura/heritage/prodotto):

| Integrazione | Perché alto valore | Alimenta |
|---|---|---|
| **Google Reviews + TripAdvisor** | #1 voice-of-customer + social proof per cultura/hospitality | BT (signal) **e** CT (testimonial/FAQ) |
| **Google Business Profile** | i siti culturali sono locali: post + insight + SEO locale | CT (distribuzione) + BT (visibility locale) |
| **Biglietteria / booking** | dati di visita chiudono il loop ET (contenuto → visite) | BT (results) + ET |
| **CRM** (HubSpot/Pipedrive) | per il segmento prodotto/servizio: lead veri legati a contenuti/insight | BT + CT |
| **Social estesi** (TikTok, YouTube, Pinterest, X) | ampiezza di distribuzione | CT |
| **Shopify** (oltre Woo) | brand di prodotto e-comm | CT |

---

## 9. Gap di build (concreti, emersi dall'analisi)

1. **Routing "produci in CT"**: nuovo target accanto a interno/CMS/n8n.
2. **CT come production consumer**: accetta il contesto del tip (`ProductionRequest`), produce con KB+voce+media+craft, ritorna artifact `tipId`-linked.
3. **Generalizzare `TipData` → `ProductionRequest`** (rimuove accoppiamento BT-only — coerente col refactor di `@voler/connectors`).
4. **Attribuzione engagement social per-post**: oggi outcome = GA4/GSC a livello pagina; serve record per `platformPostId` legato al contenuto.
5. **Commenti → contenuto d'origine**: collegare i signal-commento al `tipId`.
6. **Lead/CRM**: i lead veri richiedono l'integrazione CRM.
7. **Accesso performance + signals da CT**: entità del layer condiviso lette dal cervello (DB unico post-monorepo / bridge API pre-monorepo).
8. **Memoria di progetto** + **Craft Library** + **gate di verifica** + **registro produttori**: il cuore nuovo della Fase 2 CT.

---

## 10. Implicazioni per bundling/pricing

- **BT solo**: costruisci il cervello + insight, produci altrove. Il `ProjectTip` diventa un deliverable (brief) per agenzia/freelance → momento d'upsell.
- **CT solo**: produci on-brand, ma alimenti il cervello a mano (KB) e niente loop live né apprendimento dagli esiti. "CT al buio".
- **Bundle**: il flywheel vivo — produci ciò che i dati dicono, misuri, apprendi, e **compone nel tempo**. Il premio del bundle è il loop + gli **asset condivisi** (BrandSkill, KB, Craft Library, connectors costruiti una volta, usati ovunque). È anche il pitch dell'agenzia ("capiamo + produciamo + misuriamo").

Conseguenza: il **bridge è on di default** nel bundle (non un nice-to-have, è la ragione del bundle); CT-con-BT è strettamente migliore di CT-solo → upsell naturale in entrambe le direzioni.

---

## 11. Open questions

1. **Soglia "produci in CT" vs interno**: post-monorepo l'interno *è* CT (i moduli migrano) — confermare che tutta la produzione passi dal cervello CT.
2. **Granularità Craft Library**: universale + specializzazione per segmento (cultura/prodotto)? Per brand?
3. **Freshness trend di formato**: feed curato manuale, listening automatico, o benchmark? Cadenza?
4. **Memoria di progetto**: quanto storico tiene lo Strato 1 (tutto / finestra / riassunto)?
5. **Costo del cervello a 4 strati**: il loop di critica + multi-modello alza i crediti per contenuto — calibrare il costo-azione (vedi pricing).
6. **Accesso pre-monorepo**: se CT spedisce prima del merge, serve davvero il bridge API o aspettiamo il DB unico?
