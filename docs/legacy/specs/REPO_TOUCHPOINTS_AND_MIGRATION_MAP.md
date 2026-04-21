# REPO_TOUCHPOINTS_AND_MIGRATION_MAP

## Scopo
Questo documento collega:
- i piani prodotto in `/docs/plans`
- i contratti tecnici in `/docs/specs`
- i file reali del repository

Serve a evitare che un LLM o uno sviluppatore:
- implementi nel file sbagliato
- allarghi ancora i contratti legacy invece di introdurre quelli canonici
- rompa l'allineamento tra piattaforma, preview web e app Expo

Formula chiave:

`prima capire dove vive oggi una cosa, poi decidere dove deve vivere domani`

## Come usare questo documento
Per ogni feature o tranche:
1. identificare il contratto canonico coinvolto
2. trovare il touchpoint attuale del repo
3. decidere se:
   - estendere temporaneamente un layer legacy
   - oppure introdurre il layer target
4. non cambiare mai prima il client se manca il builder lato piattaforma

## Stato attuale di migrazione (20 marzo 2026)
Snapshot sintetico:

- `Project App Definition`: introdotto e operativo
- `Capability Snapshot`: introdotto e operativo
- `Theme Pack`: introdotto e operativo
- `Runtime Manifest`: introdotto in forma v1 (`visit/runtime`)
- `Session Bundle`: non ancora introdotto
- `Preview runtime-first`: avviata, non ancora completa su tutti i flussi
- `Expo runtime-first`: avviata, in corso su stato sessione canonico

Regola operativa corrente:
- nuovi sviluppi su bootstrap/config devono usare i contratti canonici
- route e shape legacy possono restare solo come adapter temporanei

## Keep / Transform / Remove
Questa sezione definisce cosa mantenere, cosa trasformare e cosa eliminare del codice esistente.

### Keep (mantenere come base)
- [src/lib/contracts/project-app-definition.ts](/Users/tommycinti/Documents/toolia/src/lib/contracts/project-app-definition.ts)
- [src/lib/contracts/capability-snapshot.ts](/Users/tommycinti/Documents/toolia/src/lib/contracts/capability-snapshot.ts)
- [src/lib/contracts/theme-pack.ts](/Users/tommycinti/Documents/toolia/src/lib/contracts/theme-pack.ts)
- [src/lib/contracts/runtime-manifest.ts](/Users/tommycinti/Documents/toolia/src/lib/contracts/runtime-manifest.ts)
- [src/lib/builders/project-app-definition.ts](/Users/tommycinti/Documents/toolia/src/lib/builders/project-app-definition.ts)
- [src/lib/builders/capability-snapshot.ts](/Users/tommycinti/Documents/toolia/src/lib/builders/capability-snapshot.ts)
- [src/lib/builders/theme-pack.ts](/Users/tommycinti/Documents/toolia/src/lib/builders/theme-pack.ts)
- [src/lib/builders/runtime-manifest.ts](/Users/tommycinti/Documents/toolia/src/lib/builders/runtime-manifest.ts)
- [src/lib/builders/visit-compose.ts](/Users/tommycinti/Documents/toolia/src/lib/builders/visit-compose.ts)
- [src/app/api/projects/[id]/app-definition/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/app-definition/route.ts)
- [src/app/api/projects/[id]/capability-snapshot/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/capability-snapshot/route.ts)
- [src/app/api/projects/[id]/theme-pack/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/theme-pack/route.ts)
- [src/app/api/projects/[id]/visit/runtime/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/runtime/route.ts)
- [mobile/src/hooks/useRuntimeBootstrap.ts](/Users/tommycinti/Documents/toolia/mobile/src/hooks/useRuntimeBootstrap.ts)

### Transform (tenere ma evolvere)
- [src/app/api/projects/[id]/visit/compose/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/compose/route.ts)
  - target: solo adapter compatibile verso `visit-compose` builder
