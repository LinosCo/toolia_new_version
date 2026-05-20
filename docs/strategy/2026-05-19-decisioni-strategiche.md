# Voler.ai Tuner Suite — Decisioni Strategiche

> **Data**: 19 maggio 2026
> **Status**: bozza approvata in conversazione, da formalizzare nei prossimi sprint
> **Scope**: definisce brand structure, positioning, pricing, architettura tecnica e roadmap 6 mesi per i 3 prodotti Voler.ai

---

## 1. Brand structure — la Tuner Suite

Voler.ai diventa una **suite di prodotti business** sotto un brand ombrello. Tre prodotti con identità distinte ma narrative coerente.

### 1.1 Business Tuner (BT) — Strategy

**Promessa**: "Sintonizza la tua strategia"

**Cosa fa**: BT è 3 capability in un prodotto:
- **Intelligence**: monitoraggio posizionamento brand (SERP, social, AI), analisi competitor, visibility scan
- **Conversation**: interview engine AI (interviste qualitative 24/7), training bot (formazione aziendale con scoring), chatbot multilingua (data collection), copilot chat
- **Strategy**: copilot strategico, tips engine, suggerimento azioni operative misurate (Results Hub)

> **Nota** (aggiornamento 2026-05-20): i tool conversational (interview/training/chatbot) RESTANO dentro BT — confermato. BT non è "solo intelligence", è anche la piattaforma conversational AI della suite.

**Target**: PMI, consulenti, agenzie marketing, marketing manager interni.

**Brand identity**:
- Palette esistente (arancio/rosso BT)
- Dominio: `businesstuner.voler.ai`
- Status: **in produzione, early adopter** (5-15 tenant attivi al 2026-05-19)

### 1.2 Content Tuner (CT) — Storytelling

**Promessa**: "Sintonizza la tua produzione di contenuti"

