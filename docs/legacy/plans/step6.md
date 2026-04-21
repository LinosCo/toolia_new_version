# Step 6 - Composizione runtime e delivery

## Scopo dello step
Questo step prende:
- l'architettura della visita prodotta nello Step 4
- il catalogo contenutistico modulare prodotto nello Step 5
- il profilo reale del visitatore raccolto dal wizard
- i vincoli di durata, device, family mode e copertura dati

e li trasforma in una visita concreta, eseguibile e robusta sul campo.

Qui non stiamo piu' progettando il sistema in astratto.
Stiamo decidendo:
- come nasce la visita del singolo visitatore
- cosa deve essere pronto prima della partenza
- quali asset devono essere disponibili offline
- come l'app esegue il piano durante la visita
- come gestire eccezioni, skip, resume e riallineamento

## Problema strategico che risolve
Gli step precedenti producono:
- una base di verita'
- una struttura spaziale
- una logica di personalizzazione
- un'architettura della visita
- un catalogo di contenuti

Manca pero' ancora il passaggio che dice:

`come il sistema costruisce davvero una sessione di visita funzionante`

Se questo passaggio resta implicito, il rischio e' doppio:
- da un lato il prodotto resta una bella architettura teorica
- dall'altro l'implementazione runtime improvvisa scelte troppo importanti

Questo step serve a evitare che il comportamento dell'app venga lasciato a interpretazioni implicite del team o del vibe coding.

## Decisione di fondo dello step
La decisione forte di questo step e' questa:

`la visita viene composta a session start`
`durante la visita il piano non viene ricomposto continuamente`

Ma questa scelta va letta insieme a un secondo principio:

`l'esperienza deve essere offline-first`

E a un terzo principio complementare:

`se c'e' connessione, il sistema puo' migliorare l'esperienza senza cambiare il contratto di base`

Quindi il modello corretto non e':
- rete continua durante il percorso
- fetch just-in-time dei contenuti
- motore che ricalcola in ogni momento

Il modello corretto e':
- contenuti critici preparati prima della partenza
- piano di visita composto all'inizio della sessione
- esecuzione locale durante la visita
- riallineamento o ricalcolo solo come eccezione esplicita
- miglioramenti connessi solo se non introducono dipendenze fragili

## Principi guida dello step

### 1. Session-start composition
La visita finale del singolo visitatore nasce all'inizio della sessione.

In quel momento il sistema decide:
- percorso della sessione
- ordine dei contenuti
- contenuti POI e di segmento
- bridge
- family overlay
- audio e immagini da rendere disponibili

### 2. Offline-first execution
La visita non deve dipendere dalla qualita' della rete durante il percorso.

Quindi:
- i contenuti critici devono essere gia' disponibili localmente
- l'app deve poter proseguire anche senza segnale
- la rete puo' servire per sync e servizi non critici, non per il nucleo della visita

### 3. Deterministic runtime
Durante la visita l'app esegue un piano gia' composto.

In sessione puo':
- far avanzare la queue
- marcare progressi
- gestire skip, pause e resume
- attivare overlay family gia' previsti
- proporre un riallineamento

In sessione non dovrebbe:
- riscrivere i contenuti principali
- cambiare automaticamente la logica della visita
- ricalcolare il percorso in continuo
- dipendere dalla rete per i contenuti essenziali

### 4. Explicit recalc only
Il ricalcolo non deve essere il comportamento standard.

Deve esistere solo come eccezione:
- richiesta esplicita del visitatore
- uscita evidente dal piano
- impossibilita' concreta di proseguire il percorso previsto

### 5. Connected assist, never connected dependency
Se durante la visita c'e' una connessione sufficiente, il sistema puo' attivare un layer di supporto.

Questo layer puo':
- sincronizzare progresso e stato locale
- scaricare asset non essenziali o versioni piu' ricche
- migliorare segnali UI e recupero sessione
- rendere disponibile un `explicit recalc`