- [src/app/api/projects/[id]/app-manifest/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/app-manifest/route.ts)
  - target: subset o adapter del futuro `Project Delivery Pack`
- [src/app/api/projects/[id]/export/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/export/route.ts)
  - target: export editoriale/diagnostico, non contratto runtime
- [src/app/preview/[projectId]/page.tsx](/Users/tommycinti/Documents/toolia/src/app/preview/[projectId]/page.tsx)
  - target: consumer runtime-first modulare (bootstrap/session/player/map separati)
- [mobile/src/store/appStore.ts](/Users/tommycinti/Documents/toolia/mobile/src/store/appStore.ts)
  - target: session state canonico (manifest id, visit session id, route/content queue, policies)
- [mobile/src/lib/api.ts](/Users/tommycinti/Documents/toolia/mobile/src/lib/api.ts)
  - target: client orientato a runtime contracts; ridurre progressivamente chiamate legacy
- [mobile/app/visit-wizard.tsx](/Users/tommycinti/Documents/toolia/mobile/app/visit-wizard.tsx)
  - target: comporre e persistere sessione completa dal runtime manifest
- [mobile/app/composed-visit.tsx](/Users/tommycinti/Documents/toolia/mobile/app/composed-visit.tsx)
  - target: leggere da session state canonico, non da payload composito legacy

### Remove (dismettere a milestone)
- [mobile/AppConfig.json](/Users/tommycinti/Documents/toolia/mobile/AppConfig.json)
  - non eliminare subito dal repo: ridurre a `dev bootstrap pointer` e poi sostituire con env/project ref
- endpoint legacy `visit/compose` come entrypoint principale
  - dismettere quando tutti i consumer usano `visit/runtime`
- dipendenza operativa da `app-config` lato preview/mobile
  - eliminare quando il bootstrap usa solo `app-definition + theme-pack + capability-snapshot`
- shape `composedVisit` come contratto primario di sessione nel mobile store
  - eliminare quando il runtime manifest e il session bundle diventano source of truth

## Regole di eliminazione
- non rimuovere file legacy prima di avere:
  - consumer migrati
  - test smoke su flussi principali
  - fallback controllato o piano rollback
- ogni rimozione deve citare la milestone del piano sequenziale in:
  - [TEAM_SEQUENTIAL_EXECUTION_PLAN.md](/Users/tommycinti/Documents/toolia/docs/specs/TEAM_SEQUENTIAL_EXECUTION_PLAN.md)

## Aree reali del repository

### 1. Piattaforma/editoring
La base piattaforma vive soprattutto in:
- [src/app](/Users/tommycinti/Documents/toolia/src/app)
- [src/components](/Users/tommycinti/Documents/toolia/src/components)
- [src/lib](/Users/tommycinti/Documents/toolia/src/lib)
- [prisma/schema.prisma](/Users/tommycinti/Documents/toolia/prisma/schema.prisma)

### 2. Preview web attuale
La preview vive oggi soprattutto in:
- [src/app/preview/[projectId]/page.tsx](/Users/tommycinti/Documents/toolia/src/app/preview/[projectId]/page.tsx)

### 3. App Expo attuale
Il client mobile vive in:
- [mobile/app](/Users/tommycinti/Documents/toolia/mobile/app)
- [mobile/src](/Users/tommycinti/Documents/toolia/mobile/src)
- [mobile/AppConfig.json](/Users/tommycinti/Documents/toolia/mobile/AppConfig.json)
- [mobile/app.config.ts](/Users/tommycinti/Documents/toolia/mobile/app.config.ts)

## Mappa del v1 attuale

### Configurazione progetto v1
Touchpoint attuali:
- [src/app/api/projects/[id]/app-config/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/app-config/route.ts)
- [src/components/app-configurator.tsx](/Users/tommycinti/Documents/toolia/src/components/app-configurator.tsx)
- [mobile/AppConfig.json](/Users/tommycinti/Documents/toolia/mobile/AppConfig.json)

Ruolo attuale:
- configurazione visuale e funzionale semplificata
- bootstrap mobile hardcoded o semi-statico

