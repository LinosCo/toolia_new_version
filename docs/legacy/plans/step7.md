# Step 7 - UX/UI dell'esperienza di visita

## Scopo dello step
Questo step prende:
- il `Runtime Manifest`
- il `Session Bundle`
- il `Visit Assistant Pack`
- il `Family Overlay Schedule`
- la `Connected Assist Policy`

e li traduce nell'esperienza concreta che il visitatore vede, tocca e percepisce nell'app.

Qui non definiamo piu' il motore interno.
Definiamo:
- come il visitatore entra nella visita
- come capisce dove si trova
- come ascolta, guarda, avanza e si riallinea
- come usa l'assistant senza rompere il ritmo
- come il family mode convive con il tour adulto
- come l'app comunica offline, sync, errori e recovery

## Problema strategico che risolve
Fino allo Step 6 il sistema e' stato reso logicamente robusto.

Ma robustezza interna non significa ancora:
- esperienza leggibile
- sensazione di fluidita'
- percezione di personalizzazione
- fiducia nell'app sul campo

Il rischio qui e' doppio:
- mostrare troppa complessita' e far sentire il motore
- oppure nascondere tutto cosi' tanto da far perdere orientamento e controllo

Questo step serve a trovare l'equilibrio giusto tra:
- guida
- autonomia
- chiarezza
- immersione

## Decisione di fondo dello step
La scelta forte di UX e' questa:

`l'esperienza e' player-centric, ma route-aware`

Questo significa:
- il centro della visita non e' una mappa piena di pin
- il centro della visita non e' neanche un player audio isolato dal luogo
- il cuore dell'esperienza e' il contenuto in corso
- ma sempre dentro una progressione spaziale leggibile

Quindi il visitatore deve sentire:
- cosa sta ascoltando ora
- dove si trova nel percorso
- cosa viene dopo
- quanto gli manca

senza essere costretto a gestire la complessita' del motore.

## Principi guida dello step

### 1. Una visita, non un menu
L'app non deve sembrare un catalogo di tappe o contenuti.
Deve sembrare una visita che scorre.

### 2. Progressione prima di esplorazione libera
La UI deve privilegiare:
- cosa sto facendo adesso
- qual e' il prossimo passo
- come continuo

La mappa e l'elenco tappe sono supporti, non il centro del prodotto.

### 3. Personalizzazione implicita
Il visitatore non deve sentire:
- categorie interne
- lenti
- personas
- logiche di scoring

Deve sentire:
- questa visita e' per me
- il ritmo e' giusto
- i passaggi hanno senso

### 4. Offline-safe by default
L'UX non deve dare per scontato che ci sia rete.

Le parti essenziali devono essere:
- leggibili offline
- avviabili offline
- recuperabili offline

### 5. Escalation chiara, non invasiva
Feature piu' ricche come:
- assistant
- sync live
- recalc
- asset extra

devono comparire come miglioramenti, non come dipendenze incomprensibili.

## Le due superfici da distinguere
Questo step riguarda prima di tutto la `visitor app`.

Non riguarda ancora in profondita':
- workspace editoriale Toolia
- pannelli operativi interni
- authoring UI

Questi arriveranno in uno step successivo.

## Architettura UX della visitor app
La visitor app dovrebbe essere organizzata in sei layer principali:

### 1. Session start
Serve a:
- confermare la visita
- chiarire durata e modalita'
- verificare readiness del bundle
- far partire la sessione con fiducia

### 2. Active visit shell
E' il contenitore persistente della visita in corso.
Deve sempre dare accesso a:
- player
- avanzamento
- prossimo passo
- assistant
- family moments quando attivi

### 3. Content playback surface
E' il cuore dell'esperienza.
Qui il visitatore fruisce:
- schede POI
- contenuti di segmento
- bridge
- intro e chiusure

### 4. Route awareness layer
Fa capire:
- dove siamo
- cosa abbiamo fatto
- cosa manca
- dove andare dopo

### 5. Assistance layer
Comprende:
- assistant verticale
- stati di recovery
- aiuti di riallineamento
- suggerimenti connessi non critici

### 6. Family overlay layer
Quando attivo, inserisce:
- micro-missioni
- clue
- reward
- handoff per il genitore

senza creare un secondo tour concorrente.

## Session start UX
Lo start session deve essere corto, chiaro e rassicurante.

Non deve sembrare un setup tecnico.
Deve sembrare la preparazione concreta alla visita.

### Elementi minimi
- titolo della visita
- durata scelta o rilevata
- eventuale family mode attivo
- stato bundle
- messaggio semplice su offline/online
- call to action unica: `inizia la visita`

