# RUNTIME_CONTRACTS

## Scopo
Questo documento definisce i contratti runtime canonici di Toolia.

Serve a chiarire:
- quali artefatti vengono prodotti dal sistema prima e durante una visita
- quali sono i confini tra export di progetto e composizione di sessione
- quali shape devono essere condivisi tra piattaforma, web preview e app Expo
- come mantenere coerenza con offline-first, capability model e session-start composition

Formula chiave:

`il client non interpreta il prodotto: esegue contratti runtime espliciti`

## Relazione con gli altri documenti
Questo documento va letto insieme a:
- [PROJECT_APP_DEFINITION.md](/Users/tommycinti/Documents/toolia/docs/specs/PROJECT_APP_DEFINITION.md)
- [DATA_MODEL.md](/Users/tommycinti/Documents/toolia/docs/specs/DATA_MODEL.md)
- [STATE_MACHINE.md](/Users/tommycinti/Documents/toolia/docs/specs/STATE_MACHINE.md)
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)
- [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md)

## Regola fondamentale
Distinguere sempre tra:

### 1. `Project-level contracts`
Valgono per il progetto intero.
Esempio:
- `Project App Definition`
- `Project Delivery Pack`

### 2. `Session-level contracts`
Valgono per una singola visita del visitatore.
Esempio:
- `Session Visit Plan`
- `Runtime Manifest`
- `Session Bundle`

### 3. `Supporting contracts`
Valgono come layer ausiliari.
Esempio:
- `Visit Assistant Pack`
- `Audio Delivery Plan`
- `Visual Delivery Plan`
- `Connected Assist Policy`

## Contratti canonici principali
I contratti runtime minimi del sistema sono:
- `Project App Definition`
- `Project Delivery Pack`
- `Session Visit Plan`
- `Route Sequence`
- `Content Queue`
- `Family Overlay Schedule`
- `Visit Assistant Pack`
- `Audio Delivery Plan`
- `Visual Delivery Plan`
- `Runtime Manifest`
- `Session Bundle`
- `Session Entitlement Snapshot`
- `Connected Assist Policy`

## Ordine di generazione corretto

1. la piattaforma esporta `Project App Definition`  
2. la piattaforma produce o aggiorna `Project Delivery Pack`  
3. il visitatore entra nel progetto e genera input di sessione  
4. il sistema compone `Session Visit Plan`  
5. da questo derivano:
   - `Route Sequence`
   - `Content Queue`
   - `Family Overlay Schedule`
   - `Visit Assistant Pack`
   - `Audio Delivery Plan`
   - `Visual Delivery Plan`
6. il sistema materializza il `Runtime Manifest`
7. il sistema verifica e produce il `Session Bundle`
8. il client esegue la sessione

## 1. Project Delivery Pack
Il `Project Delivery Pack` e' il catalogo operativo del progetto pronto a essere consumato dal motore di sessione.

### Obiettivo
Evitare che la sessione debba interrogare dati editoriali grezzi o incompleti.

### Cosa contiene
Almeno:
- riferimenti ai contenuti pubblicabili
- primary rendition approvate
- deep dive pubblicabili
- bridge disponibili
- assistant answer base approvato
- family mission set approvato
- asset audio e visuali approvati
- metadata di eligibility, durata e fallback
- riferimenti a capability e regole di degradazione

### Shape logica minima
```json
{
  "pack_id": "pdp_123",
  "project_id": "proj_123",
  "pack_version": "2026-03-20.1",
  "capability_snapshot_ref": "cap_123",
  "content_index_ref": "content_idx_123",
  "audio_index_ref": "audio_idx_123",
  "visual_index_ref": "visual_idx_123",
  "assistant_base_ref": "assist_base_123",
  "family_pack_ref": "family_123",
  "fallback_policy_ref": "fallback_123"
}
```

### Stato
Si muove nella `Delivery/export lifecycle`:
- `not_generated`
- `generated`
- `validated`
- `released`
- `obsolete`
- `failed`

## 2. Session Visit Plan
Il `Session Visit Plan` e' il primo oggetto session-specific veramente semantico.

### Obiettivo
Tradurre:
- input del visitatore
- capability attive
- project delivery pack
- regole di Step 4

