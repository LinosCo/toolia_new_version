# Toolia Studio — Flusso di inserimento dati

**Documento funzionale centrale.** Descrive come l'operatore costruisce un progetto audioguida, step per step, con regole precise su cosa si inserisce, cosa fa la AI e quando lo step si considera completo.

In caso di conflitto con altri documenti, questo vince.

---

## Principio di fondo

Toolia non genera contenuti dal nulla. Prende informazioni reali — documenti, siti web, interviste, mappe, foto — e le trasforma in un'esperienza di visita strutturata.

**La AI rielabora, non inventa.** Fonti scarse = risultato scarso. Fonti ricche = risultato ricco.

L'inserimento dati segue **6 step operativi**. Ogni step costruisce un livello di comprensione che alimenta il successivo. La UI guida l'utente in ordine e segnala i prerequisiti mancanti. L'enforcement è a livello **UI**, non API: gli endpoint `step-gate` sono informativi, non bloccanti.

---

## Step 1 — Strategia e fonti

### Obiettivo
Costruire la base di conoscenza del progetto e definire la direzione editoriale.

### Input dell'operatore

**Fonti di conoscenza** (tre modalità combinabili):

| Modalità | Uso | Note |
|----------|-----|------|
| **URL sito web** | Scansione automatica del testo | Modalità WordPress dedicata. Se il sito blocca lo scraping, fallback su upload manuale. |
| **Documenti** | Upload PDF / testi / guide / cataloghi | Per ogni doc: titolo, importanza (`primaria` / `secondaria` / `contesto`), affidabilità (`alta` / `media` / `bassa`). |
| **Intervista guidata** | Sistema pone domande, operatore risponde | Cattura il sapere tacito del curatore / direttore / guida. |

I tre metodi coprono tipi di conoscenza diversi e si complementano.

**Brief strategico:**
- Destinatario dell'esperienza (turisti, famiglie, esperti, scolaresche…)
- Cosa deve portarsi a casa il visitatore
- Tono dell'audioguida (formale, coinvolgente, leggero, emozionale…)
- Storie obbligatorie
- Argomenti da evitare

### Elaborazione AI

Al comando "Estrai Knowledge Base":

1. La AI legge tutte le fonti e produce una lista di **fatti strutturati** (`KBFact`).
2. Ogni fatto è classificato in una di 4 categorie:

| Categoria | Uso narrativo |
|-----------|---------------|
| **Fatto solido** | Supportato da fonti affidabili. Usabile liberamente, tono assertivo. |
| **Interpretazione fondata** | Lettura coerente ma non certa. Usata come chiave narrativa. |
| **Memoria / tradizione** | Viene dal cliente o dalla cultura locale. Tono evocativo e cauto. |
| **Ipotesi da verificare** | Interessante ma non solida. Resta sospesa finché non confermata. |

Il brief strategico produce una **griglia editoriale** attiva per tutto il progetto:
- `must_tell` — storie obbligatorie
- `nice_to_tell` — elementi opzionali
- `avoid` — argomenti vietati
- `verify` — da confermare

### Condizione di completamento
- Almeno una fonte o intervista caricata
- Knowledge Base ha almeno un fatto estratto

Se il brief strategico manca, warning non bloccante.

---

## Step 2 — Struttura del luogo

### Obiettivo
Costruire la mappa fisica del sito. Dove sono le cose, come ci si muove.

### Input dell'operatore

**Modalità mappa** (da scegliere subito):

| Modalità | Uso |
|----------|-----|
| **GPS** | Siti all'aperto: parchi, percorsi urbani, giardini, cantine con vigneti. |
| **Planimetria interna** | Musei, palazzi, ville. Upload immagine della piantina. |
| **Ibrida** | GPS per esterni + planimetria per interni. |

> Nota: tecnicamente la modalità può essere modificata dopo la scelta iniziale, ma un cambio riscrive tutta la struttura spaziale (zone, POI, nodi, segmenti) cancellando i dati precedenti. Valutare lock della modalità dopo il primo percorso creato.

**Zone** (raggruppamenti di POI):
- Nome
- Promessa narrativa (che esperienza offre)
- Funzione nella visita (apertura / sviluppo / climax)

**POI (Point of Interest)** — i punti dove il visitatore si ferma:
- Nome *(obbligatorio)*
- Posizione sulla mappa *(obbligatoria)* — drag pin o coordinate
- Zona di appartenenza
- Tipo (interno / esterno)
- Descrizione breve (contesto per generazione AI)
- Tempo minimo di sosta (per calcolo durate percorsi)
- Immagine (sfondo nella schermata di visita)

