# APP_UX_UI_TEMPLATE_EXECUTION

## Scopo
Tradurre i requisiti UX/UI della project app in un piano implementativo modulare, riusabile su tutti i progetti.

Riferimenti strategici:
- [step11.md](/Users/tommycinti/Documents/toolia/docs/plans/step11.md)
- [step12.md](/Users/tommycinti/Documents/toolia/docs/plans/step12.md)
- [step13.md](/Users/tommycinti/Documents/toolia/docs/plans/step13.md)

## Moduli UX/UI canonici

### 1. Session Start
- scelta lingua
- scelta durata e lenti
- toggle family mode
- readiness gate session bundle

DoD:
- stato `cannot_start` esplicito con motivazione (es. `bundle_not_ready`)
- passaggio deterministico a `visit_shell` con `visitSessionId` valido

### 2. Visit Shell
- top bar (progressione + stato connessione)
- switch vista `scheda` / `mappa`
- CTA rapida assistant
- spazio episodico family mission
- mission card family con visual hint reale e fallback testuale

DoD:
- nessuna logica di compose lato client
- shell guidata solo da `Runtime Manifest` + `Session Bundle` + playback state

### 3. Player
- riproduzione audio base
- resume/pause/seek/next
- fallback asset locale offline
- stato errore audio recuperabile

DoD:
- progressione aggiorna `sessionPlayback`
- `session_end` emesso con metrica minima

### 4. Map Surface
- marker POI route-aware
- stato posizione corrente
- supporto progetti geo-native e local-map-native
- fallback no-GPS: attivazione POI via scan/manual code

DoD:
- la mappa non ricalcola il percorso
- usa solo route/sequence già composte server-side

### 5. Premium Unlock
- ingresso tramite QR/password
- entitlement duration (`1_day`, `1_week`, `custom`)
- stato entitlement visibile in UI
- convivenza nello scanner con mode `POI` per attivazione locale contenuti

DoD:
- scadenza entitlement applicata lato runtime policy
- audit event su unlock riuscito/fallito

### 6. On-route Assistant
- chat contestuale session-aware
- fallback locale quando rete assente
- policy esplicita su ricalcolo percorso (non automatico)

DoD:
- prompt bounded + contesto runtime
- analytics `assistant_message_sent` + `assistant_local_fallback_used`

## Sequenza sprint consigliata
1. `UI-01` Session Start + readiness gating
2. `UI-02` Visit Shell + Player base
3. `UI-03` Map surface route-aware
4. `UI-04` Premium unlock UX
5. `UI-05` Assistant in-shell + fallback
6. `UI-06` QA matrix multi-progetto (territory/museum/industrial)

## Keep / Transform / Remove

Keep:
- contratti runtime esistenti (`Runtime Manifest`, `Session Bundle`, `Capability Snapshot`)
- stato canonico mobile (`visitSession`, `sessionPlayback`)

Transform:
- superfici UI verso template modulare con feature flags capability-driven
- configurazione project skin da `app-definition` + `theme-pack`

Remove:
- branch UX legacy che richiedono `visit/compose` come canale primario
- dipendenze a `app-manifest` non dichiarate come fallback esplicito

## Criteri di accettazione globali
- UX consistente tra web preview e app nativa (stessi stati logici)
- nessun modulo UI deve inferire capability non presenti nei contratti
- ogni modulo deve avere almeno 1 segnale analytics operativo
- comportamento offline esplicito (mai implicito) su tutte le superfici critiche