Questo layer non deve:
- cambiare silenziosamente il percorso
- introdurre fetch obbligatori per i contenuti critici
- bloccare l'esecuzione della visita se la rete scompare

## Input dello step
Lo Step 6 prende in ingresso almeno:
- `Canonical Full Visit`
- `Adaptation Rules`
- `Plausible Route Rules`
- `Segment Graph`
- `Visit Chapter Map`
- `POI Content Stack Model`
- `Segment Content Model`
- `Bridge Model`
- `Active Editorial Lenses`
- `Family Overlay Architecture`
- `Mission Candidate Set`
- `Semantic Content Base`
- `Primary Rendition Set`
- `Deep Dive Set`
- `Bridge Set`
- `Character Contract Set`
- `Visual Pairing Base`
- `Visual Asset Inventory`
- `Assistant Answer Base Set`
- `Visitor Session Inputs`

I `Visitor Session Inputs` includono almeno:
- durata totale
- segnali raccolti dal wizard
- dominante e secondarie inferite
- attivazione o meno del `family mode`
- eventuali vincoli di fruizione dichiarati

## Oggetti fondamentali dello step
Gli oggetti canonici di questo step sono:
- `Project Delivery Pack`
- `Session Visit Plan`
- `Route Sequence`
- `Content Queue`
- `Family Overlay Schedule`
- `Visit Assistant Pack`
- `Audio Delivery Plan`
- `Visual Delivery Plan`
- `Runtime Manifest`
- `Session Bundle`
- `Local Session State`
- `Deferred Sync Payload`
- `Connected Assist Policy`

## Due livelli di preparazione
Per rendere l'esperienza davvero eseguibile servono due livelli distinti.

### 1. Project-level delivery preparation
Prima ancora che parta una sessione singola, il progetto deve poter essere trasformato in un pacchetto delivery-ready.

Qui si prepara almeno:
- inventario dei contenuti pubblicabili
- varianti lens-based approvate
- bridge pronti
- set di risposte approvate per l'assistant verticale
- audio pronti o generabili in anticipo
- immagini abbinate
- family overlay pack approvati
- metadati runtime minimi

L'output e' il:
- `Project Delivery Pack`

### 2. Session-level composition
Quando il visitatore inizia la sessione, il sistema usa:
- `Project Delivery Pack`
- input del wizard
- regole di Step 4

per costruire il:
- `Session Visit Plan`

## Project Delivery Pack
Il `Project Delivery Pack` e' il pacchetto master del progetto pronto per essere consumato dal runtime.

Deve contenere almeno:
- versioni pubblicabili dei contenuti
- audio asset approvati
- visual asset approvati
- `Assistant Answer Base Set` approvato
- metadati di durata e costo
- mappa delle dipendenze tra contenuti
- eligibility family dei POI/segmenti
- missioni family selezionate
- regole di fallback minime

Non e' ancora la visita del singolo utente.
E' il catalogo operativo su cui la sessione viene composta.

Quando serve, puo' includere anche:
- asset secondari scaricabili on demand ma non critici
- versioni visuali piu' ricche
- audio non essenziali
- metadati utili al sync o a un recalc esplicito

## Session start: composizione della visita
La sessione nasce in un punto preciso:
- il visitatore completa il wizard
- l'app dispone del `Project Delivery Pack`
- viene costruito il piano della sessione

L'ordine corretto e' questo.

### 1. Validazione input sessione
Il sistema consolida:
- durata totale
- dominante e secondarie
- eventuale `family mode`
- contesto device
- disponibilita' del pack locale

### 2. Selezione del percorso di sessione
Dal `segment graph` e dalle regole di Step 4 si seleziona una `Route Sequence` concreta:
- compatibile col budget totale
- coerente con dominante e secondarie
- coerente con lo spatial mode
- fisicamente plausibile

### 3. Selezione dei contenuti
Per la `Route Sequence` scelta il sistema costruisce la `Content Queue`:
- contenuti POI
- contenuti di segmento
- bridge
- eventuali deep dive
- contenuti di apertura e chiusura

