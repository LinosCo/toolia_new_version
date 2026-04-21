# Step 4 - Architettura della visita

## Scopo dello step
Questo step trasforma:
- la `Logical Map` prodotta nello Step 2
- i `driver`, le `personas` e il `modello di inferenza` prodotti nello Step 3

in una struttura concreta di visita.

Qui non stiamo ancora scrivendo tutte le schede finali.
Stiamo decidendo:
- quali percorsi sono plausibili
- come si costruisce la visita completa del progetto
- come durata e preferenze del visitatore modificano il percorso
- dove vivono i contenuti nel percorso
- come il sistema tiene insieme fluidita' fisica, pertinenza e filo narrativo

## Problema strategico che risolve
Lo spazio da solo non basta.
Le personas da sole non bastano.

Serve uno step che prenda:
- la verita' strutturale del luogo
- la logica di personalizzazione

e le trasformi in una regola chiara di composizione della visita.

L'obiettivo e' evitare due errori opposti:
- visite troppo "calcolate", corrette nello spazio ma deboli come esperienza
- visite troppo "editoriali", belle sulla carta ma scomode o innaturali da vivere

In questo step il primato va al `segment graph`, perche' la narrazione puo' adattarsi meglio dello spazio.

## Principio guida dello step
La struttura fisica del luogo e' la verita' operativa della visita.

Quindi:
- il `segment graph` e' il backbone reale
- i `capitoli di visita` sono il modo in cui rendiamo quel backbone leggibile e raccontabile
- la personalizzazione decide come spendere il tempo disponibile
- il percorso non va mai progettato ignorando naturalezza e percorribilita'

Formula chiave:

`il segment graph e' la verita' operativa; i capitoli di visita sono la sua lettura editoriale`

## Input dello step
Lo Step 4 prende in ingresso almeno:
- `Logical Map`
- `Spatial Mode`
- `Macro-Zone Map`
- `POI Set`
- `Route Node Set`
- `Segment Graph`
- `Visual Anchor Set`
- `Clue Candidate Set`
- `Preliminary Traversal Estimates`
- `Driver Map`
- `Project Personas`
- `Driver-Persona Matrix`
- `Candidate Editorial Lenses`
- `Narrative Continuity Rules`
- `Dominance Rules`
- `Inference Model`
- `Family Mode Trigger Rules`

## Oggetti fondamentali dello step
Gli oggetti canonici di questo step sono:
- `segmenti`
- `POI`
- `percorsi plausibili`
- `capitoli di visita`
- `lenti editoriali attive`
- `stack contenutistici`
- `bridge`
- `overlay family`

## Segment graph pesato
Il `segment graph` resta l'oggetto principale.

In questo step smette di essere solo topologico e acquisisce valori utili alla composizione.

Ogni segmento deve avere almeno:
- nodo iniziale e finale
- tempo di percorrenza stimato
- eventuale attrito di deviazione
- ruolo nel flusso del luogo
- valore probabile per diverse personas o dominanti
- compatibilita' con certe letture della visita

Ogni POI deve avere almeno:
- tempo di sosta minimo
- peso di rilevanza per personas / lenti
- eventuale flag `must include` solo per pochi casi davvero obbligati
- stack di contenuti possibili associabili
- eventuale idoneita' per `family mode`

## Percorsi plausibili
Il sistema non deve esplorare tutte le combinazioni possibili del grafo.

Deve invece generare e valutare solo `percorsi plausibili`.

Un percorso plausibile e':
- fisicamente naturale
- coerente con lo spatial mode del progetto
- compatibile con la durata totale richiesta
- privo di zig-zag inutili
- privo di backtracking gratuito
- capace di sostenere un racconto leggibile

Sono ammesse:
- deviazioni brevi
- rami opzionali
- piccoli loop naturali del luogo

Non sono ammessi come default:
- avanti-indietro artificiosi
- salti pensati solo per massimizzare score
- percorsi ottimizzati in modo innaturale per spremere contenuti

## Visita completa canonica
Per default il progetto ha:
- `una visita completa canonica`
- eventualmente `varianti controllate`

