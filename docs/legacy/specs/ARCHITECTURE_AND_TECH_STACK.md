# ARCHITECTURE_AND_TECH_STACK

## Scopo
Questo documento fissa:
- stack reale del repository
- direzione architetturale target
- vincoli tecnologici da non reinventare

Serve soprattutto a evitare che LLM o sviluppatori introducano:
- stack paralleli
- duplicazioni di responsabilita'
- client divergenti
- scorciatoie incoerenti con il modello di prodotto

## Stack reale del repository

### Root platform / web
Dal repo attuale risulta:
- `Next.js 16`
- `React 19`
- `TypeScript`
- `Prisma`
- `PostgreSQL`
- `NextAuth`
- `Tailwind CSS 4`
- mapping e geolayer con librerie come:
  - `leaflet`
  - `react-leaflet`
  - `@react-google-maps/api`

Riferimenti:
- [package.json](/Users/tommycinti/Documents/toolia/package.json)
- [next.config.ts](/Users/tommycinti/Documents/toolia/next.config.ts)
- [prisma/schema.prisma](/Users/tommycinti/Documents/toolia/prisma/schema.prisma)

### Mobile / native app
Nel repo esiste gia' un'app mobile separata:
- `Expo 55`
- `expo-router`
- `React Native 0.83`
- `Zustand`
- `react-native-mmkv`
- `expo-audio`
- `expo-camera`
- `expo-location`
- `@react-native-community/netinfo`
- `react-native-maps`

Riferimenti:
- [mobile/package.json](/Users/tommycinti/Documents/toolia/mobile/package.json)
- [mobile/app.config.ts](/Users/tommycinti/Documents/toolia/mobile/app.config.ts)

## Direzione architetturale target
La direzione del sistema deve essere questa:

### 1. Content Platform centrale
La piattaforma centrale:
- crea
- valida
- versiona
- pubblica

i dati e i contratti del progetto.

### 2. Project Web Preview App
La piattaforma deve poter generare o montare una preview web quasi completa del progetto per testing e review.

### 3. Native Project App via Expo
La app nativa iOS/Android legge gli stessi contratti fondamentali della preview web.

### 4. Shared contracts
I client devono condividere almeno:
- `Project App Definition`
- `Runtime Manifest`
- `Visit Assistant Pack`
- `Project Capability Matrix`
- `Theme Contract`

## One source of truth
La verita' del progetto deve restare nella piattaforma.

I client:
- non definiscono il contenuto
- non definiscono le capability
- non ridefiniscono il runtime

I client consumano:
- configurazione
- bundle
- manifest
- theme pack

## Responsabilita' per layer

### Piattaforma web
Responsabile di:
- authoring
- review
- configuration
- export
- preview
- publishing
- analytics

### Preview web
Responsabile di:
- validazione rapida del progetto
- review cliente
- test dei flussi principali

### App Expo
Responsabile di:
- esperienza mobile reale
- device integration
- distribuzione iOS/Android
- esecuzione runtime sul campo

## Vincoli architetturali da non rompere

### 1. No duplicated business logic
La logica di:
- capability
- entitlement
- routing runtime
- family overlay
- assistant scope

non deve essere reimplementata in modo divergente tra web e mobile.

### 2. No project-specific forks by default
I progetti devono essere:
- configurazioni
- skin
- bundle

non codebase separate.

### 3. Offline-first remains canonical
L'app mobile deve restare:
- offline-first
- connection-assisted, non connection-dependent

### 4. Session-start composition remains canonical
La visita viene composta a `session start`.
L'app in visita non ricalcola tutto continuamente.

### 5. Multi-trigger activation remains canonical
L'attivazione di contenuti/POI non deve dipendere da un solo meccanismo.

## Tecnologia raccomandata per ogni area

### Data and API
Restare su:
- Prisma
- PostgreSQL
- route handlers / API su Next

Non introdurre:
- un secondo backend parallelo
- un secondo ORM
- un secondo database primario

se non con motivazione molto forte.

### Web preview
Restare su:
- Next.js / React nel repo principale

Non creare una seconda app web separata solo per la preview se la stessa piattaforma puo' montarla.

### Native app
Restare su:
- Expo Router
- Expo modules gia' presenti
- MMKV per stato locale e cache veloce
- NetInfo per connected assist

### State management
Per mobile, preferire la direzione gia' presente:
- `Zustand` per stato app/sessione
- `MMKV` per persistenza locale

### Local storage and bundle
Per mobile, usare il set gia' coerente con Expo:
- `expo-file-system`
- `react-native-mmkv`

## Repo boundaries raccomandate

### Root
Piattaforma, API, editoring, export, preview.

### `/mobile`
App Expo nativa che consuma contratti e bundle di progetto.

### `/docs/plans`
Visione prodotto e processo.

### `/docs/specs`
Contratti tecnici, guardrail e documenti implementativi.

## Guardrail per LLM meno evoluti
Un modello meno evoluto non deve:
- introdurre un nuovo stack frontend per la preview
- introdurre un nuovo backend per il mobile
- spostare la logica di progetto nel client
- usare feature premium come semplice controllo UI senza entitlement reale
- creare fork di UX per progetto invece di usare theme/capability/config

## Checklist architetturale minima
Prima di implementare una feature, verificare:
- in quale layer vive davvero
- quale contratto la governa
- se deve comparire in platform, preview, native o tutti e tre
- se e' capability-aware
- se impatta offline-first
- se impatta session-start composition

## Formula chiave
`Una piattaforma centrale, una preview web reale, una app Expo nativa, contratti condivisi.`
