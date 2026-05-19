# Toolia Studio — Master Roadmap di allineamento al piano strategico

> **Per chi esegue:** Questo è un **master roadmap**, non un piano TDD step-by-step. Ogni sotto-progetto qui descritto avrà bisogno di un proprio piano di esecuzione dettagliato (vedi `superpowers:writing-plans` per la versione da eseguire). Le checkbox `- [ ]` qui sono **milestone di fase**, non micro-step.

**Goal:** Riposizionare Toolia da "generatore audioguide AI" a **"content engine del sito culturale"** in cui l'audioguida è il primo di N output, allineando l'architettura al piano legacy. Tutto in 6 fasi su 5-8 mesi mantenendo il prodotto funzionante.

**Riposizionamento strategico:** la dataset editoriale ricca (KB verificata + semantic base + lenses + tension map) ha valore intrinseco oltre l'audioguida. Stesso dato → audioguida visitatore + post social + articoli blog + brochure + newsletter + comunicati + copy sito + audio promo. **Toolia diventa il content engine del cliente**, l'audioguida è il primo prodotto.

**Architettura target:**
- Multi-tenant SaaS con isolamento server-side delle API keys LLM
- Pipeline editoriale a livelli: Intent layer → Evidence layer → Spatial Graph → Editorial Lenses → Semantic Base → **Content Engine (RAG)** → Output multipli (audioguide visitor app + multi-channel content)
- Audioguide visitor app deterministica che consuma pack pre-generati (non DB live)
- Content Studio interno per generazione multi-canale on-demand
- Studio workspace proposal-first con readiness sempre visibile

**Tech Stack:** Next.js 16, Prisma 7 / PostgreSQL **+ pgvector**, NextAuth v5, OpenAI (LLM + embeddings) / Anthropic SDK, ElevenLabs TTS, Cloudflare R2, Resend, Tailwind v4, Expo SDK 53+ (per app nativa post-Fase 3).

---

## Sommario delle 6 fasi (v3 — con estensioni 2026-05-19)

| Fase | Durata | Obiettivo | Sotto-progetti |
|---|---|---|---|
| **Fase 0** — Stabilizzazione | 1-2 sett. | Bug critici, deploy hardening, **cost tracking LLM per-progetto** | 5 |
| **Fase 1** — Fondazione architetturale | 3-5 sett. | Segment Graph + Editorial Lenses (refactor completo) + Narrative Tension Map | 3 |
| **Fase 2** — Content Engine RAG | 5-7 sett. | pgvector + retrieval + content templates + Content Studio + brand voices per-tenant | 6 |
| **Fase 3** — Produzione audioguide + branding | 4-5 sett. | Visual Layer + DeliveryPack + storage R2 + **export progetto** + **branding/white-label per progetto** | 5 |
| **Fase 4** — Visitor app evoluta | 7-13 sett. | Wizard + chatbot + family + Expo nativa (**+ app icon + branding nativo per progetto**) + onboarding | 5 |
| **Fase 5** — Operations & scaling + compliance | 4-6 sett. | Readiness trasversale + multilingua + **analytics interna + visitor analytics per cliente** + **auto-review hallucination** + GDPR + **AI Act compliance** | 6 |

**Totale stimato:** 24-38 settimane (~6-9.5 mesi) con 1 sviluppatore full-time. Aumento vs v2 (22-35 sett.) deriva da:
- Estensione 5.3 visitor analytics dashboard per cliente (+4-6gg)
- Estensione 3.5 branding/white-label per progetto (+7-10gg)
- Estensione 4.4 con app icon Expo per progetto (+2-3gg incluso nel range Expo esistente)
- Nuovo 5.6 AI Act compliance (+8-12gg + consulenza legale)

**Capability esplicite confermate dall'utente (2026-05-19):**
- ✅ Cost tracking per progetto (0.5 esteso)
- ✅ Export progetto (3.4)
- ✅ Auto-review hallucination (5.4)
- ✅ Branding e customizzazione frontend per progetto (3.5)
- ✅ Upload app icon (Expo nativa per progetto in 4.4)
- ✅ AI Act compliance (5.6 nuovo)
- ✅ Data analytics utilizzo app (5.3 esteso con dashboard cliente)

**Decisioni v2 (2026-05-19):**
1. Scope: 100% piano legacy + content engine come capability strategica
2. Reset progetti demo: niente migration scripts
3. App Expo: in scope dopo Fase 3 (era Fase 2)
4. **Toolia content engine first** — Fase 2 RAG ribaltata prima della produzione audioguide
5. Simplifications applicate: 0.3 Job queue (no tabella Job, solo maxDuration + SSE), 3.2 DeliveryPack (no versioning V1), 5.1 Workspace (solo readiness trasversale, no superficie 8-pieces)
6. Lenses refactor completo (no incremental) — è il cuore del valore

---

## Fase 0 — Stabilizzazione tecnica

**Premessa:** Prima di toccare l'architettura, sistemiamo i bug che metterebbero a rischio sicurezza e deploy. Tutti i sotto-progetti qui sono **prerequisiti** per il lavoro successivo: l'introduzione di nuove tabelle nella Fase 1 amplifica i rischi se non risolviamo prima il deploy delle migrazioni e l'isolamento per-tenant delle API keys.

**Durata:** 1-2 settimane. Può essere parallelizzato fra più persone — i 4 sotto-progetti sono indipendenti.

### 0.1 — Sicurezza & deploy hardening

**Why:** Tre problemi che possono esplodere in produzione:
- `DEV_BYPASS_AUTH=true` se finisce in `.env.production` apre il Studio a chiunque
- Le migrazioni Prisma non vengono applicate in CI/build → deploy con schema disallineato
- `/api/scrape` accetta POST da chiunque, utilizzabile come proxy HTTP

**What:** Tre fix indipendenti, ciascuno commit separato.

**How:**

- [ ] **0.1.a — Guard production su DEV_BYPASS_AUTH**
  - Modifica: `mvp/src/lib/rbac.ts:48` e `mvp/src/auth.config.ts:25`
  - Sostituire `if (process.env.DEV_BYPASS_AUTH === "true")` con `if (process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "true")`
  - Acceptance: in container con `NODE_ENV=production` e `DEV_BYPASS_AUTH=true`, `/progetti` redirect a `/auth/signin`

- [ ] **0.1.b — Migration deploy automatico**
  - Modifica: `mvp/package.json`
  - Aggiungere script `"start": "prisma migrate deploy && next start"`
  - Su Railway impostare `Start Command` esplicito a `npm run start`
  - Acceptance: deploy fresh con migration nuova → `prisma migrate status` ritorna "applied" senza intervento manuale

- [ ] **0.1.c — Auth su /api/scrape**
  - Modifica: `mvp/src/app/api/scrape/route.ts`
  - Aggiungere `await getSessionUser()` in cima al handler POST + `requireRole(user, ["Admin","Editor"])`
  - Update whitelist `auth.config.ts` solo se serve mantenerlo accessibile a fonti pubbliche (probabilmente non serve)
  - Acceptance: POST a `/api/scrape` senza session → 401

- [ ] **0.1.d — POST /checklist ricontrolla blockers automatici**
  - Modifica: `mvp/src/app/api/projects/[id]/checklist/route.ts:53-92`
  - Prima di `project.update({ status: "published" })`, ricalcolare i blockers automatici dello stesso modulo usato da `/readiness` e rifiutare se ce ne sono di tipo `block`
  - Acceptance: POST `/checklist` con `qualityChecklist` tutto a `true` ma zero schede published → 400 con `blockers_present`

**Files affected:** 4 file. **Effort:** 0.5-1 giorno.

### 0.2 — API keys server-side per-tenant

**Why:** Oggi le chiavi LLM (OpenAI, Anthropic, ElevenLabs) vivono in `localStorage` del browser e transitano nel body HTTP di ogni POST AI. Contrario al CLAUDE.md ("API keys LLM per-tenant in Tenant.settingsJson"). Implicazioni:
- Ogni editor deve configurare le chiavi nel proprio browser
- Impossibile ruotare centralmente
- Impossibile tracciare costi per tenant
- Le chiavi sono visibili in DevTools network tab

**What:** Spostare la lettura/scrittura delle chiavi dentro `Tenant.settingsJson.apiKeys`, accessibili solo via endpoint autenticato. Le route AI leggono le chiavi server-side dal tenant della sessione corrente, non più dal body.

**How:**
1. Nuova route `GET/PUT /api/tenant/api-keys` (solo `Admin`) che legge/scrive `Tenant.settingsJson.apiKeys`
2. Modificare TUTTE le 18 route `/api/ai/*` per leggere la chiave da `prisma.tenant.findUnique({where:{id:user.tenantId}}).settingsJson.apiKeys.<provider>` invece che da `body.apiKey`
3. Modificare UI Impostazioni (`mvp/src/app/impostazioni/`) per chiamare la nuova route invece di `loadApiKeys()` localStorage
4. Migrazione one-shot: aggiungere banner UI "le chiavi sono ora salvate per tenant — incollale di nuovo dalla pagina Impostazioni" finché non sono ripopolate
5. Rimuovere `mvp/src/lib/api-keys.ts` modulo client (deprecato)

**Files affected:**
- Create: `mvp/src/app/api/tenant/api-keys/route.ts`, `mvp/src/lib/tenant-keys.ts` (helper server-side)
- Modify: tutti gli `mvp/src/app/api/ai/*/route.ts` (~18 file), `mvp/src/app/impostazioni/page.tsx`, tutti i client che oggi fanno `loadApiKeys()` (~25 chiamate dal frontend)
- Delete: `mvp/src/lib/api-keys.ts`

**Acceptance:**
- Nessuna chiave LLM appare più nel body delle request `/api/ai/*` (verificabile in DevTools)
- Cambio chiave in Impostazioni → riflesso immediato su tutte le sessioni del tenant
- Test e2e: come Admin del Tenant A, configuro la chiave; come Admin del Tenant B, vedo la mia separata; come Editor del Tenant A, non posso vedere la chiave in chiaro (solo placeholder "configurata")

**Effort:** 3-5 giorni. **Risk:** medio — tocca molte route, serve testing end-to-end accurato. Mitigation: refactor incrementale con feature flag temporaneo che permette fallback al body.

### 0.3 — Async hardening per operazioni AI lunghe (semplificato v2)

**Why:** Solo TTS e bulk generation rischiano davvero di sforare 30s su Railway. Le altre 16 route AI stanno comodamente sotto. Soluzione completa con tabella Job è overkill — applichiamo solo dove serve.

**What:** 3 fix mirati senza introdurre Job table runtime.

**How:**

- [ ] **0.3.a — `maxDuration` esplicito sulle 3 route più lente**
  - Modify: `mvp/src/app/api/projects/[id]/schede/[schedaId]/audio/route.ts`, `mvp/src/app/api/ai/extract-kb-single/route.ts`, `mvp/src/app/api/ai/generate-semantic-base/route.ts`
  - Aggiungere in cima al file: `export const maxDuration = 120` (Vercel/Railway leggono questa export)
  - Acceptance: TTS scheda 2000 parole completa senza timeout

- [ ] **0.3.b — Bulk generation server-side con SSE streaming**
  - Spostare `bulkGenerateAll` da `schede/page.tsx` (client) a una nuova route `POST /api/projects/[id]/schede/bulk-generate` che usa SSE per stream del progresso
  - Client: usa EventSource per ricevere `{progress: 0.4, completed: ['poi1','poi2'], current: 'poi3'}` durante l'esecuzione
  - Server: orchestrazione sequenziale con concorrenza limitata (max 5 chiamate LLM parallele)
  - Acceptance: bulk generate per 20 POI × 2 narratori (~60 calls) → progress visibile + errore singolo non blocca il resto