La visita completa canonica:
- copre al meglio il luogo nella sua forma lunga
- non coincide necessariamente con "tutto"
- e' il riferimento massimo da cui si comprime
- non cambia da zero per ogni lente

Le lenti/personas non generano di default una visita completa alternativa.
Modificano piuttosto:
- il peso dei segmenti
- il peso dei POI
- le deviazioni che valgono la pena
- la profondita' dei contenuti
- la lettura editoriale della visita

## Lenti editoriali attive
Le `personas` non devono diventare una moltiplicazione incontrollata di contenuti.

In questo step va fatto un passaggio di compressione:
- da `personas` ricche e sfumate
- dalle `Candidate Editorial Lenses` prodotte nello Step 3
- a poche `lenti editoriali attive` che il progetto puo' sostenere in produzione

Regola pratica:
- 3 lenti attive come default
- 4 come eccezione

Queste lenti:
- non coincidono con i narratori
- non coincidono uno a uno con le personas
- servono a decidere per quali versioni produrre davvero i contenuti nello Step 5

## Capitoli di visita
I `capitoli di visita` non sostituiscono il grafo.
Lo rendono leggibile.

Sono blocchi spazio-narrativi costruiti sopra segmenti e POI.
Servono a:
- dare progressione alla visita
- rendere riconoscibile il cambiamento di fase
- aiutare bridge, intro e chiusure
- rendere il percorso piu' autoriale senza piegarlo troppo

I capitoli:
- devono restare compatibili con il segment graph
- devono essere comprimibili
- non devono imporre routing innaturali

## Ordine del motore di composizione
L'ordine corretto del ragionamento e':

### 1. Durata totale
La durata indicata dal visitatore e' il `budget totale della visita`.

Dentro ci stanno gia':
- cammino
- soste
- ascolto
- un piccolo buffer di sicurezza

La durata non decide solo quanto raccontare.
Decide fin dove e con quale densita' accompagnare il visitatore.

### 2. Percorsi plausibili compatibili col budget
Il sistema calcola quali percorsi plausibili stanno nel budget disponibile, usando:
- tempo di percorrenza dei segmenti
- costo minimo di sosta dei POI
- costo delle deviazioni
- buffer di sicurezza

### 3. Rilevanza per persona / lente
Dentro i percorsi fattibili, il sistema privilegia quelli che massimizzano il valore per il visitatore:
- segmenti piu' rilevanti per la dominante
- POI piu' rilevanti per la dominante
- deviazioni che valgono la percorrenza aggiuntiva
- tagli su rami poco coerenti col profilo

### 4. Composizione narrativa
Solo dopo si controlla che il risultato:
- abbia una dominante leggibile
- non sembri una raccolta casuale di punti
- mantenga una progressione credibile
- tenga insieme capitoli, bridge e soste

### 5. Riempimento contenutistico
Solo a questo punto il sistema decide:
- quante schede associare ai POI selezionati
- quali contenuti di segmento usare
- quali bridge inserire
- se attivare o no il `family mode` in alcuni punti del percorso

Formula chiave:

`la durata definisce il perimetro, l'interesse decide la forma del percorso dentro quel perimetro`

## Modello di costo
Il budget va calcolato sul tempo totale della visita, non solo sui minuti di ascolto.

Per questo ogni visita deve tenere conto almeno di:

### Segment cost
- tempo di percorrenza
- eventuale deviazione
- attrito del ramo

### Stop cost
- fermata minima
- osservazione minima
- contenuto associabile

### Visit budget
- tempo totale dichiarato dal visitatore
- buffer di tolleranza

## Tolleranza temporale
La visita non deve essere rigidissima al minuto.
Serve un margine di tolleranza.

Default consigliato:
- tolleranza complessiva 10-20%
- meglio stare leggermente sotto budget che sforare troppo
- gli sforamenti vanno tenuti piu' sotto controllo degli undershoot

Questo perche' un visitatore percepisce piu' negativamente una visita troppo lunga di una visita leggermente piu' corta ma scorrevole.

