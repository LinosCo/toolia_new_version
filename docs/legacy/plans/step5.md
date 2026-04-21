# Step 5 - Produzione dei contenuti modulari

## Scopo dello step
Questo step prende:
- la `Canonical Full Visit` e le `Adaptation Rules` prodotte nello Step 4
- i `POI`, i `segmenti` e i `capitoli di visita`
- i `driver`, le `personas` e le `lenti editoriali attive`
- il layer visuale ereditato dagli step precedenti
- l'architettura `family mode` del progetto

e li trasforma in un catalogo di contenuti modulari, revisionabili e componibili.

Qui non stiamo ancora componendo la visita finale del singolo utente.
Stiamo producendo i mattoni da cui quella visita potra' essere costruita.

## Problema strategico che risolve
Una visita adattiva non puo' essere costruita bene partendo solo da testi finali sparsi.

Serve invece un sistema che permetta di:
- controllare prima il significato
- poi controllare la resa
- poi controllare la voce
- poi controllare l'abbinamento visuale

Se salti questo passaggio:
- la personalizzazione drift-a
- la factuality si indebolisce
- le lenti divergono troppo
- il tone of voice diventa incoerente
- le immagini arrivano troppo tardi e male

## Principio guida dello step
Per ogni unita' del sistema non si genera subito il testo finale.

Si costruisce prima una:
- `Semantic Content Base`

e solo dopo si producono:
- le `primary rendition` per le lenti
- gli eventuali `deep dive`
- i `bridge`
- i contenuti `family`
- i contenuti per l'`assistant verticale`
- gli asset visuali associati

Formula chiave:

`prima controlliamo il significato, poi controlliamo la resa`

## Unita' di produzione
Lo step produce contenuti per:
- ogni `POI`
- ogni `segmento`

In piu' produce contenuti trasversali per:
- capitoli di visita
- intro e chiusure
- bridge
- overlay family
- assistant verticale
- personaggi
- layer visuale

## Semantic Content Base
Per ogni `POI` e per ogni `segmento` la piattaforma deve produrre una `Semantic Content Base` semi-strutturata.

Questa base e' il `source of truth editoriale` dell'unita'.
Non e' ancora la scheda finale.

### Contenuto minimo della Semantic Content Base
Per ogni unita' devono esserci almeno:

- `identity`
  - tipo unita': POI o segmento
  - nome
  - ruolo nella visita

- `grounding`
  - dove siamo
  - cosa sta accadendo in questo punto o tratto
  - perche' questo elemento conta nella visita

- `key messages`
  - cosa deve arrivare per forza

- `verified facts`
  - fatti ed elementi verificati rilevanti

- `narrative angles`
  - possibili letture e angoli narrativi

- `lens relevance`
  - quali lenti trovano piu' valore qui

- `expansion potential`
  - cosa puo' diventare approfondimento

- `editorial warnings`
  - sensibilita'
  - cautele
  - cose da non banalizzare

- `delivery constraints`
  - richiede osservazione precisa
  - funziona camminando
  - troppo tecnico
  - troppo visuale
  - adatto al family mode

- `visual affordances`
  - eventuali immagini candidate
  - dettagli visivi forti
  - `visual anchor` rilevanti
  - potenziale clue per il `family mode`

- `question surfaces`
  - domande probabili che possono emergere in questo punto o tratto
  - chiarimenti brevi che il sistema deve saper dare
  - limiti di risposta da non oltrepassare

## Assistant verticale situato
Oltre ai contenuti lineari della visita, questo step deve produrre anche la base per un `assistant verticale` interrogabile durante l'esperienza.

Questo assistant non e':
- una chat generica sul mondo
- un LLM libero senza confini
- un secondo tour che compete col percorso principale

E' invece:
- situato nel progetto
- fondato sulla `Verified Knowledge Base`
- ancorato a POI, segmenti, capitoli e contesto di sessione
- pensato per rispondere a domande che nascono durante la visita

