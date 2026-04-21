# Step 13 - Pipeline di prototipazione web, handoff nativo e delivery delle project app

## Scopo dello step
Questo step prende:
- il prodotto definito negli Step 1-12
- il workspace editoriale
- il runtime manifest
- il design system e il template app

e li trasforma in una pipeline concreta di delivery.

Qui non stiamo piu' decidendo solo:
- come funziona la visitor app
- come si configura un progetto

Stiamo decidendo:
- come la piattaforma genera un mockup web funzionante quasi completo
- come quel mockup viene usato per testare contenuti e interazioni
- come si arriva a una app iOS/Android tramite Expo
- quali artefatti devono essere prodotti per lanciare il dev
- come la piattaforma resta il centro di gestione contenuti per tutte le app progetto

## Problema strategico che risolve
Se il flusso di delivery non e' esplicito, il rischio e' questo:
- si testa una cosa sul web e se ne implementa un'altra sul mobile
- il mockup resta una demo, non una base reale
- l'handoff verso il team mobile diventa manuale e ambiguo
- ogni progetto genera una nuova app poco governabile
- la piattaforma e la app divergono sui contratti

In una frase:

`senza una pipeline canonica, il mockup web e la app nativa diventano due prodotti diversi`

## Decisione di fondo dello step
La scelta forte e' questa:

`la piattaforma genera prima una project web app quasi completa per testing`
`poi la stessa definizione di progetto alimenta la app nativa Expo`

Quindi:
- il mockup web non e' una demo separata
- e' una preview funzionale del prodotto
- il mobile non riparte da zero
- nasce dalla stessa sorgente strutturale

## Principi guida dello step

### 1. One source of truth
Strategia, contenuti, runtime e capability devono vivere nella piattaforma, non nel mockup e non nella app nativa.

### 2. Web first for validation
La validazione di:
- contenuti
- flussi
- family mode
- assistant
- design/theme

deve avvenire prima sul mockup web funzionante.

### 3. Native second for delivery quality
La app nativa esiste per:
- qualità mobile reale
- accesso a funzioni device
- distribuzione iOS/Android
- performance e packaging finale

non per ridefinire il prodotto.

### 4. Shared contracts
Web mockup e app Expo devono leggere gli stessi contratti:
- contenuto
- runtime
- entitlements
- capability
- theming

### 5. Project app as configuration, not custom codebase
Ogni app progetto deve essere il piu' possibile una configurazione o skin di una stessa architettura, non una nuova app costruita ogni volta da zero.

## Le tre superfici del delivery
Questo step deve distinguere chiaramente tre oggetti.

### 1. `Project Web Preview App`
Mockup funzionante quasi completo, usato per:
- review interna
- review cliente
- testing contenuti
- testing UX
- testing family/assistant

### 2. `Native Project App`
App iOS/Android realizzata tramite Expo, coerente con la preview ma ottimizzata per il device e la distribuzione.

### 3. `Content Platform`
Sistema centrale che:
- produce
- versiona
- pubblica
- aggiorna

i contenuti e i contratti letti dalle app progetto.

## Project Web Preview App
La preview web deve essere abbastanza reale da testare:
- contenuti
- flussi principali
- capability attive
- design/theme
- behavior del player
- behavior assistant
- behavior family

Non deve essere un semplice mockup statico.

### Obiettivo
Far emergere prima:
- problemi editoriali
- problemi di interaction model
- problemi di density
- incoerenze di stato
- problemi di theming

prima di entrare nel costo del mobile nativo.

## Native Project App
La app nativa non dovrebbe ridefinire il prodotto.
Dovrebbe:
- implementare i contratti gia' validati
- aggiungere qualità mobile reale
- gestire device capabilities e distribuzione

### Target tecnico
La direzione indicata e':
- sviluppo iOS/Android tramite Expo

Quindi l'handoff non deve essere un PDF o una descrizione.
Deve produrre artefatti che permettano al team di:
- lanciare il dev
- collegarsi al backend contenuti
- caricare la configurazione del progetto

## Content Platform
La piattaforma resta il centro del sistema.

Deve continuare a gestire:
- contenuti
- versioni
- capability
- runtime manifests
- theme/project skin
- entitlement
- analytics

La app progetto non deve diventare il luogo in cui si "configura" il contenuto.
La app lo consuma.

## Artefatti di handoff
Questo step deve fissare quali artefatti servono davvero per passare dal progetto approvato al dev nativo.

### Artefatti minimi consigliati
- `Project App Definition`
- `Project Runtime Bundle`
- `Project Theme Pack`
- `Project Capability Snapshot`
- `Project Delivery Endpoint Config`
- `Expo App Dev Starter`

## Project App Definition
Questo e' l'oggetto piu' importante del passaggio.

Deve essere il file o set minimo di file che descrive:
- identita' del progetto
- capability attive
- lingua/e disponibili
- routing e schermate abilitate
- theme/skin
- asset principali
- moduli attivi
- endpoint da cui recuperare i contenuti

In pratica:
- la piattaforma deve poter generare un `Project App Definition`
- e il client web preview e la app Expo devono poterlo leggere

## Expo App Dev Starter
Dato il target dichiarato, il punto di arrivo tecnico del progetto deve includere un artefatto che permetta di partire con il dev nativo.

