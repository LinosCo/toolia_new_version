# DATA_MODEL

## Scopo
Questo documento definisce il modello dati canonico di Toolia.

Serve a:
- chiarire le entita' principali del sistema
- distinguere tra modello concettuale e persistenza attuale
- guidare evoluzioni di schema, export e client
- impedire a LLM o sviluppatori di reinventare entita' simili con nomi diversi

Formula chiave:

`prima esiste l'entita' canonica, poi decidiamo dove e come persisterla`

## Regola fondamentale
Distinguere sempre tra:

### 1. `Canonical data model`
Linguaggio comune del prodotto.

### 2. `Persistence model`
Come il repo salva oggi i dati:
- Prisma
- JSON export
- config pack
- bundle runtime

### 3. `Client consumption model`
Come web preview e app Expo leggono i dati.

Una stessa entita' puo':
- esistere nel modello canonico
- essere salvata in Prisma
- essere esportata in JSON
- essere materializzata in bundle

ma non e' detto che viva nello stesso shape in tutti i layer.

## Bounded contexts principali
Il sistema va letto in almeno sei bounded contexts.

### 1. Identity and tenancy
- tenant
- user
- role

### 2. Project definition
- project
- languages
- capability matrix
- project profile
- theme/skin
- app definition

### 3. Knowledge and editorial base
- interviews
- sources
- KB facts
- glossary
- narrative tensions
- visitor question source set

### 4. Spatial and visit architecture
- macro-zones
- route nodes
- segments
- POI
- paths / route sequences
- chapter map
- mission candidates

### 5. Content system
- semantic content base
- rendition
- deep dive
- bridge
- assistant answers
- family overlay pack
- visual assets
- character contracts

### 6. Runtime and session
- runtime manifest
- session visit plan
- session bundle
- assistant pack
- entitlements
- session state
- analytics events

## Canonical ID rules
Ogni entita' canonica deve avere un ID stabile.

### Regole consigliate
- ID persistenti e opachi per database
- ref leggibili opzionali per export e debug
- mai usare il nome come chiave logica
- gli ID devono restare coerenti tra:
  - piattaforma
  - export
  - preview
  - native app

### Esempi di famiglie ID
- `tenant_id`
- `project_id`
- `language_code`
- `poi_id`
- `segment_id`
- `chapter_id`
- `content_unit_id`
- `assistant_unit_id`
- `family_mission_id`
- `theme_id`
- `character_id`
- `entitlement_id`
- `session_id`
- `bundle_id`
- `manifest_id`

## Entity catalog

## 1. Tenant
Rappresenta il perimetro organizzativo del progetto.

### Attributi canonici minimi
- `tenant_id`
- `name`
- `settings`
- `created_at`
- `updated_at`

### Stato attuale repo
Gia' presente in Prisma come `Tenant`.

## 2. User
Rappresenta un utente del workspace o del sistema auth.

### Attributi canonici minimi
- `user_id`
- `tenant_id`
- `name`
- `email`
- `auth_provider_state`
- `created_at`
- `updated_at`

### Stato attuale repo
Gia' presente in Prisma come `User`.

## 3. Project
Rappresenta l'unita' editoriale e operativa principale.

### Attributi canonici minimi
- `project_id`
- `tenant_id`
- `name`
- `slug`
- `project_type`
- `status`
- `languages`
- `default_language`
- `spatial_mode`
- `project_profile`
- `settings`
- `created_at`
- `updated_at`

### Stato attuale repo
Prisma `Project` esiste gia', ma al momento:
- non espone `slug`
- non espone `default_language` separato
- non espone `spatial_mode` come campo esplicito
- non espone `project_profile` come campo esplicito

### Raccomandazione
Questi campi possono essere:
- aggiunti come colonne
- oppure tenuti temporaneamente in `settings_json`

ma nel modello canonico devono esistere chiaramente.

## 4. Capability Matrix
Descrive quali capability di prodotto sono attive per il progetto.

### Attributi canonici minimi
- `project_id`
- `capability_id`
- `enabled`
- `level`
- `degraded_mode`
- `readiness_status`

### Stato attuale repo
Non esiste come entita' propria.
Oggi puo' essere rappresentata temporaneamente in:
- `Project.settings_json`
- `AppConfig.config_json`

### Raccomandazione
Va trattata come entita' canonica, anche se persiste inizialmente in JSON.

## 5. Project Theme / Editorial Lens
Nel repo esiste `ProjectTheme`.
Nel modello target va usato con attenzione.

### Distinzione importante
Non confondere:
- theme di contenuto / lente editoriale
- theme visivo / skin grafica

### Attributi canonici minimi per la lente editoriale
- `theme_id`
- `project_id`
- `name`
- `description`
- `is_active`
- `order`