Formula chiave:

`non un chatbot generico, ma un assistant verticale e situato nel luogo`

## Assistant Answer Base
Per ogni progetto va prodotto anche un `Assistant Answer Base Set`.

Questo set deriva dalla:
- `Semantic Content Base`
- `Verified Knowledge Base`
- `Visitor Question Source Set`

e deve permettere almeno di rispondere a:
- cosa sto guardando
- perche' questo punto conta
- cosa significa un dettaglio appena visto
- chiarimenti brevi su termini, eventi o persone citate
- domande pratiche o contestuali gia' previste dal progetto

### Struttura minima di una assistant unit
Ogni unita' di risposta dovrebbe avere almeno:
- `assistant_unit_id`
- `scope`
  - POI, segmento, capitolo o progetto
- `trigger questions`
  - formulazioni attese o molto probabili
- `verified answer base`
  - risposta breve, controllata e verificata
- `extended answer`
  - variante un po' piu' ricca, se utile
- `session relevance`
  - quando ha senso proporla o usarla
- `do not answer beyond`
  - limiti e cautele
- `handoff suggestion`
  - se e' meglio rimandare al contenuto lineare o a un punto successivo della visita

## Regole dell'assistant
L'assistant deve:
- rispondere in modo breve e situato
- privilegiare il contesto della visita corrente
- usare la KB verticale del progetto
- mantenere coerenza con factuality, tono e limiti editoriali

L'assistant non deve:
- inventare fuori dalla KB approvata
- prendere il posto della guida principale
- aprire digressioni lunghe che rompono il ritmo
- contraddire il piano di visita o anticipare inutilmente capitoli futuri

## Review e approvazione
La `Semantic Content Base` non e' solo output interno.
E' anche il punto principale di review editoriale.

### Regola base
- review `Toolia` sempre
- review `cliente` quando il progetto, il tono o la governance lo richiedono

La logica e':
- se sbagli la base semantica, tutte le versioni lens-based saranno storte
- se allinei prima la base, la resa finale diventa molto piu' governabile

## Lenti editoriali attive
Le `personas` non coincidono con le `lenti editoriali`.

Le personas servono a capire il visitatore.
Le lenti editoriali servono a produrre contenuto.

Per ogni progetto le lenti editoriali attive devono essere poche e governabili.

Regola pratica:
- `3` lenti editoriali attive come default
- `4` come eccezione
- oltre solo in casi molto motivati

## Primary rendition
Per ogni `POI` e `segmento` devono essere generate tutte le `primary rendition` per le lenti editoriali attive del progetto.

Quindi:
- non produciamo contenuti per ogni persona
- produciamo contenuti per ogni lente editoriale attiva

Questo garantisce:
- copertura completa
- personalizzazione sempre disponibile
- authoring ancora gestibile

### Regola di copertura
Ogni `POI` e `segmento` deve essere leggibile da tutte le lenti attive del progetto.

Ma:
- non tutte le lenti meritano la stessa profondita'
- la resa puo' essere piu' ricca o piu' leggera in base alla rilevanza dell'unita' per quella lente

## Deep dive
I `deep dive` non vanno generati ovunque.

Vanno prodotti solo:
- per POI o segmenti che lo meritano davvero
- per le lenti forti in quel punto
- quando la visita canonica e le regole di adattamento rendono plausibile il loro uso

Quindi:
- `primary rendition` per tutte le lenti attive
- `deep dive` solo selettivi

## Grounding
La scheda "core" del POI non e' obbligatoria in assoluto.

Ma ogni POI che entra in visita deve avere almeno un `grounding` minimo.

Questo grounding puo' arrivare da:
- una resa generale del POI
- una primary lens-based autosufficiente
- un bridge precedente
- un'introduzione di segmento

Quindi:
- la `core card` non e' sempre obbligatoria
- il `grounding` si'

## Contenuti di segmento
I segmenti non sono solo collegamenti.
Possono ospitare contenuti propri.