Ruolo target:
- input parziale per `Project App Definition`
- non contratto finale completo

Regola:
- non estendere `app-config` all'infinito
- usarlo come base legacy da inglobare nel `Project App Definition`

### Manifest/export v1
Touchpoint attuali:
- [src/app/api/projects/[id]/app-manifest/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/app-manifest/route.ts)
- [src/app/api/projects/[id]/export/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/export/route.ts)

Ruolo attuale:
- bootstrap contenutistico per preview/mobile
- export amministrativo di contenuti pubblicati

Ruolo target:
- `app-manifest` deve diventare un adapter o subset transitorio del `Project Delivery Pack`
- `export` deve restare un export diagnostico/editoriale, non il contratto runtime principale

Regola:
- non fare evolvere `app-manifest` come contratto definitivo
- introdurre i contratti canonici e poi mantenere adapter compatibili per il v1

### Composer v1
Touchpoint attuale:
- [src/app/api/projects/[id]/visit/compose/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/compose/route.ts)

Ruolo attuale:
- composer server-side schede-first
- calcolo semplice di durata, core schede e ranking per temi

Ruolo target:
- builder iniziale di `Session Visit Plan`
- punto di partenza per `Runtime Manifest`

Regola:
- non spostare questa logica nel client
- prima estrarre la logica in builder/server service, poi farla consumare da preview e Expo

### Assistant v1
Touchpoint attuali:
- [src/app/api/projects/[id]/chatbot/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/chatbot/route.ts)
- [src/lib/llm/assistant.ts](/Users/tommycinti/Documents/toolia/src/lib/llm/assistant.ts)
- [mobile/src/hooks/useChatbot.ts](/Users/tommycinti/Documents/toolia/mobile/src/hooks/useChatbot.ts)
- [mobile/app/(tabs)/chatbot.tsx](/Users/tommycinti/Documents/toolia/mobile/app/(tabs)/chatbot.tsx)

Ruolo attuale:
- chat verticale v1

Ruolo target:
- consumer di `Visit Assistant Pack`
- assistant situato, bounded, capability-aware

Regola:
- non trattarlo come chat generica
- la UI assistant deve leggere perimetro e fallback da contratti espliciti

## Preview web attuale: punti forti e problemi
Touchpoint principale:
- [src/app/preview/[projectId]/page.tsx](/Users/tommycinti/Documents/toolia/src/app/preview/[projectId]/page.tsx)

Punti forti:
- esiste gia' una preview reale e usabile
- usa manifest, config e compose route
- permette di validare parte dell'esperienza

Problemi attuali:
- componente troppo monolitico
- dipende da route legacy diverse
- mischia bootstrap, composition, player e map view

Direzione target:
- la preview deve diventare un vero consumer di:
  - `Project App Definition`
  - `Capability Snapshot`
  - `Theme Pack`
  - `Runtime Manifest`

Regola:
- non reimplementare nella preview logiche di composizione o entitlement

## App Expo attuale: punti forti e problemi

### Bootstrap e configurazione
Touchpoint:
- [mobile/AppConfig.json](/Users/tommycinti/Documents/toolia/mobile/AppConfig.json)
- [mobile/src/lib/api.ts](/Users/tommycinti/Documents/toolia/mobile/src/lib/api.ts)
- [mobile/src/hooks/useManifest.ts](/Users/tommycinti/Documents/toolia/mobile/src/hooks/useManifest.ts)
- [mobile/src/store/appStore.ts](/Users/tommycinti/Documents/toolia/mobile/src/store/appStore.ts)

Punti forti:
- bootstrap semplice e leggibile
- store locale gia' presente
- manifest caching di base gia' presente

Problemi attuali:
- `AppConfig.json` e' troppo vicino a config hardcoded
- `manifest` e `composedVisit` sono concetti legacy troppo grezzi
- store e hook conoscono shape v1, non contratti canonici

