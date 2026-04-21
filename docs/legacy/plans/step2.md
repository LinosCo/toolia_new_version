# Step 2 - Fondazione spaziale

## Scopo dello step
Questo step serve a costruire la verita' spaziale utile del progetto.

Prende in ingresso:
- mappe del luogo
- planimetrie
- brochure e materiali di visita
- percorsi esistenti o praticabili
- fotografie reali e altri asset visivi del luogo
- segnali spaziali raccolti nello Step 1

e li trasforma in una `Logical Map` editabile su cui Toolia puo' poi costruire contenuti, drivers, personas e architettura della visita.

Lo scopo non e' ancora creare il percorso finale.
Lo scopo e' costruire un modello spaziale credibile e lavorabile.

## Problema strategico che risolve
Senza un layer spaziale vero, l'architettura della visita rischia di essere finta.

Se i POI sono posizionati in modo approssimativo e non esiste:
- una mappa dettagliata del luogo
- una rappresentazione dei percorsi praticabili
- una topologia minima dei vincoli

allora parlare seriamente di:
- durata
- detour cost
- pruning
- percorsi completi
- personalizzazione spaziale

rischia di essere prematuro.

In una frase:

`senza una mappa logica del luogo, l'architettura spazio-narrativa e' una finzione elegante`

## Decisione di rifondazione
Questo step e' sempre obbligatorio.

Non e' obbligatoria la georeferenziazione GPS.
E non tutti i progetti hanno bisogno della stessa base spaziale.

La regola che emerge e' questa:

`non tutti i progetti hanno bisogno di GPS, ma tutti i progetti hanno bisogno di una verita' spaziale di riferimento`

Questa verita' puo' essere:
- geografica
- locale
- ibrida

## Cosa puo' fare davvero un LLM multimodale
Un modello multimodale puo' aiutare molto a:
- leggere mappe eterogenee
- leggere immagini reali del luogo e dettagli osservabili
- capire legenda, zoning, ingressi, uscite, percorsi, attrazioni
- riconoscere logiche di visita gia' presenti
- proporre una mappa di sintesi
- suggerire macro-zone, POI, nodi e segmenti candidati
- proporre `visual anchor` e `clue candidate` utili ai passi successivi

Ma non va considerato affidabile da solo per:
- coordinate reali precise
- percorribilita' effettiva sul campo
- tempi veri di attraversamento
- dislivelli, barriere, accessi speciali
- topologia perfetta di luoghi indoor o ibridi

Quindi il suo ruolo giusto e':
- interprete delle mappe esistenti
- generatore di struttura iniziale
- assistente di authoring

non sostituto del layer geografico verificato.

## Ruolo del layer visuale nello step
In questo step le immagini reali non sono ancora asset finali da pubblicare.
Sono soprattutto un `reference visual layer`.

Servono a:
- aiutare il multimodale a capire il luogo
- verificare o arricchire la proposta di POI e segmenti
- riconoscere dettagli stabili e distintivi
- preparare l'abbinamento futuro tra immagini, POI e segmenti
- identificare possibili `visual anchor` e `clue candidate` utili al `family mode`

## I layer spaziali del sistema
Lo spazio va trattato come una pipeline, non come un unico oggetto.

### 1. Map Source Layer
Raccoglie:
- PDF
- brochure
- planimetrie
- mappe sentieri
- mappe illustrate
- immagini raster
- file vettoriali
- eventuali dati geografici gia' esistenti

### 1b. Visual Reference Layer
Raccoglie e indicizza:
- fotografie reali del luogo
- immagini con EXIF/GPS quando disponibile
- dettagli osservabili e stabili
- immagini archivistiche o illustrative gia' autorizzate

Questo layer serve a generare:
- suggerimenti di abbinamento a macro-zone, POI e segmenti
- `visual anchor`
- possibili `clue candidate`

### 2. Logical Map
E' l'output principale di questo step.
E' una mappa topologica editabile e sufficientemente buona per:
- progettare contenuti
- validare il luogo
- preparare i passi successivi

