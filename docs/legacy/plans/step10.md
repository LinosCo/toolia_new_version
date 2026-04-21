# Step 10 - Operations, analytics e manutenzione post-pubblicazione

## Scopo dello step
Questo step prende:
- il progetto pubblicato
- il runtime operativo definito negli Step 6-9
- i segnali che arrivano dalle sessioni reali

e li trasforma in un sistema di osservazione, manutenzione e miglioramento continuo.

Qui non stiamo piu' costruendo il progetto iniziale.
Stiamo decidendo:
- cosa misurare davvero
- come capire se la visita funziona sul campo
- come rilevare problemi, drift e opportunita'
- come aggiornare contenuti, percorsi e capability senza perdere controllo

## Problema strategico che risolve
Una visita pubblicata non resta stabile per sempre.

Cambiano:
- comportamenti dei visitatori
- percorribilita' del luogo
- materiali del cliente
- efficacia dei contenuti
- performance del runtime
- valore reale di feature come assistant, family mode o personalizzazione

Se non esiste un loop post-pubblicazione, il rischio e' questo:
- il progetto invecchia
- gli errori restano invisibili
- i punti deboli non emergono
- le capability premium sembrano teoriche ma non si sa se creano valore
- il team lavora solo reattivamente

In una frase:

`senza operations e analytics, il progetto pubblicato smette presto di essere un prodotto governato`

## Decisione di fondo dello step
La scelta forte e' questa:

`misuriamo per migliorare l'esperienza, non per accumulare vanity metrics`

Questo significa:
- meno focus su numeri decorativi
- piu' focus su segnali che cambiano decisioni editoriali, runtime o capability

E un secondo principio complementare:

`l'analytics deve rispettare il modello offline-first`

Quindi:
- gli eventi si raccolgono localmente
- il sync puo' essere differito
- l'assenza di rete non deve rompere la misurazione essenziale

## Principi guida dello step

### 1. Project health before generic dashboarding
Prima di fare dashboard belle, bisogna capire:
- se il progetto regge
- se il percorso funziona
- se i contenuti vengono fruiti
- se il runtime e' affidabile

### 2. Combine quantitative and qualitative signals
I dati di sessione non bastano.
Servono anche:
- feedback espliciti
- osservazioni del cliente o dello staff
- pattern di domande all'assistant
- issue editoriali rilevati dal team

### 3. Version everything that matters
Per capire davvero cosa sta succedendo bisogna sapere:
- quale versione del progetto era live
- quale bundle era attivo
- quali capability erano abilitate
- quale manifest e quali contenuti sono stati usati

### 4. Treat drift as normal
Il drift non e' eccezione.
E' normale.

Possono driftare:
- contenuti
- spazio
- visuali
- clue family
- risposte dell'assistant
- asset audio

### 5. Optimize the loop, not just the release
Il valore non sta solo nel pubblicare.
Sta nel saper:
- osservare
- correggere
- ripubblicare

## Cosa va osservato davvero
I segnali piu' utili stanno almeno su sei livelli.

### 1. Session health
- la sessione parte?
- il bundle e' pronto?
- la visita viene eseguita senza blocchi?

### 2. Route health
- i visitatori seguono il percorso?
- dove saltano?
- dove si riallineano?
- dove il ritmo si rompe?

### 3. Content health
- quali POI o segmenti vengono fruiti davvero?
- quali vengono saltati spesso?
- quali deep dive non vengono mai aperti?
- dove il grounding non basta?

### 4. Feature health
- assistant viene usato?
- family mode resta ingaggiante?
- connected assist porta valore?
- la personalizzazione cambia davvero il comportamento?

### 5. Runtime health
- audio mancanti
- immagini mancanti
- bundle incompleti
- recovery frequenti
- problemi di resume/rejoin

### 6. Editorial drift
- domande non coperte
- contenuti che invecchiano
- clue non piu' funzionanti
- personaggi poco credibili
- visuali non piu' adeguate

## Oggetti fondamentali dello step
Gli oggetti canonici di questo step sono:
- `Session Event Model`
- `Project Health Dashboard`
- `Capability Health Dashboard`
- `Feedback Intake`
- `Assistant Insight Queue`
- `Family Insight Queue`
- `Issue Register`
- `Maintenance Backlog`
- `Release Version Log`
- `Project Update Workflow`

