# UX_UI_QA_MATRIX

## Scopo
Checklist QA eseguibile per validare il template UX/UI prima dell'handoff nativo Expo.

Riferimenti:
- [step11.md](/Users/tommycinti/Documents/toolia/docs/plans/step11.md)
- [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md)
- [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md)
- [APP_UX_UI_TEMPLATE_EXECUTION.md](/Users/tommycinti/Documents/toolia/docs/specs/APP_UX_UI_TEMPLATE_EXECUTION.md)

## Matrice scenari

| ID | Scenario | Precondizioni | Passi | Esito atteso |
|---|---|---|---|---|
| QA-01 | Session start standard | runtime ok, bundle ready | Apri wizard, scegli temi+durata, crea visita | transizione a `composed-visit`, evento `path_started` emesso una sola volta |
| QA-02 | Session start bloccato (bundle) | rete degradata, bundle not ready | Avvia visita | blocked-state card con reason esplicita, evento `visit_start_blocked` |
| QA-03 | Family mode attivo | `familyMode=true` | Avvia visita e percorri schede trigger | mission card episodiche mostrate, completamento persistito |
| QA-04 | Assistant online | connettività disponibile | Apri chatbot e invia domanda contestuale | risposta contestuale completa, badge online visibile |
| QA-05 | Assistant offline | rete assente/intermittente | Apri chatbot e invia domanda | fallback locale, badge offline visibile, evento `assistant_local_fallback_used` |
| QA-06 | Premium unlock 1 day | QR premium valido | In scanner seleziona `1 day`, scansiona QR | entitlement locale attivo `1_day`, badge premium home visibile |
| QA-07 | Premium unlock 1 week | QR premium valido | In scanner seleziona `1 week`, scansiona QR | entitlement locale attivo `1_week`, analytics con `entitlement_duration=1_week` |
| QA-08 | Map shortcut in visita | visita in corso | Da composed-visit apri mappa | navigazione a `/map`, evento `map_opened` |
| QA-09 | Coerenza shell stato rete | cambio rete runtime | toggla connessione online/offline | top bar in visita aggiorna badge `Online/Offline` senza crash |
| QA-10 | Lingua sessione | multi-language progetto | cambia lingua home, avvia wizard | lingua propagata a runtime compose + contenuti coerenti |
| QA-11 | POI activation no-GPS | visita in corso con coda schede attiva | da menu visita apri scanner in mode `POI`, scansiona/inserisci codice valido | salto al POI corretto in `sessionPlayback`, evento `poi_scan_activated` registrato |
| QA-12 | Family mission visual hint | family mode attivo con schede immagini valorizzate | raggiungi trigger missione family in visita | mission card mostra immagine hint coerente con scheda/POI, senza regressioni playback |
| QA-13 | POI activation failure telemetry | visita in corso + codice POI non valido | da scanner `POI` inserisci codice fuori percorso | alert errore mostrato, evento `poi_scan_failed` registrato con `reason` coerente |

## Copertura per tipo progetto
- Territory (geo-native): QA-01..QA-10 obbligatori
- Museum (local-map-native): QA-01..QA-07 + QA-10 obbligatori
- Industrial/Winery (hybrid): QA-01..QA-10 obbligatori con focus su segmenti indoor/outdoor

## Criteri di uscita QA
- Nessun blocker su QA-01, QA-02, QA-04, QA-06
- Almeno 95% scenari passed sull'ambiente di staging
- Tutti gli eventi critici visibili in analytics progetto entro 5 minuti dal test
