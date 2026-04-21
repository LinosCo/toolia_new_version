# Data Model

Modello dati PostgreSQL via Prisma 6. Schema completo in `prisma/schema.prisma` (da rigenerare nel nuovo progetto — qui si documenta il design).

## Entità principali

### Tenant (root multi-tenancy)

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | PK |
| `name` | string | Nome azienda |
| `settings_json` | JSONB | API keys LLM, storage, preferenze |

Relazioni: ha N `User`, N `Project`, N `ClientEntity`.

### User

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | PK |
| `tenant_id` | FK → Tenant | Scope obbligatorio |
| `email` | string | Unique |
| `role` | enum | `Admin` / `Editor` / `Reviewer` / `ClientViewer` / `ClientEditor` |

### Project

Radice del contenuto per un cliente specifico.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | PK |
| `tenant_id` | FK → Tenant | Scope |
| `name` | string | |
| `type` | enum | `villa` / `museo` / `cantina` / `città` / `parco` … |
| `status` | enum | `draft` / `published` / `archived` |
| `spatial_mode` | enum | `gps` / `indoor` / `hybrid` |
| `languages` | string[] | Lingue attive |
| `settings_json` | JSONB | Config custom (es. `family_mode`, brief strategico, lenti editoriali) |

Relazioni: → `Zone`, `POI`, `Path`, `Scheda`, `AudioAsset`, `Source`, `Interview`, `KBFact`, `Theme`, `Driver`, `Persona`, `NarratorProfile`, `EditorialLens`, `Job`.

### Source

Fonti di conoscenza caricate nello Step 1.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `project_id` | FK | |
| `kind` | enum | `url` / `pdf` / `text` / `wordpress` |
| `title` | string | |
| `raw_content` | text | Testo estratto dalla fonte |
| `importance` | enum | `primaria` / `secondaria` / `contesto` |
| `reliability` | enum | `alta` / `media` / `bassa` |
| `metadata_json` | JSONB | URL originale, dimensioni file, ecc. |

### Interview

Intervista guidata dello Step 1.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `project_id` | FK | |
| `questions_json` | JSONB | Set di domande generate dal sistema |
| `answers_json` | JSONB | Risposte dell'operatore |
| `transcript` | text | Testo consolidato per KB extraction |

### KBFact

Fatti estratti dalla pipeline AI. Alimenta tutta la generazione successiva.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `project_id` | FK | |
| `source_id` | FK → Source? | Opzionale (può venire da intervista) |
| `kind` | enum | `fact` / `interpretation` / `tradition` / `hypothesis` |
| `value` | text | Il fatto in sé |
| `confidence` | float | 0–1 |
| `tags` | string[] | Per retrieval |

### Zone

Raggruppamento narrativo di POI.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `project_id` | FK | |
| `name` | string | |
| `narrative_promise` | text | Che esperienza offre |
| `function` | enum | `opening` / `development` / `climax` / `closure` |

### POI (Point of Interest)

Luogo fisico di sosta del visitatore.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `project_id` | FK | |
| `zone_id` | FK → Zone? | Opzionale |
| `name` | string | Obbligatorio |
| `lat`, `lon` | float | Obbligatori (GPS o coordinate sulla planimetria) |
| `type` | enum | `indoor` / `outdoor` |
| `description` | text | Contesto per la AI |
| `min_stay_seconds` | int | Tempo minimo di sosta |
| `image_url` | string? | Sfondo UI |

Relazioni: ha N `Scheda`, è referenziato da `Path.poi_order_json`.

### Driver

Lente tematica narrativa.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `project_id` | FK | |
| `name` | string | |
| `domain` | string | storia / arte / natura / produzione / … |
| `description` | text | |
| `narrative_value` | text | Perché interessa il visitatore |

### Persona

Profilo visitatore tipo.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `project_id` | FK | |
| `name` | string | |
| `motivation` | text | Perché visita |
| `payoff` | enum | `wonder` / `knowledge` / `emotion` / `discovery` |
| `preferred_duration` | enum | `short` / `medium` / `long` |

### EditorialLens