Questo artefatto non deve essere una descrizione manuale.
Deve essere qualcosa di eseguibile dal team.

A livello concettuale dovrebbe includere almeno:
- riferimento al progetto
- config di bootstrap
- environment binding
- endpoint contenuti/runtime
- theme pack
- capability snapshot

L'obiettivo e' arrivare a:
- un file o set minimo necessario per lanciare il dev della project app

## Shared contracts tra web e native
Per evitare divergenze, web preview e native app devono condividere almeno:
- `Runtime Manifest`
- `Visit Assistant Pack`
- `Project Capability Matrix`
- `Session Entitlement Snapshot`
- `Theme Contract`
- `Project App Definition`

Questo non significa che il rendering debba essere identico pixel per pixel.
Significa che la logica e i contratti devono essere gli stessi.

## Handoff gates
Il passaggio da web preview a native dev non dovrebbe essere automatico senza condizioni.

### Gate minimi
- contenuti approvati
- family mode approvato se attivo
- assistant approvato se attivo
- theme/skin approvati
- testing principale su web completato
- runtime bundle coerente
- capability snapshot approvato

Solo a quel punto si passa alla fase nativa.

## Cosa va testato nel web mockup
Il mockup web deve coprire soprattutto:
- session start
- readiness states
- route awareness
- player flow
- map interaction minima
- assistant
- family overlay
- unlock / entitlement UX
- lingue
- stati offline/connected simulati

## Cosa va validato ancora sul native
Anche con una preview forte, il mobile nativo dovra' ancora validare:
- behavior audio reale
- background / interruption handling
- permission model
- camera scan / QR
- cache locale
- offline bundle
- performance su device
- packaging iOS/Android

Quindi il web mockup riduce il rischio, ma non sostituisce completamente il test nativo.

## Multi-project architecture
Questo step suggerisce una direzione architetturale forte:

`una piattaforma centrale`
`un template app comune`
`piu' project app come configurazioni`

Questo modello e' preferibile a:
- app completamente riscritte progetto per progetto
- backend scollegati
- contenuti duplicati tra web e mobile

## Workspace impact
Il workspace Toolia deve supportare anche questo passaggio.

Quindi dovrebbe poter:
- generare la web preview del progetto
- mostrare stato di preview
- approvare l'handoff
- generare o esportare il `Project App Definition`
- vedere la readiness per Expo/native handoff

## Versioning del passaggio
Il passaggio web -> native non deve essere opaco.

Bisogna poter sapere:
- quale versione del progetto e' stata usata per la preview
- quale versione e' stata consegnata al dev mobile
- se la preview e la native app leggono la stessa definizione

## Cosa non deve fare questo step
Questo step non deve ancora:
- descrivere i dettagli del codice Expo
- scegliere la struttura di repo finale
- sostituire il piano di implementazione tecnico

Serve a fissare la pipeline di delivery e gli artefatti canonici.

## Output dello step
Gli output minimi di questo step dovrebbero essere:
- `Project Web Preview App Model`
- `Native Project App Handoff Model`
- `Project App Definition Contract`
- `Project Runtime Bundle Export Model`
- `Project Theme Pack Export Model`
- `Project Capability Snapshot Export Model`
- `Expo App Dev Starter Contract`
- `Web-to-Native Handoff Gate Model`
- `Cross-Client Shared Contract Set`

## Quando si chiude davvero lo step
Lo Step 13 si chiude quando:
- e' chiaro che la preview web e la app nativa fanno parte della stessa pipeline
- esiste un artefatto canonico di definizione progetto
- il passaggio a Expo/native non dipende da handoff verbali
- la piattaforma resta il centro unico della gestione contenuti e configurazione

## Traduzione implementativa minima
Questo step dovrebbe lasciare almeno questi artefatti operativi:
- `Project Web Preview App`
- `Project App Definition`
- `Capability Snapshot`
- `Theme Pack`
- `Expo App Dev Starter`
- `Handoff Gate Checklist`

Regole forti per l'implementazione:
- il web mockup deve essere abbastanza reale da validare flussi, contenuti e capability, non solo lo stile
- il passaggio a Expo deve partire da file o contratti espliciti e non da istruzioni verbali
- i client web e native devono condividere la stessa semantica di bootstrap, tema e capability
- i progetti devono restare configurazioni e bundle, non nuove codebase separate

Anti-pattern da evitare:
- usare la preview come demo scollegata dal contratto reale
- rifare in Expo le decisioni gia' prese e testate nel web mockup
- trattare l'handoff come semplice export di contenuti senza config e runtime shared

## Formula chiave dello step
`Prima validiamo una project web app quasi completa, poi la stessa definizione alimenta la app nativa Expo.`

## Cosa prepara dopo
A questo punto il framework di prodotto e' sostanzialmente completo.

Il passo successivo piu' utile non e' un altro step concettuale, ma l'applicazione concreta dei documenti implementativi trasversali gia' definiti:
- `DATA_MODEL.md`
- `STATE_MACHINE.md`
- `RUNTIME_CONTRACTS.md`
- `PROJECT_APP_DEFINITION.md`
- `IMPLEMENTATION_PLAN.md`

Da qui in poi il lavoro dovrebbe spostarsi su:
- contratti reali nel codice
- builder lato piattaforma
- preview web come consumer reale
- Expo app come consumer reale
