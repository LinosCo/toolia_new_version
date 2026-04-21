# STATE_MACHINE

## Scopo
Questo documento definisce gli stati e le transizioni canoniche del sistema Toolia.

Serve a evitare che:
- workspace
- platform
- preview web
- app mobile
- runtime

usino stati simili ma incompatibili.

Formula chiave:

`se un oggetto cambia stato, la transizione deve essere esplicita`

## Regola fondamentale
Non esiste una sola state machine del prodotto.
Esistono piu' state machine coordinate.

Le principali sono:
- `Project lifecycle`
- `Reviewable content lifecycle`
- `Capability readiness lifecycle`
- `Delivery/export lifecycle`
- `Visit session lifecycle`
- `Entitlement lifecycle`
- `Issue lifecycle`

## 1. Project lifecycle

## Stati canonici
- `draft`
- `in_build`
- `in_review`
- `approved`
- `published`
- `archived`

## Significato

### `draft`
Il progetto esiste ma non ha ancora una forma sufficientemente chiara.

### `in_build`
Il progetto sta venendo strutturato nei suoi layer.

### `in_review`
Il progetto e' abbastanza completo da essere revisionato in modo serio.

### `approved`
Il progetto e' approvato editorialmente e tecnicamente per la release.

### `published`
Il progetto e' disponibile ai client di fruizione.

### `archived`
Il progetto non e' piu' attivo ma resta storicizzato.

## Transizioni lecite
- `draft -> in_build`
- `in_build -> in_review`
- `in_review -> approved`
- `approved -> published`
- `published -> archived`
- `in_review -> in_build`
- `approved -> in_build`
- `published -> in_build`

### Nota
Le transizioni all'indietro servono a gestire correzioni e nuove release.

## 2. Reviewable content lifecycle
Questa state machine vale per oggetti come:
- semantic content base
- rendition
- assistant answer unit
- family mission
- visual pairing decision
- character contract

## Stati canonici
- `proposed`
- `in_review`
- `approved`
- `published`
- `blocked`
- `archived`

## Significato

### `proposed`
La piattaforma o il sistema ha generato una proposta non ancora verificata.

### `in_review`
Toolia o il team sta lavorando sulla proposta.

### `approved`
L'oggetto e' valido ma non necessariamente ancora incluso in una release live.

### `published`
L'oggetto e' in uso nel delivery pack o nella release attiva.

### `blocked`
L'oggetto non puo' avanzare per problema factual, tecnico o di dipendenze.

### `archived`
L'oggetto non e' piu' usato ma viene mantenuto per storico.

## Transizioni lecite
- `proposed -> in_review`
- `in_review -> approved`
- `in_review -> blocked`
- `blocked -> in_review`
- `approved -> published`
- `published -> archived`
- `published -> in_review`
- `approved -> in_review`

## 3. Capability readiness lifecycle
Questa state machine non dice se una capability e' "venduta", ma se e' davvero pronta in un progetto.

## Stati canonici
- `not_configured`
- `configured`
- `content_missing`
- `runtime_missing`
- `qa_required`
- `ready`
- `degraded`

## Significato

### `not_configured`
La capability non e' prevista per il progetto.

### `configured`
La capability e' prevista ma non ancora completa.

### `content_missing`
Manca il contenuto necessario.

### `runtime_missing`
Mancano supporti di export, bundle o client.

### `qa_required`
La capability e' quasi pronta ma non ha ancora passato il controllo.

### `ready`
La capability e' pronta per essere usata nella release.

### `degraded`
La capability e' utilizzabile ma in forma ridotta.

## 4. Delivery/export lifecycle
Questa machine vale per oggetti come:
- project app definition
- theme pack export
- capability snapshot
- runtime export
- web preview build
- native handoff pack

## Stati canonici
- `not_generated`
- `generated`
- `validated`
- `released`
- `obsolete`
- `failed`

## Significato

### `not_generated`
L'artefatto non esiste ancora.

### `generated`
L'artefatto e' stato prodotto.

### `validated`
L'artefatto e' stato controllato.

### `released`
L'artefatto e' quello attivo o consegnato.

### `obsolete`
L'artefatto esiste ma non e' piu' corrente.

### `failed`
La generazione o validazione non e' riuscita.

## 5. Visit session lifecycle
Questa e' una machine critica per la visitor app.

## Stati canonici
- `created`
- `bundle_preparing`
- `ready`
- `in_progress`
- `paused`
- `completed`
- `abandoned`
- `failed`

## Significato

### `created`
La sessione esiste ma il bundle non e' ancora pronto.

### `bundle_preparing`
Si stanno verificando o scaricando gli asset necessari.