Combinazione `Driver × Persona` che guida la generazione schede.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `project_id` | FK | |
| `driver_id` | FK | |
| `persona_id` | FK | |
| `tone` | text | Override tono se serve |

### Theme

Tema estratto / proposto dalla AI (es. "Architettura palladiana").

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `project_id` | FK | |
| `name` | string | |
| `description` | text | |

Relazione M:N con `Scheda` via `SchedaThemeGrade` (quanto questa scheda parla del tema X).

### NarratorProfile

Voce narrante.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `project_id` | FK | |
| `name` | string | Obbligatorio |
| `voice_style` | string | Obbligatorio |
| `language` | string | Obbligatoria |
| `character_bio` | text | Guida la AI |
| `preferred_drivers` | string[] | ID dei driver preferiti |

### Path (Percorso)

Itinerario tematico.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `project_id` | FK | |
| `name` | string | |
| `description` | text | |
| `duration_target_minutes` | int | |
| `poi_order_json` | JSONB | Array ordinato di POI ID |
| `narrator_id` | FK? | |
| `theme_focus` | string? | |
| `chapters_json` | JSONB? | Divisioni narrative |

### Scheda

**Il contenuto vero dell'audioguida.** Una scheda = un testo che il visitatore ascolta su un POI in una lingua.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `project_id` | FK | |
| `poi_id` | FK | |
| `narrator_id` | FK | |
| `language` | string | |
| `title` | string | |
| `script_text` | text | Testo narrativo |
| `duration_estimate_seconds` | int | Calcolato a 150 parole/minuto |
| `is_core` | bool | Se `true`, sempre inclusa nei percorsi |
| `is_deep_dive` | bool | Contenuto extra opzionale |
| `status` | enum | `draft` / `in_review` / `client_review` / `published` / `archived` |
| `version` | int | Incrementato a ogni modifica significativa |
| `quality_score` | float? | Metrica AI |
| `semantic_base_json` | JSONB | Base semantica intermedia (vedi Step 5) |

Constraint: `@@unique([poi_id, narrator_id, language])`.

### AudioAsset

Traccia TTS per scheda.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `scheda_id` | FK | |
| `language` | string | |
| `file_url` | string | R2/S3 |
| `duration_seconds` | float | |
| `voice_model` | string | openai-tts-1 / elevenlabs-… |
| `is_stale` | bool | `true` se il testo è cambiato dopo la generazione |

Constraint: `@@unique([scheda_id, language])`.

### Job

Task asincrono (LLM batch, TTS batch, KB extraction).

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `tenant_id` | FK | |
| `project_id` | FK | |
| `type` | enum | `kb_extract` / `scheda_generate` / `tts` / `export` |
| `status` | enum | `queued` / `running` / `completed` / `failed` |
| `payload_json` | JSONB | Parametri |
| `result_json` | JSONB? | Output |
| `error` | text? | |
| `progress` | float | 0–1 per UI progress bar |

### ClientEntity

Soggetto del progetto (es. "Villa Tal dei Tali"). Non è un utente del sistema.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | `cuid` | |
| `tenant_id` | FK | |
| `name` | string | |
| `metadata_json` | JSONB | Contatti, note |

## Pattern architetturali

### Tutto è scoped a `tenant_id` + `project_id`
Ogni entità di dominio ha entrambe le FK esplicite. Isolamento a livello di route tramite filtro Prisma.

### JSONB per dati fluidi
`settings_json`, `metadata_json`, `semantic_base_json` dove la forma può evolvere. Tipizzazione via builder TypeScript lato server.

### Soft delete via `status`
Nessun `DELETE`. Si cambia `status` in `archived` e si filtra sulle query.

### Audit trail
`version` incrementale sulle schede. Timestamp `createdAt`/`updatedAt` via Prisma `@default(now())` e `@updatedAt`.

### RBAC a livello di route, non di row
Tutti gli utenti dello stesso tenant vedono tutti i progetti del tenant. I ruoli limitano le azioni possibili.

## Convenzioni

- ID: `cuid()` per tutti
- Date: `DateTime @default(now())` e `@updatedAt`
- Campi multilingua: colonna `language` esplicita, non JSONB di traduzioni
- Enum sempre tipizzati in Prisma, mai stringhe libere