- [ ] **0.3.c — Job table mantenuta solo per future export/long-running**
  - Nessun lavoro qui — la tabella resta come futura riserva architetturale
  - Documentare in `mvp/prisma/schema.prisma` con commento `// reserved for future async export/import`

**Files affected:**
- Modify: 3 route AI (aggiunta maxDuration)
- Create: `mvp/src/app/api/projects/[id]/schede/bulk-generate/route.ts`
- Modify: `mvp/src/app/progetti/[id]/schede/page.tsx` (sostituire client loop con EventSource)

**Acceptance generale:** nessuna operazione AI standard timeout su Railway. Bulk generation visibile e robusto.

**Effort:** 2-3 giorni (semplificato da 4-6gg v1). **Risk:** basso.

### 0.4 — Bug fixes minori (batch)

**Why:** Sono fix piccoli ma visibili nell'UX o nei comportamenti silenziosi-pericolosi.

**What:** Batch di 8 fix, ciascuno con un commit.

**How:**

- [ ] **0.4.a — `ZoneFunction.chiusura` accessibile dallo Step Luogo**
  - Modify: `mvp/src/lib/project-store.ts:227` (tipo `ZoneFunction` da `"apertura"|"sviluppo"|"climax"` a includere `"chiusura"`)
  - Modify: `mvp/src/app/progetti/[id]/luogo/page.tsx:76-86` (aggiungere label+hint per `chiusura`)
  - Modify: `mvp/src/lib/project-store.ts:932-943` (`normalizeZoneFunction` mappa `closure`→`chiusura`, non `sviluppo`)
  - Acceptance: posso creare zone con funzione "chiusura" dallo Step Luogo

- [ ] **0.4.b — `suggest-zones` ritorna funzioni italiane**
  - Modify: `mvp/src/app/api/ai/suggest-zones/route.ts` prompt + validation set
  - Acceptance: response JSON usa `apertura|sviluppo|climax|chiusura`

- [ ] **0.4.c — Soft delete narratori e percorsi**
  - Schema: aggiungere `archived Boolean @default(false)` a `NarratorProfile` e `Path`
  - Migration: `npx prisma migrate dev --name narrator_path_soft_delete`
  - Modify: `narrators/[narratorId]/route.ts:96` e `paths/[pathId]/route.ts:89` — sostituire `prisma.X.delete()` con `prisma.X.update({data:{archived:true}})`
  - Modify: tutte le `findMany` aggiungono `where: { archived: false }`
  - Acceptance: DELETE narratore → schede collegate restano, narratore non appare più nelle liste

- [ ] **0.4.d — Workflow status su FamilyMission**
  - Schema: aggiungere `status SchedaStatus @default(draft)` (riusa enum esistente)
  - Migration
  - Modify: visitor data fetcher filtra `status: "published"`
  - Acceptance: missioni in stato draft non appaiono nel visitor app

- [ ] **0.4.e — Race condition unique scheda → 409 invece di 500**
  - Modify: `mvp/src/app/api/projects/[id]/schede/route.ts` POST — `try { ... } catch (e: any) { if (e.code === 'P2002') return 409 }`
  - Acceptance: race su (poi,narrator,lang) ritorna 409 con error code `already_exists`

- [ ] **0.4.f — Stale audio anche su modifica titolo? NO** (decisione architettonica: titolo non entra in TTS, lasciar perdere). **Sì** invece: stale audio su modifica semantic base del POI
  - Modify: `mvp/src/app/api/projects/[id]/pois/[poiId]/semantic-base/route.ts` — dopo update semantic base, marcare `isStale=true` su tutte le audio asset delle schede derivate (`schede where poiId=...`)
  - Acceptance: modificare base semantica di un POI → tutte le sue schede mostrano badge "audio obsoleto"

- [ ] **0.4.g — Fix link rotto /v/[id]/lingua**
  - Modify: il componente che genera il link (probabilmente `visitor-home.tsx`) → rimuoverlo o farlo puntare a una pagina esistente
  - Acceptance: nessun link 404 nell'app visitor

- [ ] **0.4.h — Debounce su PUT brief**
  - Modify: `mvp/src/app/progetti/[id]/brief/page.tsx:162-170` → wrap `persist()` in un debounce a 800ms (lodash o custom hook)
  - Acceptance: digitando velocemente in un textarea del brief, max 1 chiamata PUT al secondo

**Files affected:** ~12 file. **Effort:** 2-3 giorni totali. **Risk:** basso, tutti fix isolati.

### 0.5 — Cost tracking LLM per-tenant

**Why:** Un progetto medio consuma $30-80 di chiamate OpenAI/ElevenLabs (KB extract + 20 semantic base + 40 schede + 40 audio + 20 Q&A pack). **Niente nel sistema attuale traccia questi costi**. Senza, non possiamo: avere alert quando un tenant brucia budget, mostrare consumo all'utente, applicare quote, prevedere costi a scala.

**What:** Logging consumo token + dashboard Impostazioni + (opzionale) cap configurabile.

**How:**

1. **Schema**
   ```prisma
   model LlmUsage {
     id          String   @id @default(cuid())
     tenantId    String
     tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
     projectId   String?
     operation   String   // "extract-kb" | "generate-scheda" | "tts" | etc.
     provider    String   // "openai" | "anthropic" | "elevenlabs"
     model       String   // "gpt-4o" | "eleven_multilingual_v2" | etc.
     inputTokens Int      @default(0)
     outputTokens Int     @default(0)
     audioSeconds Int     @default(0)  // per TTS
     costUsd     Float    @default(0)  // calcolato
     createdAt   DateTime @default(now())
     @@index([tenantId, createdAt])
     @@index([projectId])
   }
   ```

2. **Helper centrale**
   - `mvp/src/lib/llm-usage.ts`: funzione `logLlmCall({tenantId, projectId, operation, provider, model, usage})` chiamata da ogni route AI. **`projectId` sempre passato quando applicabile** per breakdown granulare
   - Tabella pricing hardcoded (aggiornabile da env): GPT-4o $2.50/1M input, $10/1M output, ecc.

3. **Integrazione nelle route AI**
   - In ognuna delle 18 route AI: dopo la risposta LLM, estrarre `usage` dall'oggetto response (OpenAI/Anthropic restituiscono token count) e chiamare `logLlmCall(...)`
   - Per route che operano su un progetto specifico, passare `projectId`. Per route a livello tenant (es. retrieval generale), `projectId: null`

4. **Dashboard**
   - Nuova pagina `Impostazioni > Consumo`
   - Grafico ultimi 30 giorni $ + tabella **per progetto** (drill-down: ogni progetto mostra costo cumulativo + breakdown per operation)
   - Filtri per data range, per progetto, per operation
   - **Per-project page**: nella dashboard di ogni progetto, widget "Costo AI di questo progetto" con grafico storico

5. **(Opzionale fase successiva)** Quote: hard stop quando un tenant supera soglia configurabile in `Tenant.settingsJson.usageQuota`

**Files affected:**
- Create: migration `LlmUsage`, `mvp/src/lib/llm-usage.ts`, `mvp/src/app/impostazioni/consumo/page.tsx`, `mvp/src/app/api/tenant/usage/route.ts`
- Modify: tutte le 18 route AI (~3 righe ognuna per chiamare `logLlmCall`)

**Acceptance:**
- Dopo 1 progetto demo generato end-to-end: dashboard mostra ~$30-50 consumati con breakdown per operation
- Filtro per progetto isola correttamente costi

**Effort:** 3-4 giorni. **Risk:** basso.

### Checkpoint Fase 0

- [ ] Tutti gli 0.1-0.5 mergiati su `main`
- [ ] Deploy Railway verde, smoke test su tutti gli step manuali
- [ ] Nessuna chiave LLM nel body HTTP (verifica DevTools)
- [ ] Migration applicate automaticamente al deploy
- [ ] Cost tracking visibile per tenant

---

## Fase 1 — Fondazione architetturale

**Premessa:** Qui introduciamo i 3 strati mancanti del piano legacy che sbloccano tutto il resto. Sono refactor invasivi ma ortogonali: si possono iniziare in parallelo se hai più di una persona, altrimenti **l'ordine raccomandato è 1.1 → 1.2 → 1.3** perché ogni layer beneficia del precedente.

**Durata:** 3-5 settimane.

### 1.1 — Segment Graph (Step 2 del piano legacy)

**Why:** È il gap strategico più grave. Il piano legacy lo definisce *"la verità operativa della visita"*. Senza grafo dei segmenti:
- Il compositore di percorsi runtime non sa quali POI sono fisicamente connessi
- Impossibile calcolare costo di percorrenza, attriti di deviazione
- I percorsi sono sequenze cieche, non grafi
- L'invariante "spazio vince su narrazione" è solo retorica nei prompt LLM, non un dato

**What:** Introdurre 2 nuovi modelli (`MapNode`, `Segment`) + UI map-first per editarli + AI che li propone insieme a POI/zone.

**How:**

1. **Schema Prisma**
   ```prisma
   model MapNode {
     id           String   @id @default(cuid())
     projectId    String
     project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
     kind         NodeKind  // accesso|bivio|transizione|rientro
     lat          Float?
     lng          Float?
     planimetriaX Float?
     planimetriaY Float?
     label        String?
     order        Int      @default(0)
     createdAt    DateTime @default(now())
     updatedAt    DateTime @updatedAt
     segmentsFrom Segment[] @relation("SegmentFrom")
     segmentsTo   Segment[] @relation("SegmentTo")
     @@index([projectId])
   }
   
   enum NodeKind { accesso bivio transizione rientro }
   
   model Segment {
     id             String   @id @default(cuid())
     projectId      String
     project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
     fromNodeId     String
     fromNode       MapNode  @relation("SegmentFrom", fields: [fromNodeId], references: [id], onDelete: Cascade)
     toNodeId       String
     toNode         MapNode  @relation("SegmentTo", fields: [toNodeId], references: [id], onDelete: Cascade)
     kind           SegmentKind  // passaggio|ramo|loop|connessione
     traversalSec   Int?         // tempo di percorrenza stimato
     detourCost     Float?       // 0-1, attrito di deviazione
     poiIds         String[]     @default([])  // POI che vivono lungo il segmento
     bidirectional  Boolean      @default(true)
     createdAt      DateTime     @default(now())
     updatedAt      DateTime     @updatedAt
     @@index([projectId])
   }
   
   enum SegmentKind { passaggio ramo loop connessione }
   ```
   - Aggiungere `nodes Node[]` e `segments Segment[]` alla relazione `Project`
   - Aggiungere `nodeId String?` opzionale a `POI` (un POI può coincidere con un nodo)

2. **API CRUD**
   - `GET/PUT /api/projects/[id]/graph` — pattern full-replace come `/map` esistente, ma per nodes+segments
   - `POST /api/ai/propose-graph` — chiama OpenAI con POI esistenti + planimetria + descrizione → ritorna nodes e segments candidati

3. **UI map-first**
   - Nuovo componente `<GraphEditor>` sotto `mvp/src/app/progetti/[id]/luogo/` che permette:
     - Click su mappa/planimetria per aggiungere nodo (selezione tipo: accesso/bivio/...)
     - Drag da nodo a nodo per creare segmento (selezione tipo: passaggio/ramo/...)
     - Inline edit traversalSec e detourCost sul segmento selezionato
     - Tab "Vista logica" vs "Vista georef" — la logica è una grafica forza-diretta dei nodi, la georef è la mappa reale
   - Integrazione con i POI esistenti: drop di POI su segment lo assegna a `segment.poiIds`