### 4. Inserimento family overlay
Se il `family mode` e' attivo, il sistema inserisce il `Family Overlay Schedule`:
- micro-missioni solo sui punti curati
- sempre subordinate al backbone comune
- dopo il contenuto adulto del punto o del tratto

### 5. Costruzione del Visit Assistant Pack
Il sistema costruisce anche un `Visit Assistant Pack` situato sulla sessione.

Questo pack dovrebbe contenere almeno:
- risposte rilevanti per i POI e segmenti della `Route Sequence`
- risposte di capitolo e di progetto sempre utili
- domande pratiche o chiarimenti ricorrenti ammessi
- limiti e handoff che evitano digressioni troppo lunghe

In modalita' offline-first, questo pack deve essere sufficiente per una Q&A verticale minima durante la visita.

### 6. Costruzione del Runtime Manifest
Il sistema traduce il piano in un oggetto eseguibile dall'app:
- ordine
- dipendenze
- asset richiesti
- stati iniziali
- fallback previsti

### 7. Verifica di completezza del bundle
Prima di far partire davvero la visita il sistema verifica:
- che gli audio essenziali siano disponibili
- che le immagini essenziali siano disponibili
- che il `Visit Assistant Pack` minimo sia disponibile
- che il manifesto sia coerente
- che l'overlay family sia consistente

Solo a questo punto nasce il:
- `Session Bundle`

Se c'e' connessione disponibile, il sistema puo' anche:
- completare asset secondari mancanti
- pre-scaricare bundle piu' ricchi per i capitoli successivi
- verificare anticipatamente la possibilita' di recovery o recalc

## Route Sequence
La `Route Sequence` e' la sequenza effettiva di segmenti e POI che la sessione seguira'.

Non e' piu' una struttura teorica.
E' la materializzazione di una singola visita.

Deve contenere almeno:
- segmenti inclusi
- POI inclusi
- ordine di fruizione
- tempi stimati
- eventuali punti di sync
- eventuali punti family

## Content Queue
La `Content Queue` e' l'ordine eseguibile dei contenuti della sessione.

Non coincide semplicemente con la lista dei POI.
Deve includere anche:
- intro
- bridge
- contenuti di segmento
- missioni family
- eventuali payoff parziali
- chiusura finale

Ogni item della queue dovrebbe avere almeno:
- `content_id`
- `content_type`
- `bound_to`
  - POI, segmento, capitolo o sessione
- `speaker`
- `estimated_duration`
- `visual_asset_id`
- `family_related`
- `fallback_id` se previsto

## Audio Delivery Plan
L'audio e' parte critica dell'esperienza.
Non va trattato come dettaglio posticcio.

Il `Audio Delivery Plan` deve dire:
- quali audio sono essenziali
- quali sono opzionali
- quali sono gia' presenti localmente
- quali vanno scaricati prima della partenza
- quali fallback testuali o alternativi esistono

Se la rete e' disponibile, puo' anche distinguere:
- audio gia' pronti in locale
- audio non critici scaricabili in background
- varianti premium o estese non necessarie all'esecuzione base

### Regola forte
L'audio essenziale non deve dipendere dalla rete durante la visita.

Questo implica:
- pregenerazione o pre-disponibilita' degli audio principali
- readiness gate prima dell'avvio
- niente TTS critico just-in-time come comportamento standard

## Visual Delivery Plan
Ogni scheda pubblicata deve avere almeno un visual asset.

Il `Visual Delivery Plan` deve dire:
- quale asset e' primario per ogni contenuto
- quali asset sono secondari
- dove si usano immagini di segmento o placeholder
- dove serve una generated image
- dove il visuale e' obbligatorio per una missione family

Se c'e' connessione, il piano puo' anche prevedere:
- immagini ad alta risoluzione non essenziali
- gallery secondarie
- asset illustrativi extra per capitoli o missioni

