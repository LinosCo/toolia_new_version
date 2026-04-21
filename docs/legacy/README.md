# docs/legacy — documentazione di riferimento estesa

Qui è archiviata la **documentazione originale più dettagliata** del progetto Toolia Studio (13 step plans + 14 spec tecniche). È materiale utile per approfondire concetti che la spec consolidata in `docs/spec/` sintetizza, ma **non è autoritativa**: in caso di conflitto con `docs/spec/`, vince `docs/spec/`.

## Quando leggere questa cartella

- Quando stai progettando uno step complesso e vuoi vedere il ragionamento di fondo oltre la sintesi.
- Quando hai bisogno di distinzioni concettuali non presenti nella spec consolidata (es. Intent layer vs Evidence layer, Narrative Tension Map, Visual Reference Layer, ecc.).
- Quando cerchi dettagli tecnici su data model full, state machine, runtime contracts che il consolidato non riporta.

## Quando NON leggerla

- Non come prima fonte di verità. Parti sempre da `docs/spec/02-flusso-inserimento-dati.md`.
- Non per decisioni di MVP scope — per quello vedi `.claude/` memory `project_mvp_scope_decisions.md`.

## Indice

### `plans/` — 13 step plan originali

| File | Contenuto | Stato MVP |
|---|---|---|
| `step1.md` | Strategia e fonti — Intent/Evidence, griglia editoriale, Narrative Tension Map, Visitor Questions | ✅ In costruzione (sub-step Fonti + Brief) |
| `step2.md` | Fondazione spaziale — Logical Map, spatial mode (GPS/indoor/hybrid), nodi, segmenti | ⏭️ Futuro (Luogo) |
| `step3.md` | Driver, personas e inferenza | ⏭️ Futuro |
| `step4.md` | Architettura della visita (percorsi) | ⏭️ Futuro |
| `step5.md` | Produzione contenuti modulari (schede) | ⏭️ Futuro |
| `step6.md` | Composizione runtime e delivery | ⏭️ Futuro |
| `step7.md` | UX/UI visita — visitor app | ⏭️ Post-MVP |
| `step8.md` | UX/UI workspace editoriale Toolia (Studio) | 🔄 In corso |
| `step9.md` | Capability model e configurazione progetto | ⏭️ Post-MVP |
| `step10.md` | Operations, analytics, manutenzione | ⏭️ Post-MVP |
| `step11.md` | Design system, template modulare, theming | ⏭️ Post-MVP |
| `step12.md` | Interaction model visitor app | ⏭️ Post-MVP |
| `step13.md` | Pipeline prototipazione web, handoff, delivery | ⏭️ Post-MVP |

### `specs/` — 14 spec tecniche

| File | Contenuto | Uso |
|---|---|---|
| `SPEC_INDEX.md` | Indice master | Mappa a colpo d'occhio |
| `PROJECT_APP_DEFINITION.md` | Definizione visitor app | Alimenta comprensione output finale |
| `ARCHITECTURE_AND_TECH_STACK.md` | Stack + decisioni architetturali | Consultare prima grandi refactor |
| `DATA_MODEL.md` | Data model completo (Prisma) | Più dettagliato di `docs/spec/03-data-model.md` |
| `STATE_MACHINE.md` | Status workflow scheda, progetto, job | Consultare quando costruisci logica di approvazione |
| `RUNTIME_CONTRACTS.md` | Contratti runtime per app visitor | Utile per Step 6+ (delivery) |
| `IMPLEMENTATION_PLAN.md` | Piano di implementazione originale | Confrontare con roadmap MVP |
| `IMPLEMENTATION_GUIDE_FOR_LLMS.md` | Istruzioni per LLM che lavorano al progetto | Rilevante per il team AI |
| `EXECUTION_BOARD.md` | Board esecuzione | Storico |
| `DEVELOPMENT_AND_QUALITY_METHOD.md` | Metodo sviluppo | Consultare per QA |
| `DEVELOPMENT_STATUS.md` | Stato sviluppo originale | Storico |
| `TEAM_SEQUENTIAL_EXECUTION_PLAN.md` | Piano esecuzione team | Storico |
| `UX_UI_QA_MATRIX.md` | Matrice QA UX/UI | Utile per review finale |
| `APP_UX_UI_TEMPLATE_EXECUTION.md` | Template esecuzione UX/UI app | Utile per visitor app |
| `REPO_TOUCHPOINTS_AND_MIGRATION_MAP.md` | Mappa migrazione | Storico |

### `STATO-PROGETTO.md` — stato originale del progetto prima del rebuild

## Regola d'oro

1. Parti da `docs/spec/` (autoritativo, sintetico)
2. Se serve profondità concettuale → vai su `docs/legacy/plans/step<N>.md`
3. Se serve dettaglio tecnico → vai su `docs/legacy/specs/<FILE>.md`
4. Se conflitto fra consolidato e legacy → vince consolidato, ma segnala la discrepanza all'utente