## Scoring
Lo scoring non deve essere un numero astratto unico.
Deve combinare almeno:
- costo temporale del segmento
- costo della deviazione
- rilevanza per la lente/persona dominante
- rilevanza per eventuali secondarie
- ruolo del POI nel percorso
- contributo alla progressione della visita

In v1 non serve un modello iper-sofisticato.
Basta che il ranking segua una logica chiara:

`valore di visita entro un budget temporale`

## Must include
Il sistema di scoring non basta da solo.
Servono anche pochi vincoli forti.

Per questo alcuni POI o segmenti possono essere marcati come:
- `must include`

Ma devono restare pochi e davvero giustificati.
Se sono troppi, il motore di personalizzazione si svuota.

## Stack contenutistico dei POI
Ogni POI non ha una sola scheda.
E' un contenitore di contenuti.

Per ogni POI possono esistere:
- piu' schede per lenti diverse
- piu' schede per la stessa lente
- eventuali approfondimenti

Ma questa ricchezza deve restare governabile.

### Modello consigliato
Per ogni POI:
- almeno una resa principale per le lenti rilevanti
- eventuali deep dive solo nei POI che lo meritano davvero
- non piu' di una profondita' eccessiva per default

Il motore non deve trattare tutte le schede del POI come equivalenti.
La durata decide fino a che livello "aprire" il POI.

Formula chiave:

`il percorso seleziona i POI; il tempo residuo decide quanto apriamo ogni POI; la lente decide quali schede aprire per prime`

## Grounding minimo del POI
La scheda "core" del POI non deve essere obbligatoria in assoluto.

Ma quando un POI entra nell'itinerario deve ricevere almeno un contenuto di `grounding`.

Questo grounding puo' arrivare da:
- una scheda POI piu' generale
- una scheda lens-based autosufficiente
- un bridge precedente
- un'introduzione di segmento

Quindi:
- la core non e' sempre obbligatoria
- il contesto minimo del POI invece si'

## Contenuti di segmento
Non tutto il contenuto deve vivere sui POI.

I segmenti possono ospitare contenuti mobili utili quando:
- il senso e' nel passaggio
- il tratto ha valore paesaggistico o di atmosfera
- serve introdurre un capitolo
- serve accompagnare il visitatore nel cambio di zona
- il contenuto non richiede osservazione di un punto preciso

Questi contenuti non sostituiscono le schede POI.
Distribuiscono meglio il carico narrativo.

I segmenti possono anche essere candidati a:
- momenti family
- missioni leggere per bambini
- sync point tra adulto e bambino

ma solo se il tratto lo consente davvero.

## Bridge
I bridge sono `first-class objects`.
Non sono testo accessorio.

Servono a:
- indirizzare il visitatore nel percorso
- tenere il filo narrativo
- preparare il prossimo tratto o il prossimo POI
- dare una lettura piu' coerente con la lente dominante

### Struttura consigliata del bridge
Ogni bridge ha tre layer:

#### 1. Navigation
Breve istruzione di movimento.
Quando il layer spaziale non e' abbastanza verificato, meglio landmark-based che turn-by-turn troppo preciso.

#### 2. Bridge body
Raccordo principale del segmento.
E' authored per quel tratto e tiene insieme la visita.

#### 3. Lens accent
Modulo separato e opzionale.
Si attiva solo quando aggiunge davvero valore.

## Visual anchors e clue candidate
Lo Step 4 deve ereditare dal layer spaziale anche:
- `visual anchor`
- `clue candidate`

Non come asset finali di contenuto, ma come supporto all'architettura della visita.

Servono a:
- capire dove il luogo offre dettagli forti e osservabili
- selezionare punti family davvero promettenti
- evitare di progettare missioni o contenuti troppo astratti rispetto a cio' che si vede davvero

## Family mode
Il `kids dedicated track` viene escluso dal modello base.

In questo step si architetta invece un `family mode` come overlay sul tour standard.

Il family mode:
- usa lo stesso backbone del tour adulto
- non genera un percorso indipendente
- attiva micro-missioni in un sottoinsieme curato di POI e segmenti
- assume un solo device condiviso tra adulto e bambino