Il visuale non deve bloccare inutilmente la sessione se manca una specificita' forte.
Sono ammessi:
- hero image di segmento
- visuale generale di macro-zona
- placeholder controllati

## Family Overlay Schedule
Nel `family mode` non esiste un secondo tour.

Esiste un overlay episodico sopra il tour comune.

Il `Family Overlay Schedule` deve contenere:
- punti in cui la missione si attiva
- tipo missione
  - POI, segmento o sync
- durata stimata
- clue
- hint ladder
- reward
- eventuale handoff per il genitore
- eventuale personaggio kids associato

### Regole forti del family mode
- stesso device condiviso
- la durata totale include contenuti adulti e contenuti family
- la missione arriva di default dopo il contenuto adulto
- il layer family e' intermittente, non continuo
- si producono solo missioni curate, non missioni per ogni punto idoneo

## Visit Assistant Pack
Il `Visit Assistant Pack` e' il sottoinsieme della KB verticale del progetto che l'app rende interrogabile durante la visita.

Non deve essere una copia integrale e indiscriminata della base di conoscenza.
Deve essere:
- contestuale alla sessione
- compatibile con il ritmo della visita
- abbastanza ricco da rispondere ai dubbi spontanei piu' probabili

Il pack dovrebbe includere almeno:
- risposte per i POI inclusi nella sessione
- risposte per i segmenti inclusi nella sessione
- chiarimenti per capitolo
- FAQ di progetto ad alta utilita'
- eventuali risposte pratiche contestuali

### Regole forti dell'assistant
- l'assistant e' verticale, non generalista
- privilegia prima il contesto del punto o tratto corrente
- usa solo risposte fondate su contenuti approvati
- se la domanda eccede il suo perimetro, deve dichiararlo e rientrare nel contesto
- non deve prendere il sopravvento sulla fruizione lineare

### Modalita' offline e connessa
In modalita' offline:
- l'assistant usa il `Visit Assistant Pack` locale
- risponde solo entro il perimetro previsto
- privilegia risposte brevi e situate

In modalita' connessa:
- puo' allargare prudentemente il perimetro al resto della KB verticale approvata del progetto
- puo' gestire meglio follow-up e chiarimenti secondari
- non deve comunque trasformarsi in chat generalista

## Runtime Manifest
Il `Runtime Manifest` e' il contratto operativo tra motore di composizione e app.

L'app non dovrebbe dover interpretare liberamente i contenuti.
Dovrebbe eseguire un manifesto chiaro.

Il manifesto dovrebbe contenere almeno:
- `session_id`
- `project_id`
- `route_sequence`
- `content_queue`
- `visit_assistant_pack`
- `audio_delivery_plan`
- `visual_delivery_plan`
- `family_overlay_schedule`
- `navigation checkpoints`
- `resume points`
- `sync policy`
- `recalc policy`
- `connected assist policy`

## Session Bundle
Il `Session Bundle` e' il pacchetto locale minimo che serve a eseguire la visita.

Deve essere verificabile prima dell'inizio.

Deve contenere almeno:
- `Runtime Manifest`
- audio essenziali
- visual asset essenziali
- missioni family previste
- `Visit Assistant Pack` minimo
- metadati minimi per progress tracking

### Readiness gate
La visita non dovrebbe partire in modo "sicuro" se il bundle non e' abbastanza completo.

Il sistema deve saper distinguere almeno:
- `ready`
- `ready with degraded visuals`
- `not ready`

Quando la rete e' disponibile, il sistema puo' distinguere anche uno stato implicito di:
- `ready and enrichable`

cioe' una sessione gia' sicura, ma migliorabile tramite download non critici o sync anticipato.

## Connected Assist Policy
Il `Connected Assist Policy` definisce cosa il sistema puo' migliorare quando c'e' rete senza violare il modello offline-first.

