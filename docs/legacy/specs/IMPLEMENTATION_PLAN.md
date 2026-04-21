# IMPLEMENTATION_PLAN

## Scopo
Questo documento traduce i piani e le specs in un percorso di sviluppo concreto.

Serve a:
- ordinare il lavoro
- evitare di implementare layer fuori sequenza
- dare priorita' chiare
- guidare sia sviluppo umano sia sviluppo assistito da LLM

Formula chiave:

`prima stabilizziamo i contratti, poi costruiamo i client, poi aggiungiamo ricchezza`

## Regola generale
Non cercare di portare tutto il modello target in produzione in un'unica tranche.

Il sistema va sviluppato a strati:
1. contratti e modelli condivisi
2. export e bootstrap
3. preview web coerente
4. app Expo coerente
5. capability avanzate
6. osservabilita' e tuning

## Obiettivi complessivi
Gli obiettivi da raggiungere sono:
- piattaforma centrale come source of truth
- project web preview quasi completa per testing
- app Expo che consuma gli stessi contratti
- runtime offline-first coerente
- capability model governabile
- percorso di release e iterazione sostenibile

## Stato avanzamento (20 marzo 2026)
Sintesi reale rispetto alle tranche:

- `Tranche 0`: completata (framework documentale consolidato)
- `Tranche 1`: completata (mappa legacy vs target chiarita)
- `Tranche 2`: avanzata (Project App Definition + endpoint)
- `Tranche 3`: avanzata (Capability Snapshot introdotto)
- `Tranche 4`: avanzata (Theme Pack introdotto e consumato)
- `Tranche 5`: avviata (Runtime Manifest v1 introdotto)
- `Tranche 6`: avviata (preview usa bootstrap canonico)
- `Tranche 7`: avviata (Expo bootstrap su contratti canonici)
- `Tranche 8+`: non ancora avviate in forma canonica completa

Riferimenti implementativi principali:
- [src/lib/contracts/project-app-definition.ts](/Users/tommycinti/Documents/toolia/src/lib/contracts/project-app-definition.ts)
- [src/lib/contracts/capability-snapshot.ts](/Users/tommycinti/Documents/toolia/src/lib/contracts/capability-snapshot.ts)
- [src/lib/contracts/theme-pack.ts](/Users/tommycinti/Documents/toolia/src/lib/contracts/theme-pack.ts)
- [src/lib/contracts/runtime-manifest.ts](/Users/tommycinti/Documents/toolia/src/lib/contracts/runtime-manifest.ts)
- [src/app/api/projects/[id]/visit/runtime/route.ts](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/runtime/route.ts)
- [mobile/src/hooks/useRuntimeBootstrap.ts](/Users/tommycinti/Documents/toolia/mobile/src/hooks/useRuntimeBootstrap.ts)
- [mobile/app/visit-wizard.tsx](/Users/tommycinti/Documents/toolia/mobile/app/visit-wizard.tsx)

## Coda interventi immediata (sequenziale)
Ordine raccomandato per evitare regressioni:

1. hardening `visit/runtime` (validazioni, taxonomy errori, telemetry minima)
2. evoluzione store mobile da `composedVisit` a session state canonico
3. introduzione `Session Bundle` v1 con readiness gate offline
4. migrazione preview al consumo runtime-first completo
5. integrazione runtime di assistant pack e family overlay schedule

## Sequenza raccomandata

### Tranche 0 - Preparazione e allineamento documentale
Obiettivo:
- congelare il linguaggio comune prima del coding profondo

Deliverable:
- [SPEC_INDEX.md](/Users/tommycinti/Documents/toolia/docs/specs/SPEC_INDEX.md)
- [ARCHITECTURE_AND_TECH_STACK.md](/Users/tommycinti/Documents/toolia/docs/specs/ARCHITECTURE_AND_TECH_STACK.md)
- [IMPLEMENTATION_GUIDE_FOR_LLMS.md](/Users/tommycinti/Documents/toolia/docs/specs/IMPLEMENTATION_GUIDE_FOR_LLMS.md)
- [DEVELOPMENT_AND_QUALITY_METHOD.md](/Users/tommycinti/Documents/toolia/docs/specs/DEVELOPMENT_AND_QUALITY_METHOD.md)
- [PROJECT_APP_DEFINITION.md](/Users/tommycinti/Documents/toolia/docs/specs/PROJECT_APP_DEFINITION.md)
- [DATA_MODEL.md](/Users/tommycinti/Documents/toolia/docs/specs/DATA_MODEL.md)
- [STATE_MACHINE.md](/Users/tommycinti/Documents/toolia/docs/specs/STATE_MACHINE.md)
- [RUNTIME_CONTRACTS.md](/Users/tommycinti/Documents/toolia/docs/specs/RUNTIME_CONTRACTS.md)
- [REPO_TOUCHPOINTS_AND_MIGRATION_MAP.md](/Users/tommycinti/Documents/toolia/docs/specs/REPO_TOUCHPOINTS_AND_MIGRATION_MAP.md)

