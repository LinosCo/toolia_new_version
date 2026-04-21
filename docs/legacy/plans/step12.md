# Step 12 - Interaction model e information architecture della visitor app

## Scopo dello step
Questo step prende:
- il motore runtime definito negli Step 6-10
- la visitor UX di alto livello definita nello Step 7
- il capability model definito nello Step 9
- il design system e template modulare definiti nello Step 11

e li traduce nel comportamento concreto della app visitatore.

Le regole definite qui devono valere sia per:
- la `Project Web Preview App` usata per testing
- la futura app nativa del progetto

Qui non stiamo piu' decidendo:
- cosa sa fare il sistema in astratto
- come viene tematizzata l'app

Stiamo decidendo:
- come si entra in un progetto
- come si sbloccano funzioni e contenuti
- come si sceglie la lingua
- come si usa menu, mappa e player
- come si attivano i POI
- come si gestiscono onboarding, help, assistant, family mode e recovery

## Problema strategico che risolve
Senza un interaction model esplicito, il team di implementazione finisce per inventare da solo:
- accessi
- stati
- menu
- regole di attivazione dei contenuti
- fallback
- logiche premium

Questo e' pericoloso perche':
- rende incoerente l'app tra progetti
- introduce abusi o buchi nelle feature premium
- rompe l'esperienza in luoghi indoor, outdoor o ibridi
- crea troppe divergenze tra visitor app, runtime e capability model

In una frase:

`senza interaction model, la app resta troppo interpretabile per essere implementata bene`

## Decisione di fondo dello step
La scelta forte di questo step e' questa:

`la app deve essere semplice da usare, ma governata da regole esplicite`

Questo significa:
- poche azioni principali
- percorsi d'uso leggibili
- entitlement chiari
- fallback robusti
- nessuna dipendenza da un solo trigger o da un solo canale di accesso

e, in piu':
- gli stessi flussi fondamentali devono essere validabili sul web prima dell'implementazione nativa

## Principi guida dello step

### 1. One clear next action
In ogni stato principale l'utente deve capire subito:
- cosa puo' fare adesso
- cosa succede dopo

### 2. Progressive disclosure
La app non deve mostrare tutta la complessita' all'inizio.
Deve rivelarla solo quando serve.

### 3. Multi-trigger reliability
POI e contenuti non devono dipendere da un solo meccanismo di attivazione.

### 4. Capability-aware interaction
La app deve adattare i suoi flussi alle capability attive del progetto, senza generare buchi o UI morte.

### 5. Time-bounded entitlement
Gli sblocchi premium non devono essere indefiniti per default.
Devono avere:
- una durata chiara
- uno scope chiaro
- un comportamento chiaro allo scadere

### 6. Offline-safe first, connected-enhanced second
La app deve funzionare in modo base anche senza rete, ma usare la connessione quando porta valore reale.

## Oggetti fondamentali dello step
Gli oggetti canonici di questo step sono:
- `App Entry Model`
- `Unlock Model`
- `Entitlement Duration Model`
- `Language Selection Model`
- `Navigation Model`
- `Menu Model`
- `Map Interaction Model`
- `Player Interaction Model`
- `POI Activation Model`
- `Onboarding and Help Model`
- `Offline and Recovery Interaction Model`

## App entry model
La app deve supportare almeno questi ingressi:
- apertura standard dell'app
- apertura diretta di un progetto
- ingresso via QR code
- ingresso via link condiviso
- ripresa di una sessione esistente

### Obiettivo UX
L'utente non deve doversi chiedere:
- dove entro
- cosa devo sbloccare
- se sto aprendo il progetto giusto

## Accesso al progetto
L'accesso a un progetto puo' avvenire almeno tramite:
- selezione manuale dalla lista progetti disponibili
- scansione di un `project QR`
- deep link
- codice breve o password

La UI deve distinguere chiaramente:
- accesso al progetto
- sblocco di feature o contenuti premium

Queste due cose non devono essere sempre fuse, perche' un progetto puo':
- essere accessibile a tutti
- ma avere capability premium da sbloccare

## Unlock model
Il modello di sblocco deve essere esplicito e time-bounded.

La app deve poter supportare almeno:
- `free access`
- `included access`
- `premium unlock`
- `custom entitlement`

### Canali di sblocco minimi
- QR code
- password / codice
- entitlement preassegnato
- link con token

## Premium unlock model
Le funzioni premium non devono essere sbloccate a tempo indefinito per default.

Ogni sblocco deve dichiarare almeno:
- `scope`
  - progetto
  - capability
  - bundle di capability
