# DEVELOPMENT_STATUS

## Riferimento temporale
Aggiornato al: `22 marzo 2026`

## Scopo
Questo documento registra lo stato reale dello sviluppo rispetto al piano.

Serve a:
- evitare mismatch tra documentazione e codice
- dare una vista rapida di cosa e' gia' pronto
- chiarire cosa e' in corso e cosa e' ancora da avviare

## Stato sintetico per macro-area

### 1. Contratti bootstrap progetto
Stato: `avanzato`
Step strategici:
- [step9.md](/Users/tommycinti/Documents/toolia/docs/plans/step9.md)
- [step11.md](/Users/tommycinti/Documents/toolia/docs/plans/step11.md)
- [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md)

Gia' introdotti:
- `Project App Definition`
- `Capability Snapshot`
- `Theme Pack`

Touchpoint implementati:
- [project-app-definition.ts](/Users/tommycinti/Documents/toolia/src/lib/contracts/project-app-definition.ts)
- [capability-snapshot.ts](/Users/tommycinti/Documents/toolia/src/lib/contracts/capability-snapshot.ts)
- [theme-pack.ts](/Users/tommycinti/Documents/toolia/src/lib/contracts/theme-pack.ts)
- [app-definition route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/app-definition/route.ts)
- [capability-snapshot route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/capability-snapshot/route.ts)
- [theme-pack route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/theme-pack/route.ts)

### 2. Preview web come consumer reale
Stato: `avanzato`
Step strategici:
- [step7.md](/Users/tommycinti/Documents/toolia/docs/plans/step7.md)
- [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md)

Gia' fatto:
- bootstrap da `app-definition`, `capability-snapshot`, `theme-pack`
- refactor strutturale della preview per ridurre problemi `static-components`
- compose flow preview migrato a endpoint runtime (`visit/runtime`) con consumo `composed_visit` dal `Runtime Manifest`

Touchpoint:
- [preview page](/Users/tommycinti/Documents/toolia/src/app/preview/[projectId]/page.tsx)

Nota:
- restano warning non bloccanti su `<img>` (`@next/next/no-img-element`)

### 3. Bootstrap Expo su contratti canonici
Stato: `avanzato`
Step strategici:
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)
- [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md)

Gia' fatto:
- bootstrap runtime mobile centralizzato
- tema mobile alimentato da `theme-pack`
- API mobile disaccoppiata da base hardcoded runtime

Touchpoint:
- [useRuntimeBootstrap.ts](/Users/tommycinti/Documents/toolia/mobile/src/hooks/useRuntimeBootstrap.ts)
- [api.ts](/Users/tommycinti/Documents/toolia/mobile/src/lib/api.ts)
- [ThemeProvider.tsx](/Users/tommycinti/Documents/toolia/mobile/src/theme/ThemeProvider.tsx)
- [theme index](/Users/tommycinti/Documents/toolia/mobile/src/theme/index.ts)
- [_layout.tsx](/Users/tommycinti/Documents/toolia/mobile/app/_layout.tsx)

### 8. Project Delivery Pack (EB-07)
Stato: `completato`
Step strategici:
- [step9.md](/Users/tommycinti/Documents/toolia/docs/plans/step9.md)
- [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md)

Aggiornamento implementativo:
- introdotto contratto canonico `Project Delivery Pack` v1
- introdotto builder server-side con metadata schema/versioning + refs bootstrap/runtime
- route `export` riallineata su delivery pack come payload principale
- route `app-manifest` trasformata in adapter legacy del delivery pack
- introdotta route dedicata `delivery-pack` (`/api/projects/[id]/delivery-pack`) per consumo JSON diretto
- `project-app-definition.endpoints` esteso con `delivery_pack_path`
- `project-app-definition.endpoints` esteso con path preferiti runtime-first (`preferred_manifest_path`, `preferred_visit_compose_path`)
- mobile `useManifest` migrato a consumo `delivery-pack` come canale primario; fallback `app-manifest` attivabile solo via flag esplicito (`EXPO_PUBLIC_ENABLE_LEGACY_MANIFEST_FALLBACK=1`)
- pannello studio `Export` aggiornato con doppio download (`Delivery Pack` canonico + `Legacy Export`)
- `app-manifest` etichettato come legacy endpoint tramite header response con replacement `delivery-pack`
- `app-manifest` arricchito con header deprecazione/sunset (`X-Toolia-Deprecation-Date`, `X-Toolia-Sunset-Date`)
- `app-manifest` hardenizzato: fallback `500` strutturato (`INTERNAL_ERROR`) con header legacy/deprecation preservati
- preview web migrata a bootstrap `delivery-pack` first con fallback lazy su `app-manifest` solo se necessario
- proxy runtime aggiornato: `delivery-pack` incluso tra le route mobile pubbliche/CORS in produzione
- proxy runtime: `visit/compose` rimosso dalle route mobile pubbliche (resta compat layer non primario)