### Readiness UX
Lo stato del bundle deve essere mostrato in modo molto leggibile.

Almeno tre stati:
- `pronta`
- `pronta con elementi secondari mancanti`
- `non ancora pronta`

L'utente non deve vedere:
- download tecnici poco interpretabili
- liste di asset
- dettagli da debug

Deve capire solo:
- posso partire ora
- posso partire ma con qualche elemento meno ricco
- devo aspettare ancora un attimo

## Active visit shell
La shell della visita deve restare stabile per tutta la sessione.

Deve contenere almeno:
- area contenuto principale
- player persistente
- stato di avanzamento
- accesso rapido all'assistant
- accesso rapido alla vista percorso
- accesso al family overlay quando attivo

Questa shell deve ridurre al minimo:
- cambi di contesto bruschi
- navigazione gerarchica profonda
- schermate che fanno "uscire" dalla visita

## Content playback surface
Questa e' la superficie principale dell'app.

Per ogni item della queue deve mostrare almeno:
- titolo o etichetta del momento corrente
- speaker o personaggio quando rilevante
- visual asset principale
- testo breve o supporto visuale minimo
- player audio
- progresso del singolo contenuto
- azione chiara per andare avanti o saltare

## Gerarchia dei contenuti
La UI deve far capire la differenza tra:
- contenuto principale del momento
- contenuti di raccordo
- eventuali approfondimenti
- overlay family

Ma senza trasformare tutto in tassonomia tecnica.

La gerarchia giusta e':
- `ora`
- `subito dopo`
- `piu' tardi`

non:
- tipo contenuto A
- tipo contenuto B
- tipo contenuto C

## Route awareness layer
Anche se il prodotto non e' map-centric, il visitatore ha bisogno di orientamento.

La route awareness dovrebbe dare almeno:
- stato della visita
- checkpoint attuale
- prossimo POI o tratto
- stima del tempo rimanente
- possibilita' di vedere il percorso in forma semplice

### Forme possibili
La route awareness puo' manifestarsi come:
- timeline di visita
- lista ordinata di tappe
- mini-mappa
- stato di capitolo

La raccomandazione e':
- timeline/lista semplice come default
- mappa come supporto secondario, non come home primaria

## Mappa
La mappa serve, ma non deve comandare l'esperienza.

La sua funzione principale e':
- rassicurare
- aiutare il rejoin
- far vedere la prossima direzione
- spiegare un tratto o un punto

Non dovrebbe diventare:
- il centro della navigazione primaria
- il luogo dove il visitatore gestisce manualmente tutta la visita

## Assistant verticale
L'assistant e' una feature importante della UX.

Non deve apparire come chatbot generico.
Deve apparire come:
- aiuto contestuale
- estensione intelligente della visita
- strumento per sciogliere dubbi che nascono sul posto

### Trigger UX consigliati
- bottone persistente ma discreto
- prompt contestuali in punti complessi
- suggerimenti di domanda breve
- accesso veloce dal contenuto corrente

### Regole UX
L'assistant deve:
- privilegiare il punto o tratto corrente
- rispondere breve per default
- permettere un follow-up limitato
- saper rientrare nel percorso

L'assistant non deve:
- trasformarsi in schermata separata dominante
- portare il visitatore fuori dalla visita per troppo tempo
- diventare una chat infinita

## Family mode UX
Il family mode non e' un secondo canale continuo.
E' un overlay episodico sullo stesso device.

Quindi la UI deve gestire molto bene:
- transizione tra contenuto adulto e missione
- brevissima deviazione d'attenzione
- ritorno naturale al backbone

### Regola chiave
La missione kids arriva di default:
- dopo il contenuto adulto del punto o tratto

### UI minima della missione
- personaggio kids ricorrente
- obiettivo breve
- clue leggibile
- eventuale hint progressivo
- reward piccolo ma percepibile
- chiusura con handoff o ritorno al tour

### Cosa evitare
- missioni lunghe
- schermate troppo dense
- cambio completo di linguaggio dell'app
- doppia navigazione adulta/kids in parallelo

## Progress, skip, pause, resume
L'app deve accettare che una visita reale non sia lineare al 100%.

Per questo servono controlli chiari ma sobri:
- `pausa`
- `riprendi`
- `salta`
- `continua da qui`

### Skip
Lo skip non deve sembrare un errore.
Deve sembrare una possibilita' naturale.

### Resume
Il resume deve essere immediato:
- stesso contenuto
- stesso checkpoint
- stesso stato family

### Rejoin
Il rejoin deve essere una funzione leggibile, non un concetto interno.

