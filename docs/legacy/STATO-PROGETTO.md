# Toolia Studio — Stato del progetto
*Aggiornato al 2 aprile 2026*

---

## Step 1 — Strategia e fonti ✅ COMPLETATO

### Cosa fa
Raccoglie tutto il materiale strategico e documentale del progetto prima di qualsiasi generazione AI.

### Implementato
- Intervista guidata (Business Tuner) con domande dinamiche per target, promessa, tono, posizionamento
- Intervista libera (free-form) per approfondimenti e contesto aggiuntivo
- Upload fonti multi-formato: testi incollati, PDF, URL, immagini (con estrazione EXIF/GPS)
- Immagini gestite via endpoint `/ingest-image` dedicato (FormData, upload R2, VisualAsset record)
- Classificazione automatica delle fonti per layer: `intent`, `evidence`, `spatial`, `visual`
- Estrazione fatti KB con classificazione: `solid`, `interpretation`, `memory`, `hypothesis`
- Valore editoriale per ogni fatto: `must_tell`, `nice_to_tell`, `avoid`, `verify`
- Brief Review con riepilogo fonti per layer, distribuzione fatti, visitor outcomes
- Step gate con blockers e warning prima di procedere allo step 2

### File principali
- `src/components/interview-upload.tsx` — UI completa step 1 (sub-steps: interview, free_interview, sources)
- `src/components/brief-review.tsx` — riepilogo e approvazione brief
- `src/app/api/projects/[id]/ingest-image/route.ts` — upload immagini con EXIF
- `src/app/api/projects/[id]/step-gate/route.ts` — validazione step=1

---

## Step 2 — Struttura del luogo 🔄 IMPLEMENTATO (in test)

### Cosa fa
Costruisce la Logical Map del progetto: la verità spaziale utile su cui tutto il resto viene costruito.

### Implementato
- Selezione modalità spaziale con suggerimento AI rapido (256 token, fast path): `geo_native`, `local_map_native`, `hybrid`
- Proposta AI completa (8192 token, multimodale se ci sono immagini): macro-zone, POI, nodi, segmenti, visual anchors, clue candidates, spatial constraints, traversal estimates
- Timeline di progresso animata durante la generazione
- Editor map-first: sidebar 380px + mappa Google Maps a destra
- Sidebar: Macro-zone, POI di esperienza, Nodi di percorso, Segmenti, Anchor visuali, Clue candidates, Fonti spaziali, Asset visivi
- Gestione modalità mappa: Google Maps per geo_native/hybrid, placeholder planimetria per local_map_native
- Banner riepilogativo: durata stimata visita + vincoli spaziali
- Salvataggio completo Logical Map nel DB (Zone, POI, RouteNode, Segment, VisualAsset anchor/clue)
- spatial_constraints e traversal_estimates salvati in project.intent_json
- Step gate step=2
- Fix JSON parsing LLM: `extractJson()` nell'orchestratore che gestisce markdown fences

### File principali
- `src/components/spatial-editor.tsx` — UI completa step 2
- `src/components/leaflet-map.tsx` — mappa Google Maps con gestione spatialMode
- `src/app/api/projects/[id]/spatial/propose/route.ts` — proposta AI (con fast path mode_only)
- `src/app/api/projects/[id]/spatial/save/route.ts` — salvataggio Logical Map completa
- `src/app/api/projects/[id]/spatial/logical-map/route.ts` — lettura Logical Map completa
- `src/lib/llm/orchestrator.ts` — AIOrchestrator con extractJson() e callLLMWithImages()

### Noto / da verificare
- Upload planimetria locale (local_map_native) ✅ implementato — immagine visualizzata nella mappa con lista POI
- Editing nodi e segmenti ✅ inline form completo (nome, tipo, descrizione per nodi; tipo, traversal, secondi per segmenti)

---

## Step 3 — Driver, personas e inferenza ✅ COMPLETATO

### Cosa fa
Costruisce il motore di personalizzazione: driver narrativi, personas visitatore, lenti editoriali, modello di inferenza.

### Implementato
- Proposta AI completa (8192 token): driver map, personas, editorial lenses, inference model, family activation, continuity rules, dominance rules
- Timeline di progresso animata durante la generazione
- Editor con 4 tab: Driver narrativi, Personas, Lenti editoriali, Inferenza
- Driver con dominio disciplinare (geologia, botanica, storia, ecc.) e badge colorato
- Min 2 / max 4 driver, nomi semplici e brevi
- Personas con motivation, payoff_type, duration preference, driver_weights
- Lenti editoriali con depth_level, emphasis, tone
- Tab inferenza: continuity rules, inference signals, dominance rules
- Banner family activation (triggers, overlay zones, notes)
- Rigenerazione proposta AI
- Step gate step=3 con blockers e warnings
- Salvataggio completo: Driver model, Persona model, EditorialLens model + intent_json

