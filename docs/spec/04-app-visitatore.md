# Toolia — App Visitatore

Documento esplicativo, non vincolante. Mette insieme in un unico posto cosa è l'app visitatore (l'output finale di un progetto Toolia), come funziona, come è "vestita", come viene generata e pubblicata, e qual è lo stato del codice oggi.

In caso di conflitto con `01-overview.md`, `02-flusso-inserimento-dati.md` o `03-data-model.md`, vince la spec.

---

## 1. Cosa è l'app visitatore

L'app visitatore è la **web app pubblica** che il visitatore di un sito culturale apre sul telefono in loco. Toolia Studio non è essa: lo Studio è il pannello con cui l'operatore costruisce i contenuti. L'app visitatore è il **prodotto consegnato al cliente finale** — quello che vedono i turisti.

Forma:
- Web responsive mobile-first (no app store, no installazione)
- URL pubblica unica per progetto (es. il QR code esposto in cassa porta a un link tipo `villa-rotonda.toolia.app` o equivalente)
- Funziona anche offline una volta caricata la prima volta (offline-first)

Output di un progetto = una di queste app, con i contenuti generati negli step 1‑6 dello Studio.

---

## 2. Le due modalità di visita

L'app, dopo una sessione di benvenuto rapida, offre al visitatore due modi di vivere la visita.

### 2a. "Crea la tua visita"

Il visitatore dichiara:
- Lingua
- Tema/lente narrativa preferita (deriva dai *driver* dello Step 3)
- Durata disponibile (30min / 1h / 2h+)
- Persona/payoff (deriva dalle *personas* dello Step 3)
- Family Mode on/off

Il **compositore runtime** lato server assembla un percorso pesando driver e personas, vincolato dal **grafo dei segmenti** (Step 2). Le schede `is_core = true` sono sempre incluse, le altre tagliabili in base alla durata.

Il visitatore non vede questa logica: vede solo "ecco la tua visita personalizzata".

### 2b. "Scegli un percorso"

Il visitatore seleziona uno dei *percorsi predefiniti* creati nello Step 4. Ordine POI fisso, durata stimata, narratore già assegnato. Niente personalizzazione runtime.

In entrambi i casi, **solo schede `published`** entrano nel flusso. Mai `draft` o `in_review`.

---

## 3. Schermate principali (visit shell)

Pattern stabili indipendenti dal progetto:

| Schermata | Cosa fa |
|-----------|---------|
| **Entry / Home** | Hero con foto/cover, scelta della modalità di visita |
| **Session Start** | Wizard: lingua, durata, temi, family mode |
| **Visit Shell** | Centro operativo: player audio + mappa + scheda corrente + navigazione fra POI |
| **Mappa / Route awareness** | Posizione stimata, POI visitati/attivabili, riallineamento al percorso |
| **Scheda POI** | Testo della scheda, audio, immagini, eventuale missione family |
| **Assistant (chatbot)** | Domande libere su un POI o sul progetto |
| **Menu / Settings** | Lingua, accessibilità, recovery |

L'utente naviga prevalentemente tramite il player. Non c'è un *planner manuale*: si avanza nella sequenza, oppure si fa "salta scheda" / "torna indietro".

---

## 4. Mappa interattiva

Funzione: orientamento, attivazione POI, awareness del percorso.

Comportamenti chiave:
- Mostra la **posizione stimata** del visitatore (GPS quando outdoor, fallback su QR/scan/manuale indoor)
- Evidenzia **POI attivabili** (vicini), POI già visitati, POI futuri
- Permette **rejoin**: se il visitatore esce dal percorso, lo rimette in carreggiata
- Nelle modalità `planimetria` (musei, ville interne) la "mappa" è la planimetria caricata nello Step 2 con i POI sovrapposti
- Nella modalità `gps` (parchi, percorsi outdoor) usa una vera mappa interattiva (Google Maps o equivalente)
- Nella modalità `ibrida` switcha tra le due in base al POI corrente