- `duration`
  - es. `1 day`
  - es. `1 week`
  - es. `single session`
  - es. `custom window`
- `binding`
  - device
  - account
  - sessione
- `activation channel`
  - QR
  - password
  - token
- `expiry behavior`

### Regola forte
Se non e' esplicitamente definito altrimenti:
- lo sblocco premium deve avere una durata finita

Questo evita:
- uso improprio
- trasferimento incontrollato
- ambiguita' sul perimetro del servizio

### Durate consigliate
Il sistema dovrebbe supportare nativamente almeno:
- `single session`
- `1 day`
- `1 week`
- `custom`

### Expiry behavior
Alla scadenza, la app deve sapere se:
- disattiva subito la capability
- la mantiene fino a fine sessione in corso
- chiede nuovo sblocco
- degrada a modalita' base

La mia raccomandazione di default e':
- se la sessione e' gia' iniziata, la capability resta valida fino a fine sessione
- non e' pero' riutilizzabile oltre la finestra concessa

## Entitlement duration model
Ogni entitlement dovrebbe avere almeno:
- `entitlement_id`
- `project_id`
- `capability_scope`
- `level`
- `valid_from`
- `valid_until`
- `grace_policy`
- `binding`
- `source`

### Grace policy
Serve una policy esplicita per evitare comportamenti bruschi.

Esempi:
- `no grace`
- `grace until session end`
- `grace for offline session already downloaded`

## Onboarding and guida all'uso
La app deve avere una guida all'uso, ma non deve obbligare ogni utente a un tutorial pesante.

### Livelli consigliati
- onboarding minimo di primo accesso
- tips contestuali in punti critici
- help center leggero sempre accessibile

### Cosa deve spiegare
- come funziona la visita
- come usare player e percorso
- come usare mappa e assistant
- come funzionano family mode e missioni
- come comportarsi offline

### Regola UX
Meglio:
- aiuti brevi e situati

che:
- tutorial lungo iniziale pieno di testo

## Language selection model
La lingua e' una scelta fondamentale e va trattata come parte del flusso principale.

### Momento di scelta consigliato
La lingua va scelta:
- prima dell'inizio effettivo della sessione
- o al primo accesso al progetto, se non gia' nota

### Scope
La lingua puo' essere:
- globale app
- preferenza progetto
- preferenza di sessione

La raccomandazione e':
- lingua scelta a livello di sessione, con memoria della preferenza per il progetto

### Effetti della lingua
La lingua impatta almeno:
- testi UI
- contenuti visita
- audio
- assistant
- family mode

### Fallback
Se una lingua non e' disponibile per tutti i layer, il sistema deve dirlo prima di iniziare.

Esempi:
- UI disponibile ma audio no
- tour disponibile ma assistant no
- tour disponibile ma family overlay solo in lingua base

## Navigation model
La navigation della app deve restare corta e leggibile.

### Sezioni principali consigliate
- `Home / Project Entry`
- `Start Session`
- `Visit`
- `Route / Map`
- `Assistant`
- `Menu / Settings`

In alcuni casi `Assistant` puo' essere:
- pannello contestuale e non tab autonoma

### Regola forte
La navigazione primaria non deve avere troppe voci stabili.
Meglio poche superfici forti e accessi contestuali.

## Menu model
Il menu non deve diventare la sede di tutte le funzioni.
Deve contenere soprattutto:
- lingua
- aiuto
- impostazioni audio
- stato offline/sync
- informazioni sul progetto
- resume/recovery se rilevante
- sblocca premium quando applicabile

Il menu non deve essere il luogo principale da cui si guida la visita.

## Map interaction model
La mappa e' supporto importante ma non centro assoluto della app.

### La mappa deve permettere almeno
- orientamento
- vedere il prossimo punto o tratto
- capire la progressione
- supportare `rejoin`
- evidenziare POI attivabili o gia' attivati

### La mappa non deve di default
- diventare un planner manuale dell'intera visita
- sostituire il player o il flusso di contenuto

### Funzioni possibili della mappa
- evidenzia posizione stimata
- mostra route sequence
- mostra prossimo checkpoint
- mostra POI visitati / non visitati
- consente tap manuale di attivazione solo quando previsto
- supporta vista semplificata indoor/local-map-native

## Player interaction model
Il player e' il centro operativo della visita.

### Funzioni minime
- play / pause
- avanzamento nel contenuto corrente
- skip contenuto
- replay contenuto
- passaggio al successivo quando consentito
- stato di download / availability

### Funzioni opzionali utili
- velocita' di riproduzione
- transcript sintetico
- coda visibile
- mini player persistente

