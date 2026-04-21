# IMPLEMENTATION_GUIDE_FOR_LLMS

## Scopo
Questo documento serve a guidare lo sviluppo successivo anche quando viene eseguito da:
- LLM meno evoluti
- agenti con contesto parziale
- sviluppatori che entrano piu' tardi nel progetto

L'obiettivo non e' spiegare tutto da zero.
L'obiettivo e' ridurre al minimo le interpretazioni arbitrarie.

## Regola principale
Non implementare una feature partendo solo da:
- intuizione
- nome del file
- struttura attuale del repo

Prima leggere sempre:
1. gli step rilevanti in `/docs/plans`
2. [SPEC_INDEX.md](/Users/tommycinti/Documents/toolia/docs/specs/SPEC_INDEX.md)
3. [ARCHITECTURE_AND_TECH_STACK.md](/Users/tommycinti/Documents/toolia/docs/specs/ARCHITECTURE_AND_TECH_STACK.md)
4. [PROJECT_APP_DEFINITION.md](/Users/tommycinti/Documents/toolia/docs/specs/PROJECT_APP_DEFINITION.md)
5. [DEVELOPMENT_AND_QUALITY_METHOD.md](/Users/tommycinti/Documents/toolia/docs/specs/DEVELOPMENT_AND_QUALITY_METHOD.md)

## Ordine di lavoro raccomandato

### 1. Capire il layer
Chiedersi sempre:
- e' platform?
- e' preview web?
- e' app Expo?
- e' contratto condiviso?
- e' contenuto?
- e' runtime?

### 2. Identificare i contratti
Chiedersi:
- quali oggetti canonici tocca?
- quale capability coinvolge?
- quali step di progetto la governano?

### 3. Cambiare il minimo layer necessario
Non implementare la stessa logica in piu' punti se puo' stare in un contratto unico.

### 4. Verificare gli impatti
Ogni modifica va valutata rispetto a:
- offline-first
- session-start composition
- family mode
- assistant verticale
- capability model
- preview web vs native

## Cose da non fare

### Non inventare nuovi concetti se esistono gia'
Usare i termini gia' definiti:
- `Project App Definition`
- `Runtime Manifest`
- `Session Bundle`
- `Visit Assistant Pack`
- `Family Overlay Schedule`
- `Project Capability Matrix`

### Non accorpare layer diversi
Non confondere:
- configurazione progetto
- stato di sessione
- contenuto pubblicato
- export per client

### Non spostare il source of truth nei client
Web preview e app Expo consumano configurazione e bundle.
Non diventano il luogo dove si definisce il progetto.

### Non introdurre dipendenze live per il core della visita
Il sistema e':
- offline-first
- session-start composition

### Non creare forche di progetto
Un progetto deve essere:
- configurazione
- capability matrix
- theme/skin
- bundle

non una nuova app reimplementata.

## Domande da porsi prima di scrivere codice
- questa feature e' gia' descritta in uno step?
- e' una capability o solo un dettaglio UI?
- quale documento tecnico dovrebbe governarla?
- tocca anche web preview?
- tocca anche Expo?
- ha impatto su bundle, manifest o entitlement?
- serve un fallback offline?

## Domande da porsi prima di cambiare il database
- il concetto e' gia' rappresentato da un'entita' esistente?
- e' davvero persistente o solo derivato?
- serve al progetto, alla sessione o all'analytics?
- impatta esportazione verso i client?
- richiede aggiornare [DATA_MODEL.md](/Users/tommycinti/Documents/toolia/docs/specs/DATA_MODEL.md)?

## Domande da porsi prima di cambiare l'UX
- il pattern e' gia' canonico?
- e' capability-aware?
- rompe la coerenza tra preview e native?
- rompe il modello player-centric, route-aware?
- aumenta complessita' inutile?

## Metodo di implementazione raccomandato

### 1. Definire il contratto
Prima:
- shape dati
- responsabilita'
- stati

### 2. Implementare il layer centrale
Per esempio:
- export/config sul backend o piattaforma

### 3. Implementare i consumer
Poi:
- preview web
- app Expo

### 4. Aggiungere fallback e degradazioni
Non come afterthought.

### 5. Verificare con scenario reale
Almeno uno scenario:
- progetto
- capability attive
- lingua
- family o no
- online/offline

## Scenari minimi da coprire sempre
Ogni nuova feature importante dovrebbe essere pensata almeno per:
- progetto semplice, no premium, no family, no assistant
- progetto con assistant attivo
- progetto con family attivo
- progetto offline
- progetto con connected assist disponibile

## Se il dubbio e' tra due soluzioni
Preferire quella che:
- sposta meno logica nei client
- rispetta di piu' i contratti
- mantiene il source of truth nella piattaforma
- e' piu' compatibile con preview web e native
- degrada meglio offline

## Riferimenti principali
- [ARCHITECTURE_AND_TECH_STACK.md](/Users/tommycinti/Documents/toolia/docs/specs/ARCHITECTURE_AND_TECH_STACK.md)
- [PROJECT_APP_DEFINITION.md](/Users/tommycinti/Documents/toolia/docs/specs/PROJECT_APP_DEFINITION.md)
- [REPO_TOUCHPOINTS_AND_MIGRATION_MAP.md](/Users/tommycinti/Documents/toolia/docs/specs/REPO_TOUCHPOINTS_AND_MIGRATION_MAP.md)
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)
- [step9.md](/Users/tommycinti/Documents/toolia/docs/plans/step9.md)
- [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md)
- [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md)

## Formula chiave
`Prima il contratto, poi il layer centrale, poi i client, poi i fallback.`