Deve specificare almeno:
- quali sync possono partire in background
- quali asset secondari possono essere scaricati senza impatto sul percorso
- quali miglioramenti UI possono comparire solo in modalita' connessa
- quando e' ammesso proporre un `explicit recalc`
- quali azioni non devono mai essere automatiche

### Miglioramenti ammessi con connessione
Esempi sensati:
- backup continuo dello stato sessione
- upload progressivo degli eventi per analytics e recovery
- download di visuali non essenziali piu' ricche
- download di audio non essenziali o estesi
- ampliamento controllato del perimetro dell'assistant al resto della KB verticale del progetto
- indicazione UI di stato bundle, sync completato, recovery disponibile
- recupero rapido di una sessione su riapertura o cambio stato dell'app
- attivazione del bottone `riallinea da qui` quando il sistema puo' supportarlo bene

### Miglioramenti non ammessi come dipendenza
Esempi da escludere come comportamento standard:
- fetch live del contenuto principale del prossimo POI
- sostituzione automatica di una scheda gia' pianificata
- modifica silenziosa della `Route Sequence`
- missioni family che esistono solo online
- bridge critici disponibili solo se c'e' rete
- risposte dell'assistant basate su conoscenza non approvata o non contestualizzata

## In-session execution
Durante la visita l'app esegue il piano.

Le responsabilita' runtime sono:
- playback locale
- avanzamento della queue
- progress tracking locale
- skip / pause / resume
- attivazione missioni family previste
- gestione dell'assistant verticale entro il perimetro del `Visit Assistant Pack`
- gestione dei checkpoint
- eventuale rejoin sul piano
- eventuale sync opportunistico se la connessione lo consente
- eventuale download di asset non essenziali previsti dalla `Connected Assist Policy`

Durante la visita l'app non dovrebbe:
- riscrivere i contenuti
- cambiare continuamente la logica del percorso
- dipendere dalla rete per contenuti essenziali

## Rejoin e resume
Anche con piano congelato serve una logica robusta di riallineamento.

### Resume
Serve a riprendere la visita:
- dopo pausa
- dopo chiusura dell'app
- dopo perdita temporanea di attenzione

### Rejoin
Serve quando il visitatore:
- ha saltato un punto
- si e' spostato piu' avanti del previsto
- vuole continuare dal punto in cui si trova

Il `rejoin` non deve ricalcolare tutta la visita automaticamente.
Deve preferire:
- riallineamento sul checkpoint successivo
- mantenimento del piano quando possibile

## Recalc policy
Il ricalcolo non e' il comportamento normale.

Va previsto solo come opzione esplicita.

Esempi di trigger leciti:
- il visitatore richiede un nuovo piano
- il percorso previsto non e' piu' praticabile
- l'utente e' uscito in modo sostanziale dalla Route Sequence

Default consigliato:
- nessun recalc automatico continuo
- eventuale prompt: `vuoi riallineare la visita da qui?`

Quando il recalc viene proposto, il sistema dovrebbe verificare:
- connettivita' sufficiente
- disponibilita' del `Project Delivery Pack`
- possibilita' di scaricare un eventuale nuovo bundle senza rompere la visita in corso

## Local Session State
Lo stato locale della sessione deve essere salvabile e recuperabile.

Almeno:
- posizione nella queue
- contenuti completati
- contenuti saltati
- missioni family completate
- principali interazioni con l'assistant
- ultimo checkpoint valido
- timestamp principali
- stato di download del bundle

## Deferred sync
La rete non va assunta disponibile durante la visita.

Per questo il sync deve essere differibile.

Il `Deferred Sync Payload` puo' includere:
- progresso visita
- tappe completate
- missioni svolte
- tempi reali di fruizione
- eventi di skip
- domande poste all'assistant e pattern di follow-up
- eventuali errori di esecuzione

Se la connessione e' disponibile durante la visita, questo payload puo' essere sincronizzato progressivamente senza aspettare la fine della sessione.

Questo sync avviene quando la connettivita' torna disponibile.