### Regola forte
Il player non deve diventare un semplice componente media.
Deve essere il punto in cui contenuto, percorso e stato della visita si incontrano.

## POI activation model
Questo e' uno dei punti piu' importanti dell'intera app.

La app non deve dipendere da un solo meccanismo di attivazione.

### Trigger supportati
Il sistema dovrebbe supportare almeno:
- `GPS activation`
- `QR activation`
- `visual scan activation`
- `manual activation`
- `code activation`

### Scelta del default per spatial mode

#### `geo-native`
Default consigliato:
- GPS come trigger principale
- manual activation sempre disponibile
- QR come fallback o supporto

#### `local-map-native`
Default consigliato:
- QR o visual scan come trigger principale
- manual activation sempre disponibile
- GPS irrilevante o solo di supporto

#### `hybrid`
Default consigliato:
- combinazione di GPS + QR/scan
- manual activation sempre disponibile

### Regola forte
L'utente deve poter attivare il punto anche se:
- il GPS e' impreciso
- la rete non c'e'
- il luogo e' indoor

Quindi `manual activation` non deve mai mancare come ultimo fallback.

## Visual scan activation
Visto che hai citato la scansione dei POI, questa va modellata bene.

### Obiettivo
Permettere l'attivazione di un contenuto o di un POI:
- senza dipendere dalla posizione GPS
- usando marker visivi, QR o elementi riconoscibili

### Usi plausibili
- musei
- luoghi indoor
- ambienti con GPS debole
- punti da attivare con grande precisione

### Regola
La scansione deve essere:
- rapida
- leggibile
- con fallback immediato

Mai:
- unico canale obbligatorio senza alternativa

## Manual activation model
La manual activation deve essere sempre possibile.

Puo' avvenire da:
- lista tappe
- mappa
- bottone `attiva da qui`
- selezione del prossimo POI

La UI deve presentarla come:
- scelta naturale
- non come fallback di serie B

## Assistant interaction model
L'assistant verticale deve essere accessibile senza rompere il flusso.

### Entrata consigliata
- bottone persistente ma discreto
- entry point nel player o nella shell
- suggerimenti contestuali nei punti complessi

### Azioni supportate
- fare una domanda
- scegliere tra prompt suggeriti
- leggere/ascoltare una risposta breve
- tornare subito al contenuto in corso

### Regola forte
L'assistant non deve aprire una modalita' alternativa di visita.
Deve restare ancillare al percorso principale.

## Family mode interaction model
Nel family mode lo stesso device viene condiviso.

Quindi la app deve poter:
- passare da contenuto adulto a missione kids
- far rientrare tutti nel backbone
- mantenere leggibile chi sta "parlando" adesso

### Funzioni minime
- attivazione della micro-missione
- clue e hint ladder
- reward
- ritorno al tour

### Regola forte
Il family mode non deve creare una doppia navigazione parallela.

## Offline and recovery interaction model
L'app deve rendere comprensibili gli stati offline/online senza linguaggio tecnico.

### Stati minimi da comunicare
- tutto pronto offline
- pronto con elementi ridotti
- rete disponibile, esperienza arricchibile
- sync in corso
- recovery disponibile

### Recovery
L'utente deve poter:
- riprendere una sessione
- continuare dal punto attuale
- riallinearsi sul percorso

senza doversi chiedere che differenza tecnica c'e' tra questi concetti.

## Permission model
Le permission non devono essere trattate come dettaglio tecnico secondario.
Devono essere parte esplicita del modello di interazione.

Permessi minimi da considerare:
- posizione
- camera per QR o visual scan
- eventualmente microfono solo se esistono feature vocali reali

Regole forti:
- chiedere il permesso solo nel momento in cui il valore e' comprensibile
- spiegare sempre il fallback se il permesso viene negato
- non bloccare l'intera visita se un singolo trigger non e' disponibile

## Session identity model
L'esperienza di visita puo' essere anche senza account forte, ma non senza identita' di sessione.

Serve chiarire almeno:
- sessione anonima
- sessione legata al device
- sessione recuperabile
- relazione tra sessione e entitlement temporaneo

Regola forte:
- anche in assenza di login tradizionale deve esistere un'identita' minima di sessione per bundle, resume, unlock e analytics essenziali

## Background audio and interruption model
Il player deve avere una politica chiara su:
- schermo bloccato
- uscita temporanea dall'app
- chiamate o interruzioni di sistema
- cuffie o device audio esterni

