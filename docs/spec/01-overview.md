# Toolia Studio — Architettura di alto livello

## Contesto

Toolia Studio è una **piattaforma SaaS multi-tenant** per creare audioguide AI per siti culturali. L'operatore inserisce le informazioni del sito (fonti scritte, interviste, mappa, POI) e il sistema genera schede narrative e tracce audio sincronizzate.

Questo documento descrive **solo lo Studio + pipeline AI**. L'app mobile di fruizione non è trattata.

## Attori

| Attore | Descrizione |
|--------|-------------|
| **Tenant** | Account aziendale (agenzia/studio). Possiede progetti, utenti, API keys proprie. |
| **User** | Membro del tenant. Ha un ruolo (Admin / Editor / Reviewer). |
| **ClientEntity** | Soggetto del progetto (es. "Villa Tal dei Tali"). Non è un utente del sistema. |
| **ClientViewer / ClientEditor** | Utente del cliente finale con accesso limitato al progetto. |

## Flusso di prodotto

```
FONTI                    PIPELINE                    OUTPUT
─────                    ────────                    ──────

- Siti web               1. Ingestione + scraping    Schede narrative
- Documenti PDF          2. LLM extraction → KB      (testo approvato)
- Interviste             3. Themes + Narrators              │
- Testi liberi           4. Driver + Personas               ▼
                         5. Schede generation        Tracce audio TTS
                         6. TTS audio                (una per scheda
                                                     per lingua)
```

## Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5 strict
- **DB**: PostgreSQL + Prisma 6
- **Auth**: NextAuth v4 (JWT, Credentials + Email magic link)
- **Styling**: Tailwind CSS v4, lucide-react, next-themes
- **LLM**: Anthropic SDK (Claude) + OpenAI SDK — API keys per-tenant
- **Storage**: Cloudflare R2 (via AWS S3 SDK)
- **TTS**: OpenAI TTS default, ElevenLabs opzionale

## Principi chiave

### Multi-tenancy rigida
Ogni entità di dominio referenzia `tenant_id`. Ogni query Prisma filtra per `tenant_id` estratto dalla session JWT. Helper in `src/lib/rbac.ts`.

### Pipeline AI multi-step
Modelli diversi per step diversi (Haiku per extraction, Sonnet per proposal, Sonnet/Opus per scheda generation). API key e scelta modello configurabili **per-tenant** via `Tenant.settings_json` (JSONB).

### Propose → Accept
Ogni step AI produce una proposta che l'operatore revisiona e accetta esplicitamente prima della persistenza. L'AI non scrive mai direttamente sul DB senza approvazione.

### Async via Job
Operazioni lunghe (LLM batch, TTS) creano un record `Job`, la UI riceve `jobId` e segue il progresso via SSE o polling. Mai bloccare la richiesta HTTP.

### Status workflow
Le schede passano attraverso `draft → in_review → client_review → published → archived`. Modifica di una scheda pubblicata la riporta automaticamente a `draft`.

## Ruoli RBAC

| Ruolo | Permessi |
|-------|----------|
| `Admin` | Gestione tenant, utenti, settings |
| `Editor` | Crea/modifica progetti e contenuti |
| `Reviewer` | Approva schede |
| `ClientViewer` | Sola lettura sul progetto del proprio cliente |
| `ClientEditor` | Può modificare testi del proprio progetto |

## Layout cartelle documentazione

```
Toolia Studio - Tech Repo/
├── README.md                              ← entry point
├── CLAUDE.md                              ← istruzioni per Claude Code
├── 01-architettura/
│   ├── OVERVIEW.md                        ← questo file
│   └── flusso-inserimento-dati.md         ← spec funzionale (6 step)
└── 02-data-model/README.md                ← entità Prisma
```

## Ordine di lettura raccomandato

1. Questo file (panoramica)
2. `flusso-inserimento-dati.md` (cosa l'utente inserisce step per step)
3. `02-data-model/README.md` (come è strutturato il dato)