Touchpoint:
- [project-delivery-pack contract](/Users/tommycinti/Documents/toolia/src/lib/contracts/project-delivery-pack.ts)
- [project-delivery-pack builder](/Users/tommycinti/Documents/toolia/src/lib/builders/project-delivery-pack.ts)
- [export route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/export/route.ts)
- [app-manifest route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/app-manifest/route.ts)
- [delivery-pack route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/delivery-pack/route.ts)

### 4. Runtime manifest v1
Stato: `avviato`
Step strategici:
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)

Gia' fatto:
- builder composizione estratto e riusabile
- nuovo contratto `Runtime Manifest`
- nuovo endpoint `/visit/runtime`
- wizard mobile migrato a `runtimeManifest`

Touchpoint:
- [visit-compose builder](/Users/tommycinti/Documents/toolia/src/lib/builders/visit-compose.ts)
- [runtime-manifest contract](/Users/tommycinti/Documents/toolia/src/lib/contracts/runtime-manifest.ts)
- [runtime-manifest builder](/Users/tommycinti/Documents/toolia/src/lib/builders/runtime-manifest.ts)
- [legacy lifecycle headers helper](/Users/tommycinti/Documents/toolia/src/lib/server/legacy-headers.ts)
- [visit runtime route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/runtime/route.ts)
- [visit compose route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/compose/route.ts)
- [visit wizard](/Users/tommycinti/Documents/toolia/mobile/app/visit-wizard.tsx)

Aggiornamento implementativo:
- introdotta validazione input runtime/compose con taxonomy errori (`INVALID_JSON`, `INVALID_INPUT`, `INTERNAL_ERROR`)
- introdotta telemetry minima su route `visit/runtime` e `visit/compose`
- `visit/compose` riallineata come adapter esplicito di `visit/runtime`
- `visit/compose` etichettata come legacy endpoint tramite header response (`X-Toolia-Legacy-Endpoint`, `X-Toolia-Replacement-Endpoint`)
- `visit/compose` arricchita con header deprecazione/sunset (`X-Toolia-Deprecation-Date`, `X-Toolia-Sunset-Date`) per guidare la migrazione client
- lifecycle header legacy centralizzati via helper server condiviso (`withLegacyLifecycleHeaders`) per evitare drift date tra adapter
- `visit/compose` e `app-manifest` ora espongono header legacy/deprecation anche su risposte `404` per guidance client consistente
- `visit/compose` ora espone header legacy/deprecation anche su errori di validazione (`400`) per guidance client costante
- aggiunto smoke test route runtime: [visit runtime route test](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/runtime/route.test.ts)
- simulatore visita studio (`content-kanban`) migrato da `visit/compose` a `visit/runtime`
- `project-app-definition.platform_hints.legacy_v1.compose_visit` impostato a `false` per guidare nuovi consumer runtime-first

### 5. Session bundle offline-first
Stato: `avviato`
Step strategici:
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)

Gia' fatto:
- introdotto contratto `Session Bundle` v1 e builder server-side da `Runtime Manifest`
- introdotto endpoint `visit/session-bundle` per preparazione bundle sessione
- introdotto download locale asset essenziali (audio/visual) per sessione
- introdotto readiness gate in `visit-wizard` prima dello start della visita
- introdotto gate UX anche dalla home (`La tua visita`) per impedire ingresso se bundle `not_ready`
- introdotto persistenza locale stato bundle (`bundleReadinessState`, mappe asset locali, resume points)
- esteso `Session Bundle` con `family_mission_pack_refs` derivati dal runtime manifest
- `composed-visit` usa asset locali del bundle quando disponibili
- introdotto `resume/rejoin` base con pointer persistente di sessione (`visitSessionId`, `currentIndex`, `currentSchedaId`)
- ripristino automatico posizione in `composed-visit` con fallback ai `resume_points` del bundle