**Multi-trigger di attivazione POI** (vincolante da spec):
- GPS prossimità (outdoor)
- QR code / scan visivo
- Manuale ("sono qui, parti")
- Codice/password (fallback robusto)

Non si dipende mai da un solo meccanismo.

---

## 5. Audio TTS e narratore

- Una traccia audio per scheda per lingua (TTS — OpenAI o ElevenLabs)
- Il **narratore** non è solo timbro: cambia anche il *contenuto* della scheda (vedi Step 4)
- Audio generato dopo l'approvazione del testo, non insieme. Modificare il testo dopo la generazione audio → flag "audio obsoleto"
- Player con play/pause, skip, velocità, sottotitoli on/off
- Riproduzione in background (l'utente può guardare la mappa o leggere mentre ascolta)

---

## 6. Chatbot AI (assistant)

Ibrido a due livelli, sempre contestuale al POI/progetto corrente.

- **Livello 1 — pack pre-generato.** In Step 5, per ogni POI la AI produce un set di domande frequenti + risposte verificate (con domanda di attivazione, risposta concisa, risposta estesa, "confine" oltre cui non andare). Funziona offline.
- **Livello 2 — LLM runtime.** Per domande non coperte dal pack, chiamata in tempo reale a Claude/OpenAI con guardrail: usa solo fatti KB ad alta affidabilità.

Il chatbot non sostituisce il percorso: è di supporto.

---

## 7. Family Mode

Layer parallelo opzionale, attivabile dal visitatore in Session Start.

- Per ogni POI può esistere una **missione**: quiz, osservazione, disegno
- Tono e linguaggio dedicati (compagno animato, fascia d'età target, modalità di gioco)
- Workflow approvazione separato (`draft → published`)
- Si integra nella visit shell senza rompere il flusso adulto: l'adulto vede la scheda normale, il bambino una sovrapposizione gioco

---

## 8. Styling — come si "veste" l'app

L'app visitatore ha un'**ossatura UX stabile** (uguale per tutti i progetti) e una **pelle visiva configurabile per progetto**.

### Cosa resta stabile

- Architettura di navigazione e visit shell
- Pattern di playback, mappa, assistant, family overlay
- Comportamenti offline/online e recovery
- Layout responsive mobile-first

### Cosa cambia per progetto

Configurabile in un **Theme Pack** referenziato dal progetto:

| Token | Esempi |
|-------|--------|
| `color_tokens` | palette primaria/secondaria, sfondi, accenti, semantici (success/warning/error) |
| `typography_tokens` | font display + font corpo, scala dimensioni, weights |
| `spacing_tokens` | griglia spaziatura, padding/margin scale |
| `shape_tokens` | radius, bordi, ombre |
| `motion_tokens` | tempi animazione, curve |
| Imagery / hero | immagine cover, trattamento gradienti |
| Iconografia | set icone, stile (lineare / pieno) |
| Microcopy / tono | UI strings, voice |

L'idea è: un visitatore di Villa Tal dei Tali e uno di Cantina X vivono *funzionalmente* la stessa app, ma *visivamente* due esperienze coerenti col brand del cliente.

### Brand kit a livello tenant

Plausibilmente, un Theme Pack "default" viene gestito a livello tenant (l'agenzia ha la sua palette di base) e poi sovrascritto a livello progetto se serve.

### Stato della spec

Lo step legacy `step11.md` definisce in dettaglio il design system tokens-based ma:
- Dark mode esplicitamente non specificato
- Il file di forma del Theme Pack (JSON schema) è citato ma non finalizzato
- Le varianti dei singoli moduli (player, card, mission) sono nominate ma non enumerate

---

## 9. Generazione e pubblicazione

Tre concetti chiave (dalla spec runtime):

1. **Project App Definition** — JSON dichiarativo del progetto: lingue, capability attive, theme pack reference, endpoint runtime, moduli UI da montare. Serve all'app per sapere "cosa è" il progetto al boot.
2. **Runtime Manifest** — assemblato lato server quando il visitatore inizia una sessione. Contiene la sequenza concreta di POI/schede/audio/missioni per *quella* sessione, in base alle scelte del visitatore.
3. **Session Bundle** — gli asset effettivi (testi, audio, immagini) scaricati dall'app per funzionare offline.

Flusso boot dell'app visitatore:

```
visitatore apre l'URL pubblica
        │
        ▼
app carica Project App Definition (cosa è il progetto, theme, capability)
        │
        ▼
app mostra Session Start (lingua, durata, temi)
        │
        ▼
app chiama /runtime/compose → riceve Session Visit Plan + Runtime Manifest
        │
        ▼
app scarica Session Bundle (offline-first)
        │
        ▼
visit shell parte
```

Il client visitatore **non** compone nulla. Esegue contratti runtime espliciti.

### URL pubblica per visitatore

La spec parla di un endpoint pubblico per progetto (`project_bootstrap_url`). Operativamente, ciò significa che ogni progetto pubblicato ha una URL canonica del tipo:

```
https://<tenant>.toolia.app/v/<project-slug>
```

oppure custom domain del cliente. Da quella URL parte il flusso di boot. Il QR code in cassa punta lì.

Lo Studio mostra all'operatore questa URL nello Step 6 (Pubblica) come prodotto finale, da consegnare al cliente.

---

## 10. Stato del codice oggi (aggiornato 27 aprile 2026)

### Cosa c'è

### Componenti riusabili (refactor del 27 aprile 2026)

I 4 schermi dell'app visitatore sono stati estratti come **componenti shared parametrizzati** in `mvp/src/components/visitor/`:

- `visitor-home.tsx` — home con hero, itinerari, mappa, narratori
- `visitor-crea.tsx` — wizard "Crea la tua visita" (driver, durata, persona)
- `visitor-visita.tsx` — sequenza POI dell'itinerario
- `visitor-poi.tsx` — scheda dettaglio POI con audio player, missioni family, Q&A
- `preview-map.tsx` — mappa Google Maps (richiede API key client-side)
- `chatbot-fab.tsx` — bottone fluttuante chatbot

Ogni componente accetta `projectId` e `basePath` per costruire i link interni. Tipi condivisi in `mvp/src/lib/visitor-types.ts`.

### Rotte che istanziano i componenti

- `mvp/src/app/progetti/[id]/preview/*` — anteprima **interna allo Studio** (basePath = `/progetti/[id]/preview`). Mantiene il device-frame iPhone via il proprio layout. Ogni page è uno stub di 3 righe.
- `mvp/src/app/v/[id]/*` — **rotta pubblica mobile-first** (basePath = `/v/[id]`). Layout pubblico in `mvp/src/app/v/[id]/layout.tsx`: niente header Studio, contenuto in colonna `max-w-[480px]`, safe-area iOS.
  - `/v/[id]` — home
  - `/v/[id]/crea` — wizard
  - `/v/[id]/visita` — itinerario
  - `/v/[id]/poi/[poiId]` — scheda POI

### Middleware

`mvp/src/auth.config.ts` — il path `/v/` è in `PUBLIC_PATHS`: la rotta pubblica è raggiungibile senza login. In dev `DEV_BYPASS_AUTH=true` bypassa tutto.

### Step "Pubblica" dello Studio

`mvp/src/app/progetti/[id]/pubblica/page.tsx` ha ora 2 ingressi alla preview:

- "Anteprima desktop" → `/progetti/[id]/preview` (con device-frame, dentro Studio)
- "Link pubblico mobile" → componente `<PublicVisitorLink>` con bottone **Copia** e bottone **Apri** che porta a `/v/[id]` in nuovo tab

### API runtime usate

- `/api/projects/[id]/visitor-data` (legge il progetto)
- `/api/projects/[id]/compose-visit` (compositore runtime)
- `/api/projects/[id]/assistant-qa` (pack chatbot livello 1)

### Cosa manca rispetto alla spec

| Area | Gap |
|------|-----|
| **API pubbliche per `/v/`** | Le API che servono la rotta pubblica usano `getSessionUser()` → in dev funzionano col bypass, in prod tornerebbero 401. Da introdurre endpoint pubblici dedicati per progetto pubblicato. |
| **QR code** | Componente `<PublicVisitorLink>` mostra solo testo + bottone copia. Aggiungere lib `qrcode` e un QR sotto il link. |
| **Mappa nell'itinerario** | `<PreviewMap>` è usato solo in `<VisitorHome>`. Mancante in `<VisitorVisita>` e `<VisitorPoi>`. |
| **Mappa indoor / planimetria** | Solo Google Maps. Modalità planimetria non visualizzata. |
| **Theming** | Design system tokens-based non esiste come configurabile. Stile attuale hardcoded in Tailwind. Manca pannello Brand del progetto. |
| **Project App Definition / Runtime contracts canonici** | Endpoint runtime esistenti ma non strutturati come contratti versionati con bundle/manifest separati. |
| **Family Mode visualizzato** | Pack missioni renderizzato dentro `<VisitorPoi>`, ma manca un toggle/onboarding family mode in session start. |
| **Multi-trigger POI activation** | Solo "tap manuale" disponibile. GPS prossimità / QR scan non implementati. |

### Riassunto onesto

Stato al 27 aprile 2026: la rotta pubblica `/v/[id]` esiste, è mobile-first, condivide la logica con la preview Studio. Il flusso è funzionale per validazione interna e può essere aperto da telefono in stessa LAN del Mac di sviluppo. Per arrivare al prodotto finale come da spec mancano: API pubbliche dedicate (auth-free), mappa nelle pagine giuste, theming configurabile, contratti runtime canonici, QR code per la URL pubblica.

---

## 11. Domande aperte (da decidere insieme)

1. **Rotta pubblica per il visitatore.** Sotto-dominio per tenant, oppure path? Custom domain per cliente premium?
2. **Theme Pack.** Lo modelliamo come record DB (`Theme` table) referenziato da `Project.themePackId`, o come blob in `Tenant.settings_json`? Forma esatta del JSON tokens.
3. **Editor di tema in Studio.** Un nuovo step "Branding" aggiuntivo, oppure pannello globale tenant + override per progetto?
4. **Modalità planimetria nell'app visitatore.** Image overlay con POI pin scalati vs. SVG generato + zoom/pan?
5. **Family Mode UX.** Toggle a livello sessione o pagina dedicata "Vai con i bambini"?
6. **Strategia generazione bundle offline.** Service Worker + Cache API, o pre-bundle servito statico?
7. **Multi-trigger POI.** Quale priorità a quali meccanismi e in quali contesti?

---

## 12. Bibliografia (questi documenti)

- `docs/spec/01-overview.md` — architettura alto livello
- `docs/spec/02-flusso-inserimento-dati.md` — flusso 6 step + sezioni "Flussi di visita esposti al visitatore", "Family Mode", "Assistente AI durante la visita"
- `docs/spec/03-data-model.md` — schema entità
- `docs/legacy/specs/PROJECT_APP_DEFINITION.md` — definition JSON (manifest del progetto)
- `docs/legacy/specs/RUNTIME_CONTRACTS.md` — contratti client/server runtime
- `docs/legacy/specs/STATE_MACHINE.md` — lifecycle progetto
- `docs/legacy/specs/APP_UX_UI_TEMPLATE_EXECUTION.md` — esecuzione template UX/UI
- `docs/legacy/specs/UX_UI_QA_MATRIX.md` — matrice QA UX
- `docs/legacy/plans/step11.md` — design system, theme pack, modulo varianti
- `docs/legacy/plans/step12.md` — interaction model dell'app visitatore
- `docs/legacy/plans/step13.md` — pipeline platform → preview → app
- `docs/presentazione/presentazione-app.pdf` — pitch visivo dell'app