Stato:
- gia' avviata

## Tranche 1 - Stabilizzare il v1 esistente
Obiettivo:
- capire e consolidare l'export/config gia' presente senza romperlo

Repo target:
- [schema.prisma](/Users/tommycinti/Documents/toolia/prisma/schema.prisma)
- [app-config route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/app-config/route.ts)
- [export route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/export/route.ts)
- [app-configurator.tsx](/Users/tommycinti/Documents/toolia/src/components/app-configurator.tsx)

Lavori:
- mappare esplicitamente il v1 attuale sui concetti canonici
- documentare quali shape sono legacy
- evitare nuove feature basate direttamente su shape ambigue
- introdurre naming piu' chiaro dove possibile senza migrazione distruttiva

Done quando:
- e' chiaro cosa nel repo e' `v1 legacy`
- e' chiaro cosa diverge dal modello target
- il team sa quali route usare come base temporanea

## Tranche 2 - Introdurre Project App Definition
Obiettivo:
- avere un contratto bootstrap canonico per preview e Expo

Deliverable:
- endpoint o export reale di `project.app-definition.json`
- export di `project.capability-snapshot.json`
- export di `project.theme-pack.json` o shape equivalente
- config environment-aware

Lavori:
- definire schema JSON iniziale
- creare builder lato platform
- permettere lettura del contratto da parte di una preview web
- permettere lettura del contratto da parte della app Expo

Priorita':
- alta

Done quando:
- un progetto esporta un `Project App Definition`
- web preview e Expo possono bootstrapparsi da quello

## Tranche 3 - Capability model minimo operativo
Obiettivo:
- rendere la configurazione di progetto esplicita, almeno nei casi principali

Capability minime da supportare:
- `audio_base`
- `personalization`
- `family_overlay`
- `visit_assistant`
- `connected_assist`

Lavori:
- scegliere dove persistere il modello iniziale
  - JSON in `Project.settings_json`
  - JSON in `AppConfig.config_json`
  - o tabella dedicata, se sostenibile
- esporre capability snapshot nel `Project App Definition`
- rendere capability-aware almeno:
  - web preview
  - Expo bootstrap

Done quando:
- le capability attive non sono piu' implicite
- i client non mostrano moduli non supportati

## Tranche 4 - Theme pack e template export
Obiettivo:
- unificare design system e project skin in un export consumabile

Deliverable:
- `Project Theme Pack` o shape equivalente
- semantic token set
- module variants minime

Lavori:
- definire export di branding/theme coerente con [step11.md](/Users/tommycinti/Documents/toolia/docs/plans/step11.md)
- evitare configurazioni visive solo lato Expo
- usare lo stesso theme pack in preview e native

Done quando:
- la preview web e l'app Expo leggono la stessa base di tema

## Tranche 5 - Runtime contracts v1
Obiettivo:
- introdurre i primi contratti runtime oltre l'export contenutistico v1

Contratti minimi della tranche:
- `Project Delivery Pack`
- `Session Visit Plan`
- `Runtime Manifest`
- `Session Bundle` minimo

Lavori:
- definire gli endpoint o builder di questi contratti
- usare inizialmente il modello attuale di contenuti, senza aspettare tutte le entita' target nuove
- introdurre session-start composition almeno in forma base
- permettere al client di leggere un `Runtime Manifest`

Done quando:
- la sessione non viene piu' costruita implicitamente nel client
- esiste un manifesto eseguibile

## Tranche 6 - Web preview reale
Obiettivo:
- trasformare la preview in client reale del sistema

Lavori:
- costruire una `Project Web Preview App` che usa:
  - `Project App Definition`
  - `Runtime Manifest`
  - capability snapshot
  - theme pack
- validare:
  - start session
  - player
  - route awareness
  - assistant se attivo
  - family overlay se attivo
  - premium unlock se attivo

Done quando:
- la preview non e' piu' una simulazione scollegata
- il cliente puo' testare davvero i flussi principali sul web

## Tranche 7 - Expo bootstrap e allineamento client
Obiettivo:
- fare in modo che la app Expo parta dalla stessa definizione progetto