### Regole di base
- il contenuto adulto resta la spina dorsale
- la micro-missione arriva `dopo` il contenuto adulto
- il budget di visita include sia il layer adulto sia quello family
- le attivazioni kids devono essere episodiche e non continue

### Tipi di punti family
Lo step deve poter marcare alcuni POI o segmenti come:
- `family-friendly`
- `mission candidate`
- `sync point`

La marcatura non implica ancora la scrittura della missione.
Serve a preparare lo Step 5.

Non tutti i bridge devono essere fortemente personalizzati.
Alcuni possono essere:
- solo navigazionali
- solo narrativi
- ibridi

## Cosa produce questo step
Gli output minimi sono:
- `Weighted Segment Graph`
- `Visit Chapter Map`
- `Active Editorial Lenses`
- `Canonical Full Visit`
- `Plausible Route Rules`
- `Visit Budget Model`
- `Route Ranking Rules`
- `POI Content Stack Model`
- `Segment Content Model`
- `Bridge Model`
- `Family Overlay Architecture`
- `Mission Candidate Set`
- `Adaptation Rules for Duration and Persona`

## Canonical Full Visit
La `Canonical Full Visit` deve descrivere:
- percorso completo di riferimento
- capitoli in ordine
- principali segmenti inclusi
- principali POI inclusi
- eventuali deviazioni normalmente ammesse

Non e' ancora la visita personalizzata finale.
E' la base massima da cui il sistema poi comprime.

## Adaptation Rules for Duration and Persona
Le regole di adattamento devono chiarire almeno:
- cosa si taglia prima quando il tempo cala
- quando una deviazione vale il costo per una certa lente
- quanto si puo' approfondire un POI
- come cambia il peso dei segmenti in base alla dominante
- come garantire che il risultato resti naturale

Quando e' attivo il `family mode`, queste regole devono anche chiarire:
- quanti momenti kids possono stare nel budget
- quanto spazio lasciare tra una missione e l'altra
- dove e' meglio attivare le missioni
- quali tratti non vanno interrotti per non rompere il tour adulto

## Cosa non deve fare questo step
Step 4 non deve ancora:
- scrivere i testi definitivi
- generare tutte le schede finali
- produrre l'audio
- rifinire ogni bridge parola per parola
- fare il packaging finale dell'app

Questo step costruisce la logica della visita, non ancora il contenuto finale completo.

## Quando si chiude davvero lo step
Step 4 si chiude quando:
- esiste una visita completa canonica credibile
- il segment graph e' abbastanza pesato da guidare durata e preferenze
- i percorsi plausibili sono governati da regole chiare
- il sistema sa come comprimere o arricchire la visita
- il ruolo di segmenti, POI e bridge e' chiaro
- esiste un modello abbastanza forte da passare alla produzione dei contenuti

## Traduzione implementativa minima
Questo step dovrebbe lasciare almeno questi artefatti operativi:
- `Route Candidate Set`
- `Canonical Full Visit`
- `Chapter Map`
- `Adaptation Rules for Duration and Persona`
- `Mission Candidate Set`
- `Grounding Rules`

Regole forti per l'implementazione:
- il `segment graph` resta la verita' strutturale di partenza
- il motore deve generare e rankare solo `percorsi plausibili`, non tutte le combinazioni del grafo
- i criteri di costo e valore devono essere espliciti e versionabili
- `must include` deve restare raro e leggibile

Anti-pattern da evitare:
- lasciare al client il compito di ricostruire percorso o queue narrativa
- trattare la durata come puro numero di schede
- usare i capitoli come struttura che forza lo spazio invece di leggerlo

## Formula chiave dello step
`La durata definisce la capienza della visita; la lente decide come spendere quella capienza.`

## Cosa prepara per lo Step 5
Lo Step 4 prepara direttamente lo Step 5, perche' rende possibile:
- scrivere schede POI e contenuti di segmento con un ruolo chiaro
- sapere quali contenuti sono principali e quali opzionali
- sapere dove servono bridge
- sapere come la visita si comprime o si estende
- produrre contenuti coerenti con spazio, durata e persona