## Session Event Model
Il sistema deve definire un modello eventi coerente e non eccessivamente rumoroso.

Gli eventi minimi utili sono:
- session_started
- bundle_ready_state
- content_started
- content_completed
- content_skipped
- mission_started
- mission_completed
- assistant_opened
- assistant_question_asked
- assistant_no_answer
- pause
- resume
- rejoin
- recalc_requested
- sync_succeeded
- sync_failed
- session_completed
- session_abandoned

Ogni evento dovrebbe essere collegabile almeno a:
- progetto
- versione progetto
- sessione
- capability attive
- POI o segmento, se rilevante
- timestamp

## Project Health Dashboard
Ogni progetto pubblicato dovrebbe avere una dashboard di salute operativa.

Questa dashboard non deve essere infinita.
Deve mostrare soprattutto:
- readiness e affidabilita' del runtime
- avvio sessioni
- completamento o quasi-completamento
- punti di drop frequenti
- skip anomali
- recovery / rejoin frequenti
- problemi di bundle

## Capability Health Dashboard
Oltre alla salute generale del progetto, serve capire se le capability attive stanno funzionando davvero.

Per esempio:

### `personalization`
- distribuzione durate scelte
- uso reale delle diverse lenti attive
- segmenti/POI piu' spesso selezionati o esclusi

### `visit_assistant`
- frequenza di apertura
- domande ricorrenti
- no-answer rate
- handoff utili o inutili

### `family_overlay`
- mission start rate
- mission completion rate
- spacing effettivo
- punti dove il family mode interrompe troppo

### `connected_assist`
- quanto spesso aiuta davvero
- quanto spesso la rete non e' disponibile
- quanto valore producono sync e recovery

## Feedback Intake
Serve un ingresso strutturato dei segnali qualitativi.

Le fonti possibili sono:
- feedback del visitatore
- feedback del cliente
- feedback di guide o staff
- osservazioni del team Toolia
- note da test sul campo

Il punto importante e' non lasciarli dispersi tra mail, chat e memoria.

## Assistant Insight Queue
L'assistant verticale produce segnali molto preziosi.

Serve una coda dedicata che raccolga:
- domande ricorrenti
- domande senza risposta
- follow-up troppo frequenti
- domande fuori perimetro che si ripetono
- punti dove l'assistant corregge una debolezza del contenuto lineare

Questa queue deve alimentare:
- aggiornamento dell'Assistant Answer Base
- aggiornamento della Semantic Content Base
- possibili miglioramenti del percorso o dei bridge

## Family Insight Queue
Anche il family mode va osservato come sistema specifico.

Questa queue dovrebbe raccogliere:
- missioni che funzionano bene
- missioni ignorate o interrotte
- clue troppo difficili o troppo banali
- spacing sbagliato
- punti dove il family mode rompe il backbone adulto
- segnali su personaggio kids e reward

## Issue Register
Il progetto deve avere un registro strutturato dei problemi.

Non tutti gli issue sono bug tecnici.

Categorie utili:
- `runtime`
- `spatial`
- `content`
- `assistant`
- `family`
- `visual`
- `audio`
- `analytics`

Ogni issue dovrebbe avere almeno:
- gravita'
- impatto visitatore
- impatto progetto
- workaround possibile
- stato

## Maintenance Backlog
Non tutti i problemi diventano fix immediati.
Serve un backlog di manutenzione.

Esempi:
- aggiornare una risposta assistant
- correggere un clue family
- sostituire un visual asset
- ribilanciare un segmento troppo debole
- rivedere una rendition poco efficace
- migliorare uno stato UI ricorrente

## Release Version Log
Per ogni rilascio del progetto serve una traccia chiara di:
- cosa e' cambiato
- quale versione e' live
- quali capability erano attive
- cosa e' stato toccato
- se la release e' editoriale, spaziale, runtime o mista

Senza questo log, i dati post-release diventano difficili da interpretare.

## Project Update Workflow
Serve una procedura canonica di aggiornamento.

