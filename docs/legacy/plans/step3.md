# Step 3 - Driver, personas e inferenza

## Scopo dello step
Questo step non serve a generare semplicemente dei "temi".

Serve a trasformare:
- strategia del progetto
- fonti
- tensioni editoriali
- conoscenza del luogo
- mappa logica prodotta nello Step 2

in un sistema che renda possibile la personalizzazione senza perdere coerenza narrativa.

Se Step 1 definisce il campo da gioco e Step 2 costruisce la verita' spaziale utile, Step 3 definisce:
- per chi quel luogo puo' essere raccontato in modi diversi
- con quali assi narrativi
- con quale logica di personalizzazione
- con quali vincoli di continuita'

## Problema strategico che risolve
Lo stesso luogo puo' essere interessante per persone molto diverse.

Non basta sapere:
- cosa c'e' nel luogo
- come e' fatto
- come si attraversa

Bisogna capire:
- per chi quel luogo puo' diventare rilevante
- quale lettura merita per ciascun tipo di visitatore
- come personalizzare senza distruggere il racconto

Esempio: Cascate di Molina.
Lo stesso luogo puo' essere vissuto da:
- famiglie in cerca di meraviglia, scoperta e orientamento
- geologi affascinati da pareti rocciose, corsi d'acqua e processi naturali
- botanici attenti a specie, habitat, stagionalita' e microecologie

Non si tratta di inventare tre prodotti falsi.
Si tratta di progettare piu' letture vere della stessa esperienza.

## Perche' questo step e' decisivo
I driver non sono tag.
Le personas non sono etichette di marketing.
Il wizard non e' un form di preferenze.

Questo step e' il punto in cui Toolia decide:
- come il luogo viene letto dal sistema
- per quali tipi di visitatore merita una narrazione dedicata
- come trasformare segnali deboli del visitatore in una visita davvero personalizzata
- come farlo senza produrre un collage incoerente

## Decisione chiave emersa
Il sistema non deve guardare solo il prodotto.
Deve guardare il consumatore.

Questo significa:
- il visitatore non deve scegliere il prodotto tra categorie costruite da noi
- il wizard deve capire chi abbiamo davanti
- l'obiettivo non e' fargli configurare l'architettura editoriale
- l'obiettivo e' offrirgli la miglior versione possibile dell'esperienza

## Distinzione fondamentale dello step
Qui vanno separati almeno quattro layer diversi.

### 1. Driver interni
Sono gli assi profondi del progetto.
Servono a Toolia per:
- leggere il luogo
- costruire il racconto
- orientare narratori, schede, POI e itinerari
- governare il grading in modo non superficiale

Non sono necessariamente visibili all'utente.

### 2. Personas di progetto
Sono profili visitatore rilevanti per quel luogo specifico.
Non sono un catalogo fisso universale.
Devono emergere dal progetto.

Per esempio:
- Molina puo' generare personas come botanico, geologo, famiglia esploratrice
- una citta' puo' generare personas come amante dell'architettura, flaneur urbano, curioso di potere e personaggi
- uno zoo puo' generare personas come family discovery, amante della conservazione, curioso di etologia

Le personas quindi sono:
- progetto-specifiche
- interne al motore
- mai dichiarate esplicitamente al visitatore

### 3. Segnali visitor-facing
Sono le poche informazioni che raccogli dal visitatore in modo naturale, senza mostrargli la struttura interna del sistema.

Possono includere:
- passioni
- aspettative
- durata
- composizione del gruppo
- modalita' di fruizione
- contesto della visita
- obiettivo della giornata

Qui possono entrare anche segnali che attivano una modalita' di fruizione particolare, per esempio:
- visita in famiglia con bambini
- desiderio di un'esperienza piu' giocosa o piu' guidata

### 4. Modello di inferenza
E' il layer che traduce i segnali raccolti nel wizard in:
- persona dominante
- eventuali secondarie
- blend controllato
- attivazione dei driver piu' rilevanti
- forma dell'esperienza

## Uso del layer spaziale nello step
La `Logical Map` prodotta nello Step 2 entra qui come contesto e vincolo, non ancora come percorso finale.

Serve a:
- verificare se una persona ha davvero senso per quel luogo
- capire dove certi interessi possono trovare payoff reale
- evitare driver astratti sganciati dalla struttura del progetto
- preparare il lavoro successivo su architettura, segmenti e pruning

In questo step lo spazio non viene ancora pesato editorialmente.
Viene usato per:
- radicare i driver nel luogo
- controllare la plausibilita' delle personas
- evitare promesse personalizzate irrealistiche