4. **Prompt LLM**
   - System prompt: "Sei un planner di percorsi per audioguida. Data una planimetria e i POI, identifica nodi topologici (accessi, bivi, transizioni, rientri) e segmenti che li collegano. Ogni segmento ha un tipo (passaggio/ramo/loop/connessione) e una stima di tempo di percorrenza in secondi. NON inventare connessioni che non sono plausibili sulla planimetria."

5. **Reset progetti demo** (decisione 2): nessun migration script. Dopo deploy del nuovo schema, eseguire `dev-reset.sh` per wipe-and-recreate i progetti demo (es. `forte-monte-tesoro` da `fixtures/`).

**Files affected:**
- Create: `mvp/prisma/migrations/<timestamp>_segment_graph/migration.sql`, `mvp/src/app/api/projects/[id]/graph/route.ts`, `mvp/src/app/api/ai/propose-graph/route.ts`, `mvp/src/components/graph-editor.tsx`, `mvp/scripts/seed-default-graph.ts`
- Modify: `mvp/prisma/schema.prisma` (3 nuovi model), `mvp/src/app/progetti/[id]/luogo/page.tsx` (tab "Grafo"), `mvp/src/lib/project-store.ts` (nuovi tipi)
- Modify: `mvp/src/app/api/projects/[id]/compose-visit/route.ts` (può ora usare segments per calcolare tempi realistici, opzionale)

**Acceptance:**
- Su un progetto demo con planimetria + 10 POI: clicco "Proponi grafo" → AI propone 6-8 nodi e 8-12 segmenti
- Posso editare manualmente: aggiungere/rimuovere nodo, cambiare tipo segmento, modificare traversalSec
- Il grafo persiste correttamente attraverso reload
- I percorsi esistenti continuano a funzionare (backward compat via `poiOrderJson`)

**Effort:** 8-12 giorni. **Risk:** alto (è il refactor più grosso della Fase 1). Mitigation: feature flag `enableGraphEditor=true` sui progetti nuovi, vecchi mantengono `MapAnchor`-only.

### 1.2 — Editorial Lenses come asse di generazione

**Why:** Il piano legacy è cristallino: *"le personas servono a capire il visitatore, le lenti editoriali servono a produrre contenuto"*. Il codice oggi genera Scheda con asse `(POI × narratore × lingua)` — il narratore meccanicamente surroga la lente. Risultato: lo stesso narratore con due ratings driver diversi produce comunque la stessa scheda. La promessa di "letture diverse dello stesso luogo" non è mantenuta.

**What:** Introdurre `EditorialLens` come tabella popolata (oggi è in JSONB blob) + cambiare l'asse di generazione schede a `(POI × lens × narratore × lingua)` con depth flag (`primary` / `deep_dive`).

**How:**

1. **Schema Prisma**
   ```prisma
   // EditorialLens già esiste in schema (linea 405) ma non viene mai popolato.
   // Ampliarlo:
   model EditorialLens {
     id            String   @id @default(cuid())
     projectId     String
     project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
     name          String                    // "Storia per famiglie", "Architettura per esperti"
     primaryDriverId String?
     primaryDriver Driver?  @relation("PrimaryDriverLens", fields: [primaryDriverId], references: [id])
     secondaryDriverIds String[] @default([])
     personaIds    String[] @default([])
     tone          String?  @db.Text
     description   String   @db.Text         // come si caratterizza
     active        Boolean  @default(true)   // solo 3-4 attive di default
     createdAt     DateTime @default(now())
     updatedAt     DateTime @updatedAt
     @@index([projectId])
   }
   
   // Modificare Scheda:
   model Scheda {
     // ... esistente ...
     lensId        String?
     lens          EditorialLens? @relation(fields: [lensId], references: [id], onDelete: SetNull)
     depth         SchedaDepth   @default(primary)
     // rimuovere/relaxare l'unique constraint precedente
     @@unique([poiId, lensId, narratorId, language, depth])
   }
   
   enum SchedaDepth { primary deep_dive }
   ```

2. **Reset progetti demo** (decisione 2): nessuna migration script per le schede esistenti. Wipe-and-recreate dopo deploy schema.

3. **API CRUD**
   - `GET/POST /api/projects/[id]/lenses` e `PATCH/DELETE /api/projects/[id]/lenses/[lensId]`
   - Modificare l'endpoint di salvataggio `drivers-personas` per estrarre `lenses[]` dal JSONB blob → tabella `EditorialLens` + `Driver` + `Persona` (popolare anche queste)

4. **Prompt LLM**
   - `generate-scheda` accetta `lensId` come parametro
   - Il prompt riceve il contesto lens: `primaryDriver.name`, `tone`, `description`
   - Esempio system prompt addition: "Stai scrivendo questa scheda attraverso la lente '{lens.name}' caratterizzata da: {lens.description}. La voce dominante deve essere {primaryDriver.name}, con sfumature di {secondaryDrivers.join(', ')}. Tono di lente: {lens.tone}"

5. **UI Schede**
   - Editor schede mostra le 3-4 lenti attive come tab in cima
   - Per ogni POI: matrice (lens × narratore) di schede esistenti
   - Click su cella vuota → genera scheda per quella combinazione

6. **Compose-visit aggiornato**
   - Quando il visitatore arriva con una persona dominante: il sistema sceglie la lens che ha quella persona nel `personaIds`
   - Per ogni POI servito, sceglie la scheda con `lens=chosenLens, depth=primary, narrator=pathNarrator, language=visitorLang`
   - Fallback: se la combinazione precisa non esiste, scende di gerarchia (lens generica, narratore backbone, ecc.)

**Files affected:**
- Create: `mvp/prisma/migrations/<timestamp>_lenses_axis/migration.sql`, `mvp/src/app/api/projects/[id]/lenses/route.ts`, `mvp/src/app/api/projects/[id]/lenses/[lensId]/route.ts`, `mvp/scripts/migrate-lenses-from-blob.ts`
- Modify: `mvp/prisma/schema.prisma`, `mvp/src/app/api/projects/[id]/schede/route.ts` (gestire nuovo asse), `mvp/src/app/api/projects/[id]/schede/[schedaId]/route.ts`, `mvp/src/app/api/ai/generate-scheda/route.ts` (prompt + parametro lens), `mvp/src/app/progetti/[id]/schede/page.tsx` (UI matrice lens×narrator), `mvp/src/app/progetti/[id]/driver/page.tsx` (UI per popolare le 3-4 lenti attive), `mvp/src/app/api/projects/[id]/compose-visit/route.ts` (selezione lens runtime)

**Acceptance:**
- Sui progetti esistenti, le schede vecchie continuano a esistere con `lens=null` (backward compat)
- Sui progetti nuovi: posso definire 3-4 lenti attive nello Step 3
- Generazione schede produce versioni diverse per la stessa combo (POI×narratore) se cambio lens
- Test A/B: due profili visitatori con persona diversa → ricevono testi diversi sullo stesso POI

**Effort:** 10-15 giorni. **Risk:** alto — è il refactor più impattante per la generazione contenuti. Mitigation: feature flag `lensesAxisEnabled` per-progetto.

### 1.3 — Narrative Tension Map (Step 1 del piano legacy)

**Why:** Il piano legacy la definisce come *output minimo dello Step 1*: oggetto editoriale che rende esplicito cosa il cliente vuole spingere vs cosa le fonti sostengono vs cosa è narrativamente forte vs cosa va trattato cauto vs cosa va tenuto fuori. È la bussola che gli step successivi consultano per arbitrare. Senza, ogni decisione AI parte da capo.

**What:** Nuovo modello `NarrativeTension` + UI sezione Brief + AI che la propone da KB+brief+intervista.

**How:**

1. **Schema**
   ```prisma
   model NarrativeTension {
     id           String   @id @default(cuid())
     projectId    String   @unique  // 1 per progetto
     project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
     mustTellJson Json     @default("[]")    // array di item {title, why, source}
     niceToTellJson Json   @default("[]")
     avoidJson    Json     @default("[]")    // {topic, reason}
     verifyJson   Json     @default("[]")    // {claim, source, status: pending|verified|rejected}
     tensionsJson Json     @default("[]")    // {clientWants, sourcesSay, recommendation}
     createdAt    DateTime @default(now())
     updatedAt    DateTime @updatedAt
   }
   ```

2. **API**
   - `GET/PUT /api/projects/[id]/narrative-tension`
   - `POST /api/ai/propose-tension-map` — input: KB + brief + transcript intervista → output: 4 array + tensioni

3. **UI**
   - Sezione nuova nello Step Brief: "Mappa delle tensioni narrative" con 4 colonne (must/nice/avoid/verify) + sezione "Tensioni" dove il sistema evidenzia conflitti rilevati
   - Ogni item: clickable, link alla fonte originale, possibilità di promuovere/declassare

4. **Integrazione downstream**
   - Il prompt `generate-semantic-base` riceve la tension map nel contesto
   - Quando una scheda toccherebbe un argomento `avoid`, l'AI lo segnala in `editorialWarnings`
   - Le `verify` non confermate generano warning nello Step 6 (Pubblica)

**Files affected:**
- Create: migration, `mvp/src/app/api/projects/[id]/narrative-tension/route.ts`, `mvp/src/app/api/ai/propose-tension-map/route.ts`, `mvp/src/components/narrative-tension-map.tsx`
- Modify: schema, `mvp/src/app/progetti/[id]/brief/page.tsx` (aggiunta sezione), `mvp/src/app/api/ai/generate-semantic-base/route.ts` (prompt + lettura tension map)

**Acceptance:**
- Posso generare una tension map automaticamente dal brief+KB
- Le schede generate dopo evitano gli argomenti `avoid`
- Lo step Pubblica mostra warning se ci sono `verify` non ancora confermati

**Effort:** 5-7 giorni. **Risk:** medio — il valore reale dipende dalla qualità del prompt; iterazione necessaria.

### Checkpoint Fase 1

- [ ] Segment graph editabile e popolato sui progetti nuovi
- [ ] Editorial lenses generano contenuti differenziati sullo stesso POI
- [ ] Narrative tension map produce vincoli editoriali downstream
- [ ] Test end-to-end: creo progetto demo, completo Steps 1-3 con tutti i nuovi layer, vedo le differenze nelle schede

---

## Fase 2 — Content Engine RAG (riposizionamento prodotto)

**Premessa strategica:** Con la dataset editoriale ricca della Fase 1 in place (KB strutturata + semantic base + lenses + tension map), abbiamo un asset che ha valore oltre l'audioguida. Questa fase trasforma quella dataset in un motore che produce **contenuti di comunicazione multi-canale** per il cliente: post social, articoli blog, brochure, newsletter, comunicati stampa, copy web, audio promozionali.

**Posizionamento risultante:** Toolia smette di essere "generatore di audioguide" e diventa **"content engine del sito culturale"** — l'audioguida è il primo output, il content engine alimenta tutta la comunicazione del cliente da una sola fonte di verità.

**Durata:** 5-7 settimane.

### 2.1 — pgvector + embedding pipeline

**Why:** Per fare retrieval semantico (non solo full-text) servono embedding vettoriali del materiale editoriale. Postgres ha l'estensione `pgvector` nativa, supportata da Railway — niente Pinecone/Qdrant esterni necessari per scala MVP.

**What:** Estensione DB + tabella embedding + worker di re-indexing on-change.

**How:**

1. **Setup pgvector**
   - Railway: abilitare estensione su Postgres con `CREATE EXTENSION vector;`
   - Aggiungere `previewFeatures = ["postgresqlExtensions"]` a `generator client` in schema.prisma
   - Aggiungere `extensions = [vector]` a `datasource db`

