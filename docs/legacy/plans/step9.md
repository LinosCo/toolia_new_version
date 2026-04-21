# Step 9 - Capability model e configurazione di progetto

## Scopo dello step
Questo step prende:
- il sistema di prodotto definito negli Step 1-8
- le sue superfici visitor, workspace e runtime
- la necessita' di modularita' e customizzazione per progetto

e lo trasforma in un modello configurabile, governabile e tecnicamente coerente.

Qui non stiamo definendo listini o pricing finale.
Stiamo decidendo:
- quali capability esistono nel prodotto
- come si attivano o disattivano per progetto
- quali dipendenze hanno
- come cambiano workspace, runtime e visitor app
- come evitare che ogni progetto diventi una fork implicita del sistema

## Problema strategico che risolve
Toolia non sembra un prodotto da impacchettare in tre tier rigidi uguali per tutti.

I progetti possono cambiare molto per:
- tipo di luogo
- qualità delle fonti
- ricchezza del layer spaziale
- target del visitatore
- presenza o meno del family mode
- necessità di assistant, connected assist o personalizzazione profonda

Se però lasciamo tutto "custom progetto per progetto" senza modello comune, succede questo:
- il workspace non sa cosa mostrare
- il runtime non sa cosa preparare
- la visitor app non sa quali superfici abilitare
- il team commerciale promette cose che il sistema non sa governare
- l'implementazione si riempie di eccezioni non strutturate

In una frase:

`la modularita' senza capability model diventa caos operativo`

## Decisione di fondo dello step
La scelta forte e' questa:

`non tier fissi come base del sistema`
`ma capability canoniche attivabili per progetto`

Questo significa:
- il prodotto ha un catalogo finito di capability
- ogni progetto attiva un sottoinsieme coerente di capability
- le capability possono avere livelli diversi
- le superfici del prodotto leggono quella configurazione

Quindi:
- niente customizzazione anarchica
- niente tier rigidi prematuri
- si' a una matrice configurabile e leggibile

## Principi guida dello step

### 1. Capability before packaging
Prima definiamo bene:
- cosa esiste nel prodotto
- cosa serve per attivarlo
- cosa cambia tecnicamente

Solo dopo possiamo tradurlo in packaging commerciale.

### 2. Configuration, not fork
Un progetto deve essere una configurazione del sistema, non una variante separata del prodotto.

### 3. Progressive richness
Molte capability possono esistere in forma:
- base
- avanzata
- estesa

senza dover introdurre una nuova capability ogni volta.

### 4. Readable dependencies
Ogni capability deve dichiarare:
- cosa richiede
- cosa abilita
- cosa blocca se manca

### 5. Cross-surface coherence
Una capability non cambia solo il visitor.
Deve avere effetti espliciti su:
- workspace
- contenuti
- runtime
- visitor app

## Cosa si intende per capability
Una capability e' una funzione di prodotto significativa e governabile.

Non e':
- un micro-flag tecnico
- un singolo dettaglio UI
- una singola voce di menu

E' qualcosa che modifica davvero:
- il lavoro editoriale
- la composizione della visita
- l'esperienza utente
- oppure il delivery runtime

## Capability candidate del sistema
Il modello dovrebbe supportare almeno capability come queste:

### 1. `audio_base`
Esperienza audio standard del tour.

### 2. `personalization`
Composizione della visita basata su durata, segnali e lenti attive.

### 3. `family_overlay`
Micro-missioni e layer family sul tour comune.

### 4. `visit_assistant`
Assistant verticale situato durante la visita.

### 5. `connected_assist`
Miglioramenti non critici in presenza di rete.

### 6. `deep_dive`
Approfondimenti oltre le rendition principali.

### 7. `generated_visuals`
Immagini generate per personaggi, family, concetti, reward o supporti illustrativi.

### 8. `multivoice_storytelling`
Uso strutturato di piu' personaggi o voci oltre al backbone base.

### 9. `advanced_spatial_layer`
Georeferenziazione o workspace spaziale piu' ricco del minimo logico.

### 10. `analytics_and_recovery`
Strati avanzati di tracking, sync, recovery e osservabilita' della visita.

Questa lista non deve essere infinita.
Deve restare abbastanza corta da essere governabile.

## Capability levels
Non tutte le capability devono essere binarie.

Molte possono avere livelli.

### Esempio di livelli possibili
- `off`
- `base`
- `advanced`
- `extended`

Questo permette, per esempio:
- `visit_assistant = off`
- `visit_assistant = base`
  - assistant verticale locale e limitato
- `visit_assistant = advanced`
  - assistant con supporto connected assist

Oppure:
- `family_overlay = off`
- `family_overlay = base`
  - set curato di missioni