in un piano di visita coerente e ancora abbastanza alto livello.

### Cosa contiene
Almeno:
- language scelta
- durata totale
- dominant e secondary lenses
- family mode on/off
- selected route candidate
- selected content refs
- expected total duration
- session entitlement snapshot

### Shape logica minima
```json
{
  "session_plan_id": "svp_123",
  "project_id": "proj_123",
  "visit_session_id": "vs_123",
  "language": "it",
  "family_mode": true,
  "dominant_lens": "natura",
  "secondary_lenses": ["contemplazione"],
  "visit_budget_seconds": 5400,
  "selected_route_ref": "route_candidate_456",
  "selected_content_refs": ["rend_1", "rend_2", "bridge_9"],
  "entitlement_snapshot_ref": "ses_ent_123"
}
```

## 3. Route Sequence
La `Route Sequence` e' la materializzazione ordinata del percorso della sessione.

### Obiettivo
Dire al client:
- in che ordine si visitano segmenti e POI
- quali punti sono check-point
- dove sono i punti family
- dove sono i punti di resume/rejoin

### Cosa contiene
Almeno:
- route item ordinati
- tipo item
  - segment
  - poi
  - chapter checkpoint
  - sync point
- tempi stimati
- activation hints
- checkpoint info

### Shape logica minima
```json
{
  "route_sequence_id": "rs_123",
  "project_id": "proj_123",
  "visit_session_id": "vs_123",
  "items": [
    {
      "order": 1,
      "item_type": "segment",
      "item_id": "seg_1",
      "checkpoint": false,
      "estimated_seconds": 240
    },
    {
      "order": 2,
      "item_type": "poi",
      "item_id": "poi_8",
      "checkpoint": true,
      "estimated_seconds": 420
    }
  ]
}
```

## 4. Content Queue
La `Content Queue` e' l'ordine eseguibile dei contenuti.

### Obiettivo
Permettere al client di eseguire la visita senza dover inferire i passaggi narrativi.

### Cosa contiene
Almeno:
- contenuti principali
- bridge
- segment bodies
- family moments
- intro/outro
- riferimenti speaker
- durata stimata
- fallback ref

### Shape logica minima
```json
{
  "content_queue_id": "cq_123",
  "project_id": "proj_123",
  "visit_session_id": "vs_123",
  "items": [
    {
      "queue_order": 1,
      "content_id": "intro_1",
      "content_type": "session_intro",
      "bound_to_type": "session",
      "bound_to_id": "vs_123",
      "speaker_ref": "narrator_main",
      "estimated_duration_seconds": 45,
      "visual_asset_ref": "vis_hero_1",
      "family_related": false,
      "fallback_ref": null
    }
  ]
}
```

## 5. Family Overlay Schedule
Il `Family Overlay Schedule` e' il piano episodico delle missioni family.

### Obiettivo
Inserire il layer family senza creare un secondo tour parallelo.

### Cosa contiene
Almeno:
- missioni previste
- punti di attivazione
- tipo di missione
- durata prevista
- clue / hint / reward refs
- eventuale family handoff

### Shape logica minima
```json
{
  "family_overlay_schedule_id": "fos_123",
  "project_id": "proj_123",
  "visit_session_id": "vs_123",
  "active": true,
  "missions": [
    {
      "mission_id": "fam_7",
      "trigger_after_content_id": "rend_45",
      "scope_type": "poi",
      "scope_id": "poi_8",
      "estimated_seconds": 60
    }
  ]
}
```

## 6. Visit Assistant Pack
Il `Visit Assistant Pack` e' il sottoinsieme della KB verticale interrogabile durante la sessione.

### Obiettivo
Rendere disponibile un assistant situato e bounded senza dipendere dalla rete per il minimo funzionamento.

### Cosa contiene
Almeno:
- unità assistant per i POI inclusi
- unità assistant per i segmenti inclusi
- chiarimenti di capitolo
- FAQ di progetto ad alta utilita'
- limiti e handoff

