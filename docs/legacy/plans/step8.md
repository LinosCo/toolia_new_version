# Step 8 - UX/UI del workspace editoriale Toolia

## Scopo dello step
Questo step prende:
- il modello progettuale costruito negli Step 1-7
- gli oggetti canonici del progetto
- i layer spaziali, contenutistici, visuali e runtime

e li traduce nella superficie operativa con cui Toolia lavora davvero.

Qui non stiamo progettando l'esperienza del visitatore.
Stiamo progettando:
- come Toolia crea e governa un progetto
- come valida le proposte della piattaforma
- come corregge lo spazio, i contenuti e il runtime
- come arriva alla pubblicazione senza perdersi nella complessita'

## Problema strategico che risolve
Finora abbiamo definito un sistema ricco:
- strategia e fonti
- fondazione spaziale
- driver, personas e lenti
- architettura della visita
- contenuti modulari
- runtime
- visitor app

Ma tutto questo rischia di restare teorico se il `workspace editoriale` non permette a Toolia di:
- vedere la proposta della piattaforma
- capire cosa conta davvero
- correggere velocemente senza ricostruire tutto a mano
- approvare con fiducia

Il rischio piu' grande qui e' uno solo:

`trasformare Toolia in compilatore manuale di campi invece che in arbitro editoriale ad alto valore`

## Decisione di fondo dello step
La scelta forte e' questa:

`il workspace deve essere proposal-first, review-centric e map-aware`

Questo significa:
- la piattaforma propone
- Toolia non parte da zero quasi mai
- il lavoro umano si concentra sulle decisioni ad alto impatto
- le superfici devono mostrare prima la forma del progetto, poi il dettaglio

Il workspace non deve sembrare:
- un CMS tradizionale
- un pannello tecnico
- un database con molti tab

Deve sembrare:
- un sistema per disegnare, verificare e pubblicare una visita

## Principi guida dello step

### 1. Proposal-first
Ogni fase deve partire da una proposta leggibile della piattaforma.

### 2. Review before edit
Toolia deve prima capire cosa e' stato proposto, poi decidere dove intervenire.

### 3. Shape before detail
Prima:
- forma del luogo
- forma della visita
- forma del contenuto

Solo dopo:
- editing fine
- micro-correzioni
- polishing

### 4. Map-first where space matters
Quando si lavora su spazio, segmenti, POI, missioni o visual anchor:
- la UI deve essere map-first

### 5. Card-first where content matters
Quando si lavora su contenuti, review, personaggi, assistant e visual pairing:
- la UI deve essere card-first / panel-first

### 6. Readiness always visible
Toolia deve vedere sempre:
- cosa e' pronto
- cosa e' incompleto
- cosa e' bloccato
- cosa manca per pubblicare

## Le superfici principali del workspace
Il workspace dovrebbe articolarsi almeno in otto superfici operative.

### 1. Project overview
Vista sintetica del progetto:
- stato generale
- step completati / da rivedere
- warning principali
- readiness complessiva

### 2. Strategy and sources
Superficie per:
- Client Vision Brief
- KB verificata
- tensioni narrative
- fonti
- Visitor Question Source Set

### 3. Spatial workspace
Superficie map-first per:
- macro-zone
- nodi
- segmenti
- POI
- visual anchor
- clue candidate

### 4. Personalization workspace
Superficie per:
- driver
- personas
- candidate editorial lenses
- family mode trigger
- inferenza

### 5. Visit architecture workspace
Superficie per:
- percorsi plausibili
- visita canonica
- lenti attive
- family overlay architecture
- mission candidate set

### 6. Content production workspace
Superficie per:
- Semantic Content Base
- primary rendition
- deep dive
- bridge
- assistant answer base
- character contract
- visual pairing

### 7. Runtime and publishing workspace
Superficie per:
- Project Delivery Pack
- readiness
- bundle logic
- Visit Assistant Pack
- fallback e connection assist

### 8. QA and release workspace
Superficie per:
- review finale
- checklist di pubblicazione
- preview visitor app
- preview web app funzionante del progetto
- stato di handoff verso la app nativa
- gating di release

## Project overview
La home del progetto non deve essere un elenco di menu.
Deve dare la forma complessiva del lavoro.

### Deve mostrare almeno
- nome progetto
- tipo di luogo
- spatial mode
- stato di avanzamento per step
- warning aperti
- contenuti mancanti
- stato family
- stato assistant
- stato visuale
- stato runtime

### Obiettivo UX
In meno di un minuto Toolia deve capire:
- a che punto siamo
- cosa manca
- dove conviene intervenire adesso

## Strategy and sources workspace
Questa superficie serve a governare il significato del progetto prima dei contenuti.

### Oggetti chiave
- `Client Vision Brief`
- `Verified Knowledge Base`
- `Narrative Tension Map`
- `Spatial Source Pack`
- `Visual Source Pack`
- `Visitor Question Source Set`

### UX consigliata
- vista a sezioni o card
- differenza visiva chiara tra:
  - intent
  - evidence
  - leads da verificare
  - domande ricorrenti

