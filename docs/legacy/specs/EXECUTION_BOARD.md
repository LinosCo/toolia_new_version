# EXECUTION_BOARD

## Scopo
Tabella operativa sprint-ready per guidare l'esecuzione del team.

Uso consigliato:
- una riga = un work package assegnabile
- ogni sprint seleziona righe con `status = ready`
- una riga si chiude solo se passa tutti i criteri DoD

Legenda status:
- `backlog`
- `ready`
- `in_progress`
- `blocked`
- `done`

## Execution Board (Sprint-ready)
| ID | Work Package | Step Strategico (ref) | Milestone | Owner Primario | Owner Supporto | Keep / Transform / Remove | Dipendenze | Sprint Target | DoD (Definition of Done) | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| EB-01 | Hardening `visit/runtime` | [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md) | M1 | Platform | Mobile | Keep: [visit runtime route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/runtime/route.ts) / Transform: [visit compose route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/visit/compose/route.ts) | runtime contract v1 gia' presente | Sprint 1 | input validation + error taxonomy + telemetry minima + smoke test route | done |
| EB-02 | Session state canonico mobile | [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md), [step7.md](/Users/tommycinti/Documents/toolia/docs/plans/step7.md), [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md) | M2 | Mobile | Platform | Transform: [appStore.ts](/Users/tommycinti/Documents/toolia/mobile/src/store/appStore.ts), [composed-visit.tsx](/Users/tommycinti/Documents/toolia/mobile/app/composed-visit.tsx) | EB-01 | Sprint 1-2 | store con `runtimeManifestId/visitSessionId/routeSequence/contentQueue/policies` + UI lettura da stato canonico | done |
| EB-03 | Session Bundle v1 | [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md) | M3 | Platform | Mobile | Keep: contratti runtime / Transform: download flow in [useItineraryDownload.ts](/Users/tommycinti/Documents/toolia/mobile/src/hooks/useItineraryDownload.ts) | EB-01, EB-02 | Sprint 2 | contratto bundle + endpoint + readiness gate + resume base offline | done |
| EB-04 | Preview runtime-first completa | [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md), [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md) | M4 | Web Preview | Platform | Transform: [preview page](/Users/tommycinti/Documents/toolia/src/app/preview/[projectId]/page.tsx) | EB-01 | Sprint 2 | preview usa runtime manifest end-to-end, nessuna compose logic lato client | done |
| EB-05 | Assistant runtime pack v1 | [step5.md](/Users/tommycinti/Documents/toolia/docs/plans/step5.md), [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md), [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md) | M5 | Platform AI | Mobile, Web Preview | Transform: [chatbot route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/chatbot/route.ts) in consumer di pack | EB-01, EB-02 | Sprint 3 | pack bounded + integrazione UI contestuale + policy offline/online | done |
| EB-06 | Family overlay runtime v1 | [step5.md](/Users/tommycinti/Documents/toolia/docs/plans/step5.md), [step6.md](/Users/tommycinti/Documents/toolia/docs/plans/step6.md), [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md) | M6 | Content/Platform | Mobile, Web Preview | Transform: family flows runtime-side, no separate tour | EB-01, EB-02 | Sprint 3 | schedule missioni + attivazione episodica + handoff al percorso principale | in_progress (scheduler + mission content + completion persistence + progressive hints + preview family toggle/schedule recap + profilo editoriale project-aware + age/game-modes) |
| EB-07 | Project Delivery Pack | [step9.md](/Users/tommycinti/Documents/toolia/docs/plans/step9.md), [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md) | M7 | Platform | Mobile Ops | Transform: [app-manifest route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/app-manifest/route.ts), [export route](/Users/tommycinti/Documents/toolia/src/app/api/projects/[id]/export/route.ts) | EB-03, EB-04 | Sprint 4 | delivery pack versionato + handoff expo ripetibile | done |
| EB-08 | Observability loop | [step10.md](/Users/tommycinti/Documents/toolia/docs/plans/step10.md) | M8 | Platform Ops | Team cross-funzionale | Keep: contracts + runtime / Transform: analytics events | EB-01..EB-07 | Sprint 4 | event model + dashboard health + issue loop attivo | done |
| EB-09 | App UX/UI template modulare | [step11.md](/Users/tommycinti/Documents/toolia/docs/plans/step11.md), [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md), [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md) | M9 | Product UX | Mobile, Platform | Transform: shell/player/map/unlock/assistant in template capability-driven | EB-02, EB-03, EB-05, EB-06 | Sprint 5 | checklist UX/UI modulare + stati canonici + gating premium/lingua/offline | done (quick actions complete + POI scan no-GPS activation + family visual hints) |

## Sprint 1 consigliato
Scope consigliato:
- EB-01
- EB-02 (fase 1: store shape + mapping iniziale)
- EB-04 (fase 1: wiring runtime-first)

Obiettivi di sprint:
- stabilizzare composizione sessione su runtime manifest
- iniziare la migrazione client su stato canonico
- eliminare nuova logica di composizione lato preview

## Gate di avanzamento tra sprint
- Gate A (fine Sprint 1):
  - EB-01 `done`
  - EB-02 almeno `in_progress` con store canonico introdotto
  - EB-04 almeno `in_progress` con runtime consumption avviata
- Gate B (fine Sprint 2):
  - EB-02 `done`
  - EB-03 `in_progress`
  - EB-04 `done`
- Gate C (fine Sprint 3):
  - EB-03 `done`
  - EB-05 `in_progress`
  - EB-06 `in_progress`

## Regole operative
- Non avviare task `Transform` se manca il contratto `Keep` corrispondente.
- Una riga `Remove` puo' essere eseguita solo dopo:
  - consumer migrati
  - smoke test verdi
  - rollback path definito
- Ogni riga deve mantenere almeno un riferimento esplicito allo step strategico (`/docs/plans/step*.md`) da cui deriva.
- Ogni riga deve avere PR con:
  - file toccati
  - criterio DoD verificato
  - riferimento allo step strategico usato per validare scope e priorita'
  - impatto su `Keep / Transform / Remove`

## Riferimenti
- [DEVELOPMENT_STATUS.md](/Users/tommycinti/Documents/toolia/docs/specs/DEVELOPMENT_STATUS.md)
- [TEAM_SEQUENTIAL_EXECUTION_PLAN.md](/Users/tommycinti/Documents/toolia/docs/specs/TEAM_SEQUENTIAL_EXECUTION_PLAN.md)
- [REPO_TOUCHPOINTS_AND_MIGRATION_MAP.md](/Users/tommycinti/Documents/toolia/docs/specs/REPO_TOUCHPOINTS_AND_MIGRATION_MAP.md)
- [SPEC_INDEX.md](/Users/tommycinti/Documents/toolia/docs/specs/SPEC_INDEX.md)
- [APP_UX_UI_TEMPLATE_EXECUTION.md](/Users/tommycinti/Documents/toolia/docs/specs/APP_UX_UI_TEMPLATE_EXECUTION.md)
- [UX_UI_QA_MATRIX.md](/Users/tommycinti/Documents/toolia/docs/specs/UX_UI_QA_MATRIX.md)
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
