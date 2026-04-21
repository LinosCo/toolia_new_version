# PROJECT_APP_DEFINITION

## Scopo
Questo documento definisce il contratto canonico che la piattaforma deve esportare per descrivere una `project app`.

Il `Project App Definition` e' l'artefatto che collega:
- piattaforma editoriale
- web preview funzionante
- app nativa Expo iOS/Android

Non contiene tutta la conoscenza del progetto.
Contiene la configurazione minima, stabile e versionabile necessaria a far partire un client.

Formula chiave:

`stessa definizione di progetto, piu' client diversi`

## Obiettivo tecnico
L'obiettivo e' arrivare a un file o set minimo di file che permetta a un client di:
- capire quale progetto sta caricando
- sapere quali capability sono attive
- sapere quali schermate e moduli abilitare
- sapere dove recuperare bundle, contenuti e manifest runtime
- applicare tema e skin del progetto
- rispettare le regole di accesso e premium unlock

## Cosa non e'
Il `Project App Definition` non e':
- il `Runtime Manifest` di una singola sessione
- il database del progetto
- l'intero catalogo contenuti
- un tema CSS generico
- un handoff verbale o un documento descrittivo

## Posizione nel flusso
La sequenza corretta e':

1. la piattaforma costruisce e approva il progetto  
2. la piattaforma esporta il `Project App Definition`  
3. la web preview lo usa per montare la `Project Web Preview App`  
4. la app Expo lo usa per bootstrap e sviluppo/dev  
5. la sessione del visitatore genera poi i `Runtime Manifest` concreti

## Principi del contratto

### 1. Stable enough to version
Il contratto deve essere abbastanza stabile da:
- essere versionato
- essere confrontabile
- essere migrabile

### 2. Small enough to bootstrap
Non deve pesare come un bundle completo.
Deve essere piccolo e leggibile.

### 3. Shared by web and native
Web preview e app Expo devono poter consumare lo stesso contratto.

### 4. Capability-aware
Il contratto deve governare cosa il client mostra o non mostra.

### 5. Environment-neutral
Il contratto non deve dipendere da un singolo ambiente.
Deve poter puntare a:
- preview
- staging
- production

## Forma consigliata
La raccomandazione e':
- un `manifest JSON` principale
- eventualmente accompagnato da pochi file fratelli esportati

### File minimi consigliati
- `project.app-definition.json`
- `project.theme-pack.json`
- `project.capability-snapshot.json`
- `project.endpoint-config.json`

Il manifest principale puo' includere direttamente molti dati.
Ma conviene tenere separati i blocchi piu' riusabili o pesanti.

## Struttura logica minima
Il `project.app-definition.json` dovrebbe contenere almeno questi blocchi:

- `schema`
- `project`
- `branding`
- `capabilities`
- `languages`
- `access`
- `navigation`
- `modules`
- `activation`
- `runtime`
- `endpoints`
- `assets`
- `platform_hints`

## Schema block
Serve a governare versioning e compatibilita'.

### Campi minimi
- `schema_name`
- `schema_version`
- `export_version`
- `generated_at`
- `source_project_version`

## Project block
Identifica il progetto.

### Campi minimi
- `project_id`
- `project_slug`
- `project_name`
- `project_type`
- `spatial_mode`
- `default_language`
- `available_languages`
- `project_profile`

## Branding block
Serve a identificare il progetto nel client.

### Campi minimi
- `display_name`
- `short_name`
- `logo_url` o asset id
- `hero_asset_id`
- `theme_pack_ref`
- `brand_mode`

## Capabilities block
Questo blocco deve riflettere la `Project Capability Matrix`.

### Campi minimi
Per ogni capability:
- `capability_id`
- `level`
- `enabled`
- `degraded_mode`

### Esempio concettuale
```json
{
  "capabilities": {
    "audio_base": { "enabled": true, "level": "base" },
    "personalization": { "enabled": true, "level": "advanced" },
    "family_overlay": { "enabled": true, "level": "base" },
    "visit_assistant": { "enabled": false, "level": "off" }
  }
}
```

## Languages block
Definisce il perimetro localizzato del progetto.

### Campi minimi
- `default_language`
- `available_languages`
- `fully_supported_languages`
- `partially_supported_languages`
- `language_fallback_policy`

### Per ogni lingua puo' essere utile sapere
- `ui_available`
- `tour_available`
- `audio_available`
- `assistant_available`
- `family_available`

## Access block
Definisce come si entra nel progetto.

### Campi minimi
- `project_access_mode`
  - `public`
  - `restricted`
  - `mixed`
- `entry_methods`
  - lista dei metodi supportati
- `default_entry_method`

### Metodi possibili
- `project_qr`
- `deep_link`
- `code`
- `manual_select`