### Elaborazione AI
Al caricamento di mappa/planimetria, la AI propone: suddivisione in zone, POI candidati, percorsi plausibili. Tutte proposte sempre da verificare manualmente (la AI non vede barriere reali, accessi chiusi, preferenze del sito).

I POI + collegamenti costituiscono il **grafo dei segmenti**, usato per costruire i percorsi nello Step 4.

### Regola invariante
**Quando narrazione e spazio fisico sono in conflitto, vince lo spazio.** Non si può far attraversare una sala chiusa o tornare indietro senza motivo.

### Condizione di completamento
- Almeno un POI creato

Warning se i POI non hanno coordinate o mancano zone.

---

## Step 3 — Driver e Personas

### Obiettivo
Dire alla AI **con che angolazione** raccontare e **per chi**. Stesso luogo → letture diverse.

### Input dell'operatore

**Driver narrativi** (lenti tematiche, tipicamente 3–6 per progetto):
- Nome *(obbligatorio)*
- Dominio (storia, arte, botanica, produzione, scienza, curiosità…)
- Descrizione
- Valore narrativo (perché interessa il visitatore)

**Personas** (visitatori tipo, specifici al luogo):
- Nome *(obbligatorio)* — es. "Famiglia con bambini", "Esperto d'arte"
- Motivazione di visita
- Payoff atteso (meraviglia / conoscenza / emozione / scoperta)
- Durata preferita (breve 30min / media 1h / lunga 2h+)

### Elaborazione AI

Combinazione driver × personas → **lenti editoriali**. Stesso fatto raccontato diversamente per "Storia per famiglie" vs "Storia per esperti". Cambia vocabolario, lunghezza, tipo di curiosità, non i fatti.

Driver e personas possono essere proposti dalla AI a partire da KB + brief. Proposta sempre da revisionare.

### Condizione di completamento
- Almeno un driver e una persona

Warning se non ci sono lenti editoriali attive.

---

## Step 4 — Percorsi e Narratori

### Obiettivo
Decidere la struttura concreta della visita. Quanti percorsi, in che ordine, con che voce.

### Input dell'operatore