### Stato attuale repo
Prisma `ProjectTheme` gia' esiste.

## 6. Interview
Fonte di intent e conoscenza.

### Attributi canonici minimi
- `interview_id`
- `project_id`
- `transcript`
- `audio_ref`
- `notes`
- `interview_type`
  - guided
  - free

### Stato attuale repo
`Interview` esiste ma non distingue ancora esplicitamente il tipo.

## 7. Source
Fonte documentale o testuale.

### Attributi canonici minimi
- `source_id`
- `project_id`
- `source_type`
- `title`
- `uri`
- `extracted_text`
- `trust_level`
- `created_at`
- `updated_at`

### Stato attuale repo
`Source` esiste. `trust_level` non e' esplicito.

## 8. KB Fact
Unita' factual verificabile.

### Attributi canonici minimi
- `kb_fact_id`
- `project_id`
- `source_id`
- `fact_text`
- `confidence`
- `verified`
- `tags`
- `factual_class`
  - solid_fact
  - grounded_interpretation
  - memory_or_tradition
  - hypothesis_to_verify

### Stato attuale repo
`KBFact` esiste, ma `factual_class` non e' ancora esplicita.

## 9. Visitor Question Unit
Unita' che rappresenta una domanda rilevante del visitatore.

### Attributi canonici minimi
- `question_unit_id`
- `project_id`
- `scope_type`
  - project
  - chapter
  - segment
  - poi
- `scope_id`
- `question_text`
- `question_cluster`
- `priority`

### Stato attuale repo
Non esiste come tabella.
Per ora puo' vivere in JSON o layer derivato.

## 10. Map Layer
Layer cartografico o planimetrico.

### Attributi canonici minimi
- `map_layer_id`
- `project_id`
- `layer_type`
  - base
  - vector
  - floorplan
  - overlay
- `name`
- `geojson`
- `style`

### Stato attuale repo
`MapLayer` esiste ma non copre ancora bene la distinzione logica dei layer.

## 11. Macro Zone
Grande partizione spaziale del luogo.

### Attributi canonici minimi
- `zone_id`
- `project_id`
- `name`
- `geometry`
- `narrative_promise_light`
- `zone_role`
- `created_at`
- `updated_at`

### Stato attuale repo
`Zone` esiste, ma al momento riflette piu' una geometria che una macro-zona spazio-narrativa.

## 12. Route Node
Nodo topologico del percorso.

### Attributi canonici minimi
- `route_node_id`
- `project_id`
- `zone_id`
- `node_type`
  - access
  - bifurcation
  - transition
  - rejoin
- `coordinates_or_local_position`
- `metadata`

### Stato attuale repo
Non esiste come tabella propria.
Nel modello target e' importante.

## 13. Segment
Tratto tra due nodi.

### Attributi canonici minimi
- `segment_id`
- `project_id`
- `from_node_id`
- `to_node_id`
- `segment_type`
  - passage
  - branch
  - loop
  - connection
- `estimated_walk_seconds`
- `detour_cost`
- `metadata`

### Stato attuale repo
Non esiste come entita' esplicita.
Attualmente il repo usa soprattutto `Path` e POI ordinati.

### Raccomandazione
E' una delle entita' da introdurre o materializzare prima del motore avanzato.

## 14. POI
Punto di esperienza del luogo.

### Attributi canonici minimi
- `poi_id`
- `project_id`
- `zone_id`
- `route_node_id?`
- `segment_id?`
- `name`
- `description`
- `lat`
- `lon`
- `position_mode`
  - geo
  - local_map
  - segment_relative
- `narrator_ref?`
- `metadata`

### Stato attuale repo
`POI` esiste.

### Gap importante
Manca ancora una modellazione esplicita di:
- POI lungo segmento
- rapporto con nodo topologico

## 15. Path / Route Sequence
Sequenza ordinata di POI o segmenti per percorsi predefiniti.

### Attributi canonici minimi
- `path_id`
- `project_id`
- `name`
- `description`
- `path_order`
- `recommended_durations`
- `overrides`
- `metadata`

### Stato attuale repo
`Path` esiste ed e' oggi una delle entita' piu' vicine al runtime v1.

### Nota
Nel modello target `Path` non sostituisce:
- `Segment`
- `Canonical Full Visit`
- `Route Sequence`

## 16. Character
Personaggio o voce contestualizzata.

### Attributi canonici minimi
- `character_id`
- `project_id`
- `theme_id?`
- `name`
- `character_type`
  - real
  - contextual_role
  - composite
- `relationship_to_place`
- `tone`
- `territory_of_competence`
- `territory_of_presence`
- `factual_limits`
- `voice_map`
- `image_ref`