## Premium and entitlement block
Conviene tenerlo come sottoblocco di `access` oppure blocco dedicato.

### Campi minimi
- `premium_unlock_supported`
- `unlock_methods`
- `default_entitlement_duration`
- `supported_entitlement_durations`
- `grace_policy`
- `binding_mode`

### Durate supportate di default
- `single_session`
- `1_day`
- `1_week`
- `custom`

### Esempio concettuale
```json
{
  "access": {
    "premium_unlock_supported": true,
    "unlock_methods": ["qr", "password", "token"],
    "supported_entitlement_durations": [
      "single_session",
      "1_day",
      "1_week",
      "custom"
    ],
    "default_entitlement_duration": "1_day",
    "grace_policy": "until_session_end",
    "binding_mode": "device_or_session"
  }
}
```

## Navigation block
Definisce la struttura di navigazione che il client puo' montare.

### Campi minimi
- `primary_surfaces`
- `secondary_surfaces`
- `menu_sections`
- `default_start_surface`

### Surface candidate
- `project_entry`
- `start_session`
- `visit_shell`
- `route_map`
- `assistant`
- `settings`
- `recovery`

## Modules block
Definisce quali moduli UI/UX devono essere resi.

### Campi minimi
- `session_start_module`
- `player_module`
- `route_awareness_module`
- `assistant_module`
- `family_module`
- `unlock_module`
- `offline_state_module`
- `completion_module`

Per ogni modulo puo' servire:
- `enabled`
- `variant`
- `required_capabilities`

## Activation block
Definisce come i contenuti e i POI possono essere attivati.

### Campi minimi
- `supported_activation_methods`
- `default_activation_strategy`
- `fallback_activation_strategy`

### Metodi possibili
- `gps`
- `qr`
- `visual_scan`
- `manual`
- `code`

### Strategia per spatial mode
Conviene poter esprimere qualcosa tipo:
```json
{
  "activation": {
    "geo_native": {
      "default": ["gps", "manual"],
      "fallback": ["qr"]
    },
    "local_map_native": {
      "default": ["qr", "visual_scan", "manual"]
    },
    "hybrid": {
      "default": ["gps", "qr", "manual"]
    }
  }
}
```

## Runtime block
Definisce come il client deve ragionare sulla sessione.

### Campi minimi
- `offline_first`
- `connected_assist_mode`
- `requires_bundle_before_start`
- `supports_resume`
- `supports_rejoin`
- `supports_explicit_recalc`

### Esempio concettuale
```json
{
  "runtime": {
    "offline_first": true,
    "requires_bundle_before_start": true,
    "supports_resume": true,
    "supports_rejoin": true,
    "supports_explicit_recalc": true,
    "connected_assist_mode": "optional"
  }
}
```

## Endpoints block
Questo blocco e' fondamentale per il bootstrap del client.

### Campi minimi
- `project_bootstrap_url`
- `runtime_manifest_url`
- `bundle_url`
- `theme_pack_url`
- `assistant_pack_url`
- `analytics_url`
- `entitlement_validation_url`

### Nota importante
Gli endpoint devono essere environment-aware.
Il client non deve hardcodare URL progetto-specifiche nel codice.

## Assets block
Definisce asset minimi non contenutistici necessari al bootstrap.

### Campi minimi
- `logo_asset`
- `splash_asset`
- `hero_asset`
- `icon_assets`
- `default_placeholder_assets`

## Platform hints block
Serve a passare informazioni pratiche ai client.

### Campi minimi
- `target_clients`
  - `web_preview`
  - `expo_native`
- `preferred_orientation`
- `tablet_support`
- `requires_camera_for_scan`
- `requires_location`
- `supports_background_audio`

## Theme pack reference
Il `Project App Definition` non deve duplicare tutto il theme pack.

Meglio:
- referenziare il `Project Theme Pack`
- includere solo alcuni override minimi se servono

### Campi minimi
- `theme_pack_id`
- `theme_pack_version`
- `theme_pack_url`

## Relationship with Runtime Manifest
La distinzione deve essere netta:

### `Project App Definition`
Dice:
- che tipo di app progetto e'
- cosa puo' fare
- che moduli deve montare
- dove prendere i dati

### `Runtime Manifest`
Dice:
- cosa succede in una singola sessione
- quale route sequence usare
- quale content queue usare
- quale assistant pack usare

Il `Project App Definition` e' stabile a livello progetto.
Il `Runtime Manifest` e' dinamico a livello sessione.

## Relationship with Expo app
Per Expo il contratto deve essere abbastanza chiaro da permettere un bootstrap semplice.

### Il minimo necessario per il dev
Un client Expo deve poter partire conoscendo almeno:
- dove trovare il `project.app-definition.json`
- oppure come caricarne una copia locale