### Shape logica minima
```json
{
  "visit_assistant_pack_id": "vap_123",
  "project_id": "proj_123",
  "visit_session_id": "vs_123",
  "scope_units": [
    {
      "assistant_unit_id": "au_1",
      "scope_type": "poi",
      "scope_id": "poi_8",
      "trigger_questions": [
        "Che cosa sto guardando?",
        "Perche' e' importante?"
      ],
      "answer_ref": "ans_1",
      "extended_answer_ref": "ans_1_ext",
      "handoff_ref": "handoff_1"
    }
  ]
}
```

## 7. Audio Delivery Plan
Il `Audio Delivery Plan` governa disponibilita' e criticita' degli audio.

### Obiettivo
Dire al client:
- cosa deve essere locale
- cosa e' opzionale
- cosa puo' essere scaricato in background

### Cosa contiene
Almeno:
- audio essential refs
- audio optional refs
- local availability state
- background download eligibility
- fallback refs

### Shape logica minima
```json
{
  "audio_delivery_plan_id": "adp_123",
  "essential_audio_refs": ["aud_1", "aud_2"],
  "optional_audio_refs": ["aud_99"],
  "background_fetch_allowed": true,
  "fallback_policy_ref": "fallback_audio_1"
}
```

## 8. Visual Delivery Plan
Il `Visual Delivery Plan` fa la stessa cosa per gli asset visuali.

### Cosa contiene
Almeno:
- asset primari per item di coda
- asset secondari
- fallback image refs
- readiness stato dei visuali

## 9. Session Entitlement Snapshot
Lo `Session Entitlement Snapshot` e' la fotografia concreta degli entitlement attivi per quella sessione.

### Obiettivo
Evitare che il client debba ricostruire la validita' di capability e premium unlock in modo implicito.

### Cosa contiene
Almeno:
- capability scope
- level
- valid_from
- valid_until
- grace_policy
- active_at_session_start

### Shape logica minima
```json
{
  "session_entitlement_snapshot_id": "ses_123",
  "project_id": "proj_123",
  "visit_session_id": "vs_123",
  "entries": [
    {
      "capability_id": "visit_assistant",
      "level": "base",
      "valid_until": "2026-03-21T09:00:00Z",
      "grace_policy": "until_session_end",
      "active_at_session_start": true
    }
  ]
}
```

## 10. Connected Assist Policy
La `Connected Assist Policy` dichiara cosa il client puo' migliorare quando c'e' rete.

### Obiettivo
Rendere esplicito il perimetro del connected enhancement senza trasformarlo in dipendenza critica.

### Cosa contiene
Almeno:
- sync permissions
- background enrich permissions
- explicit recalc permission
- assistant extension permission
- forbidden automatic actions

### Shape logica minima
```json
{
  "connected_assist_policy_id": "cap_123",
  "background_sync_allowed": true,
  "background_asset_enrichment_allowed": true,
  "explicit_recalc_allowed": true,
  "assistant_scope_extension_allowed": true,
  "forbidden_automatic_actions": [
    "silent_route_change",
    "live_fetch_of_critical_content"
  ]
}
```

## 11. Runtime Manifest
Il `Runtime Manifest` e' il contratto operativo principale della sessione.

### Obiettivo
Permettere al client di eseguire la visita in modo deterministico.

### Cosa contiene
Almeno:
- route sequence ref o inline
- content queue ref o inline
- audio delivery plan
- visual delivery plan
- family overlay schedule
- visit assistant pack ref
- session entitlement snapshot ref
- connected assist policy
- resume points
- recalc policy

### Shape logica minima
```json
{
  "runtime_manifest_id": "rm_123",
  "project_id": "proj_123",
  "visit_session_id": "vs_123",
  "route_sequence_ref": "rs_123",
  "content_queue_ref": "cq_123",
  "family_overlay_schedule_ref": "fos_123",
  "visit_assistant_pack_ref": "vap_123",
  "audio_delivery_plan_ref": "adp_123",
  "visual_delivery_plan_ref": "vdp_123",
  "session_entitlement_snapshot_ref": "ses_123",
  "connected_assist_policy_ref": "cap_123",
  "resume_points": ["poi_8", "poi_9"],
  "recalc_policy": {
    "mode": "explicit_only",
    "requires_connectivity": true
  }
}
```

## 12. Session Bundle
Il `Session Bundle` e' il pacchetto locale minimo necessario a eseguire la sessione.