### Stato attuale repo
`NarratorProfile` esiste, ma il modello target e' piu' esplicito del naming attuale.

### Raccomandazione
Nel codice e nei documenti nuovi usare una distinzione concettuale chiara:
- `character/narrator contract`
- non solo `narrator profile`

## 17. Semantic Content Base
Unita' semantica sorgente per POI o segmento.

### Attributi canonici minimi
- `content_base_id`
- `project_id`
- `scope_type`
  - poi
  - segment
- `scope_id`
- `grounding`
- `key_messages`
- `verified_facts`
- `narrative_angles`
- `lens_relevance`
- `expansion_potential`
- `editorial_warnings`
- `delivery_constraints`
- `question_surfaces`
- `visual_affordances`
- `status`

### Stato attuale repo
Non esiste come entita' persistita in modo esplicito.
Oggi il repo e' piu' vicino al layer `Scheda`.

### Raccomandazione
Questa e' una delle entita' chiave da introdurre nel modello logico anche se all'inizio puo' vivere in JSON.

## 18. Rendition
Resa contenutistica finale o quasi-finale a partire dalla base semantica.

### Attributi canonici minimi
- `rendition_id`
- `project_id`
- `content_base_id`
- `rendition_type`
  - primary
  - deep_dive
  - segment_body
  - bridge
  - family
  - assistant_answer
- `lens_id?`
- `language`
- `speaker_ref?`
- `title`
- `script_text`
- `duration_estimate_seconds`
- `status`
- `version`

### Stato attuale repo
La tabella `Scheda` oggi copre una parte di questa entita'.

### Distinzione importante
Nel modello target:
- `Scheda` non basta piu' come concetto unico
- serve distinguere meglio i tipi di rendition

## 19. Scheda
Nel modello target `Scheda` puo' sopravvivere come termine di prodotto/UI, ma non dovrebbe essere l'unica entita' dati di contenuto.

### Stato attuale repo
`Scheda` e' attualmente la content entity dominante.

### Raccomandazione
Usare `Scheda` come:
- legacy-compatible persistence entity
- o alias UI

ma modellare logicamente:
- `Semantic Content Base`
- `Rendition`

## 20. Audio Asset

### Attributi canonici minimi
- `audio_asset_id`
- `rendition_id` o `scheda_id`
- `language`
- `provider`
- `voice_id`
- `asset_url`
- `asset_meta`

### Stato attuale repo
`AudioAsset` esiste e oggi punta a `Scheda`.

## 21. Visual Asset

### Attributi canonici minimi
- `visual_asset_id`
- `project_id`
- `asset_type`
  - documentary
  - illustrative
  - generated
- `role`
  - hero
  - gallery
  - clue
  - character
  - explanatory
- `scope_type`
- `scope_id`
- `reference_only`
- `delivery_candidate`
- `gps_meta?`
- `stable_detail`
- `tags`

### Stato attuale repo
Non esiste come tabella dedicata.

### Raccomandazione
Va introdotta o modellata esplicitamente.

## 22. Assistant Answer Unit

### Attributi canonici minimi
- `assistant_unit_id`
- `project_id`
- `scope_type`
- `scope_id`
- `trigger_questions`
- `verified_answer_base`
- `extended_answer`
- `handoff_suggestion`
- `limit_policy`
- `status`

### Stato attuale repo
Non esiste come entita' propria.

## 23. Family Mission

### Attributi canonici minimi
- `family_mission_id`
- `project_id`
- `scope_type`
  - poi
  - segment
  - sync
- `scope_id`
- `mission_brief`
- `clue`
- `hint_ladder`
- `reward`
- `handoff`
- `character_ref?`
- `status`

### Stato attuale repo
Non esiste come entita' propria.

## 24. App Config / Theme Pack / Project App Definition
Qui conviene distinguere tre layer.

### `AppConfig`
Config white-label o operativa del progetto.

### `ThemePack`
Skin e token UI.

### `ProjectAppDefinition`
Contratto bootstrap per web preview e Expo.

### Stato attuale repo
- `AppConfig` esiste in Prisma
- `app-config` API esiste
- `ProjectAppDefinition` e `ThemePack` sono definiti a livello specs, non ancora come entita' esplicite

## 25. Entitlement

### Attributi canonici minimi
- `entitlement_id`
- `project_id`
- `capability_scope`
- `level`
- `binding_mode`
- `valid_from`
- `valid_until`
- `grace_policy`
- `activation_channel`
- `token_or_ref`

### Stato attuale repo
Non esiste come entita' propria.
Oggi parte della logica e' coperta solo indirettamente via `QRCode` o config.

## 26. QR Code / Activation Token

### Attributi canonici minimi
- `activation_token_id`
- `project_id`
- `token_type`
  - poi
  - path
  - premium_unlock
  - project_entry
