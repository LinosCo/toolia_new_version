# Step 11 - Design system, template modulare e theming delle app

## Scopo dello step
Questo step prende:
- l'architettura UX definita negli Step 7-10
- il capability model
- la necessita' di customizzare i progetti senza perdere coerenza di prodotto

e li trasforma in un sistema di template, componenti e theming controllato.

Qui non stiamo piu' decidendo:
- cosa fa il prodotto
- come si compone la visita
- come si governa il progetto

Stiamo decidendo:
- come le app vengono disegnate
- cosa puo' cambiare e cosa deve restare stabile
- come supportare white-label o progetti diversi senza rifare la UX ogni volta

## Problema strategico che risolve
Se ogni progetto o cliente porta a ridisegnare completamente l'app, succede questo:
- l'UX si frammenta
- la manutenzione esplode
- il runtime deve supportare troppe varianti incoerenti
- i pattern che funzionano vengono persi
- la qualita' dipende troppo dal singolo progetto

Se invece tutto e' rigidissimo:
- il prodotto sembra sempre uguale
- il cliente percepisce poco valore di customizzazione
- il luogo non sviluppa una propria identita' visiva

In una frase:

`serve un sistema che permetta di personalizzare lo stile senza riscrivere l'esperienza`

## Decisione di fondo dello step
La scelta forte e' questa:

`UX e struttura dell'app sono comuni`
`stile, tono visivo e alcuni moduli sono customizzabili entro guardrail forti`

Quindi:
- non app diverse ogni volta
- non solo cambio colori cosmetico
- non redesign libero per progetto

Ma:
- un template modulare comune
- un design system coerente
- un motore di theming controllato
- alcuni slot progettati per differenziare il progetto

## Principi guida dello step

### 1. One product, many identities
Il prodotto deve restare riconoscibile come sistema unico.
I progetti possono avere identita' visive diverse.

### 2. Behavior is stable, presentation is flexible
Le interazioni critiche devono restare stabili.

Per esempio:
- session start
- playback
- route awareness
- assistant
- family moments
- rejoin e recalc

Lo stile puo' cambiare.
La logica d'uso no.

### 3. Theme, not redesign
La customizzazione deve passare per:
- token
- varianti
- moduli predefiniti
- asset di brand

non per rifare da zero il prodotto.

### 4. Capability-aware UI
Il template deve reagire alle capability attive del progetto:
- mostrare moduli quando servono
- nasconderli quando non servono
- degradare bene quando una capability non e' attiva

### 5. Guardrails over freedom
La liberta' visiva deve essere reale ma delimitata.

### 6. Web-to-native visual continuity
Il sistema visivo deve poter vivere sia nella preview web sia nella app nativa senza diventare due design separati.

## Cosa deve restare comune tra le app
Queste parti dovrebbero restare canoniche:
- architettura di navigazione
- shell della visita
- pattern di playback
- pattern di route awareness
- pattern di assistant
- pattern di family overlay
- stati offline/online
- error states e recovery states

In pratica:
- stessi comportamenti
- stessi pattern
- stessa grammatica d'interazione

## Cosa puo' cambiare tra le app
Queste parti invece possono e devono essere customizzabili:
- palette cromatica
- tipografia
- set di icone o stile iconografico entro limiti
- forma e densita' dei componenti
- imagery e hero treatment
- stile delle card
- stile di illustrazioni e visual generated
- tono microcopy entro un range coerente
- motion language entro un range coerente

## Template system
Il template system deve essere il livello che collega:
- design system comune
- capability del progetto
- identita' visiva del progetto o cliente

### Struttura consigliata
- `core app template`
- `theme layer`
- `module variants`
- `project skin`

## Core app template
Il `core app template` contiene:
- information architecture stabile
- layout principali
- pattern di navigazione
- stati standard
- pattern di contenuto

Questa parte non dovrebbe cambiare da progetto a progetto.

## Theme layer
Il `theme layer` controlla:
- colori
- typography scale
- spacing scale
- border radius / shape language
- shadow/elevation logic
- motion tempo
- icon tone
- imagery framing

Questa parte puo' cambiare per progetto, ma dentro un contratto preciso.

## Module variants
Alcuni moduli possono avere varianti.

Per esempio:
- card dei contenuti
- schermata start session
- visual treatment del player
- family mission cards
- assistant drawer/panel
- route awareness modules

Ma le varianti devono essere finite e governate.
Non infinite.

## Project skin
Il `project skin` e' il pacchetto di personalizzazione visiva del singolo progetto o cliente.

Può includere:
- logo
- palette
- font pair selezionato
- hero imagery
- character art style
- texture o pattern
- stile delle illustrazioni
- preset di varianti modulo

Questo skin deve essere esportabile in modo coerente sia verso:
- `Project Web Preview App`
- app nativa del progetto

## Theme contract
Ogni skin o tema deve rispettare un `Theme Contract`.

### Campi minimi consigliati
- `theme_id`
- `brand_mode`
- `color_tokens`
- `semantic_tokens`
- `typography_tokens`
- `spacing_tokens`
- `shape_tokens`
- `motion_tokens`
- `icon_style`
- `visual_rules`
- `allowed_module_variants`
- `accessibility_constraints`
- `export_targets`

## Semantic tokens
I token non devono essere solo colori grezzi.