Regole forti:
- il contenuto audio deve poter essere messo in pausa e ripreso in modo prevedibile
- l'app deve distinguere tra interruzione di sistema e stop volontario
- la ripresa non deve confondere la coda narrativa o la missione family corrente

## Bundle and storage interaction model
Anche lato UX vanno esplicitati:
- stato del download
- stato di completezza del bundle
- eventuale spazio insufficiente
- stato di aggiornamento o obsolescenza del bundle

Regola forte:
- il visitatore deve capire se il progetto e' pronto prima di iniziare, non scoprire il problema lungo il percorso

## Support and issue reporting
L'app dovrebbe avere almeno un punto minimo di supporto o segnalazione per:
- asset mancanti
- QR non funzionanti
- POI non attivabili
- problemi di ascolto o bundle

Regola forte:
- la segnalazione deve essere rapida e contestuale, senza uscire dall'esperienza o costringere l'utente a descrivere tutto da zero

## Connected interaction model
Quando c'e' rete, la app puo' migliorare l'esperienza.

### Esempi
- sync immediato
- recovery cross-session piu' forte
- assistant piu' ricco
- recalc esplicito disponibile
- download di asset non essenziali

### Regola forte
Queste funzioni devono apparire come plus, non come prerequisiti.

## Error and fallback interaction model
Ogni punto critico deve avere un fallback visibile.

### Casi minimi
- premium unlock fallito
- entitlement scaduto
- lingua non completamente disponibile
- GPS non affidabile
- scan non riuscita
- audio mancante
- asset secondario mancante
- rete assente

### Regola UX
Ogni errore deve dire:
- cosa e' successo
- cosa posso fare adesso
- come continuo senza bloccarmi

## Information architecture minima
La struttura logica della visitor app dovrebbe supportare almeno:
- `Project Entry`
- `Unlock / Access`
- `Language`
- `Start Session`
- `Visit Shell`
- `Map / Route`
- `Assistant`
- `Menu / Settings`
- `Recovery / Resume`

## Output dello step
Gli output minimi di questo step dovrebbero essere:
- `App Entry Model`
- `Unlock Model`
- `Entitlement Duration Model`
- `Onboarding and Help Model`
- `Language Selection Model`
- `Navigation Model`
- `Menu Model`
- `Map Interaction Model`
- `Player Interaction Model`
- `POI Activation Model`
- `Assistant Interaction Model`
- `Family Interaction Model`
- `Offline and Recovery Interaction Model`
- `Permission Model`
- `Session Identity Model`
- `Background Audio and Interruption Model`
- `Bundle and Storage Interaction Model`
- `Support and Issue Reporting Model`
- `Error and Fallback Interaction Model`

## Quando si chiude davvero lo step
Lo Step 12 si chiude quando:
- e' chiaro come si entra in un progetto
- sblocco e premium unlock hanno durata e comportamento espliciti
- lingua, menu, mappa e player hanno regole coerenti
- l'attivazione dei POI non dipende da un solo trigger
- assistant, family, offline e recovery convivono senza ambiguita'

## Traduzione implementativa minima
Questo step dovrebbe lasciare almeno questi artefatti operativi:
- `App Entry Model`
- `Unlock and Entitlement Flow`
- `Language Model`
- `Navigation and Menu Contract`
- `Activation Model`
- `Permission and Recovery Rules`

Regole forti per l'implementazione:
- l'app non deve dipendere da un solo trigger di attivazione
- i flussi premium devono essere time-bounded e capability-aware
- permessi, stati offline, bundle readiness e recoverability devono essere trattati come parti del modello di interazione
- le scelte fatte qui devono valere sia per web preview sia per native, con adattamenti solo dove il device lo richiede

Anti-pattern da evitare:
- navigation troppo ricca rispetto al vero uso sul campo
- sblocchi premium senza durata o binding esplicito
- visual scan o GPS trattati come unica strada per arrivare al contenuto

## Formula chiave dello step
`La app deve essere semplice da usare per il visitatore, ma rigorosa nelle sue regole di accesso, attivazione e recovery.`

## Cosa prepara dopo
Con questo step la visitor app e' ormai descritta quasi completamente.

Prepara direttamente:
- lo `Step 13`, cioe' la pipeline `platform -> web preview -> Expo app`
- l'applicazione concreta dei documenti trasversali:
  - `DATA_MODEL.md`
  - `STATE_MACHINE.md`
  - `RUNTIME_CONTRACTS.md`
  - `IMPLEMENTATION_PLAN.md`

In pratica:
- Step 11 definisce pelle e guardrail
- Step 12 definisce comportamento e interazione
- Step 13 definisce come tutto questo diventa una project app reale