**Narratori** (voci dell'audioguida — influenzano contenuto, non solo stile):
- Nome *(obbligatorio)* — es. "Marco il Custode", "Elena storica dell'arte"
- Stile narrativo *(obbligatorio)* — coinvolgente / formale / ironico / poetico…
- Lingua *(obbligatoria)* — stesso narratore può esistere in più lingue
- Carattere (guida la AI: es. "Vecchio custode che racconta come se rivelasse segreti")
- Driver preferiti

> **Il narratore va definito prima della generazione schede.** Cambia *cosa* viene raccontato, non solo *come*.

**Percorsi** (itinerari tematici):
- Nome *(obbligatorio)* — es. "Tour completo", "Percorso rapido 30 minuti"
- Durata stimata *(obbligatoria)* — calcolata dai tempi sosta POI
- Descrizione *(obbligatoria)*
- POI inclusi + ordine *(obbligatorio)* — drag & drop
- Narratore assegnato

**Capitoli** (divisioni narrative dentro un percorso — Introduzione / Sviluppo / Climax / Chiusura):
- Opzionali ma raccomandati
- Aiutano la AI a costruire arco narrativo coerente

### Elaborazione AI
La AI propone percorsi, capitoli e **bridge** (testi di transizione fra POI). I bridge sono importanti: senza diventano monologhi sconnessi, con diventa racconto continuo.

Lo step produce anche **regole di adattamento**: come la visita si accorcia/allunga, schede `core` (obbligatorie) vs tagliabili.

### Condizione di completamento
- Almeno un percorso e un narratore

Warning se percorso ha meno di 2 POI o mancano capitoli.

---

## Step 5 — Schede e Audio

### Obiettivo
Generare i testi che il visitatore ascolta, revisionarli, trasformarli in audio.

### Doppio passaggio di generazione

**1. Base semantica per ogni POI** — scheda intermedia con:
- Fatti verificati
- Messaggi chiave
- Angolazioni narrative possibili
- Avvertenze editoriali

**2. Schede finali** per ogni combinazione `POI × narratore × lingua`.
- Esempio: 10 POI × 2 narratori × 2 lingue = fino a 40 schede

**Perché il doppio passaggio:** errore fattuale corretto una volta nella base semantica → tutte le schede derivate risultano corrette. Senza base semantica, ogni errore va corretto scheda per scheda.

### Contenuto scheda

- `title`
- `script_text` — testo narrativo modificabile liberamente
- `duration_estimate_seconds` — calcolato automaticamente a 150 parole/minuto
- `is_core` — flag scheda fondamentale, sempre inclusa nei percorsi

### Workflow di approvazione

| Stato | Significato |
|-------|-------------|
| `draft` | Appena generata dalla AI, non ancora letta da umani |
| `in_review` | Editor l'ha passata al revisore |
| `client_review` | Il cliente finale sta valutando |
| `published` | Attiva, visibile ai visitatori |
| `archived` | Versione vecchia, conservata per storico |

**Regola invariante:** se un testo `published` viene modificato, lo stato torna automaticamente a `draft`. Nessuna modifica non revisionata raggiunge il visitatore.

**Regola per il compositore di visite:** solo schede `published` entrano nel flusso di consumo. Mai `draft` o `in_review`.

### Audio (TTS)

- Generato **dopo** approvazione del testo, non insieme
- Motivo: separare testo e audio permette di correggere il testo senza rigenerare l'audio ogni volta
- Se il testo cambia dopo la generazione audio → flag "audio obsoleto"
- Una traccia per scheda per lingua
- Upload in R2, record `AudioAsset`

### Filtri UI editor schede
Barra: `Tutte` / `Bozze` / `In revisione` / `Pubblicate`.

### Condizione di completamento
- Almeno una scheda presente
- Almeno una scheda `published`

Warning se copertura audio < 80% o copertura immagini < 50%.

---

## Step 6 — Delivery e verifica

### Obiettivo
Verifica finale. Nessun dato nuovo: si controlla che tutto sia in ordine.

### Metriche automatiche

- **Copertura audio**: % schede con audio associato (target ≥ 80%)
- **Copertura immagini**: % POI con almeno una foto (target ≥ 50%)
- **Distribuzione stati**: quante bozze / in revisione / pubblicate
- **Bloccanti**: problemi gravi che impediscono pubblicazione
- **Avvisi**: problemi minori

### Readiness del progetto

| Livello | Significato |
|---------|-------------|
| **Verde** | Pronto |
| **Ambra** | Pronto con avvisi |
| **Rosso** | Non pronto: problemi bloccanti |

### Checklist di qualità

**Automatica:**
- Almeno una scheda `published`
- Copertura audio ≥ 80%
- Nessun bloccante aperto

**Manuale (da spuntare):**
- Contenuti riletti e revisionati
- Accuratezza fatti verificata
- Qualità immagini approvata
- Approvazione del cliente

Il completamento della checklist è **bloccante**: non si bypassa.

---

## Flussi di visita esposti al visitatore

Alla fine della pipeline, il progetto espone due modalità di fruizione:

1. **"Crea la tua visita"** — il visitatore sceglie temi e tempo disponibile, il compositore runtime assembla dinamicamente un percorso pesando driver e personas. Le schede `is_core = true` sono sempre incluse.
2. **"Scegli un percorso"** — il visitatore seleziona un percorso predefinito dello Step 4. Ordine POI fisso.

In entrambi i casi, il compositore usa il **grafo dei segmenti** dello Step 2 per verificare percorribilità fisica e calcolare tempi realistici.

> Questo documento descrive solo la generazione dei dati lato Studio. Il consumo lato app è fuori scope.

---

## Family Mode (opzionale)

Layer parallelo di contenuti per bambini, attivabile nelle impostazioni progetto.

- Per ogni POI si possono definire **missioni** (quiz, osservazioni, disegni)
- Le missioni sono proposte dalla AI nello Step 4 e modificabili nello Step 5
- Hanno proprio workflow `draft → published`
- Config separata: tono, nome compagno animato, fascia d'età target, modalità di gioco

---

## Assistente AI durante la visita

Ibrido a due livelli.

**Livello 1 — Pack pre-generato.** Durante lo Step 5, la AI genera per ogni POI un set di domande frequenti + risposte. Ogni unità ha:
- Domande di attivazione
- Risposta verificata concisa
- Risposta estesa
- Confine ("non rispondere oltre questo punto")

**Livello 2 — Chat LLM runtime.** Per domande non coperte dal pack, chatbot che chiama Claude in tempo reale. Recupera fatti KB, classifica per rilevanza, genera risposta contestuale.

Target: aggiungere guardrail che limiti il runtime ai soli fatti KB con affidabilità alta.