Touchpoint:
- [session-bundle contract](/Users/tommycinti/Documents/toolia/src/lib/contracts/session-bundle.ts)
- [session-bundle builder](/Users/tommycinti/Documents/toolia/src/lib/builders/session-bundle.ts)
- [session-bundle route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/session-bundle/route.ts)
- [session-bundle route test](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/session-bundle/route.test.ts)
- [mobile session-bundle utility](/Users/tommycinti/Documents/toolia/mobile/src/lib/session-bundle.ts)
- [appStore bundle state](/Users/tommycinti/Documents/toolia/mobile/src/store/appStore.ts)
- [visit-wizard readiness gate](/Users/tommycinti/Documents/toolia/mobile/app/visit-wizard.tsx)
- [composed-visit local asset fallback](/Users/tommycinti/Documents/toolia/mobile/app/composed-visit.tsx)

Gap residui:
- resume/rejoin avanzato ancora da completare (attuale v1 resta index-based, senza regole smart di salto capitoli)
- consolidamento `useItineraryDownload` avviato: adapter su `Session Bundle` attivo con fallback legacy endpoint

### 6. Assistant bounded + family overlay runtime
Stato: `avviato sul runtime canonico (assistant v1 parziale)`
Step strategici:
- [step5.md](/Users/tommycinti/Documents/toolia/docs/plans/step5.md)
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)
- [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md)

Nota:
- assistant mobile ora invia contesto runtime (`visitSessionId`, punto corrente, schede vicine) alla route chatbot
- route chatbot consuma contesto sessione per bounded prompting e limita history a finestra corta
- assistant runtime contestuale esteso: se presente missione family attiva, il client invia `active_family_mission` (title/brief/clue/handoff) e la route la integra nel prompt
- assistant runtime contestuale ulteriormente esteso con progressione percorso (`completed/total schede`, `tempo residuo`, `upcoming_schede`) e policy connettivita' (`connected_assist_policy`)
- fallback assistente offline introdotto lato mobile (`assistant_local_fallback_used`) con risposta locale basata su scheda corrente quando la rete non e' disponibile
- route chatbot hardenizzata con retrieval bounded su `KBFact` (ranking lessicale su query + contesto runtime, limite facts/chars) per prompt piu' stabile e pertinente
- introdotto scheduler `family_overlay_schedule` nel `Runtime Manifest` con cadenza editoriale (`12-18 minuti`) quando `familyMode=true`
- missioni runtime generate con tipi `poi|segment|sync`, trigger su `scheda`, durata stimata missione
- missioni runtime arricchite con contenuto editoriale (`title`, `kid_brief`, `clue`, `hint_ladder`, `reward_text`, `family_handoff`, `character_cue`)
- mission engine family resa project-aware: profilo editoriale letto da `settings_json.family_overlay` (tone, density, hint_style, companion_name, directional prompts)
- cadenza missioni configurabile per progetto (`light|standard|dense`) con adattamento automatico di target/min/max
- cadenza missioni estesa con override numerico per progetto (`mission_cadence_minutes`) + tolleranza (`mission_cadence_tolerance_percent`, 10-20%) per tuning fine family overlay
- mission engine estesa con `target_age_range` (`6_8|6_10|9_12`) e `game_modes` (`riddle|observation|micro_challenge`) per missioni realmente editoriali per target kids
- missioni family arricchite con `visual_hint_image_url` (reference reale da scheda/POI) e `illustration_prompt` per pipeline immagini kids
- store mobile allineato: `visitSession.familyOverlaySchedule` persistito come parte dello stato canonico
- `visit-wizard` supporta toggle `familyMode` e invio flag in compose runtime
- `composed-visit` mostra mission card episodica quando il trigger missione coincide con la scheda corrente
- completamento missione family persistito nello stato sessione (`completedFamilyMissionIds`)
- UX missione estesa con hint progressivi (`Mostra altro hint`)
- `visitPreferences` include `familyMode` per continuita' dei flussi
- preview runtime-first aggiornato: toggle `Family mode` nello step durata, invio `familyMode` alla compose runtime e riepilogo missioni family nello screen summary