### `ready`
La sessione puo' partire in sicurezza.

### `in_progress`
La visita e' in corso.

### `paused`
La visita e' temporaneamente sospesa ma recuperabile.

### `completed`
La visita si e' chiusa in modo regolare.

### `abandoned`
La visita e' stata lasciata senza completamento.

### `failed`
La sessione non puo' proseguire per errore non recuperabile.

## Transizioni lecite
- `created -> bundle_preparing`
- `bundle_preparing -> ready`
- `bundle_preparing -> failed`
- `ready -> in_progress`
- `in_progress -> paused`
- `paused -> in_progress`
- `in_progress -> completed`
- `in_progress -> abandoned`
- `paused -> abandoned`
- `in_progress -> failed`

## Stato di readiness del bundle
Dentro la sessione esiste anche uno stato specifico del bundle.

## Stati canonici
- `not_ready`
- `ready`
- `ready_with_degraded_visuals`
- `ready_and_enrichable`

### Nota
Questo non sostituisce lo stato della sessione.
E' un sottostato o attributo del bundle/sessione.

## 6. Entitlement lifecycle

## Stati canonici
- `issued`
- `active`
- `expired`
- `revoked`
- `consumed`

## Significato

### `issued`
L'entitlement esiste ma non e' ancora stato usato.

### `active`
L'entitlement e' valido nella sua finestra temporale.

### `expired`
La finestra di validita' e' finita.

### `revoked`
L'entitlement e' stato annullato.

### `consumed`
Per entitlement one-shot o single-session, l'entitlement e' stato usato.

## Regola importante
Lo stato dell'entitlement non coincide automaticamente con lo stato della sessione.

Esempio:
- `entitlement` puo' essere scaduto
- ma la `visit_session` puo' restare valida fino a fine sessione per grace policy

## 7. Issue lifecycle

## Stati canonici
- `open`
- `triaged`
- `planned`
- `in_progress`
- `resolved`
- `closed`
- `wont_fix`

## Significato

### `open`
Il problema e' stato registrato.

### `triaged`
Il problema e' stato classificato.

### `planned`
E' stato accettato nel backlog.

### `in_progress`
E' in lavorazione.

### `resolved`
E' stato corretto in una release candidata.

### `closed`
E' verificato come chiuso.

### `wont_fix`
Non verra' trattato.

## Cross-machine dependencies
Le macchine non vivono isolate.

### Esempi importanti

#### Project publish dependency
`project -> published` richiede almeno:
- capability rilevanti in stato `ready` o `degraded` accettato
- artefatti delivery in stato `validated`

#### Capability dependency
Una capability non puo' essere `ready` se:
- il contenuto necessario non e' almeno `approved`
- il runtime/export richiesto non e' almeno `validated`

#### Session dependency
Una sessione non puo' andare in `ready` se:
- il bundle e' `not_ready`
- gli entitlement necessari non sono `active` o `grace-valid`

## Locking and editing rules

### Oggetti `published`
Possono essere:
- duplicati
- revisionati in nuova versione

Ma non dovrebbero essere:
- riscritti in place senza versioning

### Oggetti `approved`
Possono tornare `in_review` se necessario.

### Oggetti `blocked`
Devono dichiarare la causa del blocco.

## Versioned updates
Le transizioni che contano devono essere versionate almeno per:
- progetto
- export
- app definition
- runtime contract
- contenuto pubblicato

## Cosa non fare
- usare `draft` per tutto
- usare `active` come stato ambiguo per oggetti diversi
- trattare `ready` come sinonimo di `published`
- trattare `expired` e `revoked` come la stessa cosa
- perdere la distinzione tra `session state` e `bundle readiness`

## Mapping minimo con il repo attuale

### Gia' presenti
- `Project.status`
  - oggi `draft | active | archived`
- `Scheda.status`
  - oggi `draft | in_review | published | archived`
- `Job.status`
  - oggi `pending | running | done | failed`
- `AppConfig.eas_status`
  - oggi `pending | building | ready | failed`

### Raccomandazione
Non forzare subito la perfetta coincidenza dei nomi nel DB.
Ma nei nuovi layer e nei documenti usare le state machine canoniche qui definite.

## Checklist minima
Prima di introdurre un nuovo status chiedersi:
- e' davvero una nuova fase?
- o e' un attributo di un'altra machine?
- e' progetto, contenuto, capability, delivery, sessione o issue?

## Cosa prepara dopo
Questo documento prepara direttamente:
- `RUNTIME_CONTRACTS.md`
- evoluzione di API e persistenza
- logica di workspace, preview e mobile

Se vuoi, il prossimo passo naturale e' `RUNTIME_CONTRACTS.md`.