### 3. Georeferenced Workspace
Non e' richiesto per chiudere questo step.
E' una fase successiva, attivabile quando serve, in cui:
- la Logical Map viene riconciliata con una base geografica o planimetrica
- si usano Google Maps, overlay PNG/SVG, floorplan o altri layer
- si prepara il passaggio verso una geometria piu' precisa

### 4. Verified Spatial Layer
E' il layer finale, utile al runtime o ai casi che richiedono precisione.
Contiene:
- coordinate verificate
- percorsi verificati
- vincoli spaziali reali
- geometrie abbastanza affidabili per delivery e app

## Spatial mode del progetto
Lo Step 2 deve classificare ogni progetto in uno `spatial mode`.

### 1. Geo-native
Tipico di:
- territori
- borghi
- outdoor diffuso

Qui:
- Google Maps puo' essere una buona base
- lat/lng sono utili
- la georeferenziazione puo' servire presto

### 2. Local-map-native
Tipico di:
- musei
- aziende
- siti indoor
- percorsi chiusi

Qui:
- Google Maps spesso serve poco o niente
- conta una planimetria o una mappa locale
- puo' bastare un sistema di coordinate locale
- la georeferenziazione GPS puo' non servire affatto

### 3. Hybrid
Tipico di:
- ville
- zoo
- parchi
- siti misti indoor/outdoor

Qui:
- Google Maps aiuta
- ma non basta
- servono overlay piu' dettagliati
- va riconciliata una logica doppia

## Come viene scelto lo spatial mode
La piattaforma deve proporlo automaticamente.
Toolia non dovrebbe doverlo decidere da zero.

La logica corretta e':
- la piattaforma suggerisce
- spiega perche'
- Toolia conferma o cambia con un click

Questo riduce attrito senza togliere controllo.

La UI dovrebbe usare opzioni molto leggibili:
- `Territorio / mappa geografica`
- `Planimetria / mappa locale`
- `Misto`

## Sequenza di lavoro dello step

### 1. Ingest degli asset spaziali
La piattaforma legge il `Spatial Source Pack` prodotto nello Step 1 e normalizza:
- formati
- layer
- legende
- mappe multiple dello stesso luogo
- eventuali percorsi dichiarati
- reference visuali collegabili al luogo

Quando sono presenti EXIF/GPS validi, il sistema deve usarli per:
- proporre macro-zone
- proporre POI o segmenti vicini
- precompilare collegamenti spaziali

### 2. Proposta dello spatial mode
La piattaforma propone:
- il mode piu' plausibile
- la base di lavoro principale
- il motivo della proposta

Toolia valida o corregge.

### 3. Proposta delle macro-zone
La piattaforma propone una prima partizione del luogo in macro-zone.
Le macro-zone sono prima di tutto spaziali, ma devono gia' avere una promessa spazio-narrativa molto leggera.

### 4. Proposta dei POI di esperienza
Dentro le macro-zone la piattaforma propone i POI candidati.
Questi non sono ancora contenuti, ma punti del luogo rilevanti per la visita.

Le immagini reali possono aiutare la proposta dei POI quando permettono di:
- riconoscere dettagli distintivi
- confermare punti osservabili
- collegare meglio un punto alla macro-zona giusta

### 5. Proposta dei nodi di percorso
La piattaforma propone i nodi topologici che servono a capire il movimento.
Toolia puo' modificarli.

### 6. Proposta dei segmenti
La piattaforma costruisce i segmenti tra nodi e colloca i POI:
- su nodi
- oppure lungo i segmenti

### 7. Validazione della Logical Map
Toolia rivede la mappa logica e corregge solo cio' che cambia davvero la struttura del luogo.

Lo step si chiude qui.
Non produce ancora un percorso completo canonico.

## Macro-zone
Le macro-zone sono grandi aree del luogo riconoscibili e utili.