- `family_overlay = extended`
  - maggiore densita', asset generati, reward piu' ricchi

## Capability definition contract
Ogni capability dovrebbe essere descritta con un contratto minimo comune.

### Campi minimi consigliati
- `capability_id`
- `label`
- `description`
- `available_levels`
- `default_level`
- `dependencies`
- `requires_content`
- `requires_runtime_support`
- `requires_workspace_surfaces`
- `visitor_impact`
- `degraded_mode`
- `not_compatible_with`

Questo serve a evitare che la configurazione resti un insieme di flag scollegati.

## Project Capability Matrix
Ogni progetto deve produrre una `Project Capability Matrix`.

Questa matrice dice:
- quali capability sono attive
- a quale livello
- con quali limitazioni
- con quali dipendenze soddisfatte o mancanti

### Esempio concettuale
Per un progetto potrebbero risultare:
- `audio_base = base`
- `personalization = advanced`
- `family_overlay = off`
- `visit_assistant = base`
- `generated_visuals = off`
- `connected_assist = base`

Per un altro:
- `audio_base = base`
- `personalization = off`
- `family_overlay = extended`
- `visit_assistant = off`
- `generated_visuals = advanced`

## Project profile
Accanto alla matrice capability, ogni progetto dovrebbe avere anche un `Project Profile`.

Questo profilo non sostituisce la matrice, ma la rende leggibile.

Esempi di profilo:
- `standard guided tour`
- `family-first`
- `assistant-enabled`
- `rich editorial experience`
- `lightweight offline tour`

Il profilo serve a dare una forma leggibile alla configurazione, ma non deve diventare un nuovo tier rigido.

## Dipendenze tra capability
Le capability non sono indipendenti.

Per esempio:
- `visit_assistant` richiede:
  - `Verified Knowledge Base`
  - `Assistant Answer Base Set`
  - `Visit Assistant Pack`
- `family_overlay` richiede:
  - mission candidate set
  - family content pack
  - family rhythm model
- `generated_visuals` richiede:
  - visual reference layer
  - visual bible minima
- `personalization` richiede:
  - personas
  - lenti attive
  - adaptation rules
  - session composition logic

Il sistema deve poter dire chiaramente:
- capability attiva e sana
- capability attivabile ma non pronta
- capability non attivabile perche' mancano prerequisiti

## Degraded modes
Una capability non sempre deve essere solo attiva o inattiva.

Serve anche il concetto di `degraded mode`.

Esempi:
- `visit_assistant`
  - locale e limitato offline
  - piu' ricco se connesso
- `visuals`
  - immagini specifiche dove presenti
  - fallback a hero image o placeholder dove mancano
- `connected_assist`
  - completamente assente offline
  - arricchisce ma non rompe l'esperienza

Questo e' importante perche':
- mantiene coerenza tecnica
- evita promesse assolute non realistiche
- rende la UX piu' onesta

## Effetti della capability matrix sul workspace
Il workspace Toolia deve leggere la configurazione del progetto.

Questo significa:
- mostrare o nascondere superfici non rilevanti
- mostrare readiness specifica per capability
- segnalare dipendenze mancanti
- evitare che il team lavori su layer non attivi

### Esempi
Se `visit_assistant = off`:
- niente workspace assistant operativo
- niente obbligo di `Assistant Answer Base Set`

Se `family_overlay = base`:
- workspace family presente
- con set minimo curato

Se `generated_visuals = off`:
- niente step di approvazione su generated art
- solo asset reali/illustrativi

## Effetti della capability matrix sul runtime
Il runtime deve usare la stessa configurazione.

Questo significa:
- comporre solo cio' che e' abilitato
- non aspettarsi pack mancanti
- non esporre UI non supportate
- gestire fallback coerenti

### Esempi
Se `visit_assistant = off`:
- nessun `Visit Assistant Pack`
- nessuna UI assistant in app

Se `family_overlay = off`:
- nessun `Family Overlay Schedule`
- nessuna intermittenza family nel player

Se `connected_assist = off`:
- niente stati di enrichable mode
- niente promesse di sync avanzato o recalc connesso

## Effetti della capability matrix sulla visitor app
La visitor app non deve indovinare il tipo di esperienza.
Deve leggerlo dalla configurazione del progetto/sessione.

Questo impatta:
- start session
- shell della visita
- superfici secondarie
- messaggi di readiness
- assistant
- family mode
- connected states

La visitor app deve potersi comportare come:
- versione essenziale
- versione piu' ricca

ma sempre partendo da una stessa architettura.

## Entitlement tecnico
Anche se il packaging commerciale verra' deciso dopo, serve gia' un concetto di `entitlement tecnico`.