### Obiettivo
Far partire la visita in sicurezza offline.

### Cosa contiene
Almeno:
- runtime manifest
- audio essenziali
- visual asset essenziali
- visit assistant pack minimo
- family mission asset necessari
- metadata locali per resume

### Shape logica minima
```json
{
  "session_bundle_id": "sb_123",
  "project_id": "proj_123",
  "visit_session_id": "vs_123",
  "runtime_manifest_ref": "rm_123",
  "essential_audio_refs": ["aud_1", "aud_2"],
  "essential_visual_refs": ["vis_1", "vis_2"],
  "visit_assistant_pack_ref": "vap_123",
  "bundle_readiness_state": "ready_and_enrichable"
}
```

## Inline vs referenced payloads
I contratti possono essere:
- completamente inline
- reference-based
- ibridi

### Raccomandazione
Usare un modello ibrido:
- `Project App Definition` leggero
- `Runtime Manifest` medio
- bundle con refs + asset locali

### Regola
Un client non deve scaricare troppi hop di network per capire cosa fare.

## Compatibilita' e versioning
Ogni contratto runtime dovrebbe avere:
- `schema_name`
- `schema_version`
- `export_version`
- `generated_at`
- `source_project_version`

### Regola
I client devono poter:
- rifiutare contratti incompatibili
- degradare in modo controllato
- sapere quando un contratto e' obsoleto

## Lifecycle dei contratti

### Project-level
- generazione
- validazione
- release
- obsolescenza

### Session-level
- creazione
- arricchimento bundle
- esecuzione
- resume/rejoin
- completamento o abbandono

## Contratti e state machine
Relazioni minime:

### `Project Delivery Pack`
segue `Delivery/export lifecycle`

### `Runtime Manifest`
segue `Delivery/export lifecycle` ma legato anche a `Visit session lifecycle`

### `Session Bundle`
ha:
- bundle readiness state
- relazione con visit session state

### `Session Entitlement Snapshot`
deriva da `Entitlement lifecycle`

## Mapping con il repo attuale

### Gia' presenti o vicini
- [export route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/export/route.ts)
  produce un export package v1
- [app-config route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/app-config/route.ts)
  produce una config app v1

### Gap attuali
Nel repo ancora non esistono come contratti separati:
- `Project Delivery Pack`
- `Session Visit Plan`
- `Runtime Manifest`
- `Session Bundle`
- `Visit Assistant Pack`
- `Session Entitlement Snapshot`

### Raccomandazione
Non sostituire subito i route v1.
Meglio:
1. introdurre gli export nuovi come endpoint o shape parallele
2. migrare i client verso i contratti canonici
3. deprecare i pack v1 solo dopo

## Regole implementative raccomandate

### 1. JSON first
Usare JSON versionati come formato canonico iniziale.

### 2. Shared schema names
Ogni contratto deve avere uno `schema_name` stabile.

### 3. Minimal critical inline data
Tenere inline i dati che servono subito al client.

### 4. Stable refs
Usare refs stabili per collegare contratti e asset.

### 5. No client-side inference of business logic
Il client non deve ricostruire:
- entitlement rules
- route composition
- family spacing
- assistant scope

## Error handling minimo
Ogni client deve sapere cosa fare se:
- manca il `Runtime Manifest`
- il `Session Bundle` e' not ready
- il `Visit Assistant Pack` e' parziale
- il `Session Entitlement Snapshot` e' scaduto
- il `Connected Assist Policy` non e' disponibile

### Regola consigliata
Meglio:
- degradare in modo esplicito
- mostrare stato coerente

piuttosto che:
- inferire default silenziosi

## Checklist minima di completezza
Un sistema runtime e' abbastanza definito quando:
- i contratti principali sono nominati e distinti
- ognuno ha responsabilita' chiare
- preview web e app Expo possono leggerli
- stati e versioni sono espliciti
- offline-first e connected assist restano coerenti

## Cosa prepara dopo
Questo documento prepara direttamente:
- `IMPLEMENTATION_PLAN.md`
- endpoint e export reali
- bootstrap dei client web/native
- introduzione progressiva dei contratti nel repo