Direzione target:
- `AppConfig.json` deve diventare solo bootstrap pointer o dev bootstrap minimale
- i dati veri devono arrivare da:
  - `Project App Definition`
  - `Runtime Manifest`
  - `Session Bundle`

### Visitor flow v1
Touchpoint:
- [mobile/app/(tabs)/index.tsx](/Users/tommycinti/Documents/toolia/mobile/app/(tabs)/index.tsx)
- [mobile/app/visit-wizard.tsx](/Users/tommycinti/Documents/toolia/mobile/app/visit-wizard.tsx)
- [mobile/app/composed-visit.tsx](/Users/tommycinti/Documents/toolia/mobile/app/composed-visit.tsx)
- [mobile/app/(tabs)/map.tsx](/Users/tommycinti/Documents/toolia/mobile/app/(tabs)/map.tsx)

Ruolo attuale:
- home/welcome
- wizard di interesse e durata
- visita composta
- mappa separata

Ruolo target:
- consumer del `Runtime Manifest`
- UX coerente con [step7.md](/Users/tommycinti/Documents/toolia/docs/plans/step7.md), [step11.md](/Users/tommycinti/Documents/toolia/docs/plans/step11.md) e [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md)

Regola:
- non rifondare queste schermate da zero prima di avere il contratto bootstrap e il manifest target

## Mappa file -> concetto target

### `Project App Definition`
File attuali rilevanti:
- [src/app/api/projects/[id]/app-config/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/app-config/route.ts)
- [src/components/app-configurator.tsx](/Users/tommycinti/Documents/toolia/src/components/app-configurator.tsx)
- [mobile/AppConfig.json](/Users/tommycinti/Documents/toolia/mobile/AppConfig.json)

File target raccomandati:
- `src/lib/contracts/project-app-definition.ts`
- `src/lib/builders/project-app-definition.ts`
- `src/app/api/projects/[id]/app-definition/route.ts`

Regola:
- il route handler non deve assemblare la shape finale inline
- deve chiamare un builder condiviso e validato

### `Capability Snapshot`
File attuali rilevanti:
- [src/app/api/projects/[id]/app-config/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/app-config/route.ts)
- [src/components/app-configurator.tsx](/Users/tommycinti/Documents/toolia/src/components/app-configurator.tsx)

File target raccomandati:
- `src/lib/contracts/capability-snapshot.ts`
- `src/lib/builders/capability-snapshot.ts`

### `Theme Pack`
File attuali rilevanti:
- [src/components/theme-builder.tsx](/Users/tommycinti/Documents/toolia/src/components/theme-builder.tsx)
- [src/components/theme-provider.tsx](/Users/tommycinti/Documents/toolia/src/components/theme-provider.tsx)
- [mobile/src/theme/index.ts](/Users/tommycinti/Documents/toolia/mobile/src/theme/index.ts)
- [mobile/src/theme/ThemeProvider.tsx](/Users/tommycinti/Documents/toolia/mobile/src/theme/ThemeProvider.tsx)

File target raccomandati:
- `src/lib/contracts/theme-pack.ts`
- `src/lib/builders/theme-pack.ts`

Regola:
- evitare sistemi di tema separati tra web preview e Expo

### `Project Delivery Pack`
File attuali rilevanti:
- [src/app/api/projects/[id]/app-manifest/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/app-manifest/route.ts)
- [src/app/api/projects/[id]/export/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/export/route.ts)

File target raccomandati:
- `src/lib/contracts/project-delivery-pack.ts`
- `src/lib/builders/project-delivery-pack.ts`

### `Runtime Manifest`
File attuali rilevanti:
- [src/app/api/projects/[id]/visit/compose/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/compose/route.ts)
- [mobile/src/store/appStore.ts](/Users/tommycinti/Documents/toolia/mobile/src/store/appStore.ts)
- [mobile/app/composed-visit.tsx](/Users/tommycinti/Documents/toolia/mobile/app/composed-visit.tsx)
- [src/app/preview/[projectId]/page.tsx](/Users/tommycinti/Documents/toolia/src/app/preview/[projectId]/page.tsx)

