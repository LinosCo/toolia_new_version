# SPEC_INDEX

## Scopo
Questo documento organizza i materiali di progetto in un ordine leggibile per sviluppo e manutenzione.

Serve a:
- chiarire quali documenti sono strategici
- chiarire quali documenti sono implementativi
- dire a un LLM o a uno sviluppatore umano da dove partire

## Ordine di lettura consigliato

### 1. Visione prodotto
Leggere prima i piani in `/docs/plans`:
- [step1.md](/Users/tommycinti/Documents/toolia/docs/plans/step1.md)
- [step2.md](/Users/tommycinti/Documents/toolia/docs/plans/step2.md)
- [step3.md](/Users/tommycinti/Documents/toolia/docs/plans/step3.md)
- [step4.md](/Users/tommycinti/Documents/toolia/docs/plans/step4.md)
- [step5.md](/Users/tommycinti/Documents/toolia/docs/plans/step5.md)
- [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md)
- [step7.md](/Users/tommycinti/Documents/toolia/docs/plans/step7.md)
- [step8.md](/Users/tommycinti/Documents/toolia/docs/plans/step8.md)
- [step9.md](/Users/tommycinti/Documents/toolia/docs/plans/step9.md)
- [step10.md](/Users/tommycinti/Documents/toolia/docs/plans/step10.md)
- [step11.md](/Users/tommycinti/Documents/toolia/docs/plans/step11.md)
- [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md)
- [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md)

### 2. Guardrail di sviluppo
Poi leggere:
- [IMPLEMENTATION_GUIDE_FOR_LLMS.md](/Users/tommycinti/Documents/toolia/docs/specs/IMPLEMENTATION_GUIDE_FOR_LLMS.md)
- [ARCHITECTURE_AND_TECH_STACK.md](/Users/tommycinti/Documents/toolia/docs/specs/ARCHITECTURE_AND_TECH_STACK.md)
- [DEVELOPMENT_AND_QUALITY_METHOD.md](/Users/tommycinti/Documents/toolia/docs/specs/DEVELOPMENT_AND_QUALITY_METHOD.md)

### 3. Contratti implementativi
Poi leggere:
- [PROJECT_APP_DEFINITION.md](/Users/tommycinti/Documents/toolia/docs/specs/PROJECT_APP_DEFINITION.md)
- [DATA_MODEL.md](/Users/tommycinti/Documents/toolia/docs/specs/DATA_MODEL.md)
- [STATE_MACHINE.md](/Users/tommycinti/Documents/toolia/docs/specs/STATE_MACHINE.md)
- [RUNTIME_CONTRACTS.md](/Users/tommycinti/Documents/toolia/docs/specs/RUNTIME_CONTRACTS.md)
- [REPO_TOUCHPOINTS_AND_MIGRATION_MAP.md](/Users/tommycinti/Documents/toolia/docs/specs/REPO_TOUCHPOINTS_AND_MIGRATION_MAP.md)

### 4. Piano operativo
Poi leggere:
- [DEVELOPMENT_STATUS.md](/Users/tommycinti/Documents/toolia/docs/specs/DEVELOPMENT_STATUS.md)
- [IMPLEMENTATION_PLAN.md](/Users/tommycinti/Documents/toolia/docs/specs/IMPLEMENTATION_PLAN.md)
- [TEAM_SEQUENTIAL_EXECUTION_PLAN.md](/Users/tommycinti/Documents/toolia/docs/specs/TEAM_SEQUENTIAL_EXECUTION_PLAN.md)
- [EXECUTION_BOARD.md](/Users/tommycinti/Documents/toolia/docs/specs/EXECUTION_BOARD.md)

## Regola d'uso
Un LLM o uno sviluppatore non dovrebbe:
- partire dal codice e inferire il prodotto
- partire da un solo step
- implementare una feature senza leggere almeno:
  - i piani rilevanti
  - i guardrail architetturali
  - il contratto tecnico del layer coinvolto
  - la mappa del repo se deve toccare file reali

## Formula chiave
`prima capire il sistema, poi implementare il layer, poi verificare i guardrail`
