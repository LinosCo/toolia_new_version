# CLAUDE.md — istruzioni operative

Questo file guida un'istanza Claude Code che deve costruire Toolia Studio partendo da queste specifiche.

## Scope del prodotto

**In scope:**
- Studio web (Next.js) per inserimento dati del sito culturale
- Pipeline AI che estrae fatti, propone temi/narratori, genera schede narrative
- TTS per convertire le schede in audio
- Data model multi-tenant con RBAC

**Fuori scope (NON implementare):**
- App mobile (Expo/React Native)
- Design system dell'app
- Build/deploy dell'app (EAS)
- Pubblicazione store
- Preview web dell'app
- Adapter WordPress
- Contratti canonici per client runtime

## Documenti di riferimento (leggere in ordine)

### Autoritativi — fonte di verità

1. `docs/spec/01-overview.md` — architettura di alto livello
2. `docs/spec/02-flusso-inserimento-dati.md` — **fonte di verità funzionale**: i 6 step operativi con regole precise
3. `docs/spec/03-data-model.md` — entità Prisma
4. `docs/presentazione/presentazione-app.pdf` — come è fatta la web app visitatore finale (consumo a valle)

### Estesi — riferimento di approfondimento

5. `docs/legacy/README.md` — indice della documentazione vecchia più ricca. 13 step plans dettagliati + 14 spec tecniche. **Utile per profondità concettuale**: Intent/Evidence layer, Narrative Tension Map, spatial mode, state machine, runtime contracts. **Non autoritativa**: in caso di conflitto vince `docs/spec/`.

Quando progetti uno step, il flusso corretto è:
1. Rileggi la sezione in `docs/spec/02-flusso-inserimento-dati.md`
2. Se serve profondità concettuale, apri `docs/legacy/plans/step<N>.md`
3. Se serve dettaglio tecnico (data model full, state machine), apri `docs/legacy/specs/<FILE>.md`
4. Se trovi concetti che la spec consolidata non copre ma portano valore, segnalali all'utente e decidete insieme se integrarli.

**Se c'è conflitto fra documenti**: `02-flusso-inserimento-dati.md` vince. È la spec funzionale autorevole.

**Materiali di test per sviluppo locale**: `fixtures/` contiene documenti fittizi da caricare come fonti durante lo sviluppo (es. `fixtures/forte-monte-tesoro/*.txt`).

**Nota:** UI Studio, API routes e pipeline AI non sono documentate. Vanno progettate e implementate partendo dalla logica funzionale e dal data model. L'operatore preferisce rifarle da zero invece di partire da una spec tecnica preesistente.

## Stack tecnologico target

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5 strict
- **DB**: PostgreSQL + Prisma 6
- **Auth**: NextAuth v4 (JWT, Credentials + Email magic link)
- **Styling**: Tailwind CSS v4, lucide-react, next-themes
- **LLM**: Anthropic SDK (Claude) + OpenAI SDK (API key per-tenant)
- **Storage**: Cloudflare R2 via AWS S3 SDK
- **TTS**: OpenAI TTS (default) o ElevenLabs

## Convenzioni di codice

- Path alias: `@/*` → `./src/*`
- API routes REST: `/api/projects/[id]/...`
- ID: `cuid()`
- Date: `@default(now())` + `@updatedAt`
- Italiano come lingua primaria per prompt LLM e terminologia di dominio ("scheda", "percorso", "narratore")
- Business logic nei builder lato server, mai nei client
- Ogni query Prisma filtrata per `tenant_id` preso dalla session

## Principi architetturali

1. **Multi-tenant obbligatorio**: ogni entità di dominio ha FK esplicita a `tenant_id` e `project_id`. Isolamento a livello di route tramite `getSessionUser()` + filtro Prisma.
2. **Propose → Accept**: per ogni operazione AI esiste un endpoint `propose` (anteprima non persistita) e un endpoint `save/accept` (persistenza). L'utente approva prima della scrittura DB.
3. **Async via Job**: operazioni LLM/TTS lunghe creano un record `Job`, risposta immediata con `jobId`, UI segue il progresso via SSE o polling.
4. **Soft delete**: mai `DELETE` reale, si cambia `status` in `archived`.
5. **Status workflow schede**: `draft → in_review → client_review → published → archived`. Solo `published` entra nel flusso di consumo.
6. **JSONB per dati fluidi**: `settings_json`, `flags_json`, `metadata_json` quando la forma cambia nel tempo.

## Ruoli RBAC

- `Admin` — gestione tenant e utenti
- `Editor` — crea/modifica progetti e contenuti
- `Reviewer` — approva schede
- `ClientViewer` — sola lettura per cliente finale
- `ClientEditor` — cliente può modificare testi propri

Helpers: `getSessionUser()`, `requireRole(["Admin","Editor"])` in `src/lib/rbac.ts`.

## Segreti e configurazione

API keys LLM **per-tenant** in `Tenant.settings_json` (JSONB). **Non** in variabili d'ambiente.

Env vars necessarie:
- `DATABASE_URL`
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `RESEND_API_KEY`, `EMAIL_FROM` (magic link)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`

## Ordine di implementazione consigliato

1. Schema Prisma + migrazione iniziale (vedi `docs/spec/03-data-model.md`)
2. Auth + multi-tenant scaffolding (NextAuth + RBAC)
3. Project CRUD base (create, list, detail)
4. **Step 1**: gestione Sources + Interview + KB extraction (pipeline AI minima)
5. **Step 2**: mappa e POI
6. **Step 3**: Driver e Personas + proposal AI
7. **Step 4**: Percorsi e Narratori + proposal AI
8. **Step 5**: generazione schede (base semantica → scheda) + TTS
9. **Step 6**: dashboard readiness e checklist qualità
10. Job queue + UI monitoring async

## Regole di interazione con l'utente

L'utente di riferimento **non è tecnico**. Quando serve conferma su scelte architetturali, spiegare in linguaggio semplice il trade-off prima di procedere. Non scrivere codice prima di aver allineato l'approccio.
