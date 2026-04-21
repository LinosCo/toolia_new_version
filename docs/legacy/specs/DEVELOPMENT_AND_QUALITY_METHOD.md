# DEVELOPMENT_AND_QUALITY_METHOD

## Scopo
Questo documento definisce un metodo pratico di sviluppo e controllo qualita' per Toolia.

Serve a guidare:
- sviluppo umano
- sviluppo assistito da LLM
- review interne
- handoff tra piattaforma, preview e native

## Obiettivo
Ridurre tre rischi:
- feature implementate senza contratto chiaro
- divergenza tra platform, web preview e mobile
- regressioni invisibili su offline, family, assistant o entitlement

## Metodo di sviluppo raccomandato

### Fase 1. Clarify
Prima di scrivere codice:
- identificare lo step o i documenti che governano la feature
- identificare capability coinvolte
- identificare i client coinvolti

### Fase 2. Contract
Definire o aggiornare:
- shape dati
- contract export
- stati rilevanti
- fallback

### Fase 3. Platform first
Implementare prima il lato piattaforma o il contratto centrale quando la feature lo richiede.

### Fase 4. Preview validation
Portare la feature nella web preview, se rilevante per l'esperienza visitatore.

### Fase 5. Native implementation
Solo dopo implementare il lato Expo/device.

### Fase 6. QA
Verificare:
- behavior base
- degraded mode
- capability on/off
- offline

## Quality gates obbligatori

### 1. Contract gate
La feature non dovrebbe andare avanti se:
- non e' chiaro quale contratto tocca
- non e' chiaro chi e' il source of truth

### 2. Capability gate
La feature deve dichiarare:
- se e' core
- se e' capability-aware
- come si comporta se la capability e' off

### 3. Offline gate
Va chiarito:
- funziona offline?
- degrada?
- richiede connected assist?

### 4. Shared-client gate
Va chiarito:
- tocca web preview?
- tocca app Expo?
- richiede comportamento coerente su entrambi?

### 5. Recovery gate
Va chiarito:
- cosa succede se si interrompe
- cosa succede se manca un asset
- cosa succede se entitlement o bundle non sono disponibili

## Checklists minime per feature

### Feature di contenuto/runtime
- contratto definito
- fallback definito
- impatto su session bundle definito
- impatto su Runtime Manifest definito

### Feature visitor app
- UX path definito
- stato locked/unlocked definito
- stato offline definito
- stato errore definito

### Feature premium
- scope definito
- durata definita
- binding definito
- expiry behavior definito

### Feature assistant/family
- perimetro definito
- frequenza o densita' definita
- fallback definito
- analytics minimi definiti

## Test scenarios minimi
Ogni feature importante dovrebbe essere provata almeno in questi scenari:
- progetto base senza capability avanzate
- progetto con capability attiva
- offline totale
- connected assist disponibile
- entitlement valido
- entitlement scaduto o assente

## Review discipline
La review non dovrebbe limitarsi a:
- il codice compila
- la UI appare

Deve chiedersi anche:
- il comportamento rispetta il contratto?
- la preview e la native restano coerenti?
- la feature ha un fallback reale?
- la capability si spegne bene?

## Quando aggiornare i documenti
Aggiornare i documenti ogni volta che cambia:
- un contratto
- una capability
- un comportamento runtime
- una regola di unlock/entitlement
- una regola di activation
- una regola di preview/native handoff

## Cosa evitare
- sviluppo diretto sul client senza aggiornare i contratti
- fix spot che introducono eccezioni implicite
- stato salvato in luoghi incoerenti tra web e native
- feature premium trattate come semplice nascondi/mostra UI
- uso della rete per parti core che dovrebbero stare nel bundle

## Deliverable tecnici canonici
Per rendere il coding robusto questi documenti vanno trattati come base:
- `DATA_MODEL.md`
- `STATE_MACHINE.md`
- `RUNTIME_CONTRACTS.md`
- `IMPLEMENTATION_PLAN.md`
- `REPO_TOUCHPOINTS_AND_MIGRATION_MAP.md`

## Formula chiave
`Ogni feature deve passare per contratto, capability, fallback, preview e QA prima di essere considerata affidabile.`