I contenuti di segmento servono quando:
- il senso sta nel tratto
- il passaggio ha valore paesaggistico o atmosferico
- serve introdurre un capitolo
- serve accompagnare il visitatore in un cambio di zona
- il contenuto non richiede osservazione di un punto preciso

Per i segmenti produciamo:
- `segment body`
- eventuali `lens accent`
- eventuali contenuti di contesto o orientamento

## Bridge
I `bridge` sono oggetti di contenuto veri.
Non testo accessorio.

Ogni bridge ha tre layer:

### 1. Navigation
Istruzione di movimento.
Breve, chiara, anche landmark-based quando la geometria non e' abbastanza precisa.

### 2. Bridge body
Il raccordo principale del tratto.
Tiene il filo narrativo e spiega il senso del passaggio.

### 3. Lens accent
Modulo separato e opzionale.
Si attiva solo quando aggiunge valore reale rispetto alla lente dominante.

## Narratori e personaggi
Il tour e' `multivoce`, ma non corale senza gerarchia.

La struttura narrativa di default deve essere:
- `1 narratore backbone`
- `0..n personaggi contestualizzati`

## Narratore backbone
Il narratore principale puo' essere:
- neutro
- oppure solo leggermente caratterizzato

Deve:
- tenere insieme la visita
- reggere orientamento e bridge principali
- aprire e chiudere i capitoli
- sostenere i contenuti generali

Non deve essere:
- troppo artificiale
- troppo invadente
- troppo teatrale

## Personaggi contestualizzati
I personaggi secondari servono a:
- dare memoria
- dare colore
- aggiungere punto di vista
- portare competenza specifica
- aumentare l'ingaggio

Non vanno legati rigidamente alle lenti.

Le lenti decidono:
- cosa privilegiamo

I personaggi decidono:
- chi parla
- con quale postura
- con quale credibilita'

## Tipi di personaggio ammessi
Il sistema deve supportare tre tipi:

### 1. Reali o storicamente fondati
I piu' forti quando esistono davvero.

### 2. Ruoli tipici contestualizzati
Custode, abitante, lavoratore, guida locale, esperto situato.

### 3. Compositi narrativi
Figure costruite per sintetizzare un punto di vista.
Da usare con piu' cautela.

Regola di preferenza:

`reale > ruolo contestualizzato > composito`

## Character Contract
Per ogni personaggio va creato un `Character Contract`.

Deve contenere almeno:
- `identity`
  - chi e'
  - tipo
- `relationship to place`
  - che rapporto ha col luogo
- `function`
  - guida
  - testimone
  - esperto
  - gioco/missione
- `territory of competence`
  - su cosa parla bene
- `territory of presence`
  - dove entra davvero
- `target`
  - adulti
  - generalista
  - family
- `tone and register`
- `factual limits`
- `things to avoid`

Formula chiave:

`se il narratore e' un personaggio, entra nell'architettura; se e' solo una voce, entra nella resa`

## Assegnazione dei contenuti ai personaggi
I personaggi non vanno assegnati in modo casuale a singoli testi.
Devono avere:
- un territorio di competenza
- un territorio di presenza
- una funzione precisa nella visita

Quindi i contenuti devono nascere gia' sapendo:
- chi puo' reggerli bene
- chi no
- quando tornare al narratore backbone

## Visual Asset Layer
Le immagini non sono allegati.
Sono un layer del prodotto.

Vanno trattate come:
- fonte di comprensione
- strumento di pairing
- supporto editoriale
- supporto family/kids

Questo layer non nasce da zero in questo step.
Eredita:
- `Visual Source Pack` dallo Step 1
- `Visual Reference Inventory`, `Visual Anchor Set` e `Clue Candidate Set` dallo Step 2
- i vincoli architetturali del `family mode` dallo Step 4

## Tipi di asset visivi

### 1. Documentary images
- foto reali del luogo
- foto dei POI
- dettagli osservabili
- immagini storiche o di archivio autorizzate