## Driver interni: cosa sono davvero
I driver non devono essere semplici argomenti o etichette decorative.

Un driver buono deve:
- leggere davvero il luogo
- generare angoli narrativi diversi
- avere impatto su piu' contenuti
- poter influenzare grading e composizione
- aiutare a distinguere esperienze diverse per visitatori diversi

Quindi un driver non e':
- una categoria troppo micro
- una parola elegante ma vaga
- un singolo aneddoto
- un desiderio del cliente non strutturabile
- un tema scolastico usato solo per classificare

E' invece una leva narrativa profonda.

## Personas: logica e natura
Le personas non possono essere un set fisso uguale per tutti i progetti.
Se lo facessimo, distruggeremmo la parte piu' forte del prodotto.

Serve invece:
- un framework stabile sotto
- personas dinamiche sopra

### Framework stabile sottostante
Il sistema puo' avere una grammatica comune fatta di:
- passioni
- motivazioni
- modalita' di visita
- vincoli fisici
- livello di competenza
- payoff atteso

### Personas dinamiche per progetto
Ogni progetto istanzia queste dimensioni in modo diverso.

Questo permette di scalare senza diventare rigidi:
- non hai un catalogo fisso di personas
- ma non hai neanche caos totale

## Family come modalita' di fruizione
Il target `family` non va trattato come un percorso bambini separato.

In questo step va riconosciuto soprattutto come:
- contesto di visita
- modalita' di fruizione
- possibile attivatore di un overlay specifico

Quindi:
- la presenza di bambini puo' influenzare l'inferenza
- ma non genera qui un secondo tour autonomo
- prepara piuttosto il `family mode` che verra' architettato negli step successivi

## Test di validita' per una persona
Una persona va tenuta solo se rappresenta un tipo di visitatore reale e utile.

Una persona e' valida solo se:
- rappresenta un visitatore plausibile per quel luogo
- ha abbastanza materiale per generare un'esperienza distinta
- cambia davvero cosa raccontiamo o come lo raccontiamo
- e' comprensibile in modo intuitivo
- non si sovrappone troppo alle altre
- ha valore in termini di ingaggio, soddisfazione o conversione

Se non cambia nulla di sostanziale, non e' una persona: e' un'etichetta inutile.

## Cosa propone la piattaforma
Partendo da:
- strategia e fonti
- intervista
- knowledge base verificata
- metodologia di storytelling
- logical map del progetto
- tipo di luogo

la piattaforma propone:
- driver interni del progetto
- personas rilevanti per quel luogo
- mappatura tra personas e driver
- prime ipotesi di personalizzazione per ciascuna persona
- eventuali segnali che suggeriscono l'attivazione di un `family mode`

Queste ipotesi possono riguardare:
- contenuti privilegiati
- tono
- profondita'
- ritmo
- tipo di payoff
- peso del contenuto in sosta o in movimento
- sensibilita' al contesto spaziale del luogo
- opportunita' di overlay family in certi punti della visita

## Cosa fa Toolia
Toolia qui non esegue.
Arbitra.

Deve:
- eliminare personas fittizie o troppo generiche
- fondere personas troppo sovrapposte
- correggere personas troppo prodotto-centriche
- verificare che siano visitatori reali e non solo categorie interne
- validare che ciascuna persona produca un'esperienza davvero diversa
- approvare il sistema finale di driver e personas

La logica e' la stessa gia' emersa negli altri step:
- la piattaforma propone
- Toolia valuta, modifica e approva

## Regola fondamentale lato visitatore
Le personas non devono mai essere dichiarate esplicitamente.

Il visitatore non deve sentirsi classificato.
Non deve scegliere tra personaggi.
Non deve percepire un prodotto a template.

Il wizard non deve dire:
- sei un geologo?
- sei una famiglia esploratrice?
- sei un contemplativo?

Deve invece raccogliere pochi segnali naturali e far percepire che l'esperienza e' cucita su di lui.

Formula chiave:

`Le personas strutturano il motore, ma il visitatore non le vede mai.`

## Passioni e modalita' di fruizione
La personalizzazione non puo' leggere solo il "come".
Deve leggere anche il "cosa".

### Passioni
Servono a capire che cosa accende davvero il visitatore.

Esempi possibili:
- storia
- natura
- architettura
- arte
- tecnologia
- persone e biografie
- paesaggio
- spiritualita'
- produzione
- misteri e leggende

Ma queste passioni vanno sempre contestualizzate al progetto.
Non hanno valore astratto in se'.
Hanno valore quando incontrano una destinazione specifica.