File target raccomandati:
- `src/lib/contracts/runtime-manifest.ts`
- `src/lib/builders/session-visit-plan.ts`
- `src/lib/builders/runtime-manifest.ts`
- `src/app/api/projects/[id]/visit/runtime/route.ts`

Regola:
- il `Runtime Manifest` va costruito lato piattaforma
- preview e mobile devono solo consumarlo

## Regole strutturali per nuove implementazioni

### 1. Non costruire JSON canonici dentro i route handler
I route handler devono:
- fare auth e validazione input
- chiamare builder o service
- serializzare la risposta

Non devono:
- contenere tutta la logica di shape building
- diventare il posto dove nasce la verita' del contratto

### 2. Non usare il client come adapter del legacy
Se un contratto legacy va tradotto:
- fare l'adapter lato piattaforma
- non distribuire la traduzione tra preview e Expo

### 3. Non espandere `AppConfig.json` come source of truth
`mobile/AppConfig.json` deve restare:
- bootstrap minimo
- dev convenience
- eventuale puntatore a progetto/endpoint

Non deve diventare:
- storage principale di capability
- storage principale di tema
- storage principale di UX rules

### 4. Non migrare tutto in una volta
La regola corretta e':
- introdurre builder e contratti target
- mantenere adapter legacy temporanei
- spostare i consumer uno per volta
- rimuovere legacy solo dopo stabilizzazione

## Sequenza concreta raccomandata nel repo

### Passo 1
Introdurre i file builder/contract per:
- `Project App Definition`
- `Capability Snapshot`
- `Theme Pack`

### Passo 2
Creare endpoint o export target che usino quei builder.

### Passo 3
Far leggere quei contratti alla preview web.

### Passo 4
Far leggere gli stessi contratti alla app Expo.

### Passo 5
Solo dopo introdurre `Runtime Manifest` e `Session Bundle`.

### Passo 6
Solo dopo rendere capability-aware assistant, family e connected assist.

## Safe zones e risky zones

### Safe zones per primi lavori
- nuovi file sotto `src/lib/contracts`
- nuovi file sotto `src/lib/builders`
- nuovi endpoint dedicati ai contratti target
- documentazione in `/docs/specs`

### Risky zones
- [mobile/src/store/appStore.ts](/Users/tommycinti/Documents/toolia/mobile/src/store/appStore.ts)
- [mobile/src/lib/api.ts](/Users/tommycinti/Documents/toolia/mobile/src/lib/api.ts)
- [src/app/preview/[projectId]/page.tsx](/Users/tommycinti/Documents/toolia/src/app/preview/[projectId]/page.tsx)
- [src/app/api/projects/[id]/visit/compose/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/compose/route.ts)

Perche':
- sono gia' collegati a un flow usabile
- piccoli cambi locali possono rompere tutta la catena
- vanno toccati con adapter e migrazioni progressive, non con refactor cieco

## Checklist prima di toccare il codice
- il concetto esiste gia' in [DATA_MODEL.md](/Users/tommycinti/Documents/toolia/docs/specs/DATA_MODEL.md)?
- lo stato esiste gia' in [STATE_MACHINE.md](/Users/tommycinti/Documents/toolia/docs/specs/STATE_MACHINE.md)?
- il contratto esiste gia' in [PROJECT_APP_DEFINITION.md](/Users/tommycinti/Documents/toolia/docs/specs/PROJECT_APP_DEFINITION.md) o [RUNTIME_CONTRACTS.md](/Users/tommycinti/Documents/toolia/docs/specs/RUNTIME_CONTRACTS.md)?
- il builder deve vivere in piattaforma, non nel client?
- il consumer da aggiornare e' preview, Expo o entrambi?
- esiste un fallback legacy temporaneo?

## Formula chiave
`I contratti nascono nella piattaforma, i client li consumano, il legacy si adatta ma non detta la direzione.`