### 2. Illustrative images
- diagrammi
- mappe esplicative
- schemi
- visualizzazioni di concetti

### 3. Generated images
- volti dei personaggi
- visual fantasy per family/kids
- ricostruzioni evocative
- supporti per concetti complessi

## Reference visual layer e delivery visual layer
Le immagini reali hanno due ruoli diversi.

### Reference visual layer
Serve alla piattaforma per:
- capire il luogo
- riconoscere dettagli stabili
- trovare `clue candidates`
- ancorare i personaggi al contesto reale
- generare illustrazioni coerenti

### Delivery visual layer
E' quello che finisce nell'app:
- foto reali associate alle schede
- immagini di segmento
- placeholder
- illustrazioni generate
- character art
- clue cards

## Regola sulle immagini pubblicate
Ogni scheda pubblicata deve avere almeno un `visual asset principale`.

L'asset puo' essere:
- reale
- illustrativo
- generato

a seconda del tipo di contenuto.

## Pairing visuale
L'abbinamento immagine-scheda puo' chiudersi anche dopo la generazione delle versioni lens-based.

Per non bloccare il flusso:
- sono ammessi `placeholder`
- sono ammesse immagini generali di segmento
- sono ammesse hero image di macro-zona

Quindi non serve sempre l'immagine perfetta per chiudere la produzione semantica.

## EXIF / GPS
Se le immagini reali hanno EXIF con GPS valido, il sistema deve sfruttarlo automaticamente per:
- proporre macro-zone
- proporre POI o segmenti vicini
- precompilare il workspace spaziale
- ordinare il materiale visivo

Per immagini senza GPS o con GPS inutile:
- la piattaforma propone
- Toolia conferma o corregge

Il workflow corretto e':
- `auto-linked`
- `suggested`
- `manual` solo per i casi residui

## Tagging del layer visuale
Ogni immagine dovrebbe avere almeno:
- `project`
- `macro_zone`
- `poi_id` o `segment_id`
- `asset_type`
- `role`
- `target`
- `lens_fit`
- `stable_detail`
- `reference_only` o `delivery_candidate`

## Family mode
Il `kids dedicated track` viene eliminato dal modello base.

Al suo posto esiste:
- `tour standard`
- `family mode` come overlay editoriale sul tour standard

Il family mode:
- non cambia il backbone della visita
- non genera un percorso separato
- inserisce `micro-missioni kids` in punti selezionati
- usa lo stesso device della guida adulta

Formula chiave:

`il family mode non e' una guida separata: e' un layer ludico-editoriale che si innesta sul percorso comune`

## Target del family mode
Il target di riferimento e':
- bambini delle primarie `6-10 anni`

Questa e' la fascia che va progettata come default.

Per semplificare:
- si assume bambino + adulto accompagnatore
- non bambino totalmente autonomo
- non toddler
- non preadolescente come target principale

## Family Rhythm Model
Il family mode deve avere un proprio `rhythm model`.

### Regole base
- `1 solo device condiviso`
- contenuto adulto come backbone
- micro-missione kids `dopo` il contenuto adulto
- budget unico di visita che include adulti + kids + cammino + buffer

### Cadenza
Non una regola rigida, ma un ritmo target.

Riferimento utile:
- circa un momento kids ogni `12-18 minuti` outdoor
- piu' frequente indoor, se il luogo lo richiede

Con due vincoli:
- `max gap` senza attivazione kids
- `min gap` tra due missioni

### Durata missioni
Default:
- 20-60 secondi per le piu' brevi
- 1-2 minuti per le piu' ricche
- raramente oltre

## Family overlay pack
Per un sottoinsieme curato di `POI` e `segmenti` si produce un `Family Overlay Pack`.

Contiene:
- `kid mission brief`
- `clue`
- `hint ladder`
- `reward`
- `family handoff`
- eventuale `character cue`
- eventuale `visual cue`