### Azioni chiave
- conferma / correggi
- marca come verificato
- marca come cauto
- rinvia
- collega a POI/segmento/capitolo

## Spatial workspace
Questa e' una superficie decisiva.
Deve essere `map-first`, non form-first.

### Oggetti da vedere insieme
- macro-zone
- nodi
- segmenti
- POI
- visual anchor
- clue candidate

### Operazioni che devono essere facili
- fondere macro-zone
- dividere macro-zone
- aggiungere / spostare / rimuovere nodo
- creare / correggere segmento
- associare POI a nodo o segmento
- marcare un punto come visual anchor
- marcare un dettaglio come clue candidate

### Viste necessarie
- vista logica pulita
- vista topologica
- vista georeferenziata o planimetrica quando disponibile
- vista visuale con reference photos

### Regola UX
Toolia non deve "scrivere coordinate".
Deve manipolare la forma del luogo in modo comprensibile.

## Personalization workspace
Questa superficie serve a governare il motore di personalizzazione senza esporne la complessita' tecnica.

### Oggetti da governare
- driver
- personas
- candidate editorial lenses
- family mode trigger
- activation signals

### UX consigliata
- card comparabili
- matrici leggere
- evidenza visiva di sovrapposizione o ridondanza

### Operazioni chiave
- unisci personas
- elimina personas deboli
- rinomina lenti candidate
- approva lenti attive
- marca family come rilevante / non rilevante

## Visit architecture workspace
Qui Toolia deve poter vedere la visita come forma.

### Oggetti principali
- segment graph pesato
- capitoli di visita
- visita canonica
- punti must include
- segmenti/POI family-eligible
- mission candidate set

### Vista consigliata
Una doppia lettura:
- a sinistra: percorso / segmenti / capitoli
- a destra: pannello di ragioni, score, ruolo, tempo

### Operazioni chiave
- promuovi / declassa un segmento
- marca must include
- approva o rifiuta mission candidate
- sposta un checkpoint di capitolo
- verifica durata e coerenza della visita canonica

## Content production workspace
Questa e' probabilmente la superficie piu' ricca.
Deve evitare di diventare un CMS ingestibile.

### Regola forte
Il contenuto va governato per `unità`, non per file sparsi.

Quindi la UI deve essere centrata su:
- POI
- segmenti
- capitoli

e per ciascuno mostrare:
- Semantic Content Base
- primary rendition
- deep dive
- bridge correlati
- visual pairing
- assistant answers
- eventuale family pack

### Modalita' di lavoro consigliata
Per ogni unita':
1. leggi la proposta
2. verifica la base semantica
3. approva o correggi le rese
4. controlla il visuale
5. controlla assistant e family se applicabili

## Semantic Content Base UX
La base semantica deve essere piu' leggibile di un JSON, ma piu' strutturata di un testo libero.

### Soluzione consigliata
Card/panel con sezioni fisse:
- grounding
- key messages
- verified facts
- narrative angles
- lens relevance
- expansion potential
- warnings
- delivery constraints
- question surfaces
- visual affordances

### Azioni chiave
- approva
- modifica
- segnala dubbio
- rimanda a verifica
- collega a fonte

## Rendition workspace
Le primary rendition e i deep dive devono essere confrontabili senza caos.

### UI consigliata
- tabs o colonne per lente
- evidenza chiara tra:
  - primary
  - deep dive
  - bridge
  - contenuto di segmento

### Operazioni chiave
- approva una lente
- confronta due lenti sullo stesso POI
- segnala divergenza troppo forte
- marca come troppo tecnico / troppo debole / troppo simile

## Assistant workspace
L'assistant ha bisogno di una sua superficie chiara.
Non va nascosto dentro le FAQ finali.

### Oggetti da governare
- Assistant Answer Base Set
- trigger questions
- verified answer base
- extended answer
- handoff suggestion
- limiti dell'assistant

### UX consigliata
- vista per unita' e vista per domanda
- filtro per:
  - POI
  - segmento
  - capitolo
  - progetto

### Operazioni chiave
- approva risposta
- restringi perimetro
- accorcia risposta
- collega a un contenuto lineare
- marca come offline-safe / connected-only enrichment

## Character workspace
I personaggi non devono essere editati come puro testo.

### Oggetti da mostrare
- Character Contract
- tono
- competenza
- presenza
- target
- limiti factual
- visual identity se presente

### Operazioni chiave
- approva personaggio
- limita territorio di presenza
- collega personaggio a unità contenutistiche
- segnala conflitti con altri personaggi

## Visual workspace
Il visuale e' un layer autonomo.

### Deve permettere
- vedere asset reference e delivery
- verificare tag e pairing
- scegliere hero image
- marcare visual anchor
- controllare generated image e character art
- controllare clue visuali

### Operazioni chiave
- promuovi a delivery candidate
- marca reference only
- collega a POI/segmento
- cambia ruolo
- approva asset finale

## Family workspace
Il family mode ha bisogno di una sua superficie dedicata, ma non di un progetto separato.