### 7. Session state canonico mobile (fase 1)
Stato: `avviato`
Step strategici:
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)
- [step7.md](/Users/tommycinti/Documents/toolia/docs/plans/step7.md)
- [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md)

Gia' fatto:
- introdotto `visitSession` canonico nello store mobile con:
  - `runtimeManifestId`
  - `visitSessionId`
  - `routeSequence`
  - `contentQueue`
  - `recalcPolicy`
  - `connectedAssistPolicy`
- `visit-wizard` salva lo stato da `runtimeManifest`
- `composed-visit` legge da `visitSession.contentQueue` come unica source of truth
- home screen usa `visitSession` come gate UX della visita e per metadati (`durata`, `tappe`)
- API mobile `runtimeManifest` con gestione errori non-2xx (`status`, `code`, `details`)
- rimosso il fallback `composedVisit` dal client mobile (hard-cut legacy state)

Touchpoint:
- [appStore.ts](/Users/tommycinti/Documents/toolia/mobile/src/store/appStore.ts)
- [visit-wizard.tsx](/Users/tommycinti/Documents/toolia/mobile/app/visit-wizard.tsx)
- [composed-visit.tsx](/Users/tommycinti/Documents/toolia/mobile/app/composed-visit.tsx)

## Rischi attuali da gestire
- doppio canale temporaneo `visit/compose` e `visit/runtime`: ora non primario nei client first-party, resta solo per compatibilita' legacy
- modello store mobile ancora orientato a `composedVisit`: va evoluto verso session state canonico
- assenza `Session Bundle` puo' rallentare il vero offline-first

### 8. Baseline test regressione runtime
Stato: `avanzato`
Step strategici:
- [step10.md](/Users/tommycinti/Documents/toolia/docs/plans/step10.md)
- [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md)

Aggiornamento implementativo:
- introdotto wiring Jest/TS compatibile Next (`jest.config.js`) per rendere eseguibili i test route gia' presenti
- test route premium unlock riallineato ai mock Prisma correnti (`scheda.findMany`)
- aggiunta suite analytics events (`poi_scan_activated` + invalid event_type)
- aggiunta suite route analytics progetto (`auth gate` + KPI `poiScanActivated/poiScanFailed`)
- aggiunta suite route legacy `visit/compose` (adapter headers deprecazione/sunset + payload compat)
- copertura estesa su `visit/runtime` e `visit/session-bundle` per metadata visual family mission (`visual_hint_image_url`, `illustration_prompt`)
- estratta utility mobile `poi-scan` con test unitari dedicati (`tryExtractPoiId`, `resolvePoiActivation`) per iniziare copertura layer mobile logic
- baseline regression attuale: `11 suite`, `44 test` passati (`npx jest --runInBand`)

### 9. Observability loop (EB-08)
Stato: `completato`
Step strategici:
- [step10.md](/Users/tommycinti/Documents/toolia/docs/plans/step10.md)

