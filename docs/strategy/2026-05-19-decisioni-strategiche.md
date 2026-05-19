# Voler.ai Tuner Suite — Decisioni Strategiche

> **Data**: 19 maggio 2026
> **Status**: bozza approvata in conversazione, da formalizzare nei prossimi sprint
> **Scope**: definisce brand structure, positioning, pricing, architettura tecnica e roadmap 6 mesi per i 3 prodotti Voler.ai

---

## 1. Brand structure — la Tuner Suite

Voler.ai diventa una **suite di prodotti business** sotto un brand ombrello. Tre prodotti con identità distinte ma narrative coerente.

### 1.1 Business Tuner (BT) — Strategy

**Promessa**: "Sintonizza la tua strategia"

**Cosa fa**: Monitoraggio posizionamento brand (SERP, social, AI), interviste qualitative AI, copilot strategico, analisi competitor, suggerimento di azioni operative misurate (Results Hub).

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

### 1.4 Suite umbrella

```
                    ┌─────────────────────────────────┐
                    │     V O L E R . A I             │
                    │  The Tuner Suite for Business   │
                    └─────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
  ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
  │   BUSINESS   │          │   CONTENT    │          │  EXPERIENCE  │
  │    TUNER     │          │    TUNER     │          │    TUNER     │
  ├──────────────┤          ├──────────────┤          ├──────────────┤
  │   STRATEGY   │          │ STORYTELLING │          │     VISIT    │
  │  Capisci il  │          │  Racconta il │          │  Fai vivere  │
  │   mercato    │          │  tuo brand   │          │ il tuo luogo │
  └──────────────┘          └──────────────┘          └──────────────┘

  Insights ─────────────── Content production ────────── Visit delivery
```

**Narrativa di vendita unificata**: "Capire, raccontare, far vivere".

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

### 3.1 Tier Business Tuner (esistente, da consolidare)

| Tier | €/mese | Cosa include |
|---|---|---|
| Starter | 49 | 6k crediti, monitoring base |
| **Pro** ⭐ | 149 | 20k crediti, monitoring + interviews + insights |
| Business | 299 | 40k crediti, tutto pro + agenti AI |

### 3.2 Tier Content Tuner (nuovo)

| Tier | €/mese | Cosa include |
|---|---|---|
| Starter | 499 | Studio + KB + 1 brand voice + 3 canali content + 30 artifacts/mese + workflow base |
| **Pro** ⭐ | 1.200-1.500 | + preservation-first media + 3 brand voices + 9-12 canali + 150 artifacts + calendario editoriale + workflow completo |
| Enterprise | 3.000-5.000 | + brand voices unlimited + tutti i 15+ canali + unlimited artifacts + API access + bridge BT + dedicated AM |

### 3.3 Tier Experience Tuner (addon di CT, richiede CT come base)

| Tier | €/mese per sito | Cosa include |
|---|---|---|
| Basic | +300 | PWA visitor web + branding base + audio TTS |
| **Pro** ⭐ | +700 | + custom domain + visitor analytics dashboard + family mode UX |
| Enterprise | +1.500 | + app nativa Expo iOS/Android + push notifications + offline-first |

### 3.4 Bundle examples

| Cliente tipo | Configurazione | €/mese totale |
|---|---|---|
| **Museo medio** | CT Pro + ET Pro | 1.900-2.200 |
| **Cantina DOC** | BT Pro + CT Pro + ET Basic | 1.949-2.249 |
| **Brand luxury fashion** | BT Business + CT Enterprise | 3.299-5.299 |
| **Agenzia 5 clienti** | BT Pro + CT Enterprise | 3.149-5.149 |
| **Comune turistico 5 siti** | CT Enterprise + ET Pro × 5 | 6.500 |
| **Real estate prestigio 3 ville** | CT Pro + ET Pro × 3 | 3.600 |
| **Solo content (B2B prodotto)** | BT Pro + CT Pro | 1.349-1.649 |

### 3.5 Strategia di acquisizione clienti

**Pilot program** (primi 6 mesi post-launch CT):
- 3-5 clienti pilota Cultural Brand tier (CT Pro + ET Pro) a **€500/mese × 12 mesi** (sotto-costo)
- In cambio: case study pubblicabile, video testimonial, citazione "powered by Voler.ai" nei loro materiali
- Goal: avere 3-5 case study reali con nomi che fanno effetto per il go-to-market post-pilot

**Cross-sell bundle**: -20% sul totale se compri 2 prodotti, -30% se compri tutti e 3.

**Annual discount**: -29% su billing annuale (allineato a BT esistente).

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
3. **Pricing finale**: i range €499-5.000 (CT) e €300-1.500 (ET) sono indicativi; serve research di mercato + 3 pilot per pricing precise
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