### Modalita' di fruizione
Servono a capire come il visitatore vuole vivere la visita.

Per esempio:
- rapido vs profondo
- essenziale vs ricco
- emotivo vs analitico
- contemplativo vs dinamico
- orientamento vs immersione

### Regola di sintesi
- le passioni orientano il contenuto
- le modalita' di fruizione orientano la forma dell'esperienza

## Il wizard non deve far scegliere il prodotto
Il wizard iniziale non deve chiedere:
- quale versione del progetto vuoi
- quali nostri temi preferisci
- quale prodotto vuoi comprare

Deve invece capire:
- cosa ti appassiona
- che tipo di esperienza cerchi oggi
- quanta profondita' vuoi
- che payoff desideri
- in che contesto stai visitando

In una frase:

`non chiediamo al visitatore quale prodotto preferisce; cerchiamo di capire che tipo di visitatore e' oggi, per offrirgli la miglior forma possibile del luogo`

## Profili misti e blending
Il modello non deve essere binario.
Puo' produrre profili misti.

Per esempio:
- 60% botanico
- 30% family wonder
- 10% contemplativo

Questo e' uno dei punti di forza del sistema:
- il visitatore non viene schiacciato in una categoria unica
- il profilo puo' essere sfumato
- la personalizzazione diventa piu' fine

## Ma serve una dominante narrativa
Il blending non puo' trasformarsi in una miscela democratica di tutto.

Se lo facesse, il rischio sarebbe:
- perdita di identita' del racconto
- effetto collage
- visita che matcha i gusti ma non "sta insieme"

Per questo il motore deve sempre estrarre:
- una dominante narrativa
- una o due secondarie
- un blend controllato

Quindi anche se il profilo e' misto:
- non si costruisce una playlist di pezzi equivalenti
- si costruisce una visita con un asse dominante e alcuni accenti

Formula chiave:

`La personalizzazione decide l'accento, ma la composizione resta autoriale.`

## Le tre forze che il motore deve bilanciare
Il motore di Toolia deve bilanciare sempre almeno tre cose:
- persona fit
- coerenza narrativa
- realta' spaziale del luogo

Se spingi solo sul persona fit:
- ottieni un feed personalizzato, non un'esperienza

Se spingi solo sulla coerenza narrativa:
- ottieni un percorso bello ma poco personale

Se ignori la realta' spaziale:
- prometti un'esperienza che poi il luogo non riesce a sostenere

## Regole di continuita' narrativa
Step 3 non deve dire solo "per chi raccontiamo".
Deve anche dire "come facciamo a raccontare a persone diverse senza perdere un racconto".

Per questo deve produrre anche regole di continuita' narrativa, cioe':
- quali driver possono convivere bene
- quali personas si mescolano bene
- quale asse deve dominare quando il profilo e' misto
- quali transizioni risultano naturali
- quali combinazioni rischiano l'effetto collage

Queste regole sono uno degli output piu' preziosi dello step.

## Ruolo della UI nel motore editoriale
La soluzione non e' solo algoritmica.
E' anche di interfaccia.

La UI del wizard deve impedire profili piatti.
Non deve permettere al visitatore di dire:
- tutto mi interessa tantissimo
- niente mi interessa davvero

Per questo servono meccanismi che forzano una vera priorita':
- punti limitati da distribuire
- ranking
- carte da ordinare
- scelte obbligate
- massimali per singola voce
- numero minimo di preferenze da esprimere

Esempio:
- 10 punti da distribuire
- massimo 5 su una sola passione
- almeno 2 scelte obbligatorie

Questo consente al sistema di distinguere davvero:
- dominante
- seconda priorita'
- area trascurabile

Formula chiave:

`Il wizard non deve chiedere tutto cio' che piace; deve costringere a rivelare cosa conta di piu'.`

## Output interni dello step
Gli output interni minimi sono:
- `Driver Map`
- `Project Personas`
- `Driver-Persona Matrix`
- `Candidate Editorial Lenses`
- `Narrative Continuity Rules`
- `Dominance Rules`
- `Inference Model`
- `Family Mode Trigger Rules`

### Driver Map
Definisce:
- driver interni del progetto
- significato di ciascun driver
- valore narrativo
- tipi di contenuti che abilita

### Project Personas
Definisce:
- personas rilevanti per quel luogo
- chi sono
- cosa cercano
- che payoff desiderano
- che tipo di esperienza prediligono