UI consigliata:
- `continua da qui`
- `vai al prossimo punto previsto`

Non:
- linguaggio tecnico sul routing o ricalcolo

## Recalc UX
Il recalc non e' default.

Quindi la UI non deve spingere continuamente a ricalcolare.
Deve offrire il recalc solo quando serve davvero e, preferibilmente:
- come azione esplicita
- con una spiegazione semplice
- solo se il sistema puo' supportarlo bene

UI consigliata:
- `vuoi riallineare la visita da qui?`

Non:
- ricalcoli silenziosi
- popup continui
- comportamenti imprevedibili

## Offline / connected states
L'utente deve capire lo stato di connessione senza essere costretto a interpretare l'infrastruttura.

La UI dovrebbe distinguere in modo semplice:
- visita pronta offline
- visita pronta ma arricchibile
- sync in corso
- connessione assente ma visita sicura
- recupero disponibile

La comunicazione deve essere:
- rassicurante
- poco tecnica
- orientata all'azione

## Connected assist UX
Quando c'e' connessione, la UI puo' mostrare miglioramenti non critici:
- sync completato
- backup disponibile
- assistant piu' ricco disponibile
- contenuti extra scaricati
- riallineamento possibile

Ma questi elementi devono restare:
- discreti
- non invadenti
- chiaramente secondari rispetto alla visita base

## Error states e fallback
Gli errori vanno trattati come parte dell'esperienza, non come eccezioni da debug.

### Casi da coprire
- audio non essenziale mancante
- immagine specifica mancante
- missione family non disponibile
- perdita di rete
- chiusura improvvisa dell'app

### Regola UX
L'app deve sempre privilegiare:
- continuita'
- chiarezza
- recupero rapido

mai:
- blocco totale evitabile
- messaggi tecnici
- incertezza su cosa fare

## Stato finale della visita
La chiusura della visita e' parte della UX.

Non basta terminare la queue.
Serve una sensazione di compimento.

La schermata finale dovrebbe dare almeno:
- visita completata o quasi completata
- payoff finale
- eventuale memoria del percorso fatto
- eventuale riapertura di punti non visti
- sync finale o salvataggio locale rassicurante

## Tono complessivo dell'app
Il tono dell'app deve essere:
- chiaro
- calmo
- guidante
- mai troppo tecnico
- mai troppo infantile anche quando c'e' il family mode

L'app non deve esibire il motore.
Deve far percepire una visita ben orchestrata.

## Output dello step
Gli output minimi di questo step dovrebbero essere:
- `Visitor App Information Architecture`
- `Session Start UX Model`
- `Visit Shell UX Model`
- `Playback Screen Model`
- `Route Awareness Model`
- `Assistant UX Model`
- `Family Overlay UX Model`
- `Offline and Connected State Model`
- `Recovery and Rejoin UX Model`
- `Error and Fallback UX Model`

## Quando si chiude davvero lo step
Lo Step 7 si chiude quando:
- il visitatore puo' iniziare una sessione senza confusione
- la visita ha una shell chiara e stabile
- player, percorso, assistant e family mode convivono senza competere
- offline e connected states sono leggibili
- skip, resume, rejoin e recalc hanno un comportamento comprensibile
- il sistema appare semplice pur restando tecnicamente ricco

## Traduzione implementativa minima
Questo step dovrebbe lasciare almeno questi artefatti operativi:
- `Session Start UX Contract`
- `Visit Shell UX Contract`
- `Playback Surface Rules`
- `Map and Route Awareness Rules`
- `Assistant UX Rules`
- `Family Overlay UX Rules`

Regole forti per l'implementazione:
- il comportamento base deve restare `player-centric` e `route-aware`
- ogni capability deve avere stati `on`, `off`, `locked`, `degraded`
- preview web e native possono differire nella resa ma non nelle decisioni UX principali
- gli stati di errore, offline, resume e rejoin devono essere progettati come casi normali

Anti-pattern da evitare:
- UI che espone la complessita' interna del motore
- mappa dominante quando non e' il layer principale della visita
- assistant o family mode che aprono esperienze parallele disallineate dal tour

## Formula chiave dello step
`Il visitatore non deve percepire la complessita' del motore, ma solo la fluidita' della visita.`

## Cosa prepara per lo step successivo
Lo Step 7 prepara almeno due direzioni successive:
- UX/UI del workspace editoriale Toolia
- design system e template modulare delle app

Il motore e' ormai definito.
Ora bisogna governare:
- come Toolia lo authora
- come l'app viene resa coerente e personalizzabile.