## Bundle lifecycle
Il `Session Bundle` non e' solo un download iniziale.
Va governato lungo tutto il suo ciclo di vita:
- generazione
- validazione
- download
- uso
- eventuale aggiornamento
- invalidazione
- pulizia locale

Regole forti:
- un bundle non valido o incompleto non deve far partire la visita come se fosse pronto
- un bundle gia' in uso non deve essere sostituito silenziosamente nel mezzo della sessione
- gli asset essenziali devono avere integrita' verificabile
- gli asset non essenziali possono essere arricchiti dopo, ma senza cambiare il core della visita

## Asset integrity e spazio locale
Per il runtime reale va previsto almeno:
- controllo di presenza dei file essenziali
- distinzione tra asset critici e asset arricchibili
- politica minima di storage locale
- politica di retention e cleanup di bundle e sessioni obsolete

Regola forte:
- la disponibilita' di spazio o la corruzione locale devono emergere come stato chiaro in UI e in analytics, non come errore generico

## Fallback
Un sistema runtime affidabile deve prevedere fallback chiari.

### Se manca un audio non essenziale
- si puo' proseguire con il resto della queue
- si puo' usare una variante piu' breve o testuale

### Se manca un visual asset specifico
- si usa immagine di segmento
- oppure immagine di macro-zona
- oppure placeholder controllato

### Se una missione family non e' disponibile o non e' robusta
- si salta la missione
- non si spezza il backbone adulto

### Se il bundle non e' pronto
- la visita non parte in modalita' completa
- l'app deve comunicarlo prima dell'inizio

## Output dello step
Gli output minimi di questo step dovrebbero essere:
- `Project Delivery Pack`
- `Session Visit Plan`
- `Route Sequence`
- `Content Queue`
- `Visit Assistant Pack`
- `Audio Delivery Plan`
- `Visual Delivery Plan`
- `Family Overlay Schedule`
- `Runtime Manifest`
- `Session Bundle`
- `Bundle Lifecycle Model`
- `Asset Integrity Policy`
- `Local Session State Model`
- `Deferred Sync Payload Model`
- `Connected Assist Policy`

## Quando si chiude davvero lo step
Lo Step 6 si chiude quando:
- il progetto puo' essere trasformato in un pack delivery-ready
- una sessione puo' essere composta interamente a inizio visita
- il bundle puo' essere verificato prima della partenza
- l'esecuzione offline-first e' definita
- il comportamento connection-assisted e' esplicito ma non critico
- resume, rejoin e fallback sono abbastanza chiari
- il runtime non lascia decisioni critiche implicite all'app

## Traduzione implementativa minima
Questo step dovrebbe lasciare almeno questi artefatti operativi:
- `Project Delivery Pack`
- `Session Visit Plan`
- `Runtime Manifest`
- `Session Bundle`
- `Local Session State`
- `Connected Assist Policy`

Regole forti per l'implementazione:
- la composizione della visita vive lato piattaforma o backend, non nel client
- preview web e app Expo devono leggere gli stessi contratti
- il runtime e' `session-start composition + offline execution`
- il client puo' eseguire, saltare, riprendere e riallineare, ma non reinventare la visita

Anti-pattern da evitare:
- fetch just-in-time di contenuti essenziali
- ricalcolo implicito continuo del percorso in sessione
- usare il bundle come semplice cache opaca senza stato e readiness

## Formula chiave dello step
`La visita si compone all'inizio, si esegue localmente sul campo e si ricalcola solo per eccezione.`

## Cosa prepara per lo Step 7
Step 6 non chiude il prodotto.
Prepara il passo successivo:
- UX dell'app del visitatore
- UX dello start session
- UI di download readiness
- UI di playback, progress, skip, resume e rejoin
- UI del chatbot assistant verticale durante la visita
- UI del family mode su device condiviso
- UI di errori, fallback e riallineamento

In altre parole:
Step 6 definisce il motore operativo.
Lo Step 7 dovra' definire come quel motore si manifesta nell'esperienza utente.
