# Content Tuner — Design Document

> **Data**: 19 maggio 2026
> **Status**: draft v1
> **Companion docs**: [2026-05-19-decisioni-strategiche.md](./2026-05-19-decisioni-strategiche.md) (decisioni brand + suite)
> **Scope**: definisce CT in dettaglio — cosa è, come funziona, cosa eredita da BT e Toolia, come si sviluppa

---

## 1. Che cos'è Content Tuner (CT)

### Definizione operativa

**Content Tuner è il motore editoriale che trasforma fonti verificate in contenuti multi-canale preservando l'identità del brand.**

Una sola fonte di verità (KB + brand voice distillata + tension map editoriale) alimenta in modo deterministico **15+ canali di output** — dal post Instagram al comunicato stampa, dalla brochure al copy del sito web. Le immagini possono essere:
- **generate da zero** (illustrazioni concettuali)
- **modificate preservando l'identità del soggetto reale** (foto del cliente con treatment editoriale)
- **trasformate via reference style** (stile coerente cross-batch)
- **renderizzate da template layout** (poster, brochure, locandine)

Ogni contenuto è **tracciabile**: ogni affermazione è ancorata a una fonte verificata della KB, ogni immagine modificata supera un check di identity preservation.

### Mission statement

> Eliminare il gap fra "abbiamo materiali, fatti e identità verificati" e "produciamo contenuti consistenti e fedeli su tutti i canali" — riducendo il lavoro editoriale del 70-80% senza sacrificare verità o brand.

### Cosa CT NON è

| CT non è... | Perché non è |
|---|---|
| ...un altro Jasper / Copy.ai | Generic AI tools non hanno KB strutturata né preservation media — sono "AI che inventa testi" |
| ...un design tool come Canva | Canva è creazione visiva da zero; CT è preservazione di identità su asset reali |
| ...un CMS | I CMS gestiscono pubblicazione/struttura; CT è il livello sopra che PRODUCE il contenuto |
| ...una versione di Business Tuner | BT fa intelligence/strategy (input); CT fa storytelling/execution (output) — sono complementari |
| ...un tool standalone "audioguide" | L'audioguide è uno specifico output di Experience Tuner (sister product); CT produce tutto il resto |

---

## 2. Distinzione netta da Business Tuner

### Tre modi di vedere la differenza

| Dimensione | Business Tuner | Content Tuner |
|---|---|---|
| **Verbo principale** | Capire, monitorare, decidere | Raccontare, produrre, pubblicare |
| **Job-to-be-done** | "Cosa sta succedendo nel mio mercato? Cosa dovrei comunicare?" | "Come traduco questa decisione in contenuti consistenti su N canali?" |
| **Input primario** | Segnali esterni (SERP, social, interviews, GA4) | KB verificata + brand identity + tension map |
| **Output primario** | Insights, suggerimenti, tip strategici | Artifact pronti per pubblicazione (testi + media + audio) |
| **Frequenza uso** | Settimanale (review insights) | Giornaliera (produzione) |
| **Utente tipo** | Marketing strategist, consulente, CMO | Editor, content creator, marketing manager operativo |
| **Tipo di "tip"** | "Pubblica contenuto su X perché tendenza" | "Ecco il contenuto X pubblicabile, con immagine, copy, hashtag" |

### Confine condiviso

`★ Punto chiave ─────────────────────────────────`
BT produce **"tips strategici"** che sono **descrizioni di azioni da fare**. CT produce **"content artifacts"** che sono **artefatti eseguibili**. Quando BT dice "fai X" e CT trasforma quel "fai X" in un post Instagram pronto → ecco il bridge dei due prodotti.
`────────────────────────────────────────────────`

Bridge concreto:
```
BT.StrategyInsight ──→ CT.ContentBrief ──→ CT.ContentDraft ──→ CT.PublishedArtifact
   "tendenza X"        "produci 5 post     "5 post bozza      "5 post live su
   "competitor Y"      su tema X"          generati"          IG/FB/LinkedIn"
```

---

## 3. Target audience (TAM espanso)

### Cluster cliente (in ordine di priorità per acquisizione)