Il flusso ideale e':
1. raccolta segnali
2. triage
3. classificazione del problema o opportunita'
4. aggiornamento del layer corretto
5. QA
6. nuova release
7. osservazione dell'impatto

Questo workflow deve poter supportare:
- fix piccoli
- aggiornamenti editoriali
- aggiornamenti spaziali
- revisione capability

## Metriche davvero utili
Le metriche da tenere prioritarie dovrebbero essere poche ma azionabili.

### Metriche di avvio
- session start rate
- tempo medio per readiness
- tasso di bundle not ready

### Metriche di fruizione
- contenuti completati vs saltati
- tempo reale sui segmenti
- drop point ricorrenti
- rejoin rate

### Metriche assistant
- open rate
- question rate
- no-answer rate
- question clusters ricorrenti

### Metriche family
- mission activation rate
- mission completion rate
- punti di attrito
- tempo speso nel layer family

### Metriche di affidabilita'
- asset mancanti
- errori di sync
- fallbacks attivati
- sessioni interrotte

## Cosa non inseguire troppo presto
Io eviterei in v1:
- dashboard troppo sofisticate
- A/B test ovunque
- metriche troppo granulari senza uso chiaro
- segmentazione analitica eccessiva

Prima serve un sistema che dica:
- cosa non funziona
- dove migliorare
- se le capability introdotte stanno creando valore

## Privacy e minimizzazione
Anche se qui non stiamo entrando nel dettaglio legale, una regola progettuale va fissata:

`raccogliere solo i dati che servono davvero a migliorare il progetto`

Quindi:
- minimizzazione dei dati
- focus su eventi di esperienza, non su tracciamento invadente
- coerenza con il modello offline-first e deferred sync

## Effetti sul workspace
Il workspace editoriale deve avere una superficie di operations o health che renda leggibili:
- salute del progetto
- issue aperti
- capability in sofferenza
- richieste di aggiornamento
- ultime release

Questo chiude il loop tra:
- progettazione
- pubblicazione
- manutenzione

## Effetti sulla visitor app
La visitor app non deve mostrare l'analytics.
Ma deve contribuire bene al loop:
- salvando stato locale
- sincronizzando quando possibile
- permettendo feedback semplici
- non mascherando del tutto errori e fallback

## Output dello step
Gli output minimi di questo step dovrebbero essere:
- `Session Event Model`
- `Project Health Dashboard Model`
- `Capability Health Dashboard Model`
- `Feedback Intake Model`
- `Assistant Insight Queue`
- `Family Insight Queue`
- `Issue Register Model`
- `Maintenance Backlog Model`
- `Release Version Log Model`
- `Project Update Workflow`

## Quando si chiude davvero lo step
Lo Step 10 si chiude quando:
- esiste un loop chiaro tra sessioni reali e miglioramento del progetto
- le capability attive sono osservabili in modo utile
- il team puo' distinguere problemi editoriali, runtime e di feature
- il progetto puo' essere aggiornato senza perdere controllo delle versioni

## Traduzione implementativa minima
Questo step dovrebbe lasciare almeno questi artefatti operativi:
- `Session Event Model`
- `Project Health Dashboard`
- `Capability Health Dashboard`
- `Issue Register`
- `Maintenance Backlog`
- `Release Version Log`

Regole forti per l'implementazione:
- gli eventi devono essere offline-safe e sincronizzabili in ritardo
- le metriche devono essere capability-aware e project-aware
- i segnali di assistant, family, percorso e runtime devono poter riaprire backlog e review
- ogni release deve essere tracciabile rispetto a contenuti, capability e bundle

Anti-pattern da evitare:
- analytics generiche senza impatto editoriale
- misure troppo fini prima di aver definito i segnali davvero utili
- issue senza legame a progetto, capability o release

## Formula chiave dello step
`Pubblicare non basta: bisogna vedere cosa succede sul campo e saper intervenire con metodo.`

## Cosa prepara per il passo successivo
Lo Step 10 prepara due direzioni possibili:
- `pricing e commercializzazione` su base finalmente informata dai dati
- `roadmap di prodotto` e di design system basata su uso reale invece che su intuizione pura

Ora il sistema non e' solo progettato e pubblicato.
Diventa finalmente governabile nel tempo.