- `target_scope`
- `target_id`
- `expires_at`
- `asset_ref`

### Stato attuale repo
`QRCode` esiste, ma naming e tipi andrebbero allineati a un modello piu' generale di activation token.

## 27. Runtime Manifest

### Attributi canonici minimi
- `manifest_id`
- `project_id`
- `session_id`
- `route_sequence`
- `content_queue`
- `visit_assistant_pack_ref`
- `audio_delivery_plan`
- `visual_delivery_plan`
- `family_overlay_schedule`
- `connected_assist_policy`
- `resume_points`
- `recalc_policy`

### Stato attuale repo
Non esiste ancora come entita' persistita esplicita nel repo attuale.

## 28. Session Visit Plan

### Attributi canonici minimi
- `session_plan_id`
- `project_id`
- `session_id`
- `selected_route`
- `selected_content_refs`
- `family_active`
- `language`
- `dominant_lens`
- `secondary_lenses`
- `estimated_total_duration`

### Stato attuale repo
Non esiste ancora come entita' esplicita.

## 29. Session
Nel sistema esistono due sessioni distinte concettualmente:

### Auth session
Gia' presente per NextAuth.

### Visit session
Sessione reale del visitatore.

### Visit session attributi canonici minimi
- `visit_session_id`
- `project_id`
- `language`
- `started_at`
- `ended_at`
- `status`
- `capability_snapshot`
- `bundle_ref`
- `entitlement_snapshot`

### Stato attuale repo
Non esiste ancora come tabella esplicita nel repo.

## 30. Session Bundle

### Attributi canonici minimi
- `bundle_id`
- `project_id`
- `session_id?`
- `bundle_status`
- `runtime_manifest_ref`
- `audio_refs`
- `visual_refs`
- `assistant_pack_ref`
- `family_pack_refs`
- `readiness_state`

### Stato attuale repo
Non esiste ancora come entita' esplicita.

## 31. Analytics Event

### Attributi canonici minimi
- `event_id`
- `project_id`
- `visit_session_id?`
- `event_type`
- `scope_type`
- `scope_id`
- `payload`
- `created_at`
- `project_version_ref`

### Stato attuale repo
`AnalyticsEvent` esiste ma e' ancora molto generico.

## Canonical relationships

### Project owns
- themes
- interviews
- sources
- facts
- glossary
- map layers
- zones
- nodes
- segments
- POI
- paths
- characters
- content bases
- renditions
- visual assets
- assistant units
- family missions
- app config
- capability matrix
- analytics

### POI relates to
- zone
- segment or node context
- content base
- renditions
- visual assets
- family missions
- assistant answers

### Segment relates to
- nodes
- zone context
- content base
- renditions
- assistant answers
- family missions

## Current Prisma coverage vs target model

### Well covered today
- tenant/user/auth
- project
- theme as content/theme concept
- source
- KB fact
- glossary
- narrator profile
- map layer
- zone
- poi
- path
- scheda
- audio asset
- qr code
- job
- app config
- analytics event

### Partially covered today
- project app config vs app definition
- path vs route sequence
- scheda vs rendition
- narrator profile vs character contract

### Missing or only implicit today
- capability matrix
- spatial mode as explicit field
- route nodes
- segments
- semantic content base
- assistant answer units
- family missions
- visual assets as first-class entity
- visit session
- session bundle
- runtime manifest
- entitlements
- project app definition

## Implementation recommendation
Non tentare di migrare tutto in una volta.

### Ordine consigliato
1. esplicitare il modello canonico nei documenti
2. aggiungere gli export/shared contracts
3. introdurre le nuove entita' piu' critiche
4. rifattorizzare il persistence model senza rompere il v1

## Naming rules
Per ridurre ambiguita':
- usare `project` per il perimetro editoriale
- usare `visit_session` per la sessione del visitatore
- usare `auth_session` per sessione login
- usare `content_base` per il layer semantico
- usare `rendition` per le rese fruibili
- usare `theme_pack` per il layer visuale
- usare `capability` per le feature di prodotto
- usare `entitlement` per lo sblocco temporale

## Checklist minima
Prima di aggiungere una nuova tabella o JSON field chiedersi:
- questa entita' esiste gia' nel modello canonico?
- sto salvando una entita' o uno stato derivato?
- serve al progetto, alla sessione o al client?
- deve comparire anche in export o bundle?

## Cosa prepara dopo
Questo documento prepara direttamente:
- `STATE_MACHINE.md`
- `RUNTIME_CONTRACTS.md`
- future evoluzioni di Prisma e degli export JSON

Se vuoi, il prossimo passo naturale e' proprio `STATE_MACHINE.md`.