Questo significa:
- ogni capability attiva deve essere leggibile dal sistema
- il runtime deve sapere cosa e' consentito
- il workspace deve sapere cosa e' richiesto
- la visitor app deve sapere cosa mostrare

Quindi ogni progetto/sessione dovrebbe avere almeno:
- `Project Capability Matrix`
- `Session Entitlement Snapshot`

Il `Session Entitlement Snapshot` e' la fotografia concreta delle capability attive per quella sessione.

## Chi decide la configurazione
La configurazione non dovrebbe essere solo tecnica.
Deve nascere da una convergenza tra:
- bisogno del progetto
- materiali disponibili
- effort editoriale sostenibile
- scelta commerciale o di servizio

La piattaforma puo' proporre.
Toolia deve validare.

## Proposal-first anche qui
Come negli altri step, la piattaforma dovrebbe proporre una configurazione capability plausibile.

Per esempio:
- progetto piccolo, poco materiale, luogo semplice
  - proposta lightweight
- progetto ricco, forte target famiglia
  - proposta family-enhanced
- progetto premium, molto contenuto, luogo complesso
  - proposta assistant-enabled + personalization advanced

Toolia poi:
- approva
- abbassa
- alza
- limita

## Superfici minime del capability workspace
Questa parte puo' stare come sezione del workspace generale, non per forza come prodotto separato.

Ma deve permettere almeno di:
- vedere tutte le capability candidate
- vedere stato e livello
- capire dipendenze
- capire impatto su visitor app e runtime
- vedere readiness per capability
- approvare la configurazione finale del progetto

## Readiness per capability
Ogni capability dovrebbe avere un proprio stato di readiness.

Per esempio:
- `configured`
- `content missing`
- `runtime missing`
- `qa required`
- `ready`

Questo evita che la readiness del progetto resti un numero unico troppo astratto.

## Capability bundles leggibili
Pur evitando tier rigidi, puo' essere utile definire dei bundle interni leggibili.

Non come listini fissi, ma come archetipi configurativi.

Esempi:
- `essential`
- `guided`
- `personalized`
- `family enhanced`
- `assistant enabled`

Questi bundle aiutano:
- proposta iniziale
- comunicazione commerciale
- coerenza interna

Ma non devono sostituire la matrice vera.

## Cosa non deve fare questo step
Questo step non deve ancora:
- fissare i prezzi finali
- decidere i listini commerciali
- sostituire il lavoro commerciale su base cliente
- trasformare ogni capability in una promessa di marketing

Serve a costruire il modello tecnico e operativo della modularita'.

## Output dello step
Gli output minimi di questo step dovrebbero essere:
- `Capability Catalog`
- `Capability Definition Contract`
- `Project Capability Matrix`
- `Project Profile Model`
- `Session Entitlement Snapshot Model`
- `Capability Readiness Model`
- `Capability Workspace UX Section`
- `Cross-Surface Capability Rules`

## Quando si chiude davvero lo step
Lo Step 9 si chiude quando:
- il prodotto ha un catalogo finito di capability canoniche
- ogni capability ha dipendenze e livelli leggibili
- un progetto puo' essere configurato senza creare una fork implicita
- workspace, runtime e visitor app sanno leggere la stessa configurazione
- la modularita' e' tecnica e operativa, non solo commerciale

## Traduzione implementativa minima
Questo step dovrebbe lasciare almeno questi artefatti operativi:
- `Capability Definition Catalog`
- `Project Capability Matrix`
- `Dependency Rules`
- `Degraded Mode Rules`
- `Capability Bundle Catalog`
- `Entitlement Mapping Rules`

Regole forti per l'implementazione:
- le capability devono essere configurazioni dichiarative e non if sparsi nel client
- ogni capability deve avere dipendenze, livello, fallback e readiness
- workspace, preview, runtime e app devono consumare la stessa matrice
- l'entitlement tecnico deve leggere capability e durata, non solo mostrare o nascondere UI

Anti-pattern da evitare:
- trattare ogni progetto come eccezione manuale
- introdurre nuovi feature flag locali senza aggiornarne il modello canonico
- far dipendere il packaging commerciale dalla struttura interna del codice

## Formula chiave dello step
`Non tier rigidi, ma capability canoniche attivabili per progetto.`

## Cosa prepara per lo step successivo
Lo Step 9 prepara naturalmente due direzioni:
- `operations, analytics e manutenzione post-pubblicazione`
- `pricing e commercializzazione` su base piu' matura

Prima serviva capire cosa il prodotto e'.
Ora serve capire come viene governato nel tempo e come si misura se funziona davvero.