Repo target:
- [mobile/package.json](/Users/tommycinti/Documents/toolia/mobile/package.json)
- [mobile/app.config.ts](/Users/tommycinti/Documents/toolia/mobile/app.config.ts)

Lavori:
- collegare Expo a `Project App Definition`
- definire bootstrap env/project_ref
- leggere theme pack e capability snapshot
- montare le superfici in modo capability-aware

Done quando:
- l'app Expo non dipende da configurazioni manuali sparse
- puo' avviarsi su un progetto specifico con un bootstrap chiaro

## Tranche 8 - Offline-first bundle e stato locale
Obiettivo:
- rendere reale il modello offline-first

Lavori:
- introdurre `Session Bundle`
- persistenza locale stato sessione
- readiness gate
- resume/rejoin locale
- sync differito

Tecnologie da usare:
- `expo-file-system`
- `react-native-mmkv`
- `@react-native-community/netinfo`

Done quando:
- una sessione puo' partire e proseguire senza rete sui contenuti essenziali

## Tranche 9 - Activation model multi-trigger
Obiettivo:
- implementare attivazione POI/contenuti robusta e non dipendente da un solo canale

Canali minimi:
- GPS
- QR
- manual

Canali successivi:
- visual scan
- code activation

Done quando:
- la app puo' funzionare bene in geo-native, local-map-native e hybrid

## Tranche 10 - Assistant verticale v1
Obiettivo:
- introdurre l'assistant in forma bounded e situata

Lavori:
- `Assistant Answer Base Set`
- `Visit Assistant Pack`
- entry point in preview e Expo
- perimetro offline minimo
- perimetro connected assist opzionale

Done quando:
- l'assistant risponde entro il progetto e il punto corrente
- non e' una chat generica

## Tranche 11 - Family overlay v1
Obiettivo:
- introdurre il family mode come layer episodico sul tour comune

Lavori:
- `Family Overlay Pack`
- `Family Overlay Schedule`
- UI missioni su preview e Expo
- rhythm model minimo

Done quando:
- il family mode esiste senza creare un secondo tour parallelo

## Tranche 12 - Observability e issue loop
Obiettivo:
- chiudere il cerchio post-pubblicazione

Lavori:
- session event model
- project health signals
- assistant insights
- family insights
- issue register
- release version log

Done quando:
- le sessioni reali generano segnali utili per migliorare il progetto

## Refactoring di schema consigliati
Non tutto subito.

### Prima wave
Si puo' restare su:
- `Project`
- `Path`
- `POI`
- `Scheda`
- `AudioAsset`
- `AppConfig`

aggiungendo export e contratti condivisi.

### Seconda wave
Introdurre in persistenza, quando serve davvero:
- capability matrix piu' esplicita
- assistant answer units
- family missions
- visual assets
- visit sessions
- entitlements

### Terza wave
Introdurre il layer spaziale avanzato:
- route nodes
- segments
- session bundle/runtime tables se necessario

## Ordine di priorita' raccomandato
Se bisogna scegliere, l'ordine giusto e':

1. `Project App Definition`
2. `Capability Snapshot`
3. `Theme Pack`
4. `Runtime Manifest`
5. `Web Preview`
6. `Expo bootstrap`
7. `Session Bundle offline`
8. `Assistant`
9. `Family`
10. `Analytics/ops`

## Criteri di done per tranche
Una tranche non e' fatta quando:
- il codice esiste
- o la demo funziona una volta

E' fatta quando:
- il contratto e' esplicito
- preview e native sono coerenti se coinvolti
- esiste almeno un fallback
- capability on/off e' gestita
- e' chiaro cosa e' legacy e cosa e' target

## Regole per LLM meno evoluti
Quando si implementa una tranche:
- non saltare a una tranche successiva senza i prerequisiti
- non aggiungere nuove entita' fuori dal `DATA_MODEL`
- non aggiungere nuovi status fuori dalla `STATE_MACHINE`
- non spostare la logica nel client se puo' stare in un contratto
- non introdurre nuove route/export senza legarle ai documenti canonici

## Deliverable finali attesi
Il percorso implementativo dovrebbe arrivare a:
- piattaforma editoriale coerente
- preview web quasi completa e testabile
- app Expo bootstrapabile per progetto
- runtime offline-first reale
- capability model governabile
- loop di manutenzione e osservabilita'

## Cosa fare subito
Le prossime mosse piu' sensate sono:
1. implementare `Project App Definition`
2. estrarre `Capability Snapshot`
3. definire `Theme Pack`
4. progettare il primo `Runtime Manifest`

## Formula chiave
`Contratti prima, preview poi, native dopo, ricchezza avanzata solo quando il backbone e' stabile.`