### File principali
- `src/components/driver-persona-editor.tsx` — UI completa step 3
- `src/app/api/projects/[id]/drivers/route.ts` — GET stato step 3
- `src/app/api/projects/[id]/drivers/propose/route.ts` — proposta AI
- `src/app/api/projects/[id]/drivers/save/route.ts` — salvataggio
- `prisma/schema.prisma` — modelli Driver, Persona, EditorialLens

---

## Step 4 — Architettura della visita 🔄 IMPLEMENTATO (in test)

### Cosa fa
Trasforma la Logical Map (Step 2) + il motore di personalizzazione (Step 3) in una struttura concreta di visita.

### Implementato
- Proposta AI completa (8192 token): capitoli di visita, visita canonica, percorsi plausibili, POI content stacks, bridge model, mission candidates, adaptation rules, grounding rules, visit budget model
- Timeline di progresso animata (7 fasi)
- Editor con 4 tab: Capitoli, Percorsi, POI e Bridge, Regole e Family
- Capitoli di visita con arco narrativo (apertura/sviluppo/climax/chiusura/transizione), zona, POI, segmenti, durata stimata
- Banner visita canonica con durata e POI chiave
- Route candidates con durata, capitoli inclusi, POI inclusi
- POI content stack con must_include, family_eligible, grounding_type, content_layers
- Bridge model con 3 layer: navigation, body, lens accent
- Regole di adattamento: tagli per durata, adattamenti per persona
- Regole di grounding
- Mission candidates per family overlay con tipo (observation/exploration/quiz/sensory)
- Family mode budget (max missioni, spacing, zone migliori)
- Visit budget model (buffer %, sosta default, tolleranza)
- Rigenerazione proposta AI
- Step gate step=4

### File principali
- `src/components/visit-architecture-editor.tsx` — UI completa step 4
- `src/app/api/projects/[id]/visit-architecture/route.ts` — GET stato step 4
- `src/app/api/projects/[id]/visit-architecture/propose/route.ts` — proposta AI
- `src/app/api/projects/[id]/visit-architecture/save/route.ts` — salvataggio
- `prisma/schema.prisma` — modello VisitChapter

---

## Step 5 — Produzione contenuti modulari 🔄 IMPLEMENTATO (in test)

### Cosa fa
Produce il catalogo modulare dei contenuti: basi semantiche, schede per lente, personaggi, missioni family, assistente verticale.

### Implementato
- Proposta AI in 2 fasi sequenziali:
  - Fase A (8K token): Semantic Content Bases per ogni POI + Character Contracts
  - Fase B (16K token): Renditions (schede per lente), Family Missions, Assistant Answers
- Timeline di progresso animata (8 fasi)
- Editor con 4 tab: Basi semantiche, Schede, Personaggi, Family e Assistente
- Basi semantiche: grounding, messaggi chiave, fatti verificati, angoli narrativi, warnings editoriali
- Schede (renditions): una per POI per lente, con script per l'ascolto, bridge_in_text, is_core, flags_json con lente
- Personaggi: narratore backbone + contestuali con character contract completo
- Family missions: kid_brief, clue, hint_ladder, reward, family_handoff, character_cue
- Assistant verticale: trigger questions, verified answer, extended, limiti, handoff
- NarratorProfile creato automaticamente per backbone
- Banner statistiche produzione
- Rigenerazione proposta AI
- Step gate step=5

### File principali
- `src/components/content-production-editor.tsx` — UI completa step 5
- `src/app/api/projects/[id]/content-production/route.ts` — GET stato
- `src/app/api/projects/[id]/content-production/propose/route.ts` — proposta AI 2 fasi
- `src/app/api/projects/[id]/content-production/save/route.ts` — salvataggio
- Modelli DB già esistenti: SemanticContentBase, Scheda, CharacterContract, FamilyMission, AssistantAnswerUnit

---

## Step 6 — Composizione runtime e delivery ✅ COMPLETATO

### Cosa fa
Dashboard di readiness che verifica la completezza del progetto e testa la composizione runtime di una sessione di visita.

### Implementato
- Dashboard readiness con stato globale: `ready`, `ready_degraded`, `not_ready`
- Blockers (hard) e warnings (soft) con messaggi specifici
- 4 card di copertura: Audio TTS %, Visual %, Core POI %, Basi semantiche %
- Inventario contenuti completo: POI, schede, bridge, narratori, personaggi, capitoli, driver, personas, risposte assistant
- Sezione Family overlay con stato missioni (totali/pubblicate/readiness)
- Test composizione runtime: simula una sessione di 60 min e mostra risultato (schede count, durata)
- Visit Assistant Pack builder: slicing risposte KB per sessione (POI, segmento, capitolo, progetto)
- Bundle readiness reale nel SessionBundle: `not_ready` / `ready_minimal` / `ready_and_enrichable` basato su copertura audio/visual
- Step gate step=6 con validazione completa
- Navigazione avanti/indietro integrata nella pipeline

### File principali
- `src/components/delivery-readiness-editor.tsx` — UI completa step 6
- `src/app/api/projects/[id]/delivery-status/route.ts` — stato readiness del progetto
- `src/app/api/projects/[id]/visit-assistant-pack/route.ts` — GET assistant pack per sessione
- `src/lib/builders/visit-assistant-pack.ts` — builder Visit Assistant Pack
- `src/lib/builders/session-bundle.ts` — bundle readiness reale (non più hardcoded)
- `src/app/api/projects/[id]/step-gate/route.ts` — gate step=6