### Driver-Persona Matrix
Definisce:
- quali driver pesano per quali personas
- quali combinazioni sono piu' forti
- quali driver diventano dominanti in certi profili

### Candidate Editorial Lenses
Definisce il set ridotto di lenti che il progetto potra' sostenere davvero in produzione.

Le personas servono a capire il visitatore.
Le lenti editoriali servono a produrre contenuto.

### Family Mode Trigger Rules
Definisce:
- quando il progetto deve prevedere un `family mode`
- quali segnali del wizard o del brief lo attivano
- se il luogo sembra adatto a micro-missioni e contenuti condivisi adulto-bambino

### Narrative Continuity Rules
Definisce:
- regole contro l'effetto collage
- compatibilita' tra drivers e personas
- linee guida per costruire un asse dominante

### Dominance Rules
Definisce:
- quando un driver o una persona diventa dominante
- quante secondarie sono ammesse
- quando un blend e' troppo dispersivo

### Inference Model
Definisce:
- come il sistema traduce segnali deboli del wizard in un profilo narrativo utilizzabile

## Output lato prodotto
Gli output lato prodotto minimi sono:
- `Visitor Signal Model`
- `Wizard Interaction Rules`
- `Preference Weighting Logic`
- `Family Activation Signals`

### Visitor Signal Model
Definisce quali segnali raccogliamo realmente dal visitatore:
- passioni
- modalita' di fruizione
- durata
- contesto di visita
- gruppo
- obiettivi

### Wizard Interaction Rules
Definisce:
- come porre le domande
- come limitare l'ambiguita'
- come forzare priorita' reali
- come evitare di mostrare la classificazione interna

### Preference Weighting Logic
Definisce:
- come i segnali vengono pesati
- come si ottiene la dominante
- come si ottengono le secondarie
- come si producono eventuali esclusioni o attenuazioni

### Family Activation Signals
Definisce i segnali minimi con cui il sistema riconosce:
- visita con bambini
- bisogno di un ritmo piu' adatto alla famiglia
- opportunita' di attivare un overlay family sul tour standard

## Cosa non deve fare questo step
Step 3 non deve ancora:
- definire il percorso fisico finale
- attribuire rilevanza editoriale definitiva a segmenti e rami
- costruire il percorso completo canonico
- costruire il pruning
- produrre le schede
- esporre le personas come categorie UX

Queste cose arrivano dopo.

Qui si costruisce il motore concettuale della personalizzazione, radicato pero' nella verita' spaziale del progetto.

## Quando si chiude davvero lo step
Step 3 si chiude quando:
- i driver del progetto sono abbastanza chiari
- le personas sono abbastanza plausibili e utili
- il mapping tra driver e personas e' governabile
- il wizard ha una logica abbastanza forte per inferire una dominante
- esistono regole sufficienti per non rompere il filo narrativo
- il sistema di personalizzazione e' compatibile con la struttura reale del luogo

## Obiettivo finale dello step
Capire:
- per chi quel luogo puo' essere raccontato in modi diversi
- con quali assi narrativi
- con quale sistema di inferenza
- e con quali regole di continuita'

in modo che la visita sembri costruita per il singolo visitatore senza perdere una forma narrativa coerente e praticabile.

## Traduzione implementativa minima
Questo step dovrebbe lasciare almeno questi artefatti operativi:
- `Driver Map`
- `Project Personas`
- `Driver-Persona Matrix`
- `Candidate Editorial Lenses`
- `Inference Model`
- `Family Activation Signals`

Regole forti per l'implementazione:
- le `personas` restano oggetti interni di progetto, non etichette da esporre al visitatore
- il wizard deve raccogliere segnali visitor-facing semplici e mapparli a driver/lenti in backend
- il `family mode` va trattato come modalita' di fruizione, non come tour separato
- la compressione `personas -> lenti editoriali attive` deve avvenire prima della produzione contenutistica

Anti-pattern da evitare:
- far scegliere all'utente una persona o una lente con linguaggio interno al sistema
- usare direttamente le stelle o le preferenze come verita' narrativa finale senza inferenza
- produrre testi o percorso finale gia' in questo step

## Formula chiave dello step
`La personalizzazione decide l'accento, ma la composizione resta autoriale.`

## Cosa prepara per lo Step 4
Step 3 prepara direttamente lo Step 4, perche' rende possibile decidere:
- quale architettura dell'esperienza ha senso
- come costruire il percorso completo canonico
- come pesare segmenti, POI e diramazioni
- come trasformare driver e personas in logiche di visita
- come evitare che la personalizzazione rompa il racconto