### Deve mostrare
- punti missione selezionati
- ritmo complessivo
- max gap / min gap
- mission brief
- clue
- hint ladder
- reward
- handoff al genitore
- personaggio kids

### Obiettivo UX
Toolia deve poter vedere se il family mode:
- e' abbastanza presente
- non e' troppo fitto
- non rompe il backbone adulto

## Runtime and publishing workspace
Qui Toolia deve vedere il progetto come pacchetto eseguibile, non come somma di contenuti.

### Oggetti chiave
- Project Delivery Pack
- Session Bundle rules
- Runtime Manifest model
- Visit Assistant Pack rules
- Connected Assist Policy

### Operazioni chiave
- verifica readiness
- controlla asset mancanti
- marca contenuti essenziali vs secondari
- valida fallback
- valida comportamento assistant offline/online

## QA and release workspace
Prima della pubblicazione serve una superficie finale di controllo.

### Deve mostrare almeno
- stato per step
- errori bloccanti
- warning non bloccanti
- preview del visitor flow
- preview della `Project Web Preview App`
- preview family
- preview assistant
- readiness runtime
- readiness per handoff nativo

### Regola forte
La release non deve dipendere da memoria umana o check informali.
Serve una checklist esplicita.

## Stato e readiness
Tutto il workspace dovrebbe essere attraversato da un layer comune di stato.

Per ogni oggetto importante dovrebbe essere chiaro se e':
- `proposed`
- `in review`
- `approved`
- `published`
- `blocked`

Questo vale almeno per:
- POI
- segmenti
- basi semantiche
- rendition
- assistant units
- visual asset
- family mission
- character contracts

## Navigazione del workspace
La navigazione non deve essere piatta e infinita.

### Struttura consigliata
- overview
- spazio
- personalizzazione
- architettura
- contenuti
- assistant
- family
- visual
- runtime
- QA/release

Con accessi contestuali trasversali.

Esempio:
- da un POI posso saltare subito a:
  - base semantica
  - visual pairing
  - assistant
  - family mission
  - preview runtime

## Ricerca e filtri
La ricerca e' fondamentale.

Toolia deve poter filtrare per:
- macro-zona
- capitolo
- POI
- segmento
- lente
- famiglia / non famiglia
- assistant / no assistant
- visuale mancante
- stato di review
- readiness

## Preview
Il workspace deve avere preview vere, non solo dati.

Servono almeno:
- preview contenuto singolo
- preview audio/visuale
- preview missione family
- preview risposta assistant
- preview di visita composta

## Cosa evitare
Il workspace non deve diventare:
- un CMS con decine di campi obbligatori
- una mappa tecnica piena di layer illeggibili
- una pipeline rigida in cui ogni micro-errore blocca tutto
- un sistema dove Toolia riscrive manualmente cio' che la piattaforma dovrebbe proporre

## Output dello step
Gli output minimi di questo step dovrebbero essere:
- `Workspace Information Architecture`
- `Project Overview Model`
- `Spatial Workspace UX Model`
- `Personalization Workspace UX Model`
- `Visit Architecture Workspace UX Model`
- `Content Production Workspace UX Model`
- `Assistant Workspace UX Model`
- `Visual Workspace UX Model`
- `Family Workspace UX Model`
- `Runtime and Release Workspace UX Model`
- `State and Readiness Model`

## Quando si chiude davvero lo step
Lo Step 8 si chiude quando:
- Toolia puo' governare il progetto senza partire da zero
- le decisioni ad alto impatto sono facili da vedere e modificare
- spazio, contenuti, assistant, visuale e family hanno superfici leggibili
- readiness e stato sono sempre evidenti
- il workspace appare come strumento editoriale, non come pannello tecnico

## Traduzione implementativa minima
Questo step dovrebbe lasciare almeno questi artefatti operativi:
- `Workspace Navigation Model`
- `Review Flow Model`
- `Readiness Surfacing Rules`
- `Preview and Release Gating Rules`
- `Cross-step Workspace Sections`

Regole forti per l'implementazione:
- il workspace deve essere proposal-first e review-centric in tutte le superfici principali
- ogni oggetto rilevante deve mostrare stato, owner, readiness e dipendenze
- le capability attive devono cambiare il workspace in modo leggibile, non tramite eccezioni nascoste
- preview, export e release devono essere parti visibili del flusso editoriale

Anti-pattern da evitare:
- trasformare il workspace in un CMS generico
- nascondere readiness o capability dietro componenti sparsi
- costringere Toolia a passare da editing testuale puro quando serve una vista strutturale

## Formula chiave dello step
`La piattaforma propone, Toolia arbitra, il workspace deve rendere questo arbitraggio veloce e leggibile.`

## Cosa prepara per lo step successivo
Lo Step 8 prepara naturalmente due filoni:
- `packaging / entitlement / pricing surfaces`
- `operations, analytics e manutenzione post-pubblicazione`
- `preview e handoff verso le project app`

Il sistema a questo punto e' progettato sia lato visitatore sia lato redazione.
Il passo successivo sara' decidere come venderlo, governarlo e migliorarne le performance nel tempo.