**Cosa fa**: Content engine multi-canale (post social Instagram/X/LinkedIn/Facebook + articoli blog + brochure + newsletter + comunicati stampa + copy sito web + audio promo) con:
- **Preservation-first media pipeline** (modifica le foto reali del cliente preservando l'identità visiva)
- **BrandSkill distillato** dai materiali del cliente (logo, brand book, moodboard, foto reali)
- **RAG su KB verificata** (KBFact + semantic base + lenses + tension map)
- **Brand voices multiple** per tenant
- **Visual template library** (4 modalità: generation, photo edit, style transfer, layout)
- **Identity preservation check** automatico via Vision AI
- **Workflow editoriale** (draft → review → approved → published)
- **Calendario editoriale** con slot AI suggestions

**Target esteso** (TAM 5x rispetto al solo cultural):
- Cultural sites (musei, ville, fondazioni) — use case flagship
- Heritage brands (luxury fashion, automotive, vini DOC/DOCG)
- Brand di prodotto premium (artigianato, food&wine, design)
- Agenzie di branding/comunicazione che gestiscono portafoglio clienti
- Real estate di prestigio
- Hotel di charme, resort, ville relais
- Enti pubblici turistici, comuni storici

**Brand identity** (da definire):
- Palette: **azzurro/verde** (differenziazione visiva da BT)
- Logo: nuovo, family con BT (es. icona con sintonizzatore + libro/penna)
- Dominio: `contenttuner.voler.ai`
- Status: **da costruire** (Content Engine è la Fase 2 di Toolia)

### 1.3 Experience Tuner (ET) — Visit (ex Toolia)

**Promessa**: "Sintonizza l'esperienza di visita"

**Cosa fa**: Audioguida AI + visitor app + family mode + assistant Q&A + spatial engine (segment graph) + compose-visit dinamico per persona + analytics visitor.

**Target**: chi accoglie pubblico fisico — sottoinsieme dei target di CT:
- Cultural sites (sempre)
- Ville storiche
- Parchi naturali
- Cantine con visite
- Hotel/resort con dintorni storici
- Real estate (tour acquirenti)
- Sedi storiche d'azienda

**Brand identity**:
- Palette: **viola/caldo** (o altro a scelta — DA DEFINIRE)
- Logo: nuovo
- Dominio: `experiencetuner.voler.ai` o `toolia.app` (se vogliamo mantenere "Toolia" come heritage name del visitor app)
- Status: codice esiste già (visitor app `/v/[id]` in Toolia), da estrarre e brandizzare

### 1.4 Web Tuner (WT) — Digital presence (aggiunto 2026-05-20)

**Promessa**: "Sintonizza la tua presenza digitale"

**Cosa fa**: Sito web AI-native managed. Costruito incrociando strategia BT + contenuti CT, con **loop di ottimizzazione continua** (BT insights → CT content → publish → measure → BT). React/Next.js, custom domain, SEO continuo.

**Modello**: NON puro SaaS self-serve. È un **"managed product" (tech-enabled service)**: il prodotto ricorrente è il loop AI management; il design iniziale è bespoke (premium) o template (self-serve). Productization fasata: bespoke → semi-prodotto → prodotto maturo.

**Target**: sottoinsieme CT che vuole presenza web gestita (più universale di ET — quasi ogni brand ha un sito).

**Status**: da costruire dopo che CT ha clienti paganti (pull dal mercato).

### 1.5 Suite umbrella + tassonomia delivery

```
                    ┌─────────────────────────────────┐
                    │     V O L E R . A I             │
                    │  The Tuner Suite for Business   │
                    └─────────────────────────────────┘
                                  │
   ┌──────────────┬──────────────┼──────────────┬──────────────┐
   ▼              ▼              ▼              ▼              ▼
 INTELLIGENCE  PRODUCTION    ──────── DELIVERY ────────
 ┌──────────┐ ┌──────────┐  ┌──────────┐  ┌──────────┐
 │ BUSINESS │ │ CONTENT  │  │EXPERIENCE│  │   WEB    │
 │  TUNER   │ │  TUNER   │  │  TUNER   │  │  TUNER   │
 ├──────────┤ ├──────────┤  ├──────────┤  ├──────────┤
 │ Capisci  │ │ Racconta │  │Fai vivere│  │Fai vivere│
 │(strategy │ │(content+ │  │ il luogo │  │ online   │
 │+convers.)│ │ distrib.)│  │(audio app│  │ (sito)   │
 └──────────┘ └──────────┘  └──────────┘  └──────────┘
```

**Tassonomia delivery** (distinzione fondamentale):

| Tipo | Cosa | Esempi | Dove vive |
|---|---|---|---|
| **Superfici OWNED** (Voler costruisce + ospita) | Richiedono engineering | Experience Tuner (audioguida), Web Tuner (sito) | Prodotti -Tuner dedicati |
| **Canali DISTRIBUTION** (pubblichi su piattaforme esistenti) | Solo integrazione API | Social (IG/FB/LinkedIn/X), email (Mailchimp), CMS (WordPress), print (PDF) | **Capability di Content Tuner** |

> **I social NON sono un prodotto -Tuner.** Sono una capability di distribuzione di CT (pubblicazione via API). Solo le superfici che COSTRUIAMO (audioguida, sito) sono prodotti delivery dedicati.

> **ET vs WT productizzabilità**: ET è pienamente prodottizzabile (struttura uniforme tra clienti — stesso player, contenuti diversi). WT è "managed product" (siti strutturalmente diversi tra clienti — setup bespoke + management ricorrente prodottizzato).

**Narrativa di vendita unificata**: "Capire, raccontare, far vivere (on-site e online)".

---

## 2. Positioning

### 2.1 Tagline portfolio

**Voler.ai**: "The Italian AI Tuner Suite for Business — capire, raccontare, far vivere".

### 2.2 Tagline per prodotto

- **Business Tuner**: "Vedi il tuo posizionamento. Decidi con dati. Misura l'impatto."
- **Content Tuner**: "Trasforma fonti verificate in contenuti che preservano l'identità del tuo brand."
- **Experience Tuner**: "Trasforma il tuo luogo in un'esperienza ascoltabile."

### 2.3 Competitive differentiation

| Categoria | Competitor generici | Voler.ai differentiator |
|---|---|---|
| Strategy/intelligence | SEMrush, Brand24, Mention | BT = AI italiana + interviste qualitative + Copilot strategico integrato |
| Content marketing | Jasper, Copy.ai, Writer | CT = preservation-first media + verified KB + brand voice distillata |
| Audioguide | Smartify, GuidiGo, Storius | ET = produce dal content engine + spatial graph + family mode |
| Cross-product | (nessuno) | **Suite integrata Voler.ai**: insights → content → experience flow |

---

## 3. Pricing model

> **Documento di dettaglio:** [`2026-05-20-pricing-packaging.md`](./2026-05-20-pricing-packaging.md) è la fonte di verità su pricing, packaging, crediti e setup. Questa sezione ne riassume solo i principi. **In caso di conflitto vince il pricing doc.**

### 3.1 Tre principi che cambiano l'impostazione precedente

Il modello a tier separati per prodotto (BT €49-299 / CT €499-5000 / ET addon) è **superato**. Tre decisioni lo sostituiscono:

1. **Tech-enabled service, non pure SaaS.** I clienti non si auto-onboardano. La creazione della KB (sia per BT che per CT) richiede lavoro editoriale qualificato che non è prodottizzabile in self-service. Quindi vendiamo: **setup gestito + abbonamento ricorrente + retainer opzionale**.

2. **Crediti unificati su tutta la suite.** Un solo wallet a livello di Organization. I crediti si spendono su qualsiasi prodotto (BT, CT, ET, WT). Il costo in crediti di ogni azione è mappato sul costo reale in $ del modello AI sottostante (`LlmUsage` × markup ~3x, 1 credito = €0,01). Questo elimina la sproporzione "CT costa 10x BT": un'azione CT costa più crediti perché costa più $ reali, non per markup arbitrario.

3. **Il tier sblocca feature, i crediti misurano il consumo.** L'abbonamento determina *cosa puoi fare* (feature gating); i crediti determinano *quanto puoi farne*. Sono due assi indipendenti.

### 3.2 Le tre layer di ricavo (sintesi)

| Layer | Cos'è | Quando |
|---|---|---|
| **Activation bundle** | Setup gestito una tantum (KB, brand voice, configurazione, primi contenuti). Pacchetti S/M/L per prodotto. | All'onboarding |
| **Credits subscription** | Abbonamento mensile = tier (feature) + crediti inclusi. Starter €49/6k → Enterprise €4000+/unlimited. | Ricorrente |
| **Managed retainer** (opzionale) | Voler gestisce la produzione continua per conto del cliente. €1-5k/mese. | Secondario, on demand |

### 3.3 Delivery model: hybrid

- **Voler flagship**: clienti gestiti direttamente da Voler.ai (case study, prestigio, marginalità alta via retainer).
- **Partner/volume**: agenzie e partner che usano la suite per i propri clienti (volume, crediti, self-managed dopo setup).

Vedi pricing doc per: tabella costo-crediti per azione, tier completi, activation packages dettagliati per BT/CT/ET/WT, feature gating matrix, esempi cliente con LTV, e le open question ancora aperte.

---

## 4. Architettura tecnica

### 4.1 Stato attuale

```
toolia_studio/      (repo separato)
└── Toolia (Studio admin + visitor app monolitico in /v/[id])

ai-interviewer/     (repo separato)
└── Business Tuner (in produzione, early adopter)
```

**Problema**: 2 repo, 2 schema Prisma, 2 auth systems, codice duplicato (auth helpers, AI clients, UI components).

### 4.2 Naming convention (importante per evitare confusione)

Tre termini correlati che NON vanno mescolati:

| Termine | Cosa indica | Esempio uso |
|---|---|---|
| **studio-tuner** | Il **monorepo** (progetto tecnico/cartella codice) | `cd ~/dev/studio-tuner`, `git clone https://github.com/voler/studio-tuner` |
| **Voler.ai Tuner Suite** | Il **brand commerciale** (cosa il cliente vede sul sito) | "Acquista la Voler.ai Tuner Suite" — landing page marketing |
| **Workspace** | La **UI admin** dentro Content Tuner (e Experience Tuner) — dove l'operatore lavora | "Apri il Content Tuner Workspace per editare le schede" |

**REGOLA**: la parola "Studio" è riservata SOLO al nome del monorepo `studio-tuner`. Nei prodotti, la UI lato operatore si chiama **Workspace** (es. "CT Workspace", "ET Workspace"). Questo previene confusione fra "studio = monorepo" e "studio = admin UI".

**Migrazione terminologica**:
- ❌ Vecchio: "Toolia Studio" (UI admin di Toolia)
- ✅ Nuovo: "Content Tuner Workspace" (UI admin di CT) + "Experience Tuner Workspace" (UI admin di ET)

### 4.3 Stato target — Monorepo `studio-tuner`

```
studio-tuner/
├── apps/
│   ├── business-tuner/           # Frontend BT
│   ├── content-tuner/            # Frontend CT (= ex Toolia Studio admin)
│   └── experience-tuner/         # Frontend ET (= ex Toolia visitor app)
├── packages/
│   ├── @voler/db                 # Prisma schema unificato (tutte le tabelle BT+CT+ET)
│   ├── @voler/auth               # SSO Voler.ai, NextAuth shared
│   ├── @voler/ai                 # LLM clients (OpenAI/Anthropic/Kimi), provider abstraction
│   ├── @voler/ui                 # Design system tematizzabile per brand
│   ├── @voler/content-engine     # RAG + retrieval + content generation (cuore di CT)
│   ├── @voler/media-pipeline     # Preservation-first media (4 modalità + identity check)
│   ├── @voler/brand-voice        # BrandSkill distillation + manifest management
│   ├── @voler/spatial            # Segment graph + compose-visit (cuore di ET)
│   └── @voler/bridge             # Event bus inter-app + webhooks
└── services/
    ├── worker-jobs/              # Background jobs (pg-boss) per generazioni async
    └── delivery-pack-builder/    # Builder DeliveryPack per ET
```

### 4.4 Tooling

- **Monorepo manager**: Turborepo (build cache + parallel)
- **Package manager**: pnpm (con workspaces nativi)
- **Database**: Postgres unico per tutte e 3 le app (Railway-managed)
- **Auth**: NextAuth v5 con shared session su `.voler.ai` cookie domain
- **Deploy**: Railway con 3 services separati (uno per app), tutti consumano stesso DB + stesso storage R2

### 4.5 Schema DB strategy (chiave!)

Schema unificato con discriminator per app:
- **Tabelle condivise**: `Organization`, `User`, `Workspace`, `Membership`, `ApiKey`, `LlmUsage`, `BrandAsset`, `BrandSkill`
- **Tabelle BT-specific**: `Signal`, `Suggestion`, `Interview`, `InsightReport`
- **Tabelle CT-specific**: `KBFact`, `Source`, `SemanticBase`, `EditorialLens`, `NarrativeTension`, `ContentDraft`, `ContentTemplate`, `BrandVoice`
- **Tabelle ET-specific**: `Project`, `POI`, `Zone`, `MapNode`, `Segment`, `Scheda`, `Path`, `NarratorProfile`, `AudioAsset`, `FamilyMission`, `VisitorEvent`

**Pattern**: ogni `Project` può avere `purchasedModules: ["business_tuner", "content_tuner", "experience_tuner"]`. Le UI delle 3 app filtrano la propria visualizzazione in base ai moduli attivi del tenant.

### 4.6 Roadmap refactor (graduale, non big-bang)

| Stadio | Durata | Cosa | Risultato |
|---|---|---|---|
| **Stadio 1** (now) | 10-14 sett | Fase 2 di Toolia: costruisci Content Engine + media preservation completi NEL repo Toolia attuale. Organizza codice in moduli logici (`lib/content-engine`, `lib/media-pipeline`, `lib/brand-voice`) | Content engine maturo, pronto per estrazione |
| **Stadio 2** (refactor) | 2-3 sett | Crea `studio-tuner` monorepo, sposta `lib/*` di Toolia in `packages/@voler/*`, sposta UI Studio in `apps/content-tuner`, UI visitor in `apps/experience-tuner`. Migra anche BT in `apps/business-tuner` con migrazione DB ad UNA sola istanza Postgres. | 1 monorepo, 3 app deployate separatamente, DB unificato |
| **Stadio 3** (rebranding) | 2-3 sett | Applica branding distinti per app (palette, logo, hostnames). Comunica transition a early adopter BT. | 3 prodotti brandizzati live |
| **Stadio 4** (bridge) | 2-3 sett | Implementa event bus `@voler/bridge` per flussi inter-prodotto (BT → CT insights, CT ↔ ET DeliveryPack, ET → BT visitor metrics). | Suite integrata funzionante |

**Effort architetturale totale**: 6-9 settimane di refactor dopo i 10-14 della Fase 2.

### 4.7 Migrazione DB di Business Tuner (delicata)

Status: BT in produzione con early adopter (5-15 tenant).

Strategia:
1. Dump DB BT attuale (`ai-interviewer` Postgres)
2. Mapping schema BT → schema unificato Voler (con prefisso tabelle se necessario per evitare collisions iniziali)
3. Test migration in DB staging con dati copia
4. Comunicare downtime ~2 ore concordato con early adopter
5. Migration prod con backup pre-flight + rollback plan
6. DNS swap `businesstuner.voler.ai` punta alla nuova app nel monorepo

---

## 5. Decisioni di prodotto chiave

### 5.1 Media pipeline preservation-first (CT)

**Decisione**: 4 modalità di generazione media coesistenti.

| Modalità | Use case | Modello | Costo/img |
|---|---|---|---|
| A — Generation from scratch | Illustrazione concettuale astratta | gpt-image-1 → DALL-E 3 → Gemini | $0.04-0.08 |
| **B — Preservation edit** ⭐ | Foto reale del cliente + treatment editoriale (preserva identità) | Flux Kontext → gpt-image-1 edit → Gemini edit | $0.05 |
| **C — Style reference transfer** | Foto reale + style da reference library | Flux Kontext w/reference → SD+IP-Adapter | $0.05 |
| D — Layout templates | Locandina, brochure, poster | HTML/CSS render via Puppeteer | ~$0 |

**Identity preservation check** obbligatorio per modalità B e C: gpt-4o Vision compara source vs output, se `preserved=false` o `confidence<0.7` → output rejected + warning UI.

### 5.2 BrandSkill distillation (CT)

Pattern preso da Business Tuner (sezione `BrandAsset` + `BrandSkill` schema).

Flow:
1. Cliente carica BrandAsset (logo, brand book, moodboard, past content, foto reali)
2. AI distiller estrae `BrandSkill.manifest`: palette, tone, imagery archetype, visual style
3. Manifest versionato (può evolvere nel tempo)
4. Iniettato come `brandHints` in ogni generazione media + content text

### 5.3 RAG content engine (CT)

**pgvector** su Postgres (no servizi esterni Pinecone/Qdrant).

Cosa indicizzato:
- `KBFact.content` (chunked se >500 token)
- `POI.semanticBaseJson` (10 sezioni separate)
- `Brief.contenutoJson` (chunked)
- `NarrativeTension.mustTellJson + tensionsJson` (chunked)

Modello embedding: `text-embedding-3-small` ($0.02/1M token, ~$1 una tantum per progetto).

Retrieval API: `POST /api/projects/[id]/content/retrieve` con scope filtri + topK + reliability filter.

**Provenance log**: ogni `ContentDraft` salva `retrievalLog` con chunks usati per audit editoriale.

### 5.4 Content templates (15+ canali per CT)

Estensione delle 9 originali con marketing/B2B:

| # | Canale | Output |
|---|---|---|
| 1 | Instagram caption | 150 char + 5 hashtag + visual suggest |
| 2 | Instagram carousel | 3-7 slide con text + visual |
| 3 | Twitter/X post | 280 char + CTA |
| 4 | LinkedIn article | 600-1200 parole + visual |
| 5 | LinkedIn poll | Question + 4 options + context |
| 6 | Facebook post | 100-300 parole + hashtag |
| 7 | Blog article | 800-1500 parole H1/H2/H3 SEO |
| 8 | Newsletter section | 200-300 parole + CTA |
| 9 | Brochure paragraph | 100-150 parole evocativi |
| 10 | Press release | Titolo + subtitle + 3 paragrafi + boilerplate |
| 11 | Email campaign | Subject + preheader + body + CTA |
| 12 | Web hero copy | Headline + sub + 80 parole body |
| 13 | Audio promo 30s | Script radio/IG reel |
| 14 | Product description | 150-300 parole e-commerce |
| 15 | Case study | 500-1000 parole structured (problem/solution/result) |

### 5.5 Compliance & legal

**AI Act EU** (vigente dal 2026-02):
- Disclosure media generato ("Immagine AI" badge configurabile)
- Watermark audio metadata + visual opzionale
- DPA con sub-processor (OpenAI, Anthropic, ElevenLabs, Railway, Cloudflare R2, Resend)
- Lista sub-processor pubblica su `voler.ai/legal/sub-processors`

**GDPR**:
- Cookie consent visitor app
- Visitor session delete on request
- PII detection in KBFact (worker periodico)
- EXIF GPS strip opzionale su asset delivery

---

## 6. Roadmap macro 6 mesi

### Mesi 1-3.5: Fase 2 — Content Engine in repo Toolia attuale

**Outcome**: Content Tuner functionality completa dentro Toolia codebase.

Sotto-progetti (alto livello):
- 2.1 pgvector + embedding pipeline
- 2.2 Retrieval API + playground
- 2.3 Content templates (15+ canali)
- 2.4 Content Studio UI
- 2.5 Brand voices con BrandSkill distillation
- 2.6 Workflow + analytics
- 2.7 Media pipeline preservation-first (4 modalità + identity check + visual template library)
- 2.8 Module gating + tier features

### Mesi 4-4.75: Stadio 2-3 — Monorepo refactor + Rebranding

**Outcome**: `studio-tuner` monorepo live con 3 app distinte.

- Creazione monorepo Turborepo
- Estrazione `packages/@voler/*` da Toolia
- Migrazione codice in `apps/content-tuner`, `apps/experience-tuner`
- Migrazione BT in `apps/business-tuner` + migrazione DB
- Applicazione brand identity differenziate
- Comunicazione transition early adopter BT

### Mesi 5-5.75: Stadio 4 — Bridge Voler.ai

**Outcome**: Suite integrata con flussi cross-product.

- Event bus inter-app
- BT → CT: insights flow → content briefs auto-generati
- CT ↔ ET: DeliveryPack consumption
- ET → BT: visitor analytics feedback loop

### Mesi 6+: Pilot program

**Outcome**: 3-5 case study reali.

- Acquisizione 3-5 clienti pilot Cultural Brand a €500/mese × 12 mesi
- Iterazione su feedback
- Video testimonial + case study pubblicabili
- Preparazione go-to-market pricing pieno

---

## 7. Cose NON ancora decise

Lista esplicita per evitare ambiguità:

1. **Brand identity ET visivo**: palette + logo + nome finale (`experiencetuner.voler.ai` o `toolia.app`?)
2. **Brand identity CT visivo**: logo + sfumature azzurro/verde precise
3. **Pricing finale**: il modello (crediti unificati + activation bundle + retainer) è deciso in [`2026-05-20-pricing-packaging.md`]; i valori numerici precisi (costo crediti per azione, prezzo activation packages) restano da validare con research di mercato + 3 pilot. Vedi le open question nel pricing doc.
4. **Module bundling**: bundle discount fissi o configurabili da commerciale?
5. **Visitor App nativa (Expo)**: tiene tempo di Fase 3 o slip a Fase 4? Confermare in Fase 2.9
6. **Sales motion**: self-serve per CT Starter? Sales-led per CT Pro+? Da decidere prima del primo cliente
7. **AI provider preferred**: OpenAI default, ma Claude per long-form blog? Specificare per template
8. **Costo legale AI Act compliance**: budget ~€2-5k per consulenza, da pianificare
9. **DPA con sub-processor**: lista finalizzata e firmata
10. **Branding sito vetrina Voler.ai**: a un singolo dominio `voler.ai` con 3 landing per sotto-prodotti? O domini separati?

---

## 8. Approval status

| Aspetto | Status |
|---|---|
| Brand structure (BT + CT + ET Tuner family) | ✅ Approvato in chat |
| Positioning (heritage/premium broad audience) | ✅ Approvato |
| Pricing model modulare | ✅ Approvato concept, range da validare con pilot |
| Architettura monorepo target | ✅ Approvato target, gradual approach |
| Media preservation-first | ✅ Approvato |
| BrandSkill distillation | ✅ Approvato |
| RAG su pgvector | ✅ Approvato |
| Roadmap macro 6 mesi | ✅ Approvato draft |
| Brand identity visiva specifica | ⏳ Da finalizzare |
| Pricing esatto | ⏳ Da pilot |
| Sales motion | ⏳ Da decidere |

---

## 9. Prossimi step concreti

1. **(Subito)** Approvare questo documento — feedback dell'utente per fine-tune
2. **(Settimana prossima)** Scrivere piano TDD Fase 2 dettagliato basato su questo doc (sotto-progetti 2.1-2.8 nel repo Toolia attuale)
3. **(Parallelo)** Iniziare design brand identity per CT + ET (logo, palette, naming finale)
4. **(Parallelo)** Audit produzione Business Tuner: identificare dati critici per migrazione futura
5. **(Mese 1-3.5)** Esecuzione Fase 2 — subagent-driven (pattern provato in Fase 0 e Fase 1)
6. **(Mese 4)** Stadio 2: refactor monorepo
7. **(Mese 5)** Stadio 3-4: rebranding + bridges
8. **(Mese 6)** Pilot program kick-off

---

## 10. Note finali

Questo documento è la **fonte di verità strategica** per i prossimi 6 mesi. Ogni decisione operativa successiva (piano TDD, schema design, UI choices) deve essere consistent con quanto qui dichiarato.

**Quando aggiornare questo documento**:
- Cambi di brand structure (es. aggiunta di un 4° prodotto)
- Cambi di pricing significativi (es. dopo pilot data)
- Cambi di architettura (es. decisione di non fare monorepo)
- Aggiunta di nuovi target audience non previsti

**Cosa NON aggiornare qui** (vivono in altri doc):
- Schema Prisma specifico → `docs/spec/03-data-model.md` (post-refactor in monorepo)
- Step-by-step TDD plans → `docs/superpowers/plans/`
- Test isolation policies → CLAUDE.md repo-specifico