Quindi il vero punto di arrivo pratico puo' essere:
- un file locale di definizione progetto
- oppure un URL bootstrap piu' una configurazione env minima

## Expo App Dev Starter
Il `Project App Definition` non basta da solo come handoff pratico.

Serve anche un piccolo contratto operativo per il dev nativo.

### Contenuto minimo consigliato
- `project_ref`
- `app_definition_ref`
- `environment`
- `bundle_mode`
- `theme_pack_ref`
- `capability_snapshot_ref`
- `dev_start_notes`

Questo puo' poi essere tradotto in un file tecnico vero del repo Expo.

## Compatibilita' web preview
La web preview dovrebbe usare lo stesso contratto.

Questo permette di:
- validare i flussi prima del native
- ridurre differenze tra preview e app finale
- trattare il web preview come client reale del sistema

## Stato e versioning
Ogni `Project App Definition` deve poter essere collegato a:
- versione del progetto
- versione del theme pack
- versione capability snapshot
- versione export

Questo e' essenziale per capire:
- cosa ha visto il cliente in preview
- cosa e' andato in handoff
- quale definizione e' in uso nel client

## Error handling minimo
I client devono sapere cosa fare se il contratto e':
- mancante
- incompatibile
- parziale
- piu' vecchio del minimo supportato

### Regola consigliata
Il contratto dovrebbe poter dichiarare:
- `min_client_version`
- `compatible_client_targets`
- `degraded_bootstrap_policy`

## Esempio di struttura minima
```json
{
  "schema": {
    "schema_name": "toolia.project-app-definition",
    "schema_version": "1.0.0",
    "export_version": "2026-03-20.1",
    "generated_at": "2026-03-20T12:00:00Z",
    "source_project_version": "proj-v17"
  },
  "project": {
    "project_id": "rotonda-001",
    "project_slug": "rotonda-palladiana",
    "project_name": "Rotonda Palladiana",
    "project_type": "villa",
    "spatial_mode": "hybrid",
    "default_language": "it",
    "available_languages": ["it", "en"],
    "project_profile": "assistant-enabled"
  },
  "branding": {
    "display_name": "La Rotonda",
    "short_name": "Rotonda",
    "theme_pack_ref": "theme-pack://rotonda-v3"
  },
  "capabilities": {
    "audio_base": { "enabled": true, "level": "base" },
    "personalization": { "enabled": true, "level": "advanced" },
    "family_overlay": { "enabled": true, "level": "base" },
    "visit_assistant": { "enabled": true, "level": "base" }
  },
  "access": {
    "project_access_mode": "mixed",
    "entry_methods": ["project_qr", "manual_select", "deep_link"],
    "premium_unlock_supported": true,
    "unlock_methods": ["qr", "password", "token"],
    "supported_entitlement_durations": ["single_session", "1_day", "1_week", "custom"],
    "default_entitlement_duration": "1_day",
    "grace_policy": "until_session_end"
  },
  "runtime": {
    "offline_first": true,
    "requires_bundle_before_start": true,
    "supports_resume": true,
    "supports_rejoin": true,
    "supports_explicit_recalc": true
  },
  "endpoints": {
    "project_bootstrap_url": "https://api.example.com/projects/rotonda/bootstrap",
    "runtime_manifest_url": "https://api.example.com/projects/rotonda/runtime",
    "bundle_url": "https://api.example.com/projects/rotonda/bundles",
    "theme_pack_url": "https://api.example.com/projects/rotonda/theme-pack"
  }
}
```

## Decisioni implementative raccomandate
- usare JSON come formato canonico iniziale
- includere `schema_version` obbligatorio
- trattare il file come export versionato della piattaforma
- non duplicare dentro il file tutto cio' che puo' stare in `Theme Pack`, `Capability Snapshot` o `Runtime Manifest`
- permettere al client Expo e al web preview di bootstrapparsi entrambi da questo contratto

## Checklist minima di completezza
Un `Project App Definition` e' accettabile quando:
- identifica chiaramente il progetto
- dichiara capability e livelli
- dichiara lingua/e disponibili
- dichiara accesso e premium unlock
- dichiara activation strategy
- dichiara endpoint necessari
- referenzia theme pack e artifact correlati
- e' versionato

## Cosa prepara dopo
Questo documento prepara direttamente:
- `DATA_MODEL.md`
- `STATE_MACHINE.md`
- `RUNTIME_CONTRACTS.md`
- il futuro artefatto tecnico reale del repo Expo

Se vuoi, il prossimo passo naturale e' `DATA_MODEL.md`, cosi' fissiamo entita', relazioni e ID prima che il coding inizi a reinventarle.
