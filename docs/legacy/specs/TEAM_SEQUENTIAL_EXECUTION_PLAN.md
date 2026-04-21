# TEAM_SEQUENTIAL_EXECUTION_PLAN

## Scopo
Tradurre lo stato corrente in un piano esecutivo sequenziale per il team.

Obiettivo:
- far avanzare il prodotto senza salti di layer
- evitare lavoro parallelo in conflitto
- avere criteri di uscita verificabili per ogni milestone

## Regola operativa
Una milestone non si considera chiusa quando "il codice compila", ma quando:
- contratto esposto lato piattaforma
- almeno un consumer reale integrato
- criteri di verifica minimi passati

## Sequenza raccomandata

### Milestone 1 - Hardening Runtime Manifest v1
Step strategico di riferimento:
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)

Owner primario: `Platform`
Owner secondario: `Mobile`

Obiettivo:
- stabilizzare il nuovo endpoint `visit/runtime`
- formalizzare input/output e failure modes

Interventi:
- validazione input `duration/language/ratings`
- error taxonomy coerente (`400`, `404`, `500`)
- telemetry minima su compose/runtime
- allineamento route `visit/compose` come adapter esplicito

Exit criteria:
- `visit/runtime` stabile e documentato
- mobile wizard usa solo `visit/runtime`
- nessuna logica di composizione lato client

### Milestone 2 - Session State Canonico Mobile
Step strategico di riferimento:
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)
- [step7.md](/Users/tommycinti/Documents/toolia/docs/plans/step7.md)
- [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md)

Owner primario: `Mobile`
Owner secondario: `Platform`

Obiettivo:
- superare `composedVisit` come unico stato runtime

Interventi:
- introdurre in store:
  - `runtimeManifestId`
  - `visitSessionId`
  - `routeSequence`
  - `contentQueue`
  - `recalcPolicy`
  - `connectedAssistPolicy`
- aggiornare view `composed-visit` per leggere da session state canonico

Exit criteria:
- la sessione e' guidata dal runtime manifest
- `composed_visit` e' solo payload di transizione o viene rimosso

### Milestone 3 - Session Bundle v1 Offline
Step strategico di riferimento:
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)

Owner primario: `Platform`
Owner secondario: `Mobile`

Obiettivo:
- introdurre primo `Session Bundle` eseguibile offline

Interventi:
- contratto `Session Bundle`
- endpoint/build lato piattaforma
- persist locale bundle (audio+visual essenziali)
- readiness gate prima di start session

Exit criteria:
- una sessione puo' partire senza rete sui contenuti essenziali
- resume base dopo kill/restart app

### Milestone 4 - Preview Web Runtime-Driven
Step strategico di riferimento:
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)
- [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md)

Owner primario: `Web Preview`
Owner secondario: `Platform`

Obiettivo:
- rendere la preview un consumer runtime-first completo

Interventi:
- sostituire consumo diretto compose con runtime manifest
- sezioni preview separate:
  - bootstrap
  - session
  - player/map shell
- cleanup warning principali (`next/image`)

Exit criteria:
- preview usa contratti canonici end-to-end
- nessuna dipendenza operativa da route legacy

### Milestone 5 - Assistant Runtime Pack v1
Step strategico di riferimento:
- [step5.md](/Users/tommycinti/Documents/toolia/docs/plans/step5.md)
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)
- [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md)

Owner primario: `Platform AI`
Owner secondario: `Mobile`, `Web Preview`

Obiettivo:
- integrare assistant come parte del runtime, non canale separato

Interventi:
- `Visit Assistant Pack` minimale
- aggancio assistant entrypoint al punto corrente
- policy offline subset + connected enrich

Exit criteria:
- assistant bounded e situato in runtime
- comportamento coerente offline/online

### Milestone 6 - Family Overlay Runtime v1
Step strategico di riferimento:
- [step5.md](/Users/tommycinti/Documents/toolia/docs/plans/step5.md)
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)
- [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md)

Owner primario: `Content/Platform`
Owner secondario: `Mobile`, `Web Preview`

Obiettivo:
- integrare family overlay episodico sul percorso comune

Interventi:
- `Family Overlay Schedule` nel runtime manifest
- UI mission points su player/map flow
- handoff breve family -> percorso principale

Exit criteria:
- missioni family attivabili in punti previsti
- nessun secondo tour parallelo separato

### Milestone 7 - Project Delivery Pack e Handoff Expo
Step strategico di riferimento:
- [step9.md](/Users/tommycinti/Documents/toolia/docs/plans/step9.md)
- [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md)

Owner primario: `Platform`
Owner secondario: `Mobile Ops`

Obiettivo:
- chiudere pipeline `platform -> web preview -> expo app`

Interventi:
- `Project Delivery Pack` versionato
- export allineato a bootstrap/runtime contracts
- checklist handoff per progetto

Exit criteria:
- progetto esportabile in modo ripetibile
- app Expo bootstrap su artefatti canonici

### Milestone 8 - Observability e Loop di miglioramento
Step strategico di riferimento:
- [step10.md](/Users/tommycinti/Documents/toolia/docs/plans/step10.md)

Owner primario: `Platform Ops`
Owner secondario: `Team interfunzionale`

Obiettivo:
- rendere misurabile l'efficacia sul campo

Interventi:
- eventi sessione standardizzati
- dashboard health progetto/capability
- issue loop e release notes operative

Exit criteria:
- ogni rilascio produce insight utilizzabili
- backlog guidato da segnali reali

## Parallelismo consigliato
- consentito:
  - platform su contratti
  - mobile su consumer
  - preview su shell UX
- vietato:
  - UI finale senza contratto disponibile
  - route nuova senza builder condiviso
  - duplicazione logica di composizione nei client

## Cadenza execution
- Planning: settimanale
- Checkpoint tecnico: bisettimanale
- Demo cross-team: ogni milestone

## Checkpoint per ogni milestone
1. Contratto aggiornato
2. Endpoint/build operativo
3. Consumer integrato
4. Verifica quality minima
5. Note di migrazione

## Keep / Remove policy per il team
Prima di ogni milestone, compilare una mini-checklist:

### Keep
- quali file restano source of truth in questa milestone
- quali builder/contract non devono essere bypassati

### Transform
- quali file legacy restano solo come adapter
- entro quale milestone devono perdere centralita'

### Remove
- quali fallback possono essere rimossi in sicurezza
- quale smoke test copre la rimozione

Riferimento obbligatorio per questa checklist:
- [REPO_TOUCHPOINTS_AND_MIGRATION_MAP.md](/Users/tommycinti/Documents/toolia/docs/specs/REPO_TOUCHPOINTS_AND_MIGRATION_MAP.md)

## Regola di tracciabilita' strategica
- Ogni milestone, ticket e PR deve riportare almeno un riferimento allo step strategico (`/docs/plans/step*.md`) che giustifica scope e priorita'.