Servono token semantici come:
- `surface_primary`
- `surface_secondary`
- `text_primary`
- `text_muted`
- `accent_primary`
- `accent_family`
- `assistant_surface`
- `warning_surface`
- `success_surface`
- `route_progress`
- `playback_active`

Questo permette di cambiare tema senza rompere la UI.

## Moduli canonici del template visitor
Il sistema dovrebbe avere moduli canonici almeno per:
- start session
- readiness state
- visit shell
- player block
- content card
- segment transition
- route progress
- assistant entry point
- assistant panel
- family mission card
- clue card
- reward card
- error/fallback state
- completion state

Ogni modulo puo' avere varianti, ma resta dentro il sistema comune.

## Moduli capability-aware
Il template deve sapere reagire alle capability.

### Esempi
Se `visit_assistant = off`:
- nessun entry point assistant
- nessun panel assistant

Se `family_overlay = off`:
- nessuna family mission card
- nessun accento visuale family

Se `connected_assist = advanced`:
- stati di enrichable mode piu' ricchi
- segnali di sync/backup piu' presenti

## White-label e brand depth
Non tutti i progetti avranno lo stesso livello di brandizzazione.

Quindi il sistema dovrebbe supportare almeno tre profondita' di skin:

### 1. `light skin`
- logo
- palette
- imagery

### 2. `brand skin`
- logo
- palette
- typography
- modulo variants selezionati

### 3. `full project skin`
- tutto il precedente
- generated visuals coerenti
- family character styling
- assistant visual treatment

Questo non cambia la UX di base.
Cambia la percezione e l'identita' dell'app.

## Guardrail da fissare
Per evitare derive, alcuni vincoli devono essere espliciti.

### Vincoli forti
- contrasto e accessibilita' non derogabili
- pattern di navigazione non modificabili liberamente
- gerarchia del player non modificabile liberamente
- stati di errore e recovery sempre coerenti
- family mode sempre leggibile e distinto
- assistant sempre riconoscibile ma non dominante

### Vincoli medi
- varianti modulo finite
- massimo livello di decorazione
- motion entro soglie controllate

## Workspace per il design template
Questa parte dovrebbe avere una sua superficie operativa, almeno minima.

Toolia o il team design deve poter:
- scegliere un tema base
- applicare una skin di progetto
- vedere preview delle superfici principali
- verificare compatibilita' con capability attive
- validare accessibilita' e coerenza

## Preview obbligatorie
Ogni template/skin dovrebbe essere previewabile almeno su:
- session start
- playback screen
- assistant panel
- family mission
- offline/error state
- completion state

Senza queste preview, la personalizzazione visiva rischia di rompere punti critici del prodotto.

## Accessibilita'
Questo step deve trattare l'accessibilita' come vincolo del sistema, non come ritocco finale.

Almeno:
- contrasto
- leggibilita' tipografica
- target touch coerenti
- stati focus chiari
- gerarchia di contenuto leggibile

## Cosa non deve fare questo step
Questo step non deve:
- reinventare la UX per ogni progetto
- trasformare il prodotto in una galleria di temi incoerenti
- rendere customizzabile ogni singolo dettaglio
- confondere branding con utilita'

Serve a progettare una `customizzazione controllata`.

## Output dello step
Gli output minimi di questo step dovrebbero essere:
- `Core App Template`
- `Theme Contract`
- `Semantic Token System`
- `Module Variant Catalog`
- `Project Skin Model`
- `Project Theme Pack`
- `Capability-Aware UI Rules`
- `Design Guardrail Set`
- `Template Preview Matrix`

## Quando si chiude davvero lo step
Lo Step 11 si chiude quando:
- e' chiaro cosa dell'app e' comune e cosa e' customizzabile
- il prodotto puo' supportare piu' identita' visive senza perdere coerenza
- i moduli canonici sono definiti
- capability, tema e runtime parlano la stessa lingua
- il design non dipende piu' da redesign manuali progetto per progetto

## Traduzione implementativa minima
Questo step dovrebbe lasciare almeno questi artefatti operativi:
- `Core App Template`
- `Theme Contract`
- `Semantic Token Set`
- `Module Variant Catalog`
- `Project Skin Model`
- `Design Guardrail Set`

Regole forti per l'implementazione:
- web preview e Expo devono poter leggere la stessa definizione di tema
- i moduli visitor devono essere capability-aware e non ridisegnati per ogni progetto
- i progetti devono differire per token, varianti e skin, non per logiche di layout riscritte ogni volta
- motion, contrasto, typography scale e stati di lock/degraded devono essere parte del design system

Anti-pattern da evitare:
- per-project CSS/React Native styling ad hoc senza passare dal theme contract
- componenti con nomi generici ma semantica visuale non canonica
- template troppo rigido da non permettere brand depth o troppo libero da rompere la coerenza

## Formula chiave dello step
`UX comune, comportamento comune, stile personalizzabile entro guardrail forti.`

## Cosa prepara dopo
Questo step non chiude ancora il percorso.

Prepara direttamente:
- lo `Step 12`, cioe' il modello di interazione completo della visitor app
- lo `Step 13`, cioe' la pipeline di preview web, handoff nativo e delivery delle project app

In parallelo rende finalmente utilizzabili anche i documenti implementativi trasversali, perche' a questo punto il sistema e':
- pensato
- governato
- osservabile
- e anche disegnabile in modo coerente