**Cluster A — Cultural & Heritage** (use case flagship, dove l'audioguida vive):
- Musei (statali, civici, privati)
- Ville storiche, palazzi nobiliari aperti al pubblico
- Parchi naturali, parchi archeologici
- Fondazioni culturali / mecenati
- Atenei e collegi storici
- Beni religiosi (basiliche, abbazie, monasteri)

**Cluster B — Heritage Brands** (premium con storia da raccontare):
- Brand luxury fashion (Made in Italy heritage)
- Cantine DOC/DOCG, distillerie storiche, oleifici premium
- Brand automotive heritage (motorbike makers, restauratori)
- Aziende artigiane storiche (ceramica, vetro, tessile)
- Sedi storiche d'azienda (showroom, archivi)

**Cluster C — Hospitality di pregio**:
- Hotel boutique, ville relais
- Resort di charme
- Agriturismi storici con esperienze didattiche
- Charter nautici di prestigio

**Cluster D — Real Estate di prestigio**:
- Immobiliari di lusso (case d'epoca, ville)
- Comuni che vendono dimore storiche

**Cluster E — Agenzie di branding/comunicazione**:
- Agenzie che gestiscono portafogli di clienti heritage/premium
- Studi di consulenza marketing per cultural sites
- Studi di architettura/restauro che fanno comms

**Cluster F — Brand di prodotto premium** (senza visit experience):
- Designer-maker / artigiani di nicchia
- Food & wine specialty
- Editori specializzati

### Job-to-be-done per cluster

Tutti i cluster condividono un **pattern strutturale**: hanno **identità da preservare** e **fatti verificati** che vogliono trasformare in **contenuti consistenti su N canali**. La differenza è solo nella mix di canali finali: cultural sites e hospitality producono anche audio visit (richiede ET addon), il resto produce solo content multi-canale (solo CT).

---

## 4. Feature inventory completo (capabilities)

Organizzate in **8 capability cluster**:

### Cluster 1 — Knowledge Foundation
Cosa CT sa del cliente.

- **Sources Management**: caricamento URL/PDF/testi/foto/audio/video come fonti, tagging importanza+affidabilità
- **Interview Sessions**: intervista AI per estrarre tacit knowledge dal cliente (può essere alimentata da BT se collegato)
- **KB Extraction**: AI estrae KBFact strutturati con 4 categorie (`solido`, `interpretazione`, `memoria`, `ipotesi`)
- **Semantic Base**: per ogni entità di contenuto (POI per ET / brand topic per CT generic), 10 sezioni strutturate (identity, grounding, key messages, verified facts, narrative angles, lens relevance, expansion, warnings, delivery constraints, visual affordances, question surfaces)
- **Knowledge approval workflow**: ogni fatto è "approvato" prima di entrare nella produzione

### Cluster 2 — Brand Layer
Cosa il brand del cliente è/comunica.

- **BrandAsset upload**: logo, brand book, moodboard, past content, reference photos
- **BrandEvidence extraction**: AI estrae evidence strutturate da asset (palette, tone signals, archetype patterns)
- **BrandSkill distillation**: AI distilla un `manifest` versionato che descrive: palette, tone attributes, imagery byPostType, voice rules, do's and don'ts
- **Multiple brand voices per tenant**: es. "Voce ufficiale", "Voce social", "Voce formale" — ognuna distillata da subset di asset

### Cluster 3 — Editorial Layer (cuore strategico)
Le "regole d'ingaggio" per produrre contenuti.

- **Editorial Lenses**: lenti tematiche che guidano la generazione (es. "Storia per famiglie", "Architettura per esperti")
- **Personas project-specific**: profili visitor/buyer rilevanti, configurate per progetto
- **Driver-Persona Matrix**: pesi 0-10 di compatibilità che orientano l'AI
- **Narrative Tension Map**: 4 buckets (mustTell, niceToTell, avoid, verify) + tensions explicit
- **Wizard signal model**: come il consumer finale (visitor/buyer) viene profilato (per ET via wizard, per altri canali via persona inferenza dai segnali brand)

### Cluster 4 — Content Engine (RAG)
Come si produce un contenuto.

- **Vector indexing**: pgvector indicizza KBFact + semantic base + brief + tension items con `text-embedding-3-small`
- **Retrieval API**: semantic search con scope/filter (per canale, per persona, per affidabilità)
- **Content templates**: 15+ template strutturati (caption IG, post X, articolo blog, brochure paragraph, press release, email campaign, web hero, audio promo script, product description, case study, FAQ, ecc.)
- **Content orchestrator**: pipeline che combina (retrieved chunks + template prompt + brand voice + tension constraints) → output strutturato
- **Multi-provider LLM**: OpenAI default, Anthropic per long-form blog, Kimi per budget tier — configurable per template

### Cluster 5 — Media Pipeline (preservation-first)
Come si producono immagini, audio, video.

#### 5.A Modalità Generation (immagine da zero)
- gpt-image-1 → fallback DALL-E 3 → Gemini 2.5
- Use case: hero abstract, concept illustration, infografica
- Cost: $0.04-0.08/img
- **Sempre etichettata** "Immagine AI generata"

#### 5.B Modalità Preservation Edit (foto reale + treatment)
- Flux Kontext primary → gpt-image-1 edit → Gemini edit fallback
- Input: photo source + edit instructions + brand overlay
- **Identity preservation check obbligatorio** (gpt-4o-vision compara source vs output)
- Use case: foto reale del museo con treatment editoriale magazine
- Cost: $0.05/img + identity check ~$0.01

#### 5.C Modalità Reference Style Transfer
- Flux Kontext con reference image → Stable Diffusion + IP-Adapter fallback
- Input: photo source (subject) + reference image (style)
- Use case: 50 post Instagram con stesso stile editoriale ma soggetti reali diversi
- Cost: $0.05/img

#### 5.D Modalità Layout Render
- HTML/CSS template → Puppeteer headless → PNG/PDF
- Input: template + slot data (testo+immagine) + brand identity
- Use case: poster A4, brochure A5, post quadrato con cornice
- Cost: ~$0 (rendering server-side)

#### 5.E Visual Template Library
- Templates curati da Toolia disponibili a tutti (Editorial magazine, Vintage postcard, National Geographic style, Architectural detail focus, ecc.)
- Customer può uploadare i propri (Pro tier)
- Per ogni template: kind (`generation_prompt`/`edit_instructions`/`reference_pair`/`canvas_layout`), brand fit, aspect ratio

#### 5.F Audio Production
- TTS via ElevenLabs (voci configurabili per brand voice)
- Use case: audio promo 30s, podcast intro, IG reels audio
- Cost: ~$0.30/minute

### Cluster 6 — Workflow & Collaboration
Come il team del cliente revisiona e approva.

- **ContentDraft lifecycle**: `draft → in_review → client_review → approved → published → archived`
- **Auto-revert**: published modificato torna a `draft` con version bump
- **Comments threaded**: per artifact + per single sezione/paragrafo
- **Approval gate**: stato `approved` richiede ruolo Reviewer+
- **Bulk operations**: bulk approve/archive/delete + bulk regenerate
- **Editorial calendar**: drag-drop calendar settimanale con AI slot suggestions
- **Notification flow**: email + in-app quando passa allo stato `client_review` o `published`

### Cluster 7 — Export & Delivery
Come il contenuto esce di CT.

- **Multi-format export**: Markdown, HTML, DOCX, PDF, PNG, MP3
- **Per-template export**: ogni template ha export format ottimale
- **Bulk export**: ZIP con tutti gli artifact approvati del mese
- **API outbound**: webhook trigger su `published` + REST API per integrazione
- **Future integrations** (Stadio 4+ post-launch): Buffer, Notion, Mailchimp, Slack notification
- **For ET delivery**: produce `DeliveryPack` (artifact strutturato che ET visitor app consuma)

### Cluster 8 — Analytics & Cost
Come si misura quello che si produce.

- **Content performance metrics**: per ogni artifact pubblicato (views, engagement, conversion se outbound API ne riporta)
- **Cost tracking**: per artifact, per progetto, per tenant — granularità per modello LLM, per provider, per modalità media
- **Editorial productivity**: artifacts/mese, time-to-publish medio, approval rate
- **Lens performance**: quale lens produce contenuti più engaging
- **Brand voice consistency**: drift detection se output deviano dal manifest

---

## 5. Data Model (schema chiave)

### Entità centrali

Mostrate solo le **NUOVE in CT** o le **estensioni di entità Toolia esistenti**:

```prisma
// === Brand Layer (eredita da BT, refactor) ===
model BrandAsset {
  id              String   @id @default(cuid())
  projectId       String
  project         Project  @relation(...)
  kind            BrandAssetKind  // LOGO | BRAND_BOOK | MOODBOARD | PAST_CONTENT | REFERENCE_PHOTO | STYLE_REFERENCE
  fileUrl         String          // R2 URL
  metadataJson    Json     @default("{}")
  uploadedAt      DateTime @default(now())
  brandEvidences  BrandEvidence[]
}

model BrandEvidence {
  id              String   @id @default(cuid())
  brandAssetId    String
  brandAsset      BrandAsset @relation(...)
  kind            String   // palette | tone | archetype | visual_style | typography
  extractedJson   Json
  confidence      Float
  extractedAt     DateTime @default(now())
}

model BrandSkill {
  id              String   @id @default(cuid())
  projectId       String
  project         Project  @relation(...)
  name            String   // "Voce ufficiale", "Voce social"
  version         Int      @default(1)
  manifestJson    Json     // distilled brand voice: palette, tone, imagery byPostType, rules
  isDefault       Boolean  @default(false)
  distillerTokensIn  Int
  distillerTokensOut Int
  distillerCostUsd   Float
  createdAt       DateTime @default(now())
}

// === Content Engine (NEW) ===
model ContentEmbedding {
  id              String   @id @default(cuid())
  projectId       String
  project         Project  @relation(...)
  sourceType      EmbeddingSourceType  // KBFACT | SEMANTIC_BASE | BRIEF | TENSION_ITEM | POI_DESCRIPTION
  sourceId        String                // FK soft to original entity
  chunkIndex      Int      @default(0)
  content         String   @db.Text
  embedding       Unsupported("vector(1536)")?
  metadataJson    Json     @default("{}")
  createdAt       DateTime @default(now())
  @@index([projectId, sourceType])
  // Vector HNSW index added via raw SQL migration
}

model ContentTemplate {
  id              String   @id @default(cuid())
  tenantId        String?  // null = system-provided template
  tenant          Tenant?  @relation(...)
  name            String
  channel         ContentChannel  // INSTAGRAM_POST | BLOG_ARTICLE | PRESS_RELEASE | ...
  promptSystem    String   @db.Text
  promptUser      String   @db.Text       // template Mustache-like con {{retrieved}}, {{brandVoice}}
  outputSchema    Json                    // JSON Schema dell'output atteso
  parameters      Json     @default("{}") // {targetLength, includeHashtags, ...}
  isSystem        Boolean  @default(false)
  archetype       String?                 // educational | news_take | thought_leadership | ...
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ContentDraft {
  id              String   @id @default(cuid())
  projectId       String
  project         Project  @relation(...)
  templateId      String
  template        ContentTemplate @relation(...)
  brandSkillId    String?
  brandSkill      BrandSkill? @relation(...)
  scope           Json     // {poiIds?, lensId?, driverIds?, custom?}
  title           String
  contentJson     Json     // strutturato per channel (text + hashtags + cta + ...)
  mediaAssets     ContentMediaAsset[]
  retrievalLogJson Json    // provenance: chunks usati per generazione
  status          ContentStatus @default(DRAFT)
  version         Int      @default(1)
  qualityScore    Float?
  warningsJson    Json     @default("[]")  // hallucination check warnings
  scheduledFor    DateTime?
  publishedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  comments        ContentComment[]
  revisions       ContentRevision[]
  @@index([projectId, status])
  @@index([scheduledFor])
}

model ContentRevision {
  id              String   @id @default(cuid())
  contentDraftId  String
  contentDraft    ContentDraft @relation(...)
  version         Int
  contentJson     Json
  changedBy       String?  // userId
  changeReason    String?  @db.Text
  createdAt       DateTime @default(now())
}

model ContentComment {
  id              String   @id @default(cuid())
  contentDraftId  String
  contentDraft    ContentDraft @relation(...)
  parentCommentId String?  // for threading
  authorId        String
  body            String   @db.Text
  resolvedAt      DateTime?
  createdAt       DateTime @default(now())
}

// === Media Pipeline (NEW) ===
model ContentMediaAsset {
  id              String   @id @default(cuid())
  contentDraftId  String?
  contentDraft    ContentDraft? @relation(...)
  visualAssetId   String?  // FK to Toolia VisualAsset (shared)
  generationMode  MediaGenerationMode  // GENERATION | PRESERVATION_EDIT | STYLE_TRANSFER | LAYOUT
  sourcePhotoId   String?  // FK to source if EDIT/STYLE_TRANSFER
  templateId      String?
  template        VisualTemplate? @relation(...)
  provider        String   // openai | anthropic | replicate | gemini
  model           String   // gpt-image-1 | flux-kontext | dall-e-3
  promptOrInstructions String  @db.Text
  outputUrl       String   // R2 URL
  preservationCheckPassed Boolean?
  preservationCheckScore  Float?
  preservationConcerns    Json?
  costUsd         Float
  createdAt       DateTime @default(now())
}

model VisualTemplate {
  id              String   @id @default(cuid())
  tenantId        String?  // null = system-provided
  tenant          Tenant?  @relation(...)
  name            String
  kind            VisualTemplateKind  // MODE_A_PROMPT | MODE_B_EDIT | MODE_C_REFERENCE | MODE_D_LAYOUT
  description     String   @db.Text
  promptText      String?  @db.Text  // for kind=MODE_A
  editInstructions String? @db.Text  // for kind=MODE_B
  referenceImageUrl String?          // for kind=MODE_C
  layoutHtmlSlot  String?  @db.Text  // for kind=MODE_D
  layoutDataJson  Json?
  aspectRatio     String   // 1:1 | 4:5 | 16:9 | 9:16 | A4 | A5
  brandSkillId    String?
  brandSkill      BrandSkill? @relation(...)
  isSystem        Boolean  @default(false)
}

// === Enums ===
enum BrandAssetKind { LOGO BRAND_BOOK MOODBOARD PAST_CONTENT REFERENCE_PHOTO STYLE_REFERENCE }
enum EmbeddingSourceType { KBFACT SEMANTIC_BASE BRIEF TENSION_ITEM POI_DESCRIPTION }
enum ContentChannel { INSTAGRAM_POST INSTAGRAM_CAROUSEL TWITTER_POST LINKEDIN_ARTICLE LINKEDIN_POLL FACEBOOK_POST BLOG_ARTICLE NEWSLETTER_SECTION BROCHURE_PARAGRAPH PRESS_RELEASE EMAIL_CAMPAIGN WEB_HERO AUDIO_PROMO_30S PRODUCT_DESCRIPTION CASE_STUDY }
enum ContentStatus { DRAFT IN_REVIEW CLIENT_REVIEW APPROVED PUBLISHED ARCHIVED }
enum MediaGenerationMode { GENERATION PRESERVATION_EDIT STYLE_TRANSFER LAYOUT }
enum VisualTemplateKind { MODE_A_PROMPT MODE_B_EDIT MODE_C_REFERENCE MODE_D_LAYOUT }
```

### Entità riusate da Toolia (esistenti, modificate)

- `Project`, `Source`, `KBFact`, `SemanticBase`, `EditorialLens`, `NarrativeTension`, `Driver`, `Persona`, `DriverPersonaWeight` — già presenti, restano centrali in CT
- `Scheda` (Toolia audioguide content) si specializza in `ContentDraft` con `channel=AUDIO_SCHEDA` — o resta separata, decidere durante refactor
- `AudioAsset`, `VisualAsset` esistenti → integrati con `ContentMediaAsset` come pivot

### Entità ereditate da Business Tuner

- `Organization`, `User`, `Membership`, `Workspace`, `ApiKey` — gerarchia tenant
- `LlmUsage` — già pronta in Toolia per cost tracking
- `TipPlanCompiler` types e enum — riusati come modello per `ContentDraft` workflow

---

## 6. Architettura tecnica

### Stack scelte

| Layer | Scelta | Reason |
|---|---|---|
| Framework | Next.js 16 App Router | Stesso di Toolia + BT |
| ORM | Prisma 7 + `@prisma/adapter-pg` | Coerenza con repo esistenti |
| Auth | NextAuth v5 (GA quando disponibile, beta intanto) | Stesso di BT — coerenza pattern |
| DB | Postgres + pgvector + JSONB | pgvector per RAG, JSONB per output strutturato |
| Storage | Cloudflare R2 via AWS S3 SDK | Già configurato in Toolia |
| Cache | Upstash Redis (per rate limiting + session) | Pattern BT |
| Queue | **pg-boss** (NUOVO) | No setTimeout fragile; pg-boss su Postgres = no servizio esterno |
| Editor | **TipTap** (NUOVO) | WYSIWYG estensibile + supporto Markdown + collaborative editing future |
| Test | Vitest (con `fileParallelism: false` + `isolate: true`) | Già configurato in Toolia post-Fase 0 |
| Coverage target | **75% su `lib/`, `api/`** (NUOVO) | Discipline non presente in BT |
| Linter | ESLint + Prettier | Standard |
| Validation | Zod | Già in BT + Toolia |
| Monorepo | Turborepo + pnpm workspaces (post-refactor) | Industry standard |
| LLM providers | OpenAI primary, Anthropic per long-form, Kimi per budget | Multi-provider con `@voler/ai` abstraction |
| Embedding | OpenAI `text-embedding-3-small` (1536 dims) | $0.02/1M token, eccellente rapporto |
| Media gen | gpt-image-1 + DALL-E 3 + Gemini + Flux Kontext (Replicate) + SDXL (Replicate) | Cascade pattern di BT |
| TTS | ElevenLabs `eleven_multilingual_v2` | Già in Toolia per audio audioguida |
| Hosting | Railway (Toolia pattern) o Vercel (BT pattern) — TBD per CT | Decidere durante refactor monorepo |
| CI/CD | GitHub Actions + Turbo cache | Da definire |
| Lockfile | **`pnpm-lock.yaml`** (mandatorio dal day-one) | Disciplina mancante in BT |

### Layer organization (target post-refactor monorepo)

```
studio-tuner/
├── apps/
│   └── content-tuner/                       # Frontend + API routes specifici CT
│       ├── src/app/
│       │   ├── (workspace)/                 # CT Workspace UI (admin operatore)
│       │   ├── api/                         # CT-specific routes
│       │   └── content-engine/              # Public/marketing route
│       └── prisma/                          # Solo schema delta CT
│
├── packages/
│   ├── @voler/db                            # Schema Prisma unificato (tutte le tabelle)
│   ├── @voler/auth                          # NextAuth + tenant isolation helpers
│   ├── @voler/ai                            # LLM clients + provider abstraction + circuit breaker
│   ├── @voler/content-engine                # RAG retrieval + content orchestrator + templates
│   ├── @voler/media-pipeline                # 4 modes + identity preservation + visual templates
│   ├── @voler/brand-layer                   # BrandAsset/Evidence/Skill + distiller
│   ├── @voler/editorial                     # KB + SemanticBase + Lenses + TensionMap
│   ├── @voler/workflow                      # ContentDraft lifecycle + revisions + comments
│   ├── @voler/export                        # Multi-format export (md/docx/pdf/html)
│   ├── @voler/ui                            # Design system condiviso, themable
│   ├── @voler/jobs                          # pg-boss wrapper + job types
│   └── @voler/bridge                        # Event bus cross-product (BT↔CT↔ET)
│
└── services/
    ├── worker-jobs/                         # pg-boss worker process
    └── delivery-pack-builder/               # ET-specific (per CT-to-ET handoff)
```

### Multi-tenancy enforcement

Pattern ereditato da BT (`assertProjectAccess` in `@voler/auth`):

```typescript
// Pattern ovunque nelle API routes CT
const session = await getSessionUser();
await assertProjectAccess(session.user.id, projectId, "MEMBER");
// poi proseguire con prisma queries
```

**Disciplina**: nessuna route CT può fare query a `Project`/`ContentDraft`/etc. **prima** di questa chiamata. Lint rule custom se possibile.

### API surface (categorizzate)

- `/api/projects/[projectId]/brand/*` — gestione asset, evidence, skill (riuso pattern BT)
- `/api/projects/[projectId]/sources/*` — KB sources management
- `/api/projects/[projectId]/kb/*` — KBFact CRUD + approval
- `/api/projects/[projectId]/semantic-base/*` — semantic base CRUD
- `/api/projects/[projectId]/lenses/*` — editorial lenses CRUD
- `/api/projects/[projectId]/tension-map/*` — tension map CRUD
- `/api/projects/[projectId]/templates/*` — content templates browse/select
- `/api/projects/[projectId]/content/retrieve` — RAG retrieval API
- `/api/projects/[projectId]/content/generate` — content artifact generation (text)
- `/api/projects/[projectId]/content/generate-media` — media generation (4 modes)
- `/api/projects/[projectId]/content/drafts/*` — ContentDraft CRUD + workflow
- `/api/projects/[projectId]/content/calendar/*` — editorial calendar
- `/api/projects/[projectId]/content/export/*` — multi-format export
- `/api/projects/[projectId]/content/analytics/*` — performance metrics
- `/api/ai/*` — AI proxy endpoints (chiamati internamente, no public access)
- `/api/jobs/[jobId]/*` — job status + progress polling (per pg-boss)
- `/api/webhooks/bridge` — webhook receiver da BT (insights flow)

### Job queue architecture (pg-boss)

Operazioni eseguite asincrone via pg-boss:
- `brand-skill-distillation` (1-3 min)
- `kb-extraction-batch` (30s-5 min per fonte)
- `content-generation-bulk` (5-30 min per batch)
- `media-generation-batch` (10s-5 min)
- `delivery-pack-build` (1-3 min per ET handoff)
- `embedding-reindex` (1-10 min)

Pattern: ogni job ha `tenantId`, `projectId`, `userId` (chi ha triggerato), `payload`, `result`, `error`, `progress`. Worker dedicato in `services/worker-jobs/` consuma da pg-boss queue.

### Coverage targets (ridiamo discipline da day-one)

| Layer | Target coverage | Tipo test |
|---|---|---|
| `@voler/content-engine` | 85% | unit + integration |
| `@voler/media-pipeline` | 80% | unit (con mock provider) |
| `@voler/brand-layer` | 80% | unit (distiller con fixture) |
| `@voler/workflow` | 90% | unit (workflow state machine) |
| API routes | 70% | integration con test DB |
| UI components | 60% | unit con Testing Library |

CI gate: PR non mergeable se coverage scende sotto target.

---

## 7. UI/UX information architecture

### Le 8 superfici principali del CT Workspace

L'utente operatore (Editor / Marketing Manager) lavora dentro **CT Workspace**. Information architecture:

```
CT Workspace (per progetto selezionato)
│
├── 1. Project Overview          → readiness + KPI sintetici + recent activity
├── 2. Brand Workspace           → asset, evidence, skill, voices
├── 3. Knowledge Workspace       → sources, KB, semantic bases, tension map
├── 4. Editorial Workspace       → lenses, personas, driver matrix
├── 5. Content Studio            → matrix view, generation, bulk ops, editor
├── 6. Calendar                  → editorial calendar drag-drop con slot AI
├── 7. Library                   → tutti gli artifacts (filtrabili)
└── 8. Analytics                 → performance + cost dashboard
```

Settings (cross-progetto):
- 9. Tenant Settings (API keys, brand voices defaults, integrations)
- 10. Team & Members (RBAC management)
- 11. Billing & Usage

### Flow tipico operatore (use case "Pubblica 20 post per il mese")

1. **Brand Workspace** — verifica che il BrandSkill "Voce social" sia configurato (5 min)
2. **Editorial Workspace** — assicurati che la lens "Stagionalità autunno" sia attiva (2 min)
3. **Content Studio** — apri matrix view, scegli template "Instagram caption", scope "ultimo trimestre POI/topic", lens, brand voice
4. Click "Bulk genera 20" → pg-boss job → progress visible (10-15 min)
5. Review 20 bozze → approva 15, scarta 5, regenera 3 con tweak (30 min)
6. **Calendar** — drag-drop le 18 approvate sui giorni di pubblicazione (10 min)
7. Export ZIP `.csv` con caption + media + scheduled_at per Buffer

**Time-to-publish**: ~1 ora per 20 post. Senza CT: 8-10 ore di copywriting + design + scheduling.

### Producer Surface vs Consumer Surface

CT ha **solo Producer surface** (l'operatore lavora). I contenuti **pubblicati** vanno in altri canali:
- Audio scheda → consumata da Experience Tuner visitor app
- Post Instagram → exported a Buffer / pubblicato via API
- Articolo blog → pubblicato via WordPress MCP (riuso BT integration)
- Brochure PDF → download manuale o invio email

CT non gestisce il "consumer", lo gestiscono i canali downstream.

---

## 8. Deep dive: Pipeline Media Preservation-first

Già descritta in [decisioni-strategiche.md](2026-05-19-decisioni-strategiche.md#51-media-pipeline-preservation-first-ct) section 5.1, riassumo qui le decisioni operative:

### Provider selection per modalità

```typescript
// @voler/media-pipeline strategy

const PROVIDERS = {
  GENERATION: ["openai:gpt-image-1", "openai:dall-e-3", "gemini:imagen-3"],
  PRESERVATION_EDIT: ["replicate:flux-kontext", "openai:gpt-image-1-edit", "gemini:image-edit"],
  STYLE_TRANSFER: ["replicate:flux-kontext-ref", "replicate:sdxl-ip-adapter"],
  LAYOUT: ["puppeteer-render"], // server-side rendering, no LLM call
};

// Cascade: try primary → fallback → final fallback
// Each provider call wrapped in AbortController timeout
```

### Identity preservation check (algoritmo)

```typescript
async function checkIdentityPreservation(
  sourceUrl: string,
  outputUrl: string,
): Promise<PreservationResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: PRESERVATION_CHECK_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Compara queste due immagini..." },
          { type: "image_url", image_url: { url: sourceUrl } },
          { type: "image_url", image_url: { url: outputUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });
  return parsePreservationResponse(response);
}
```

Output strutturato:
```json
{
  "preserved": true | false,
  "confidence": 0.0-1.0,
  "concerns": ["dettaglio statua modificato", "colore facciata cambiato"],
  "recommendation": "accept" | "regenerate" | "reject"
}
```

UI: se `preserved=false` o `confidence<0.7`, badge rosso "Verifica manuale richiesta", l'editor può:
- Rigenerare con istruzioni diverse
- Accettare con override (audit log con motivazione)
- Scartare

### Costi tipici per progetto

Stima per "20 post Instagram con preservation":
- 20 × Modalità B (preservation edit) = $1.00
- 20 × identity check = $0.20
- 20 × caption text gen (gpt-4o, ~1000 token in + 200 out) = $0.05
- 20 × hashtag gen = $0.01
- **Totale media: ~$1.26**

vs senza preservation (modalità A solo):
- 20 × Modalità A (generate) = $1.00
- 20 × caption = $0.05
- **Totale: ~$1.05**

Differenza marginale ($0.21) per ottenere **identità preservata** + **provenance audit**.

---

## 9. Deep dive: RAG content engine

### Embedding pipeline (jobs async)

```
Trigger: KBFact approved | SemanticBase updated | Brief saved | TensionMap published
   │
   ▼
pg-boss enqueue: "content-embedding-reindex"
   │
   ▼
worker-jobs/embedding-worker.ts:
   1. Fetch updated source
   2. Chunk if > 500 token (sliding window 400+100 overlap)
   3. Per chunk: call OpenAI text-embedding-3-small
   4. Upsert ContentEmbedding (delete old chunks for same sourceId, insert new)
   │
   ▼
ContentEmbedding table populated
HNSW index su pgvector mantenuto automaticamente
```

### Retrieval API

```typescript
POST /api/projects/[id]/content/retrieve
Body: {
  query: string,           // natural language query
  scope?: {
    poiIds?: string[],
    lensIds?: string[],
    driverIds?: string[],
  },
  filter?: {
    categories?: KBFactCategory[],
    minReliability?: "alta" | "media",
    sourceTypes?: EmbeddingSourceType[],
  },
  topK: number,            // default 10
  scoreThreshold?: number, // default 0.7
}

Response: {
  chunks: Array<{
    id: string,
    content: string,
    sourceType: EmbeddingSourceType,
    sourceId: string,
    score: number,        // cosine similarity 0-1
    metadata: { ... },
  }>,
  retrievalLog: {
    query,
    embeddedQuery: number[], // [1536]
    totalCandidates: number,
    filtered: number,
    returned: number,
  },
}
```

### Content orchestrator (generation flow)

```
User: Click "Genera Instagram post per POI X con lens 'famiglie'"
   │
   ▼
POST /api/projects/[id]/content/generate
Body: { templateId, scope, brandVoiceId, customParameters }
   │
   ▼
Orchestrator:
   1. Fetch template
   2. Derive embedded_query from scope (es. "POI X famiglie content engaging")
   3. Call retrieval API → 10 chunks
   4. Fetch BrandSkill manifest
   5. Fetch TensionMap (avoid + verify constraints)
   6. Compile promptUser = template.promptUser with substitutions:
        - {{retrieved}} = chunks joined
        - {{brandVoice}} = manifest description
        - {{lensContext}} = lens.description + tone
        - {{constraints}} = avoid + verify
   7. Call LLM with promptSystem + promptUser
   8. Parse response (validated against template.outputSchema with Zod)
   9. Hallucination check (gpt-4o-mini) — compare output vs KBFact pool
   10. Persist ContentDraft + ContentMediaAsset (if media included)
   11. retrievalLog stored as provenance
   │
   ▼
Return ContentDraft to UI for review
```

**Provenance principle**: ogni affermazione in un artifact deve essere ancorata ad almeno un chunk recuperato. La retrievalLog è la traccia auditabile.

### Multi-provider strategy

Pattern `@voler/ai`:

```typescript
const llm = await aiClient.complete({
  task: "generate-content-instagram",
  provider: "auto",  // resolves based on policy
  model: undefined,  // resolves based on provider+task
  messages: [...],
  responseFormat: "json",
});

// Internal:
// "auto" + tier=pro → openai:gpt-4o
// "auto" + tier=enterprise + task=blog_longform → anthropic:claude-sonnet-4-7
// "auto" + tier=starter → kimi:moonshot-v1-128k
```

Configurable per template + per tier in `Tenant.settingsJson.llmRouting`.

---

## 10. Deep dive: Brand Voice distillation

Pattern ereditato direttamente da BT. Flow:

### 10.1 Upload phase

L'operatore carica BrandAsset (anche multipli):
- LOGO (PNG/SVG) — palette extraction
- BRAND_BOOK (PDF) — typography, palette, tone guidelines
- MOODBOARD (images zip) — visual style reference
- PAST_CONTENT (URL o file) — esempi di contenuti già pubblicati dal cliente
- REFERENCE_PHOTO (image) — foto reali per Modalità B/C

### 10.2 Evidence extraction

Per ogni BrandAsset, un job estrae BrandEvidence:
- Da LOGO: palette dominante (color theory analysis via Vision API)
- Da BRAND_BOOK: typography names, palette code, tone descriptors (LLM extract from PDF)
- Da PAST_CONTENT: tone signals (length avg, sentence structure, recurring phrases, emoji usage, exclamation rate)
- Da MOODBOARD: visual archetype tags (rustic, minimalist, vintage, editorial)

### 10.3 Skill distillation

Quando l'operatore clicca "Distilla brand voice X" dopo aver caricato ≥3 BrandAsset:

```
Distiller LLM call (gpt-4o):
  Input: tutti i BrandEvidence linked
  Output: BrandSkill.manifestJson = {
    palette: {
      primary: ["#8B4513", "#D4A574"],
      secondary: [...],
      accent: [...],
      typography: { primary: "Playfair", secondary: "Inter" },
    },
    voice: {
      formality: "warm-but-professional",
      sentenceLength: "medium",
      emojiUsage: "rare",
      personPronoun: "noi",
      tense: "present",
      cta_style: "soft",
    },
    imagery: {
      byPostType: {
        instagram_post: "editorial-magazine-warm",
        blog_hero: "wide-landscape-cinematic",
        product_shot: "minimal-clean",
      },
      brandColors: ["#8B4513", "#D4A574"],
      stylePreferences: ["natural-light", "shallow-depth-of-field"],
    },
    rules: {
      do: ["mantieni tono caldo", "usa 'noi' inclusivo"],
      dont: ["evitare 'incredibile', 'fantastico'", "no esclamativi multipli", "no claim non verificabili"],
    },
  }
```

### 10.4 Versioning + evolution

Ogni distillazione genera una nuova `BrandSkill.version`. L'operatore può:
- Sostituire (mark `isDefault=false` sulla vecchia, `true` sulla nuova)
- Confrontare due versioni A/B (UI diff side-by-side)
- Rollback se la nuova non funziona

### 10.5 Usage nei prompt

Ogni LLM call include `brandSkill.manifestJson` come parte del system prompt:

```
System: Sei un copywriter esperto. Segui rigorosamente il brand voice:
- Palette: {{manifest.palette}}
- Voice: {{manifest.voice}}
- Rules DO: {{manifest.rules.do}}
- Rules DONT: {{manifest.rules.dont}}
...
```

Per immagini: `manifest.imagery.byPostType` viene mappato a Modalità (B/C) + reference image library del tenant.

---

## 11. Integrazioni cross-product (post-monorepo)

### Bridge BT → CT (insights flow)

BT pubblica eventi via `@voler/bridge`:
- `strategy.insight.published` — quando il copilot strategico produce un'azione concreta
- `signal.high_relevance` — quando un segnale ha rilevanza > threshold
- `competitor.action.detected` — quando un competitor pubblica qualcosa rilevante
- `persona.behavior.shift` — quando l'analytics rileva cambio comportamento persona

CT subscribe (in `apps/content-tuner/api/webhooks/bridge.ts`):
1. Riceve evento
2. Converte in `ContentBrief` (entità leggera che propone "produci contenuto X")
3. Notifica utente CT via in-app inbox
4. L'operatore può accept → genera ContentDraft, decline, defer

### Bridge CT → ET (DeliveryPack)

CT produce un `ContentDraft` di tipo `AUDIO_SCHEDA` → pg-boss job `delivery-pack-build`:
1. Fetch tutti gli artifact AUDIO_SCHEDA approvati
2. Fetch TTS audio assets associati
3. Fetch visitor-relevant metadata (POI, narratori, lenses)
4. Build `DeliveryPack.contentJson` deterministico
5. Activate pack → ET visitor app legge dal pack attivo

### Bridge ET → BT (visitor performance)

ET pubblica eventi:
- `visit.completed` con metrics
- `poi.engagement.report` (POI ranking, drop-off, audio completion)
- `family.mission.outcome`

BT subscribe per:
- Aggiornare `Subscription.usage` metrics
- Calcolare KPI cross-product
- Generare insights "questo POI funziona bene per persona X" → feedback loop

### Connessioni esterne

Integrazioni outbound CT (Fase 2+ post-launch):
- WordPress (via MCP, riuso BT)
- Buffer / Hootsuite (REST API per scheduling)
- Mailchimp (REST API per newsletter)
- Notion (database sync)
- Slack (notification on `client_review` o `published`)

---

## 12. Pricing tier breakdown (con feature matrix)

Riprende i tier dichiarati nel doc strategico, espansi con feature dettagliate:

### CT Starter — €499/mese

| Capability | Limit |
|---|---|
| Brand voices | 1 |
| Knowledge sources | 50 |
| KBFact attivi | 500 |
| Editorial lenses | 2 |
| Content templates disponibili | 5 (Instagram, X, blog short, newsletter, brochure) |
| ContentDraft/mese | 30 |
| Media generation Modalità A | ✅ (15/mese) |
| Media generation Modalità B (preservation) | ❌ |
| Media generation Modalità C (style transfer) | ❌ |
| Media generation Modalità D (layout) | ✅ basic |
| Identity preservation check | ❌ |
| Editorial calendar | ✅ basic |
| Workflow review | ✅ (no client_review) |
| Export | md, html |
| API access | ❌ |

### CT Pro — €1.200-1.500/mese ⭐

| Capability | Limit |
|---|---|
| Brand voices | 3 |
| Knowledge sources | 250 |
| KBFact attivi | 5.000 |
| Editorial lenses | 5 |
| Content templates disponibili | 15 (tutti i canali) |
| ContentDraft/mese | 150 |
| Media generation Modalità A | ✅ |
| Media generation Modalità B (preservation) | ✅ |
| Media generation Modalità C (style transfer) | ✅ |
| Media generation Modalità D (layout) | ✅ avanzato + custom templates |
| Identity preservation check | ✅ |
| Editorial calendar | ✅ avanzato con slot AI |
| Workflow review | ✅ completo (incl. client_review) |
| Comments threaded | ✅ |
| Export | md, html, docx, pdf, png |
| API access | ✅ limited |

### CT Enterprise — €3.000-5.000/mese

| Capability | Limit |
|---|---|
| Brand voices | Unlimited |
| Knowledge sources | Unlimited |
| KBFact attivi | Unlimited |
| Editorial lenses | Unlimited |
| Content templates | All + custom template builder |
| ContentDraft/mese | Unlimited |
| All media modes | ✅ priority queue |
| Identity preservation check | ✅ con custom thresholds |
| Editorial calendar | ✅ |
| Workflow review | ✅ + custom approval chains |
| Multi-tenant access | ✅ (agency use case) |
| Bridge BT (insights flow) | ✅ |
| Bridge ET (audio module) | ✅ se ET addon attivo |
| API access | ✅ full |
| White-label content | ✅ (no "powered by Voler") |
| Dedicated AM | ✅ |
| AI Act compliance suite | ✅ |
| SLA | 99.5% |

---

## 13. Roadmap (sotto-progetti Fase 2)

Già descritta nel doc strategico, riassumo qui i sub-projects con label nuova post-rebranding CT:

| Sub | Nome | Effort | Repo target |
|---|---|---|---|
| 2.1 | RAG infrastructure (pgvector + embedding pipeline + worker) | 4-5gg | Toolia attuale → `@voler/content-engine` |
| 2.2 | Retrieval API + playground | 3-4gg | Toolia → `@voler/content-engine` |
| 2.3 | Content templates seed (15) + ContentDraft CRUD | 7-10gg | Toolia → `@voler/workflow` |
| 2.4 | Content Studio UI (matrix + bulk + editor TipTap) | 7-10gg | Toolia → `apps/content-tuner` |
| 2.5 | Brand Layer (eredita BT) — BrandAsset/Evidence/Skill | 5-7gg | Toolia → `@voler/brand-layer` |
| 2.6 | Workflow + analytics base | 3-4gg | Toolia → `@voler/workflow` |
| 2.7 | Media pipeline preservation-first (4 modes + check + visual templates) | 10-14gg | Toolia → `@voler/media-pipeline` |
| 2.8 | Module gating + tier features + billing integration | 5-7gg | Toolia → `apps/content-tuner` |
| 2.9 | Bridge BT↔CT (post-monorepo) | 3-4gg | post-refactor |

**Effort totale Fase 2**: 47-65 giorni di sviluppo (10-14 settimane FT).

Post-Fase 2 → Stadio 2-4 (monorepo refactor + rebranding + bridges): +6-9 settimane.

**Total CT a deploy stabile**: ~16-23 settimane (~4-5.5 mesi).

---

## 14. Open questions / pending decisions

Cose ancora aperte che richiedono decisione:

1. **Editor WYSIWYG specifico**: TipTap (più flessibile) vs Lexical (Meta, più estensibile)? Lean verso TipTap per ecosistema più maturo.

2. **Hosting CT**: Vercel (BT pattern, edge fast) o Railway (Toolia pattern, più controllo)? Probabilmente **Vercel** dato che BT è lì e si beneficia di shared infra in monorepo turbo.

3. **Job queue**: pg-boss confermato, o valutare Inngest / Trigger.dev (più feature, ma servizio esterno con costo)? Lean verso **pg-boss** per zero-dependency philosophy.

4. **TipTap collaborative editing**: aggiungiamo Y.js real-time per editing condiviso? Probabilmente **no** in Fase 2, troppo overhead. Aggiunto in Fase 4 se cliente lo richiede.

5. **Storage R2**: bucket condiviso fra BT + CT + ET o bucket separati? Lean verso **bucket per app** con prefix `{tenant}/{project}/` per isolation.

6. **Embedding model upgrade path**: oggi `text-embedding-3-small`. Quando upgrade a future modelli? Strategia: track embedding model version su ContentEmbedding, re-index automatico quando configuriamo upgrade.

7. **Multi-language support**: CT genera già contenuti in N lingue ma la UI di CT è italiana. Roadmap i18n CT UI?

8. **Replicate vs Hosted Inference**: per Flux Kontext / SDXL, partiamo da Replicate (paghi per-use). Quando volume cresce, valutare self-hosting (modal.com, fly.io, ecc.).

9. **Identity preservation threshold**: 0.7 di confidence è default. Configurable per tenant? Per template? Decidere durante 2.7.

10. **Hallucination check sempre on o opt-in?**: per ora sempre on per CT Pro+, opt-in (con surcharge) per Starter.

---

## 15. Riassunto operativo

### Cosa stiamo costruendo (in 2 frasi)

Content Tuner è la **piattaforma editoriale specializzata per organizzazioni con identità verificata da preservare**, che trasforma fonti verificate + brand voice distillata in 15+ canali di contenuti pubblicabili con **media preservation-first** (foto reali editate senza alterare l'identità) e **tracciabilità completa** (ogni affermazione ancorata a fonte). Si integra in suite con Business Tuner (intelligence upstream) ed Experience Tuner (audioguide downstream) sotto il brand Voler.ai Tuner Suite.

### Quello che cambia rispetto a oggi (Toolia)

Toolia Studio oggi → diventa **Content Tuner Workspace** (UI admin per content production).
Toolia visitor app oggi → diventa **Experience Tuner** (sister product, addon di CT).
Toolia content engine in costruzione → diventa il core di CT.

### Quello che si aggiunge ex novo

- Pipeline media preservation-first (4 modalità + identity check + visual template library)
- BrandSkill distillation (ereditato da BT, refactor)
- 15+ content templates multi-canale
- Content Studio UI con matrix view + bulk ops + TipTap editor
- Multi-format export (md, docx, pdf, html, png)
- pg-boss job queue
- Bridge bidirezionale con BT
- Bridge unidirezionale verso ET (DeliveryPack)

### Effort & timeline

- **Fase 2** (Content Engine in repo Toolia): 10-14 settimane
- **Stadio 2** (refactor monorepo `studio-tuner`): 2-3 settimane
- **Stadio 3** (rebranding CT): 2-3 settimane
- **Stadio 4** (bridges Voler.ai): 2-3 settimane
- **Total a deploy stabile**: 16-23 settimane (~4-5.5 mesi)
- **Pilot 3-5 clienti** post-deploy: +8-12 settimane di iterazione

### Approval status

| Aspetto | Status |
|---|---|
| CT identity + mission | ✅ Approvato in conversazione |
| Target audience (6 cluster) | ✅ Approvato |
| Distinzione da BT | ✅ Chiara |
| Architettura tecnica (stack, packages) | ✅ Definita |
| Pipeline media 4 modalità | ✅ Approvato |
| BrandSkill ereditato da BT | ✅ Approvato |
| RAG su pgvector | ✅ Approvato |
| Pricing tier (€499/€1.500/€5k) | ⏳ Da validare con pilot |
| Editor TipTap | ⏳ Da confermare (vs Lexical) |
| Hosting Vercel | ⏳ Da confermare (vs Railway) |
| 10 open questions section 14 | ⏳ Da risolvere durante Fase 2 |

---

## 16. Prossimi step concreti

1. **(Subito)** Review questo documento — feedback per fine-tune
2. **(Settimana prossima)** Scrivere piano TDD Fase 2 dettagliato basato su questo doc (sotto-progetti 2.1-2.8, ~3000-4000 righe nel repo Toolia attuale)
3. **(Parallelo)** Brand identity exploration: palette + logo + naming finale CT (azzurro/verde proposto) ed ET
4. **(Parallelo)** Pricing validation: research di mercato (concorrenti, willingness-to-pay) per validare tier €499-5000
5. **(Mese 1-3.5)** Esecuzione Fase 2 — subagent-driven (pattern provato in Fase 0 e Fase 1)
6. **(Mese 4)** Refactor monorepo + extraction packages
7. **(Mese 5)** Rebranding + bridges Voler.ai
8. **(Mese 6+)** Pilot program con 3-5 clienti Cultural Brand

---

## 17. Annex — Mapping BT artifacts → CT components

Per chiarezza assoluta, mappa di cosa viene da dove:

| CT Component | Ereditato da BT (riuso) | Da Toolia (riuso) | Nuovo (build) |
|---|---|---|---|
| Auth + multi-tenancy | `assertProjectAccess` + Membership | — | i18n + Better-Auth eventuale |
| Brand Layer | BrandAsset/Evidence/Skill + distiller | — | — |
| Knowledge Layer | — | Source/KBFact/SemanticBase | — |
| Editorial Layer | — | Lenses/Personas/TensionMap | — |
| Content Engine | TipPlanCompiler types | — | RAG retrieval pipeline + orchestrator |
| Content Templates | post-type-catalog (archetypes) | — | 15+ templates seed |
| Media Pipeline | media-ai-generator cascade | generate-poi-image, generate-narrator-portrait | 4 modes + identity check + visual templates |
| Workflow | tip-routing-decision-service | Scheda workflow | ContentDraft lifecycle |
| Calendar | SocialCalendar drag-drop | — | slot AI suggestions |
| Editor | — | — | TipTap |
| Export | — | — | Multi-format (md/docx/pdf/html/png) |
| Analytics | KPI loaders/calculator pattern | LlmUsage tracking | Content-specific metrics |
| Job queue | — | — | pg-boss + worker process |
| Bridge | — | — | event bus `@voler/bridge` |
| API client | safe-fetch | — | — |
| Crypto | encryption.ts | — | — |

**~40% del codice CT viene da BT/Toolia esistenti.** ~60% nuovo.

---

**Fine documento.**

Questo è il design completo di CT. Quando il piano TDD Fase 2 verrà scritto, ogni sotto-progetto deve essere consistent con questo design. Modifiche significative al design vanno fatte qui prima.