2. **Schema**
   ```prisma
   model ContentEmbedding {
     id           String   @id @default(cuid())
     projectId    String
     project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
     sourceType   EmbeddingSourceType  // kbfact | semantic_base | brief | tension_item
     sourceId     String                // FK soft a KBFact.id, POI.id (per semantic_base), ecc.
     chunkIndex   Int      @default(0)  // se sorgente è chunked
     content      String   @db.Text     // testo del chunk
     embedding    Unsupported("vector(1536)")?  // OpenAI text-embedding-3-small dimensions
     metadataJson Json     @default("{}")  // tag, lens fit, category, ecc.
     createdAt    DateTime @default(now())
     @@index([projectId, sourceType])
     // Vector index creato via raw SQL nella migration (Prisma non lo supporta nativamente)
   }
   enum EmbeddingSourceType { kbfact semantic_base brief tension_item poi_description }
   ```
   - Migration SQL extra: `CREATE INDEX content_embedding_vector_idx ON "ContentEmbedding" USING hnsw (embedding vector_cosine_ops);`

3. **Embedding worker**
   - `mvp/src/lib/embeddings.ts`: funzione `embed(text: string): Promise<number[]>` usa OpenAI `text-embedding-3-small` ($0.02/1M token, ~$1 per progetto medio)
   - `reindexProject(projectId)`: recupera tutti i KBFact approvati, semantic base, brief, tension items → chunked + embed + insert/update `ContentEmbedding`
   - Trigger automatico: dopo approvazione KBFact, update semantic base, save brief → enqueue re-index del solo sorgente cambiato (non l'intero progetto)

4. **Route**
   - `POST /api/projects/[id]/embeddings/reindex` (Admin/Editor) — re-index manuale completo

**Files affected:**
- Create: migration con pgvector + ContentEmbedding + indici, `mvp/src/lib/embeddings.ts`, `mvp/src/app/api/projects/[id]/embeddings/reindex/route.ts`
- Modify: schema.prisma, route che modificano KBFact/SemanticBase/Brief/Tension (chiamare re-index incrementale)

**Acceptance:**
- Re-index di progetto demo (~80 KBFact + 20 semantic base) completa in <60s
- `SELECT count(*) FROM "ContentEmbedding" WHERE "projectId" = X` ritorna ~150-300 record
- Query SQL di prova: `SELECT content FROM "ContentEmbedding" ORDER BY embedding <=> '<query_vector>' LIMIT 5` ritorna risultati semanticamente rilevanti

**Effort:** 4-5 giorni. **Risk:** medio — pgvector setup richiede attenzione, primo embedding stack del codebase.

### 2.2 — Retrieval API + playground

**Why:** Avere embedding senza interfaccia di query è inutile. Servono: (a) un endpoint di retrieval per content templates, (b) un playground UI per Toolia per debug.

**What:** Endpoint `/retrieve` + pagina playground in Studio.

**How:**

1. **API**
   ```typescript
   // POST /api/projects/[id]/content/retrieve
   // body: { query: string, scope?: {poiIds?, driverIds?, lensIds?}, filter?: {categories?, reliability?}, topK: number }
   // response: { chunks: Array<{content, sourceType, sourceId, score, metadata}> }
   ```
   - Embed la query con stesso modello
   - Query pgvector con filtri WHERE + ORDER BY `embedding <=> query` LIMIT topK
   - Hybrid retrieval (opzionale fase successiva): combinare embedding + BM25 full-text

2. **UI playground**
   - Nuova route Studio `/progetti/[id]/content/playground`
   - Search bar libera, filtri scope/filter, risultati con score + link al sorgente originale
   - Serve a Toolia per: verificare qualità retrieval, debug template che non funzionano

**Files affected:**
- Create: `mvp/src/app/api/projects/[id]/content/retrieve/route.ts`, `mvp/src/app/progetti/[id]/content/playground/page.tsx`

**Acceptance:**
- Query "architettura militare del forte" su demo project → top 5 chunks includono KBFact verificati su quel topic
- Query con filter `reliability: "alta"` esclude `KBFact` low-confidence
- Playground UX permette iterazione veloce su query

**Effort:** 3-4 giorni. **Risk:** basso.

### 2.3 — Content templates (9 tipi)

**Why:** Il valore vero è generare output specifici per canale, non solo retrieval. Ogni canale ha vincoli (lunghezza, tone, struttura) che devono essere codificati nei prompt.

**What:** 9 template iniziali coprenti i canali principali. Ogni template = (prompt system + struttura output + parametri).

**How:**

1. **Schema**
   ```prisma
   model ContentTemplate {
     id            String   @id @default(cuid())
     // System-provided templates: tenantId is null
     // Tenant custom templates: tenantId set
     tenantId      String?
     tenant        Tenant?  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
     name          String                  // "Post Instagram (caption breve)"
     channel       ContentChannel          // instagram|twitter|blog|newsletter|brochure|press|email|web_hero|audio_promo
     promptSystem  String   @db.Text
     promptUser    String   @db.Text       // template con placeholder {{retrieved}}, {{brandVoice}}, ecc.
     outputSchema  Json                    // descrizione JSON dell'output atteso (title, body, hashtags, ecc.)
     parameters    Json     @default("{}") // {targetLength, includeHashtags, ecc.}
     isSystem      Boolean  @default(false)
     createdAt     DateTime @default(now())
     updatedAt     DateTime @updatedAt
     @@index([tenantId])
   }
   enum ContentChannel { instagram twitter blog newsletter brochure press email web_hero audio_promo }
   
   model ContentArtifact {
     id            String   @id @default(cuid())
     projectId     String
     project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
     templateId    String
     template      ContentTemplate @relation(fields: [templateId], references: [id], onDelete: Restrict)
     scope         Json     // {poiIds?, lensId?, driverIds?, custom?}
     brandVoiceId  String?
     title         String
     content       String   @db.Text
     metadataJson  Json     @default("{}")
     status        ContentStatus @default(draft)
     retrievalLog  Json     // chunks usati per la generazione (provenance)
     createdAt     DateTime @default(now())
     updatedAt     DateTime @updatedAt
     @@index([projectId])
     @@index([templateId])
   }
   enum ContentStatus { draft in_review approved published archived }
   ```

2. **Template iniziali (system, isSystem=true, tenantId=null)**
   - Seeded via migration o script:
     - `instagram_caption`: prompt che produce caption 150 char + 5 hashtag + descrizione visual suggerita
     - `twitter_post`: 280 char con CTA e 2-3 hashtag
     - `blog_article`: 800-1500 parole, struttura H1/H2/H3, SEO meta
     - `newsletter_section`: 200-300 parole + CTA
     - `brochure_paragraph`: 100-150 parole evocativi
     - `press_release`: titolo + sottotitolo + 3 paragrafi + boilerplate
     - `email_campaign`: subject + preheader + body + CTA
     - `web_hero`: headline (max 12 parole) + sub + 80 parole body
     - `audio_promo_30s`: script radio/IG reel, ~80 parole

3. **API**
   - `GET /api/projects/[id]/templates` — lista template disponibili (system + tenant custom)
   - `POST /api/projects/[id]/content/generate` — body: `{templateId, scope, brandVoiceId, customParameters}` → orchestratore che:
     1. Chiama retrieval con embedded query derivata da scope
     2. Compila promptUser con `{{retrieved}}`, `{{brandVoice}}`, `{{scope}}`
     3. Chiama LLM con promptSystem + promptUser
     4. Salva `ContentArtifact(status=draft)` con `retrievalLog` per provenance

**Files affected:**
- Create: migration ContentTemplate + ContentArtifact, `mvp/src/app/api/projects/[id]/templates/route.ts`, `mvp/src/app/api/projects/[id]/content/generate/route.ts`, `mvp/src/lib/content-orchestrator.ts`, `mvp/prisma/seed-system-templates.ts`

**Acceptance:**
- Su demo project: posso generare un post Instagram dal POI "Sala delle Armi" → output 150 char con hashtag rilevanti, retrieval log mostra i 5 chunks usati
- Stesso scope con template "press release" → output formale 400 parole

**Effort:** 7-10 giorni. **Risk:** medio — qualità prompt richiede iterazione, soprattutto per blog longform.

### 2.4 — Content Studio UI

**Why:** API senza UI è invisibile. Serve una superficie in Studio dove Toolia genera, edita, approva contenuti.

**What:** Nuova area `/progetti/[id]/content/` con: lista artifacts + editor + workflow approvazione.

**How:**

1. **Pagine**
   - `/progetti/[id]/content` — overview: griglia di tutti i ContentArtifact con filtri (canale, scope, status), ricerca, ordinamento
   - `/progetti/[id]/content/new` — wizard creazione: scegli canale → scegli scope (POI/zone/intero progetto) → scegli brand voice → scegli template → Genera
   - `/progetti/[id]/content/[artifactId]` — editor: vista contenuto editabile + sidebar con (template usato, scope, brand voice, retrieval log con link ai sorgenti)
   - Workflow status pulsanti: Approva, Manda in revisione, Archivia

2. **Export multi-formato**
   - Da `ContentArtifact`: pulsanti `Copia testo`, `Esporta .md`, `Esporta .docx` (libreria `docx`), `Esporta .html`
   - Future: integrazione `Pubblica su Notion` / `Aggiungi a coda Buffer` (fuori scope V1)

3. **Provenance UI**
   - Per ogni artifact: tab "Da dove viene" mostra retrieval log chunks (testo + link al KBFact/POI sorgente), per audit editoriale

**Files affected:**
- Create: 3 pagine `mvp/src/app/progetti/[id]/content/...`, componenti riusabili per editor

**Acceptance:**
- Posso generare, editare, approvare un artifact end-to-end
- Provenance trasparente: per ogni frase posso risalire al KBFact che l'ha ispirata
- Export `.docx` produce file con formattazione corretta

**Effort:** 6-8 giorni. **Risk:** medio (UI sostanziosa).

### 2.5 — Brand voices per-tenant

**Why:** Lo stesso sito culturale ha bisogno di più "voci" (audioguida narratore = caldo evocativo, social = giovane brillante, comunicato stampa = formale autorevole). Servono brand voices configurabili a livello tenant, applicabili ai template.

**What:** Tabella `BrandVoice` + UI Impostazioni + integrazione con content templates.

**How:**

1. **Schema**
   ```prisma
   model BrandVoice {
     id           String   @id @default(cuid())
     tenantId     String
     tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
     name         String                  // "Voce ufficiale", "Voce social", "Voce formale"
     description  String   @db.Text       // come si caratterizza
     toneAttributes String[] @default([]) // tag tipo "warm", "concise", "playful"
     sampleText   String   @db.Text       // esempio di output desiderato per few-shot
     constraints  String?  @db.Text       // "mai usare gergo", "max 1 esclamativo per testo"
     isDefault    Boolean  @default(false)
     createdAt    DateTime @default(now())
     updatedAt    DateTime @updatedAt
     @@index([tenantId])
   }
   ```

2. **UI**
   - Pagina `Impostazioni > Brand Voices`
   - Lista voices del tenant, possibilità di crearne nuove con wizard guidato
   - Edit inline con preview "Come suonerebbe il template X con questa voce?"

3. **Integrazione nel content orchestrator**
   - `content/generate` accetta `brandVoiceId` → il prompt include `{{brandVoice.description}} + few-shot {{brandVoice.sampleText}}`

**Files affected:**
- Create: migration BrandVoice, `mvp/src/app/api/tenant/brand-voices/route.ts`, `mvp/src/app/impostazioni/voices/page.tsx`
- Modify: `mvp/src/lib/content-orchestrator.ts`

**Acceptance:**
- Stesso template "Post Instagram" con 2 brand voices diverse produce post tonalmente diversi
- Toolia può clonare una voice esistente per evolverla

**Effort:** 4-5 giorni. **Risk:** basso.

### 2.6 — Content workflow & analytics

**Why:** Una volta che il sistema genera contenuti a scala, serve workflow di review e analytics di utilizzo.

**What:**
- Workflow draft → in_review → approved → published → archived (riusa pattern Scheda)
- Commenti su artifact (tabella `ContentComment` semplice)
- Analytics base: "questo mese generati N artifacts, M approvati, costo $X"

**Files affected:**
- Create: migration ContentComment, route review, dashboard analytics in content overview

**Effort:** 3-4 giorni. **Risk:** basso.

### Checkpoint Fase 2

- [ ] Embedding pipeline funzionante con re-index automatico
- [ ] Retrieval API qualità verificata su playground
- [ ] 9 content templates seedati e generano output corretti
- [ ] Content Studio UI end-to-end usabile
- [ ] Brand voices configurabili e impattano output
- [ ] Demo: da un progetto Forte Monte Tesoro genero 1 post IG + 1 articolo blog + 1 brochure, tutto coerente con la KB verificata

---

## Fase 3 — Produzione audioguide

**Premessa:** Con la dataset editoriale (Fase 1) e il content engine (Fase 2) in place, ora completiamo i layer specifici dell'audioguida: gestione asset visivi/audio separata, pacchetto di delivery deterministico per il visitor app, e export progetto. **Ordine raccomandato: 3.1 → 3.2 → 3.3 → 3.4** (3.1 sblocca lo storage R2 che 3.2 sfrutta per il delivery pack).

**Durata:** 4-5 settimane.

### 3.1 — Visual Asset Layer separato + R2 storage

**Why:** Oggi le immagini POI sono `imageUrl` direttamente su `POI`, l'audio è base64 dataURL in `AudioAsset.fileUrl`, i ritratti narratori idem. Conseguenze:
- Database bloat: ~1-2MB per record × N (audio + portrait + planimetria + foto POI)
- No riuso tra POI
- No tagging documentary/illustrative/generated
- No auto-link EXIF/GPS (piano legacy lo richiede)
- Backup Postgres lentissimo

**What:** Nuova tabella `VisualAsset` + integrazione R2 via presigned upload + tagging + auto-link EXIF/GPS.

**How:**

1. **Schema**
   ```prisma
   model VisualAsset {
     id          String   @id @default(cuid())
     projectId   String
     project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
     url         String   // R2 public URL
     storageKey  String   // chiave R2 per delete/management
     filename    String
     mimeType    String
     sizeBytes   Int
     width       Int?
     height      Int?
     exifLat     Float?
     exifLng     Float?
     exifTimestamp DateTime?
     kind        VisualKind  // documentary | illustrative | generated | reference_only
     role        VisualRole? // hero | gallery | poi_main | character_portrait | clue
     poiId       String?
     segmentId   String?
     narratorId  String?
     lensFit     String[]    @default([])
     stableDetail Boolean    @default(false)  // dettaglio stabile, utile per clue
     tags        String[]    @default([])
     createdAt   DateTime    @default(now())
     updatedAt   DateTime    @updatedAt
     @@index([projectId])
     @@index([poiId])
   }
   
   enum VisualKind { documentary illustrative generated reference_only }
   enum VisualRole { hero gallery poi_main character_portrait clue }
   ```

2. **R2 integration**
   - Presigned upload: `POST /api/projects/[id]/assets/upload-url` → ritorna URL R2 firmato (libreria `@aws-sdk/s3-request-presigner` già installata)
   - Client uploada direttamente a R2, poi `POST /api/projects/[id]/assets` con metadati → record DB
   - EXIF parsing server-side: libreria `exifr` (~10 KB) per estrarre lat/lng/timestamp

3. **Reset progetti demo** (decisione 2): nessuna conversione asset esistenti. Wipe + recreate con asset freschi caricati direttamente su R2.

4. **UI Visual workspace**
   - Nuova superficie `mvp/src/app/progetti/[id]/visual/page.tsx`
   - Grid di tutti gli asset con filtri per `kind`, `role`, POI associato
   - Drag-to-assign: trascino foto su POI → setta `poiId` + `role=poi_main`
   - Promote `reference_only → documentary` per portarlo nel delivery layer

5. **EXIF auto-link**
   - Quando upload foto con EXIF GPS, sistema propone POI più vicino (planimetriaToLatLng matching)
   - Toolia conferma o corregge

**Files affected:**
- Create: migration, `mvp/src/app/api/projects/[id]/assets/upload-url/route.ts`, `mvp/src/app/api/projects/[id]/assets/route.ts`, `mvp/src/app/api/projects/[id]/assets/[assetId]/route.ts`, `mvp/scripts/migrate-images-to-r2.ts`, `mvp/src/app/progetti/[id]/visual/page.tsx`, `mvp/src/lib/r2-client.ts`
- Modify: schema, tutti i componenti che oggi leggono `POI.imageUrl` / `narrator.portraitUrl` (~10 punti)

**Acceptance:**
- Upload foto da Studio → finisce in R2, non in DB
- Audio TTS salvato in R2, non in Postgres
- EXIF GPS auto-link funzionante
- Migration dati: progetto esistente con 50 POI image + 5 audio passa in <2min
- Dimensione DB ridotta del ~70%

**Effort:** 6-8 giorni. **Risk:** medio — necessario test attento della migration backward-compat.

### 3.2 — Project Delivery Pack V1 (semplificato v2 — no versioning)

**Why:** Piano legacy: *"il progetto deve poter essere trasformato in un pacchetto delivery-ready"*. Oggi pubblicare = `project.status='published'`, basta. Il visitor app fa fetch live di tutto. Conseguenze:
- Performance: fetch ripetuto di payload pesante a ogni navigazione
- Determinismo: la "preview Studio" e l'"app reale" possono divergere se cambi dati durante la visita

**Semplificazione v2:** V1 NON include versioning né rollback. 1 pack per progetto, sovrascritto a ogni publish. Versioning aggiunto solo quando un cliente avrà 10+ pubblicazioni e chiederà rollback (post-MVP).

**What:** Endpoint che, su pubblicazione, genera un snapshot deterministico (JSON in DB + asset in R2) che il visitor app consuma.

**How:**

1. **Schema (semplificato)**
   ```prisma
   model DeliveryPack {
     id              String   @id @default(cuid())
     projectId       String   @unique  // 1 pack per progetto
     project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
     manifestJson    Json                             // Runtime Manifest serializzato
     contentJson     Json                             // tutto il payload visitor-data congelato
     activatedAt     DateTime?                        // null = draft, non-null = active
     updatedAt       DateTime @updatedAt
   }
   ```

2. **Generation**
   - `POST /api/projects/[id]/delivery-pack/rebuild` — sincrono (~10-30s, accettabile con `maxDuration: 60`):
     - Snapshot di tutte le schede published, narratori, paths, POI, zones, semantic bases, assistant Q&A, family missions
     - Costruisce `manifestJson` (Runtime Manifest essenziale = ordine queue, asset URLs, fallback)
     - Costruisce `contentJson`
     - Upsert su `DeliveryPack(projectId=X)` con `activatedAt=now()`

3. **Visitor consumption**
   - `GET /api/projects/[id]/visitor-data` — refactor: ritorna `DeliveryPack.contentJson` se `activatedAt != null`, fallback a 404 altrimenti
   - Cache HTTP `max-age=3600` perché ora è deterministico

4. **UI Studio Step 6**
   - Pubblica = check checklist + auto-rebuild del pack
   - Mostra "ultima pubblicazione: 2 minuti fa" + bottone "Rebuild" manuale se necessario

**Files affected:**
- Create: migration (schema semplificato), `mvp/src/app/api/projects/[id]/delivery-pack/rebuild/route.ts`, `mvp/src/lib/delivery-pack-builder.ts`
- Modify: `mvp/src/app/api/projects/[id]/visitor-data/route.ts`, `mvp/src/app/progetti/[id]/pubblica/page.tsx`

**Acceptance:**
- Pubblicare = checklist OK + rebuild pack (~15s) + visitor app legge pack
- Modifiche al DB studio NON impattano visite in corso
- Performance visitor app: cache HTTP rende navigazione fra schermate istantanea

**Effort:** 4-6 giorni (ridotto da 7-10gg v1 grazie alla semplificazione no-versioning). **Risk:** basso.

### 3.3 — Storage migration completion (post-3.1)

**Why:** Dopo 3.1, garantire che tutti i percorsi che producono asset (TTS, generate-portrait, generate-poi-image) vadano direttamente a R2, no più base64.

**What:** Modificare le 3 route AI che oggi salvano base64.

**How:**

- [ ] `mvp/src/app/api/projects/[id]/schede/[schedaId]/audio/route.ts` — invece di `data:audio/mpeg;base64,...` → upload del Buffer a R2, salva URL pubblico
- [ ] `mvp/src/app/api/ai/generate-narrator-portrait/route.ts` — idem per portrait PNG
- [ ] `mvp/src/app/api/ai/generate-poi-image/route.ts` — idem
- [ ] Cleanup: rimuovere riferimenti residui a `data:...base64` nel codice

**Files affected:** 4 route. **Effort:** 2-3 giorni. **Risk:** basso.

### 3.4 — Project export/import

**Why:** Blind spot v1: GDPR diritto alla portabilità + churn = un cliente vuole portare via il suo progetto. Inoltre il pattern export/import è prezioso per: backup manuali, clonare un progetto come template, demo seeding, troubleshooting (esporto progetto problematico, lo ricreo in locale).

**What:** Endpoint export che produce un archivio ZIP (JSON + asset R2 referenziati) + endpoint import che lo ricostruisce.

**How:**

1. **Export**
   - `POST /api/projects/[id]/export` (Admin/Editor only): produce JSON con tutto lo stato progetto (tutte le tabelle filtrate per projectId) + lista URL R2 degli asset
   - Risposta: `{exportJobId}`, polling per download → ZIP che include `project.json` + cartella `assets/` con i file scaricati da R2
   - Asset binari: zippati direttamente nell'archivio (per portabilità completa)

2. **Import**
   - `POST /api/projects/import` (Admin only): accetta ZIP, deserializza, ricrea con nuovo projectId (asset reuploadati su R2 del tenant corrente)
   - Validazione: schema version match, asset integrity, nessun ID collision

3. **CLI per uso power-user/dev**
   - Script `mvp/scripts/export-project.ts` callable da CLI per backup/seeding

**Files affected:**
- Create: `mvp/src/app/api/projects/[id]/export/route.ts`, `mvp/src/app/api/projects/import/route.ts`, `mvp/src/lib/project-serialization.ts`, `mvp/scripts/export-project.ts`, `mvp/scripts/import-project.ts`

**Acceptance:**
- Export demo project completo → ZIP ~10-50MB
- Import dello stesso ZIP su tenant diverso → nuovo progetto identico
- Round-trip test: export → wipe → import → verify nessuna perdita di dati

**Effort:** 5-7 giorni. **Risk:** medio (serializzazione di entità complesse con relazioni).

### 3.5 — Branding & customizzazione frontend per progetto (white-label)

**Why:** Oggi il visitor app vive su `toolia.app/v/abc123` con look generico. Un museo serio o un'agenzia che gestisce 5 ville lo trova inaccettabile. Per giustificare tier pricing Pro/Enterprise serve white-label completo.

**What:** Branding tematico per progetto + custom domain mapping + email transactional con dominio cliente.

**How:**

1. **Schema — Branding per progetto**
   ```prisma
   model ProjectBranding {
     id              String   @id @default(cuid())
     projectId       String   @unique
     project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
     // Identity
     logoUrl         String?  // R2 URL
     logoDarkUrl     String?  // versione per dark backgrounds
     faviconUrl      String?
     // Palette
     primaryColor    String?  // hex, es. "#8B4513"
     secondaryColor  String?
     accentColor     String?
     backgroundColor String?
     textColor       String?
     // Typography
     fontPrimary     String?  // "Inter", "Playfair Display", "custom-font"
     fontSecondary   String?
     customFontUrl   String?  // se font custom uploadato
     // Cover & splash
     coverImageUrl   String?  // hero cover visitor app
     splashScreenUrl String?  // schermata caricamento iniziale
     // Domain
     customDomain    String?  @unique  // "villa-tal-dei-tali.it"
     domainVerifiedAt DateTime?        // null = pending DNS verification
     // Email
     senderEmail     String?  // "noreply@villa.it"
     senderName      String?  // "Villa Tal dei Tali"
     emailDomainVerifiedAt DateTime?  // Resend domain auth verified
     // Hide Toolia branding
     hideToiliaFooter Boolean @default(false)  // disponibile solo tier Enterprise
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt
   }
   ```

2. **Custom domain mapping**
   - UI: pannello "Dominio personalizzato" mostra DNS records da configurare (CNAME → `toolia.app`)
   - Backend: middleware Next.js riconosce host header → mappa a projectId via lookup `ProjectBranding.customDomain` → serve come fosse `/v/[id]`
   - SSL: Cloudflare for SaaS o Vercel custom hostnames (richiede tier paying su Vercel/Railway)
   - Verifica dominio: meccanismo di TXT record check + periodic re-verification

3. **Theming runtime visitor app**
   - Il `DeliveryPack` (3.2) include `ProjectBranding` snapshot
   - Visitor app shell legge branding e applica via CSS variables: `--color-primary`, `--font-display`, ecc.
   - Tailwind config supporta `theme.extend.colors.brand` dinamico via CSS vars

4. **Email transactional per dominio cliente**
   - Resend supporta multi-domain con verifica DKIM/SPF/DMARC
   - UI: "verifica il tuo dominio email" wizard che genera record DNS necessari
   - Magic link, password reset, notifiche visitor → mandati dal dominio cliente se configurato

5. **UI Studio**
   - Nuova superficie `/progetti/[id]/branding`:
     - Upload logo (con preview light/dark)
     - Color picker palette (con WCAG contrast check live — link a 5.7 accessibility)
     - Font picker (Google Fonts integrato + upload custom .woff2)
     - Cover image + splash screen upload
     - Custom domain wizard
     - Email sender wizard
     - **Preview live**: pannello che mostra come il visitor app appare con le scelte attuali

**Files affected:**
- Create: migration `ProjectBranding`, `mvp/src/app/api/projects/[id]/branding/route.ts`, `mvp/src/app/progetti/[id]/branding/page.tsx`, `mvp/src/lib/custom-domain-resolver.ts`, `mvp/src/middleware-domain.ts`
- Modify: visitor app shell (legge branding), `mvp/src/lib/delivery-pack-builder.ts` (include branding nel pack), Resend setup, middleware Next.js

**Acceptance:**
- Posso configurare logo + palette + font per il progetto demo
- Apro `villa-test.local` (con DNS locale) → vedo il visitor app brandizzato senza traccia Toolia (se tier Enterprise)
- Magic link arriva da `noreply@villa-test.local`

**Effort:** 7-10 giorni. **Risk:** medio — custom domain è la parte più complessa (DNS, SSL, multi-tenant routing).

### Checkpoint Fase 3

- [ ] Tutti gli asset binari su R2, DB pulito
- [ ] Pubblicazione produce un DeliveryPack consumato dal visitor app
- [ ] Cache HTTP attiva, navigazione visitor app istantanea
- [ ] Export/import progetto round-trip testato
- [ ] Branding per progetto + custom domain end-to-end testato

---

## Fase 4 — Visitor app evoluta

**Premessa:** Con la fondazione (Fase 1), il content engine (Fase 2) e la delivery (Fase 3) in place, possiamo finalmente mantenere le promesse del piano legacy per la visitor app: personalizzazione reale, assistant runtime, family UX completa, e app nativa offline. In più: onboarding tenant.

**Durata:** 7-13 settimane (include Expo che varia molto).

### 4.1 — Visitor wizard con priorità forzate

**Why:** Oggi il visitor wizard mostra stelle 1-5 sui driver, ma il `driverRatings` viene **ignorato dal server**. Il piano legacy è esplicito: *"Il wizard non deve chiedere tutto ciò che piace; deve costringere a rivelare cosa conta di più"* — meccanismo "10 punti da distribuire, max 5 su una singola passione, almeno 2 scelte obbligatorie".

**What:** Rivedere UX wizard + ricezione server-side dei pesi reali.

**How:**

1. **UX wizard**
   - Refactor `mvp/src/components/visitor/visitor-crea.tsx` con meccanismo "10 punti da distribuire"
   - Slider per ogni driver, contatore "punti restanti: X" in top
   - Validazione: bloccare submit se restano punti
   - Persona dominante: opzionale, suggerita in base alle scelte driver (UX più morbida)

2. **Server scoring**
   - `compose-visit/route.ts`: leggere `driverRatings` (array di `{driverId, weight}` con somma=10)
   - Usare i pesi nel calcolo score POI invece di treat as binary
   - Persona inferita: se l'utente non sceglie, fallback al `inferenceModel` (mapping pesi driver → persona dominante)

**Files affected:** 2 file. **Effort:** 3-5 giorni. **Risk:** basso.

### 4.2 — Runtime chatbot assistant

**Why:** Il piano legacy specifica un assistant ibrido a 2 livelli: pack pre-generato + chatbot LLM runtime per domande non coperte. Il pack pre-generato c'è (`AssistantQA`), il chatbot runtime manca.

**What:** Componente chat UI nel visitor + endpoint server che:
1. Cerca prima nel pack pre-generato (matching domanda vs triggerQuestions con embeddings o full-text)
2. Se hit con confidence alta → ritorna `verifiedAnswer`
3. Se no hit → chiama LLM con restrizione hard: solo `KBFact` con `reliability=alta` + contesto POI corrente, no inventione fuori contesto

**How:**

1. **Schema**
   - Niente nuovo modello: `AssistantQA` + `KBFact` esistenti bastano
   - Opzionale: tabella `AssistantLog` per analytics delle query non risolte dal pack

2. **API**
   - `POST /api/projects/[id]/visitor/assistant-query` — body: `{question, currentPoiId?, sessionId}` → response: `{answer, source: 'qa_pack'|'runtime_llm', kbFactIds: [...]}`
   - Whitelistare la route in `auth.config.ts` come pubblica (è chiamata dal visitor)

3. **Prompt LLM runtime**
   - System: "Sei un assistant verticale di un'audioguida AI. Rispondi SOLO sulla base dei seguenti fatti verificati. Se la domanda esce dal perimetro, dì 'questo non rientra nella visita'. Tono: breve, situato, mai inventare."
   - User: `Contesto POI: {poiName, semanticBase.identity}\nFatti KB:\n{kbFacts where reliability=alta and (poiId=currentPoi or projectGeneral)}\n\nDomanda visitatore: {question}`

4. **UI**
   - Floating chat icon sempre presente in visitor shell
   - Tap → bottom sheet con conversazione
   - Suggested questions in cima (dal `AssistantQA.triggerQuestions` del POI corrente)

**Files affected:**
- Create: `mvp/src/app/api/projects/[id]/visitor/assistant-query/route.ts`, `mvp/src/components/visitor/visitor-chat.tsx`
- Modify: `auth.config.ts` (whitelist), visitor layout (aggiungere chat icon)

**Acceptance:**
- Visitatore può chiedere "Quando è stato costruito?" e ricevere risposta in <3s
- Test: domande fuori-perimetro ricevono "questo non rientra nella visita" invece di info inventata
- Log delle query unmatched per analisi qualità

**Effort:** 5-7 giorni. **Risk:** medio — qualità prompt richiede iterazione, attenzione ai costi LLM per chiamata.

### 4.3 — Family Mode UX completa

**Why:** Schema completo (FamilyMission), missioni generabili dall'AI, ma **UI visitor che le presenta — manca**. Il piano legacy specifica un personaggio kids ricorrente del progetto + flow di handoff genitore-bambino.

**What:** Aggiungere al visitor app il layer family.

**How:**

1. **Schema**
   - Aggiungere a `Project.settingsJson.familyMode`: `{enabled, characterName, characterPortrait, characterTone, targetAge}`
   - Oppure modello dedicato `FamilyConfig` (preferito): 1 per progetto, contiene config famiglia

2. **Backend**
   - `visitor-data` include `FamilyConfig` + tutte le `FamilyMission` published del progetto se familyMode attivo nella sessione
   - `compose-visit` schedula missioni: max 1 ogni 12-18 min outdoor, no doppia consecutiva

3. **UI**
   - Wizard visitor aggiunge step "Visiti con bambini? Sì/no" → attiva family mode
   - Durante la visita: dopo contenuto adulto di un POI con missione, appare overlay missione con personaggio kids
   - Hint ladder progressivo: 1° hint subito, 2° dopo 30s, 3° dopo 60s
   - Reward + handoff finale

**Files affected:**
- Create: schema FamilyConfig, `mvp/src/components/visitor/visitor-family-mission.tsx`, `mvp/src/components/visitor/family-character.tsx`
- Modify: visitor-data, compose-visit, visitor-crea (step family on/off), visitor-visita (overlay missione)

**Acceptance:**
- Toggle family on/off nel wizard funziona
- Su un progetto demo con 5 missioni: durante visita appaiono 2-3 missioni distribuite secondo ritmo
- Hint ladder progressivo testato

**Effort:** 7-10 giorni. **Risk:** basso (è tutto frontend + schema piccolo).

### 4.4 — App nativa Expo offline-first

**Why:** Il piano legacy considera la webapp come fase intermedia. Il prodotto finale è un'app nativa che il visitatore scarica per il sito specifico, può usare offline, e include Session Bundle deterministico.

**What:** Progetto Expo separato che consuma il `DeliveryPack` (Fase 3) come "bundle scaricato" e lo esegue offline.

**How:** Sotto-progetto vasto, richiede prerequisiti completi della Fase 3 (DeliveryPack + R2 + readiness gate). Componenti principali:

1. **Setup Expo monorepo** (`apps/visitor-native/`)
   - Expo SDK 53+ con Expo Router, TypeScript strict
   - Configurazione EAS Build per iOS + Android
   - Convenzioni di styling: NativeWind (Tailwind RN) per allineamento alla webapp

2. **Bundle download flow**
   - Schermata iniziale: code QR scan o input ID progetto
   - Chiamata a `GET /api/projects/[id]/delivery-pack/active` → download di `manifestJson` + asset URLs
   - Download progressivo asset critici (audio, immagini hero, ritratti narratori) in `FileSystem.documentDirectory`
   - Readiness gate UI: progress bar, "ready / ready degraded / not ready"

3. **Offline-first execution**
   - SQLite per Local Session State (libreria expo-sqlite)
   - AsyncStorage per Runtime Manifest cache
   - Tutti i contenuti critici letti da filesystem locale, mai dal network
   - Connected assist policy: sync background quando rete disponibile

4. **UI components**
   - Riuso dei concept dalla webapp (visitor-home, visitor-crea, visitor-visita) ma reimplementati in RN
   - Player audio nativo con `expo-av`
   - Mappa: react-native-maps per GPS, immagine + pan-zoom per planimetria

5. **Resume / rejoin / recalc**
   - Resume: salvataggio stato locale ad ogni event (POI completato, audio terminato)
   - Rejoin: pulsante "continua da qui" che riallinea al prossimo checkpoint del manifest
   - Explicit recalc: chiamata a `POST /api/projects/[id]/compose-visit` (richiede rete), download nuovo bundle

6. **App icon + branding per progetto (white-label nativo)**
   - **Sfida tecnica**: una build Expo = 1 app store entry. Non puoi avere "1 binario con N branding dinamici" perché app icon, nome, splash sono fissati in build time
   - **Pattern Expo EAS multi-config**: build matrix che genera N binari (1 per progetto), ciascuno con `app.config.js` dinamico che legge da `ProjectBranding` via API in build hook
   - **UI Studio**: nella sezione 3.5 Branding, sub-pannello "App nativa" con:
     - Upload **app icon 1024×1024 PNG** (Apple/Google standards)
     - Upload **splash screen 2732×2732** (Apple iPad Pro retina max)
     - Nome app (max 30 char visibile su iPhone)
     - Bundle ID suggerito (es. `com.toolia.villataldeitali`)
     - Pulsante "Build app nativa" → trigger EAS build → genera .ipa e .apk firmati
   - **Distribuzione**: 
     - Tier base: TestFlight + APK download diretto (Toolia firma con cert dev)
     - Tier Enterprise: cliente fornisce App Store / Google Play account, Toolia pubblica per loro conto
   - **Update OTA**: usando `expo-updates`, l'app può ricevere update di JS bundle senza re-build store (per fix critici + nuovo content). Branding rimane bound al binario.

**Files affected:**
- Nuovo monorepo: `apps/visitor-native/` (separato da `mvp/` webapp Studio)
- Modify backend: aggiungere `POST /api/projects/[id]/delivery-pack/[packId]/assets-bundle` che ritorna manifest + lista URL R2 firmati con TTL lungo
- Create: `mvp/src/app/api/projects/[id]/native-build/route.ts` (trigger EAS build), pannello Studio "App nativa"
- `apps/visitor-native/app.config.js` con lettura dinamica branding da Studio API durante EAS build

**Acceptance:**
- App builds e gira su iOS + Android emulator
- Scan QR di un progetto demo → download completo in <60s su rete WiFi
- Modalità airplane: sessione di visita completa funziona dall'inizio alla fine
- Resume dopo kill app: torna esattamente al checkpoint precedente

**Effort:** 4-8 settimane. **Risk:** alto. **Prerequisiti:** Fase 3 completata e stabile da almeno 2 settimane in produzione.

### 4.5 — Onboarding tenant + progetto demo

**Why:** Blind spot v1: un nuovo tenant arriva, si registra → vede empty state, niente direzione. La promessa "content engine del sito culturale" è invisibile finché non gli mostriamo come funziona.

**What:** Flow guidato primo accesso + progetto demo precaricato + tour del prodotto.

**How:**

1. **First-login detection**
   - In `auth.ts` callback `createUser`: dopo creazione, schedulare seeding del progetto demo
   - Flag `Tenant.settingsJson.onboarded: boolean`

2. **Demo project seeding**
   - Script che usa `fixtures/forte-monte-tesoro/*.txt` per pre-popolare un progetto demo con:
     - 4 fonti già caricate e taggate
     - KB già estratta (50 fatti)
     - Brief generato
     - 8 POI con zone, semantic base, schede generate published
     - 2 narratori, 1 percorso, audio TTS già generato per ~3 schede
     - DeliveryPack pre-buildato e attivo
   - Tutto già in stato "puoi visitarlo" — esperienza WOW al primo accesso

3. **Product tour**
   - Libreria leggera (es. `intro.js` o componente custom) che guida il primo accesso:
     - "Benvenuto. Questo è il tuo workspace." 
     - "Qui hai un progetto demo già pronto, esploralo."
     - "Clicca per vedere l'app visitatore."
     - "Clicca su Content Studio per vedere come generare materiale di comunicazione dalla stessa dataset."
   - Skippabile sempre. Skip ricordato in `Tenant.settingsJson.tourCompleted`.

4. **Empty states utili**
   - Quando l'utente crea un nuovo progetto da zero, ogni step ha un empty state che spiega: "Cosa va qui, perché serve, come iniziare". Link contestuali alla doc/video.

**Files affected:**
- Create: `mvp/scripts/seed-demo-project.ts`, `mvp/src/components/onboarding-tour.tsx`, `mvp/src/lib/onboarding.ts`
- Modify: `mvp/src/auth.ts` (post-createUser hook), molte pagine step (empty states)

**Acceptance:**
- Nuovo signup: dopo magic link, vedi dashboard con "Progetto demo Forte Monte Tesoro" già esplorabile
- Tour guidato funziona, skippabile
- Empty state in ogni step nuovo dà direzione chiara

**Effort:** 5-7 giorni. **Risk:** basso.

### Checkpoint Fase 4

- [ ] Wizard visitor con priorità forzate produce schede differenziate
- [ ] Assistant chatbot risponde a query reali con fonti verificate
- [ ] Family mode end-to-end testato su progetto demo
- [ ] App nativa Expo buildato e installabile su iOS+Android
- [ ] Onboarding tenant fluido, demo project visibile al primo login

---

## Fase 5 — Operations & scaling

**Premessa:** Con il prodotto completo lato editorial + content engine + visitor, ci serve infrastructure per scalare a più clienti, lingue, qualità contenuti, e compliance.

**Durata:** 3-4 settimane.

### 5.1 — Readiness trasversale Studio (semplificato v2)

**Why:** Piano legacy Step 8 descrive 8 superfici operative del workspace. Per ora i 6 step lineari attuali funzionano bene; il vero gap è che la **readiness** del progetto non è visibile ovunque, solo nello step "Pubblica". Soluzione minimale ma di alto valore.

**Semplificazione v2:** Non rifacciamo l'8-superfici. Aggiungiamo solo readiness trasversale e cross-step navigation.

**What:**
1. Badge readiness su ogni step della sidebar progettuale (`stepN: ✓ completo | ⚠ warning | ✗ bloccante`)
2. Quick-nav contestuale: da un POI nello Step Luogo, posso saltare a (Semantic Base / Schede / Q&A / Family Mission / Visual) di quel POI
3. Banner globale top-bar mostra readiness aggregata del progetto sempre visibile

**How:**
- Hook `useProjectReadiness(projectId)` SWR che chiama il `readiness` endpoint
- Componente `<StepStatusBadge stepId="luogo" />` riusabile in sidebar
- Cross-nav componente sul singolo POI

**Files affected:**
- Create: `mvp/src/lib/hooks/use-project-readiness.ts`, `mvp/src/components/step-status-badge.tsx`, `mvp/src/components/poi-cross-nav.tsx`
- Modify: `mvp/src/components/project-stepper.tsx`, ~5 pagine step

**Effort:** 3-5 giorni (ridotto da 7-10gg v1). **Risk:** basso.

### 5.2 — Multilingua reale

**Why:** Schema supporta `language` (su NarratorProfile, Scheda), ma generazione hardcoded `"it"`. Per progetti turistici è critico.

**What:** Generazione schede in N lingue per ogni narratore.

**How:**

- [ ] UI per impostare `Project.languages: ["it", "en", "de"]`
- [ ] Bulk generate iterates su `project.languages`
- [ ] TTS sceglie la voice ElevenLabs giusta per lingua (mapping lingua → voice ID)
- [ ] Visitor app: detect lingua browser → fallback a default progetto

**Effort:** 3-5 giorni. **Risk:** basso.

### 5.3 — Analytics + observability (interno + visitor analytics per cliente)

**Why:** Tre destinatari diversi di analytics:
1. **Toolia internal**: operational health (errori, latenze, costi)
2. **Tenant Toolia**: business health (quanti progetti, quante schede, quanto consumo)
3. **Cliente finale**: visitor analytics sulla SUA audioguida ("quante visite, quali POI piacciono di più, dove abbandonano, family missions completion rate"). **Questo è il pezzo che giustifica il pricing premium** — dimostra ROI al cliente

**What:** Tre layer analytics distinti con audience diverso.

**How:**

1. **Visitor event tracking (raw data)**
   - Eventi: `session_start`, `session_end`, `wizard_completed`, `path_chosen`, `poi_visited`, `audio_played_X%`, `audio_completed`, `assistant_query`, `family_mission_attempted`, `family_mission_completed`, `share_clicked`, `review_submitted`
   - Schema:
     ```prisma
     model VisitorEvent {
       id          String   @id @default(cuid())
       projectId   String
       project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
       sessionId   String   // anonymous UUID
       eventType   String
       eventData   Json     @default("{}")
       userAgent   String?
       countryCode String?  // GeoIP, non IP raw (GDPR)
       createdAt   DateTime @default(now())
       @@index([projectId, createdAt])
       @@index([sessionId])
     }
     ```
   - **No IP raw** (GDPR), solo country code via GeoIP
   - Retention: 24 mesi raw, poi aggregato

2. **Visitor analytics dashboard per CLIENTE (nuovo)**
   - Nuova superficie `/progetti/[id]/analytics` accessibile a `ClientViewer`+ roles
   - **Widgets:**
     - Visite totali per periodo (oggi/settimana/mese/anno)
     - Durata media sessione + completion rate (%visitatori che terminano)
     - **POI ranking**: i 10 più visitati + i 10 meno (alert "questo POI è skippato dal 70%, magari riformulare?")
     - **Audio engagement**: % visitatori che ascoltano l'audio fino in fondo per scheda
     - **Family mission performance**: completion rate per missione (segnala missioni troppo difficili)
     - **Assistant query top-20**: domande più poste → input per migliorare Q&A pack
     - **Drop-off funnel**: visitor → wizard completato → percorso scelto → primo POI → metà → fine
     - **Geographic distribution**: paesi di provenienza dei visitatori
     - **Device**: mobile/tablet/desktop, iOS/Android share
     - **Sharing**: review medio + posts social condivisi
   - Export CSV/PDF per report mensili al cliente
   - Live mode: contatore "visitatori attivi ora"

3. **Tenant analytics (per Toolia interno)**
   - Pagina `Impostazioni > Tenant Analytics` (Admin only)
   - Numero progetti attivi, schede generate questo mese, audio minuti, costo LLM cumulativo
   - Aggregato cross-progetto

4. **Internal observability**
   - **Sentry** per error tracking (errori frontend + backend)
   - **Structured logging** con request IDs, trace IDs cross-LLM-calls (utile per debug editoriale "perché questa scheda è uscita male?")
   - APM lightweight: latenze per route, slow query alert
   - Stack opzionale: Axiom o BetterStack (entrambi affordable, no Datadog)

5. **PostHog vs build-in**
   - Pro PostHog: feature ready, funnel analysis nativo
   - Contro PostHog: lock-in, ulteriore sub-processor GDPR
   - **Raccomandazione**: build-in su Postgres + viste materializzate aggregate. PostHog solo se misuriamo gap di velocità execution

**Files affected:**
- Create: migration `VisitorEvent`, `mvp/src/app/api/visitor/events/route.ts` (whitelisted pubblica), `mvp/src/app/api/projects/[id]/analytics/route.ts`, `mvp/src/app/progetti/[id]/analytics/page.tsx`, `mvp/src/lib/analytics-aggregator.ts`, Sentry setup
- Modify: visitor app — emit event hook in ogni componente principale (`useVisitorEvents`)

**Acceptance:**
- Dopo 1 settimana di traffico su demo project: dashboard cliente mostra 50+ visite con breakdown POI ranking + drop-off funnel
- Export PDF report mensile pulito, brand-aware (usa branding del progetto)
- Sentry cattura 100% errori production

**Effort:** 8-12 giorni (espansione significativa rispetto al v1 4-6gg perché il visitor analytics per cliente è feature commercialmente critica). **Risk:** medio.

### 5.4 — Hallucination check automatico

**Why:** Blind spot v1: l'AI può inventare fatti anche con prompt restrittivi. Niente verifica che una scheda sia consistente con i KBFact verificati. È il rischio reputazionale più alto del prodotto (cliente scopre informazione errata dopo pubblicazione).

**What:** Step di auto-review post-generazione che confronta scheda generata vs KBFact disponibili e segnala discrepanze.

**How:**

1. **Pipeline auto-review**
   - Dopo `generate-scheda` ritorna il testo, secondo LLM call con prompt: "Confronta questo testo con questi fatti verificati. Lista (a) affermazioni nel testo non supportate dai fatti, (b) eventuali contraddizioni."
   - Output strutturato: `{warnings: [{statement, type: "unsupported"|"contradiction", confidence}]}`
   - Salvato in `Scheda.qualityScore` (attualmente nullable, mai popolato) + nuovo campo `Scheda.warningsJson`

2. **UI**
   - Editor schede mostra warnings come banner sopra il testo, evidenzia le frasi sospette
   - Workflow status: scheda con warning critici non passa automaticamente a `client_review` senza override esplicito

3. **Estendere ai ContentArtifact**
   - Stesso check sui contenuti del Content Studio (Fase 2)
   - Particolarmente importante per press release / brochure (affermazioni pubbliche)

**Files affected:**
- Create: `mvp/src/lib/hallucination-checker.ts`, schema migration `Scheda.warningsJson` + `ContentArtifact.warningsJson`
- Modify: route `generate-scheda` e `content/generate` (aggiungono auto-review), UI editor schede

**Acceptance:**
- Su un test prompt che inserisce dati inventati: il checker li rileva con confidence >0.7
- Toolia vede subito i warning prima di approvare

**Effort:** 4-6 giorni. **Risk:** medio (qualità checker dipende da prompt — iterazione necessaria).

### 5.5 — GDPR compliance

**Why:** Necessario per operare in EU (cultural sites in Italia, EU). Blind spot v1.

**What:**

1. **Cookie/consent**
   - Banner nel visitor app pre-sessione (i visitatori sono utenti EU)
   - Studio: gestire i cookie di analytics

2. **Diritto cancellazione visitor session**
   - Endpoint `DELETE /api/visitor/session/[sessionId]` (richiede session token in cookie)
   - Cleanup periodico delle sessioni vecchie

3. **PII detection in KBFact**
   - Worker che scansiona i KBFact per pattern PII (nomi, indirizzi email, telefoni) e li flagga per review
   - UX: KBFact con PII richiede consenso esplicito del cliente prima di entrare in produzione

4. **EXIF GPS handling**
   - Quando foto upload (Fase 3.1 Visual Layer), opzione "strip EXIF before public delivery"
   - Default: strip su asset `delivery`, mantenuto su `reference_only`

5. **Data export = già coperto da 3.4** (project export)

6. **Privacy policy + ToS aggiornati**
   - Template legali (con disclaimer "consultare avvocato")
   - Page `/legal/privacy` e `/legal/terms`

**Files affected:**
- Create: route consent, visitor session DELETE, PII detector worker, legal pages
- Modify: visitor layout (cookie banner), R2 upload (EXIF strip option)

**Effort:** 5-8 giorni (incluso review legale del cliente). **Risk:** medio (compliance richiede attenzione legale).

### 5.6 — AI Act EU compliance

**Why:** L'**EU AI Act è in vigore dal febbraio 2026** (oggi è 19 maggio 2026 — siamo già nel periodo applicabile). Toolia ricade nella categoria **GPAI provider** (uses GPAI models from OpenAI/Anthropic) e **deployer** (genera synthetic media). Inadempienza → multe fino a 7% fatturato globale o €35M (il maggiore).

**What:** Framework di compliance per tutti gli obblighi AI Act + DPA con sub-processor + voice/image rights documentati.

**How:**

1. **Trasparenza synthetic media (obbligo principale)**
   - **Audio TTS**: ogni traccia generata deve essere riconoscibile come AI-generated. Implementazione:
     - **Watermark audio**: aggiungere segnale impercettibile (libreria `audiomark` o post-processing) che identifica come AI-gen
     - **Metadata MP3**: tag ID3 "synthetic": "true", "generated_by": "Toolia/ElevenLabs"
     - **Disclosure UX**: nel visitor app, badge sottile sotto il player audio "🎙 Voce sintetica AI" — discreto ma presente
   - **Immagini generate** (portrait narratori, generate-poi-image): metadata EXIF "synthetic": "true" + opzione tenant per watermark visibile angolo
   - **Testi schede**: footer scheda "Testo prodotto con assistenza AI, revisione editoriale [Tenant]"
   - **Configurabile per tenant**: alcuni clienti vorranno disclosure più o meno visibile (sempre nel rispetto della legge)

2. **Documentazione tecnica obbligatoria**
   - **Model card per ogni provider usato** (OpenAI, Anthropic, ElevenLabs): foundation model, capabilities, limitations, intended use, risks
   - **Risk assessment**: documento che valuta i rischi del sistema (hallucination, bias, misuse)
   - **Pipeline diagram**: schema input → processing → output di Toolia
   - **Mitigation log**: 5.4 hallucination check, 5.5 PII detection, watermarking — tutte misure di mitigazione documentate
   - File location: `docs/compliance/ai-act/` con README versionato

3. **DPA con sub-processor**
   - **Lista trasparente** di tutti i sub-processor: OpenAI (LLM + embeddings), Anthropic (LLM), ElevenLabs (TTS), Railway (hosting + DB), Cloudflare R2 (storage), Resend (email), Sentry (errors), eventualmente PostHog
   - **DPA firmati con ognuno**: scaricare i template DPA standard di ciascuno e archiviarli
   - **Pubblicare lista** in `https://toolia.app/legal/sub-processors` — visibile ai clienti per due diligence
   - **Notification flow**: se aggiungiamo un nuovo sub-processor, notifica via email ai tenant 30 giorni prima

4. **Voice & image rights documentation**
   - **Voice cloning policy**: chiarire che le voci ElevenLabs sono pre-built (non cloned da persone reali) o, se cloned, richiedere liberatoria firmata della persona
   - **Schema**: aggiungere a `NarratorProfile` campi `voiceRightsType` (`stock | licensed | custom_with_consent`) + `consentDocumentUrl` (link R2)
   - **Image rights**: aggiungere a `VisualAsset` campo `rightsType` (`owned | licensed | public_domain | ai_generated`) + `licenseDocumentUrl`

5. **Right to opt-out from AI processing (Recital 60)**
   - Endpoint per visitor "non voglio interagire con AI" → fallback a contenuto solo testuale, no AI features (no chatbot runtime, no personalizzazione visitor wizard)
   - UI opzione nel wizard "preferisco esperienza non AI"

6. **Bias monitoring**
   - Auto-check periodico: i contenuti generati hanno bias geografico/storico/culturale sistematico?
   - Sample-based review: ogni mese 20 schede random valutate manualmente per bias
   - Documentazione delle review in `docs/compliance/bias-audits/YYYY-MM.md`

7. **Pagina legale pubblica**
   - `/legal/ai-disclosure`: spiega in linguaggio chiaro che il prodotto usa AI, quali modelli, come, quali safeguard
   - Link da footer ovunque

**Files affected:**
- Create: `docs/compliance/ai-act/` documentation, `mvp/src/app/legal/ai-disclosure/page.tsx`, `mvp/src/app/legal/sub-processors/page.tsx`, schema migration (voiceRightsType + rightsType + consentDocumentUrl), watermarking utilities
- Modify: TTS route (aggiunge metadata + watermark), visitor app (disclosure badges), schede footer (disclosure text)

**Acceptance:**
- Documento "AI Act compliance audit" completo e firmabile da consulente legale
- Tutti gli audio generati hanno metadata + watermark verificabile
- Pagina pubblica `/legal/ai-disclosure` chiara
- Lista sub-processor pubblica e DPA archiviati
- Toggle "esperienza non-AI" nel visitor wizard funzionante

**Effort:** 8-12 giorni + supporto consulente legale (preventivo €2-5k). **Risk:** alto (compliance richiede expertise legale specifica). **Bloccante:** sì per vendite enterprise EU; differibile per pilot cliente piccolo.

### Checkpoint Fase 5

- [ ] Readiness trasversale visibile in tutto lo Studio
- [ ] Almeno 1 progetto pilota in 2+ lingue
- [ ] Analytics interna + visitor analytics per cliente operative
- [ ] Sentry cattura 100% degli errori production
- [ ] Hallucination checker integrato e attivo
- [ ] GDPR baseline implementato (cookie, consent, PII detection)
- [ ] AI Act compliance framework completo (disclosure, watermarking, DPA, sub-processor pubblici)

---

## Note finali

**Cosa NON è in questo piano:**
- Pricing, packaging, go-to-market — fuori scope del codebase. Il riposizionamento "content engine" implica nuovo pricing tier (es. base = audioguida, pro = + content engine, enterprise = + API + integrazioni). Discussione strategica separata.
- Design system / refactor visivo dello Studio — l'UI attuale è funzionale, da riconsiderare solo dopo product validation
- Sistema di inviti / multi-utente per tenant — il CLAUDE.md menziona "sistema Invitation DB-based" ma non è critico per allineamento al piano legacy
- Integrazioni outbound Content Studio (Notion API, Buffer, Mailchimp, Slack) — sotto-progetto 2.6 lascia traccia ma le implementazioni concrete sono post-MVP

**Riepilogo numerico v3:**
- 6 fasi
- 30 sotto-progetti totali (5 in Fase 0 + 3 in F1 + 6 in F2 + 5 in F3 + 5 in F4 + 6 in F5)
- 24-38 settimane totali (~6-9.5 mesi con 1 dev FT, ridotto se parallelizzato)
- ~$30-80 di costi LLM per progetto generato end-to-end (tracciati per-progetto da 0.5)
- Legal/compliance: budget aggiuntivo €2-5k per consulente AI Act + DPA review

**Logica di sequenza strategica:**
1. **Fase 0**: stabilizziamo il presente
2. **Fase 1**: costruiamo la dataset editoriale ricca (è il VERO asset di Toolia)
3. **Fase 2**: monetizziamo la dataset con il content engine (nuova value proposition multi-canale)
4. **Fase 3**: completiamo l'audioguida (primo output dell'engine, deterministico via DeliveryPack)
5. **Fase 4**: portiamo l'audioguida al next level (visitor evoluto + nativa Expo + onboarding tenant)
6. **Fase 5**: scaliamo (readiness trasversale, multilingua, analytics, hallucination check, GDPR)

**Cosa raccomando come primissimo step:**
Eseguire la **Fase 0 (1-2 settimane)** subito. È pura manutenzione tecnica, sblocca sicurezza, rimuove rischi, abilita cost tracking. Mentre la Fase 0 procede, possiamo finalizzare il piano dettagliato della Fase 1.

---

## Per chi eseguirà i singoli sotto-progetti

Ognuno dei 28 sotto-progetti qui (0.1-5.5) richiederà un **piano esecutivo dettagliato** scritto separatamente con lo skill `superpowers:writing-plans`, con:
- Task step-by-step in formato TDD
- File da creare/modificare con percorsi esatti
- Code blocks completi (no placeholder)
- Comandi shell e expected output
- Acceptance criteria testabili per ogni step

Quando decidi da quale partire, dimmelo e scrivo quel piano esecutivo specifico.