Aggiornamento implementativo:
- esteso catalogo analytics eventi con `family_mission_shown` e `family_mission_completed`
- `composed-visit` invia eventi anonimi quando una missione family appare e quando viene completata
- endpoint analytics progetto arricchito con metriche family (`shown/completed/completion_rate_percent`)
- riallineato ingest eventi per supportare anche `audio_play_completed`
- esteso tracking mobile lungo il flusso visita: `duration_selected`, `themes_selected`, `path_started`, `poi_entered`, `scheda_play`, `scheda_complete`
- aggiunto tracking `session_end` su chiusura manuale visita con metriche di progressione
- aggiunto tracking `assistant_message_sent` per misurare utilizzo chatbot in-session
- aggiunto tracking `assistant_local_fallback_used` per monitorare affidabilita' assistant in condizioni di connettivita' limitata
- aggiunto tracking `visit_start_blocked` per misurare blocchi reali in session-start (bundle/rete/runtime)
- analytics progetto e dashboard studio estesi con KPI `assistantMessages`
- endpoint analytics progetto hardenizzato con validazione range date (`from`/`to`)
- aggiunte metriche funnel sessione (`started/ended/completion rate/plays per session`) in API e dashboard
- aggiunto tracking `session_bundle_prepared` con metadati readiness (`ready_minimal/ready_and_enrichable`)
- analytics/dashboards estesi con breakdown `bundleReadinessBreakdown` per monitorare la qualita' offline in avvio sessione
- tracking top-funnel completato con eventi `app_open` e `language_selected` dal client mobile
- dashboard analytics arricchito con alert operativi su soglie (`session completion`, `bundle not_ready`, `family completion`)
- endpoint analytics espone ora `healthFlags` strutturati e dashboard visualizza badge health machine-readable
- issue loop operativo chiuso: endpoint analytics espone `operations.issue_loop` + `operations.actions` (azioni prioritarie con owner hint e playbook)
- dashboard analytics include KPI `Ops Issue Loop` + lista azioni operative (severity/rationale/azioni consigliate)
- KPI assistant esteso con conteggio fallback locali e flag operativo `ASSISTANT_OFFLINE_FALLBACK_HIGH`
- funnel avvio riallineato: `path_started` ora emesso solo dopo superamento readiness gate bundle
- analytics premium esteso con breakdown durate unlock (`1_day`/`1_week`) in API e dashboard studio
- analytics estese con metriche `poi_scan_activated` e `poi_scan_failed` in API/dashboard per monitorare fallback no-GPS e failure reasons
- analytics progetto estese con `poiScanFailureBreakdown` (reason-level) e export CSV per tuning operativo scanner no-GPS
- health flag operativo aggiunto: `POI_SCAN_FAILURE_RATE_HIGH` con action card nell'issue loop analytics
- KPI `poiScanFailureRate` esposto in API/dashboard/export per lettura immediata qualita' scanner
- ingest analytics hardenizzata: `poi_scan_failed.reason` validata contro enum consentito per evitare drift dati
- ingest analytics hardenizzata: `poi_scan_activated/failed.source` validata (`scan_qr|manual_code`) per coerenza telemetry scanner
- analytics estese con `poiScanTopFailureReason` per prioritizzare rapidamente la correzione operativa
- analytics estese con `poiScanSourceBreakdown` (`scan_qr` vs `manual_code`) per ottimizzare UX scanner e materiali campo
- tracciato uso fallback legacy mobile (`legacy_manifest_fallback_used`) per monitorare residuo dipendenza da `app-manifest` durante la dismissione progressiva

Touchpoint:
- [analytics events route](/Users/tommycinti/Documents/toolia/src/app/api/analytics/events/route.ts)
- [mobile api analytics](/Users/tommycinti/Documents/toolia/mobile/src/lib/api.ts)
- [composed-visit mission tracking](/Users/tommycinti/Documents/toolia/mobile/app/composed-visit.tsx)
- [analytics dashboard UI](/Users/tommycinti/Documents/toolia/src/components/analytics-dashboard.tsx)
- [project analytics API](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/analytics/route.ts)

### 10. App UX/UI template modulare (EB-09)
Stato: `completato`
Step strategici:
- [step11.md](/Users/tommycinti/Documents/toolia/docs/plans/step11.md)
- [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md)
- [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md)