Non devono essere troppo astratte.
Devono nascere da:
- struttura fisica
- naming gia' esistente
- legenda della mappa
- aree gia' percepite dal visitatore
- capitoli naturali del luogo

Ogni macro-zona deve avere almeno:
- nome
- area o confine di riferimento
- funzione nella visita
- promessa narrativa leggera
- note di vincolo o accesso

La promessa narrativa leggera non e' ancora contenuto.
Serve solo a dire in modo sintetico perche' quella zona conta.

## POI di esperienza
I POI sono punti del luogo in cui ha senso:
- fermarsi
- osservare
- orientarsi
- ascoltare qualcosa in futuro

Il POI non e' una scheda.
Il POI e' un punto fisico rilevante nella visita.

Le schede verranno dopo e potranno essere associate:
- a un POI
- a un segmento
- all'intera visita

Un POI candidato dovrebbe avere almeno:
- nome
- macro-zona
- posizione approssimativa
- tipo di punto di esperienza
- fonti da cui e' stato inferito
- confidence della proposta
- eventuali reference visuali candidate

## Nodi di percorso
I nodi di percorso non sono contenuti.
Sono punti di controllo della topologia del luogo.

Servono a capire:
- dove un percorso si biforca
- dove entra o esce una macro-zona
- dove una deviazione si stacca o rientra
- dove c'e' un vincolo di passaggio

Aiutano anche a:
- stimare distanze
- capire costi di deviazione
- costruire segmenti affidabili

Ma il loro valore vero e' modellare l'attraversabilita' del luogo.

Per tenere bassa la complessita', in v1 i tipi minimi possono essere:
- `accesso`
- `bivio`
- `transizione`
- `rientro`

I nodi devono essere:
- proposti dalla piattaforma
- modificabili da Toolia
- mostrati nella UI solo quando servono

## Segmenti
I segmenti sono tratti di percorso tra due nodi.

Un segmento:
- collega sempre un nodo iniziale e un nodo finale
- puo' contenere zero, uno o piu' POI
- puo' attraversare una o piu' macro-zone
- puo' avere vincoli o costi di percorrenza

I segmenti, in questo step, non hanno ancora peso narrativo.
Non sono ancora:
- core
- recommended
- optional

In Step 2 servono solo a modellare la topologia e la percorribilita'.

Per tenere bassa la complessita', la piattaforma puo' proporre una classificazione solo topologica, ad esempio:
- `passaggio`
- `ramo`
- `loop`
- `connessione`

## Relazione tra oggetti
Il modello spaziale base del progetto diventa quindi:
- `macro-zone`
- `POI di esperienza`
- `nodi di percorso`
- `segmenti`

Con queste regole:
- i segmenti collegano sempre `nodo -> nodo`
- un POI puo' coincidere con un nodo, ma non deve farlo per forza
- un POI puo' stare nel mezzo di un segmento
- non ogni nodo e' un POI
- i nodi servono al percorso
- i POI servono all'esperienza

Questa separazione evita di confondere:
- topologia del luogo
- punti di esperienza
- contenuti

## Logical Map come output vero dello step
Lo Step 2 non produce ancora un percorso completo.
Produce una `mappa topologica editabile`.

Questa mappa contiene:
- macro-zone
- nodi
- segmenti
- POI
- connessioni
- vincoli spaziali
- tempi e costi preliminari di attraversamento
- spatial mode del progetto

Non contiene ancora:
- percorso completo canonico
- rilevanza editoriale dei segmenti
- pruning
- personalizzazione
- rapporto finale tra persona e percorso

Puo' pero' contenere gia':
- reference visuali candidate per POI e segmenti
- primi `visual anchor`
- primi `clue candidate` da validare piu' avanti

Tutto questo viene spostato allo step successivo.

## Ruolo della piattaforma e ruolo di Toolia
Lo step non deve tradursi in classificazione manuale totale.

La logica corretta e':
- la piattaforma propone struttura, oggetti e connessioni
- Toolia verifica, corregge e valida le decisioni che cambiano davvero l'esperienza