Regola importante:
- non produciamo missioni per tutto
- produciamo un set curato, con ritmo editoriale preciso

## Tipi di micro-missione

### `POI mission`
Osserva, cerca o indovina davanti a un punto preciso.

### `Segment mission`
Funziona camminando o attraversando un tratto.

### `Sync mission`
Riallinea bambino e adulto e aiuta il genitore a trasferire una nozione predigerita.

## Immagini family e kids
Le immagini reali servono alla piattaforma per:
- identificare clue
- avere una base di riferimento per generare illustrazioni coerenti

Le immagini generate servono a:
- dare volto ai personaggi
- introdurre missioni
- creare reward
- rendere piu' ingaggiante il layer family

Ma gli indizi non devono appoggiarsi solo alla fantasia.
La soluzione deve sempre agganciarsi a qualcosa di reale e osservabile nel luogo.

## Personaggio ricorrente family
Il family mode deve avere:
- `1 personaggio kids ricorrente`

Non sempre parlante.
Ma abbastanza presente da dare:
- identita'
- continuita'
- familiarita'

## Cosa produce questo step
Gli output minimi sono:
- `Semantic Content Base Set`
- `Primary Rendition Set`
- `Deep Dive Set`
- `Segment Content Set`
- `Bridge Set`
- `Assistant Answer Base Set`
- `Character Contract Set`
- `Visual Pairing Base`
- `Family Overlay Pack Set`
- `Published Content Readiness Model`

## Published Content Readiness
Una unita' di contenuto e' pronta a essere pubblicata quando ha almeno:
- base semantica approvata
- primary rendition approvata
- assegnazione narrativa chiara
- grounding sufficiente
- almeno un visual asset principale
- eventuali warning risolti

## Cosa non deve fare questo step
Step 5 non deve ancora:
- comporre la visita finale del singolo utente
- decidere il routing runtime definitivo
- generare audio finale come asset di delivery
- fare packaging dell'app

Questo step produce il catalogo modulare dei contenuti pronti alla composizione.

## Quando si chiude davvero lo step
Step 5 si chiude quando:
- ogni POI e segmento ha una base semantica approvata
- le lenti editoriali attive hanno copertura primaria completa
- i deep dive esistono dove servono davvero
- l'assistant verticale ha una base di risposte abbastanza controllata
- i narratori e personaggi hanno contratti coerenti
- il layer visuale e' abbastanza classificato e abbinato
- il family mode ha un set curato di missioni e asset
- il catalogo contenutistico e' abbastanza completo da supportare la composizione finale

## Traduzione implementativa minima
Questo step dovrebbe lasciare almeno questi artefatti operativi:
- `Semantic Content Base Registry`
- `Rendition Catalog`
- `Character Contract Set`
- `Visual Pairing Base`
- `Assistant Answer Base Set`
- `Family Overlay Pack`

Regole forti per l'implementazione:
- ogni unita' di contenuto deve avere stato di review e approvazione leggibile
- i testi primary devono esistere per tutte le lenti attive, ma i deep dive solo dove servono
- il `Narrator backbone` e i personaggi contestuali devono essere assegnati tramite contratti espliciti, non con testo libero occasionale
- il layer visuale deve distinguere chiaramente `reference`, `delivery`, `generated`

Anti-pattern da evitare:
- generare contenuti core live in sessione
- trattare immagini e missioni family come allegati finali invece che come parte del contenuto
- creare personaggi senza territorio di competenza o senza limiti di voce

## Formula chiave dello step
`Il contenuto non si produce come testo finale isolato: si produce come catalogo modulare controllato.`

## Cosa prepara per lo Step 6
Lo Step 5 prepara direttamente lo Step 6, perche' rende possibile:
- comporre la visita finale del singolo utente
- selezionare contenuti in base a durata e profilo
- orchestrare bridge, segmenti, POI e overlay family
- rendere interrogabile la KB verticale durante la visita
- generare audio e asset runtime
- pubblicare una guida coerente e davvero fruibile