Aggiornamento implementativo:
- `UI-01` avviato: `visit-wizard` ora espone blocked-state card con reason esplicita in caso di start non disponibile
- introdotto evento analytics `visit_start_blocked` per monitorare i blocchi reali al session-start
- funnel avvio riallineato: `path_started` viene emesso solo quando la visita parte davvero (dopo readiness gate)
- `UI-02` avviato: top bar `composed-visit` mostra stato connessione + stato bundle in tempo reale (`Online/Offline`, `Bundle ok/parziale`)
- `UI-03` avviato: shortcut mappa dal visit shell (`composed-visit -> /map`) con telemetria `map_opened`
- `UI-04` avviato: premium unlock QR con selezione durata (`1 day` / `1 week`) e snapshot entitlement locale (`status/duration/expiresAt/pathId`)
- endpoint unlock premium esteso: ritorna `entitlement` (`duration`, `unlocked_at`, `expires_at`) e riceve `duration` via query param
- premium unlock esteso anche a inserimento manuale codice nello scanner (flow QR/password unificato)
- scanner esteso con modalita' `POI` (oltre a `premium`) per attivazione contenuti senza GPS durante la visita
- attivazione POI via scanner supporta input multipli (`poi:<id>`, URL con `poi_id`, payload JSON con `poi_id`)
- visit shell aggiornata con azione rapida `Scansiona POI` nel menu in-session
- introdotto evento analytics `poi_scan_activated` per monitorare adozione e affidabilita' del fallback no-GPS
- introdotto evento analytics `poi_scan_failed` con reason code (`no_active_visit|poi_not_in_route|poi_not_activable|missing_content`) per tuning operativo scanner no-GPS
- entitlement premium con scadenza gestita lato home: stato auto-invalidato quando `expiresAt` è passato
- `UI-05` avviato: assistant tab mostra modalità operativa online/offline e traccia apertura con evento `assistant_opened`
- visit shell menu completato: azioni rapide per lingua, premium unlock, mappa, assistant, chiusura visita
- card missione family in-shell aggiornata con visual hint image quando disponibile
- `UI-06` avviato: introdotta QA matrix cross-scenario per template UX/UI (start/family/assistant/premium/map/lingua)

Touchpoint:
- [visit-wizard.tsx](/Users/tommycinti/Documents/toolia/mobile/app/visit-wizard.tsx)
- [composed-visit.tsx](/Users/tommycinti/Documents/toolia/mobile/app/composed-visit.tsx)
- [analytics events route](/Users/tommycinti/Documents/toolia/src/app/api/analytics/events/route.ts)
- [APP_UX_UI_TEMPLATE_EXECUTION.md](/Users/tommycinti/Documents/toolia/docs/specs/APP_UX_UI_TEMPLATE_EXECUTION.md)
- [UX_UI_QA_MATRIX.md](/Users/tommycinti/Documents/toolia/docs/specs/UX_UI_QA_MATRIX.md)

## Decisioni architetturali gia' fissate
- piattaforma = source of truth
- contratti canonici lato server, client consumer
- session-start composition
- offline-first come obiettivo runtime
- hard-cut progressivo dal legacy operativo

## Prossime 3 priorita' operative
1. completare `EB-06` con contenuti missione editoriali curati/project-specific (engine runtime gia' project-aware via `settings_json.family_overlay`)
2. completare dismissione graduale dipendenze legacy (`app-manifest` fallback solo opt-in e `visit/compose` compat layer)
3. estendere ulteriormente la baseline regression mobile (oggi copertura `11 suite/44 test`) ai flussi UI end-to-end su device per `POI scan no-GPS` e `family visual hints` usando [UX_UI_QA_MATRIX.md](/Users/tommycinti/Documents/toolia/docs/specs/UX_UI_QA_MATRIX.md)

## Regola di aggiornamento
- Ogni aggiornamento di stato deve includere i riferimenti agli step strategici impattati (`/docs/plans/step*.md`), in modo esplicito.

## Keep / Remove rapido (operativo)
### Tenere e usare come base
- [src/lib/contracts](/Users/tommycinti/Documents/toolia/src/lib/contracts)
- [src/lib/builders](/Users/tommycinti/Documents/toolia/src/lib/builders)
- [src/app/api/projects/[id]/visit/runtime/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/runtime/route.ts)
- [mobile/src/hooks/useRuntimeBootstrap.ts](/Users/tommycinti/Documents/toolia/mobile/src/hooks/useRuntimeBootstrap.ts)

### Tenere ma ridurre progressivamente
- [src/app/api/projects/[id]/visit/compose/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/compose/route.ts)
- [src/app/api/projects/[id]/app-manifest/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/app-manifest/route.ts)
- [mobile/src/store/appStore.ts](/Users/tommycinti/Documents/toolia/mobile/src/store/appStore.ts) (campo `composedVisit`)

### Da dismettere a migrazione completata
- uso operativo di [mobile/AppConfig.json](/Users/tommycinti/Documents/toolia/mobile/AppConfig.json) oltre il bootstrap minimo
- `visit/compose` come endpoint primario di sessione
- fallback preview su `app-config` come fonte principale
- fallback mobile automatico su `app-manifest` senza flag esplicito