### Infrastruttura runtime preesistente (usata dallo step 6)
- `POST /api/projects/[id]/visit/runtime` — composizione RuntimeManifest
- `POST /api/projects/[id]/visit/session-bundle` — generazione SessionBundle
- `GET /api/projects/[id]/delivery-pack` — Project Delivery Pack completo
- `GET /api/projects/[id]/app-definition` — bootstrap contract
- `GET /api/projects/[id]/capability-snapshot` — stato capabilities
- `GET /api/projects/[id]/theme-pack` — visual theme tokens

---

## Step 7 — UX/UI dell'esperienza di visita ✅ COMPLETATO

### Cosa fa
Web preview dell'esperienza del visitatore a `/preview/[projectId]`. Consuma i contratti runtime (RuntimeManifest, ThemePack, VisitAssistantPack) e li traduce in un'esperienza mobile-first player-centric e route-aware.

### Implementato
- State machine completa: loading → setup → composing → active → complete
- Setup wizard: hero image, nome progetto, selettore durata (30/60/90 min), toggle family mode, CTA "Inizia la visita"
- Composizione runtime: POST a /visit/runtime + fetch assistant pack con POI della sessione
- Active visit shell: contenuto corrente (immagine, POI, titolo, bridge intro, script text) + player bar persistente
- Player bar: play/pause, skip avanti/indietro, progress bar, titolo/POI, contatore schede, indicatore testo/audio
- Audio playback reale via Audio API, con fallback simulato (timer su duration_estimate_seconds) per schede senza audio
- Route timeline: slide-up collassabile, lista POI con stato (fatto/corrente/prossimo), skip-to su tap, auto-scroll al corrente
- Assistant panel: slide-up contestuale, Q&A filtrate per POI corrente, domande espandibili, fallback a risposte progetto
- Family overlay: modal missione con brief, indizio, hint ladder progressivi, reward, handoff, "Continua la visita"
- Schermata completamento: stats (durata, tappe, schede), hero image, "Ricomincia"
- Theming dinamico: CSS vars da ThemePack (colors, fonts, spacing), font serif per titoli, sans per body
- Mobile-first: max-width 430px centrato, viewport completo
- Edge cases: niente audio → "Anteprima testo", niente immagine → gradient accent, assistant vuoto → messaggio, family non abilitato → toggle nascosto

### File principali
- `src/app/preview/[projectId]/page.tsx` — shell, orchestratore, rendering condizionale per fase
- `src/app/preview/[projectId]/use-visit.ts` — hook useReducer con stato, fetch, audio playback, family trigger
- `src/app/preview/[projectId]/player-bar.tsx` — barra player bottom persistente
- `src/app/preview/[projectId]/route-timeline.tsx` — timeline verticale collassabile
- `src/app/preview/[projectId]/panels.tsx` — AssistantPanel + FamilyMissionModal + CompleteSummary

---
## Step 8 — UX/UI del workspace editoriale Toolia ⏳ DA PIANIFICARE
## Step 9 — Capability model e configurazione di progetto ⏳ DA PIANIFICARE
## Step 10 — Operations, analytics e manutenzione ✅ COMPLETATO

### Implementato
- GET /api/projects/[id]/health — aggregazione eventi analytics (30gg)
- Project Health Dashboard nell'overview: KPI sessioni, completamento, skip rate, domande assistant
- Grafico sessioni giornaliere (7 giorni)
- Contenuti: riproduzioni, completamenti, skip, top POI saltati
- Feature health: assistant (aperture, domande, no-answer), family (mostrate, completate)
- Runtime health: visite bloccate, fallback legacy
- Basato su AnalyticsEvent model già esistente con event ingestion
## Step 11 — Design system, template modulare e theming ⏳ DA PIANIFICARE
## Step 12 — Interaction model e IA della visitor app ⏳ DA PIANIFICARE
## Step 13 — Pipeline di prototipazione web, handoff nativo e delivery ⏳ DA PIANIFICARE

---

## Infrastruttura base (già presente, non legata agli step)

- Multi-tenancy con RBAC (Admin, Editor, Reviewer, ClientViewer, ClientEditor)
- Prisma 6 + PostgreSQL — modello dati completo con migration history
- AIOrchestrator: Anthropic-first (claude-sonnet-4-6) con fallback OpenAI (gpt-4o)
- Storage Cloudflare R2 via AWS S3 SDK
- Architettura contract-first: RuntimeManifest, SessionBundle, AppDefinition, CapabilitySnapshot, ThemePack, DeliveryPack
- App mobile Expo 55 + React Native 0.83 in `/mobile` (struttura base, Zustand + MMKV)
- WordPress adapter (import/push, Polylang multi-lingua IT/EN)
- Analytics event ingestion
- NextAuth v4 (Credentials + magic link)