Toolia non dovrebbe ridisegnare il luogo da zero.
Dovrebbe validare:
- macro-zone troppo spezzate o troppo fuse
- POI falsi positivi o mancanti
- nodi topologici importanti
- segmenti sbagliati
- incoerenze tra mappa proposta e realta' del progetto

## UI necessaria
Qui la UI e' fondamentale.
Deve essere `map-first`, non `form-first`.

Deve permettere almeno di:
- caricare o sovrapporre mappe sorgente
- vedere la sintesi proposta
- confermare o cambiare lo spatial mode
- validare macro-zone
- aggiungere, spostare o fondere nodi
- aggiungere, spostare o correggere POI
- creare o correggere segmenti
- associare un POI a un nodo o a un segmento
- vedere vincoli e tempi preliminari

La UI giusta non deve far sentire che si sta configurando un algoritmo.
Deve far sentire che si sta disegnando il luogo in modo utile alla visita.

## Compatibilita' con la georeferenziazione successiva
Anche se la georeferenziazione puo' essere successiva o non necessaria, la Logical Map deve essere costruita in modo compatibile con i passi dopo.

Quindi:
- macro-zone, nodi, segmenti e POI devono avere ID stabili
- gli stessi oggetti devono poter sopravvivere alla riconciliazione futura
- deve cambiare la precisione geometrica, non l'identita' del modello

Questo evita duplicazioni di lavoro tra authoring logico e authoring geospaziale.

## Cosa non deve fare questo step
Step 2 non deve ancora:
- definire il percorso completo della visita
- dire quali segmenti contano di piu'
- decidere cosa verra' spesso saltato
- costruire la logica di pruning
- associare contenuti ai punti
- entrare nella personalizzazione visitatore

Qui si costruisce solo la verita' spaziale utile.

## Output dello step
Gli output minimi sono:
- `Spatial Mode`
- `Map Source Inventory`
- `Visual Reference Inventory`
- `Macro-Zone Map`
- `POI Set`
- `Route Node Set`
- `Segment Graph`
- `Logical Map`
- `Visual Anchor Set`
- `Clue Candidate Set`
- `Preliminary Spatial Constraints`
- `Preliminary Traversal Estimates`

## Quando si chiude davvero lo step
Step 2 si chiude quando:
- il progetto ha uno spatial mode chiaro
- le macro-zone sono abbastanza stabili
- i POI candidati principali sono identificati
- i nodi topologici rilevanti sono presenti
- i segmenti descrivono in modo credibile l'attraversabilita' del luogo
- esiste una Logical Map abbastanza buona da supportare lo Step 3

Non si chiude quando la geometria e' perfetta.
Si chiude quando la struttura del luogo e' abbastanza affidabile da poterci lavorare sopra.

## Traduzione implementativa minima
Questo step dovrebbe lasciare almeno questi artefatti operativi:
- `Spatial Mode`
- `Logical Map`
- `MacroZone Registry`
- `POI Registry`
- `RouteNode Registry`
- `Segment Registry`
- `Visual Anchor Candidate Set`

Regole strutturali da mantenere nel codice:
- gli stessi oggetti devono sopravvivere al passaggio da mappa logica a georeferenziazione verificata
- `POI`, `segmenti` e `nodi` devono avere ID stabili e non essere ricreati a ogni export
- il modello deve supportare sia coordinate geografiche sia coordinate locali di planimetria
- il layer visuale deve poter collegare immagini, detail anchor e possibili clue a POI o segmenti

Anti-pattern da evitare:
- dedurre tutto solo da vicinanza geografica
- forzare sempre lat/lng precisi anche quando il progetto e' `local-map-native`
- introdurre segmenti come testo libero senza nodi e senza topologia minima

## Formula chiave dello step
`Lo Step 2 costruisce la verita' spaziale utile del progetto.`

Prima si capisce come il luogo e' fatto e attraversabile.
Solo dopo si decide come trasformarlo in esperienza.
