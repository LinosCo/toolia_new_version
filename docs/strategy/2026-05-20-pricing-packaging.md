# Voler.ai Tuner Suite — Pricing & Packaging

> **Data**: 20 maggio 2026 (rev. 2 — ribasata sui numeri reali di Business Tuner)
> **Status**: draft v2 — struttura approvata in conversazione, numeri da validare con pilot
> **Companion**: [2026-05-19-decisioni-strategiche.md](./2026-05-19-decisioni-strategiche.md), [2026-05-20-modelli-ai-reference.md](./2026-05-20-modelli-ai-reference.md)
> **Scope**: modello di ricavo della suite — crediti unificati, tier, activation, retainer, account model, go-to-market

---

## 0. Cosa è cambiato nella rev. 2 (perché)

La v1 si era scollata dai numeri **reali e in produzione** di Business Tuner. Correzioni fatte verificando il codice BT (`src/config/plans.ts`, `creditPacks.ts`, `creditCosts.ts`):

| Tema | v1 (errato) | v2 (reale BT) |
|---|---|---|
| Valore credito | €0,01 | **€0,006** (floor `89/15000` = €0,00593) |
| Margine target | 3x | **4x** (`TARGET_TOKEN_COST_MARGIN = 4`) |
| Prezzi tier | €49/149/299 "mensili" | sono gli **annuali-equiv**; mensili veri **€69/199/399** |
| Enterprise | €4.000+ | €999 (BT reale) |
| Gating | cap di quantità (3 canali, 1 brand voice…) | **on/off + livello**, nessun cap (BT: "feature illimitate quando disponibili, consumano crediti") |
| Bridge BT↔CT | feature gated (Business+) | **sempre attivo** con 2+ moduli |
| Posizionamento | clienti enterprise (€16k setup + €3k/mese) | **entry-low**, sotto il costo di un freelance; alto di gamma come upside |

---

## 1. Filosofia di pricing

`Voler.ai NON è un puro self-serve SaaS, ma nemmeno una software house.` È un **tech-enabled service** con **atterraggio leggero**.

Quattro verità che guidano il modello:

1. **Il setup è skilled work** — costruire una KB CT di qualità (lenti + tension map + brand voice) o configurare gli interview bot BT richiede expertise. Ma per l'entry deve essere **leggero ed economico**, non un progetto da €16k.

2. **L'usage è prodottizzabile** — una volta fatto il setup, l'uso ricorrente (contenuti, audio, insight) è misurabile e fatturabile via crediti.

3. **Deve costare meno di un freelance/agenzia digital** (~€500–1.500/mese in Italia). Questa è l'àncora di prezzo dell'entry. Si "atterra leggeri" e si espande col consumo — non si parte pesanti.

4. **Molti clienti target non hanno team interno** — vogliono che qualcuno faccia il lavoro (retainer done-for-you, opzionale).

---

## 2. I tre layer di ricavo

```
┌──────────────────────────────────────────────────────────┐
│ 1. ACTIVATION (una tantum, SALES-LED)                    │
│    Setup skilled + onboarding + primi mesi crediti        │
│    Leggera per l'entry, ricca solo per l'alto di gamma    │
├──────────────────────────────────────────────────────────┤
│ 2. CREDITI SUBSCRIPTION (ricorrente, SELF-SERVE/Stripe)  │
│    Wallet unificato cross-suite a livello Organization    │
│    Tier reali BT estesi verso l'alto                      │
├──────────────────────────────────────────────────────────┤
│ 3. MANAGED RETAINER (ricorrente, OPZIONALE)              │
│    Voler/partner fa il lavoro — prezzo da freelance       │
└──────────────────────────────────────────────────────────┘
```

**Decisioni prese (2026-05-20)**:
- Posizionamento entry: **sotto il costo di un freelance**; alto di gamma come upside, non baseline.
- Go-to-market: **mix freelance/agenzie (canale) + clienti diretti flagship** (vedi §9).
- Activation: **bundled** (setup + primi mesi crediti) e **sales-led** (reference pricing → preventivo).
- Retainer: **sì ma opzionale/secondario**.
- Scaling agenzie: **usage-based puro** (no cap progetti, no seat per-cliente); white-label = trigger verso Business.

---

## 3. Sistema crediti unificato

### Principio

Un **wallet crediti a livello Organization**, condiviso su tutti i progetti dell'account e spendibile su qualsiasi modulo (BT/CT/ET/WT). Riusa l'infrastruttura crediti esistente di BT (`CreditTransaction`, pack Stripe), **consolidata su Organization** (oggi BT ha crediti per-User: va consolidato, vedi §12).

`★ Distinzione chiave: crediti ≠ feature access.`
- **Crediti** = quanto consumi (usage). Spesi dalle azioni AI.
- **Tier** = cosa puoi fare (feature access). Sblocca capability on/off.

### Cost mapping (LlmUsage → crediti)

Toolia ha già `LlmUsage` (Fase 0.5) che traccia il costo reale per azione. Formula (allineata a BT):

```
crediti = ceil( costo_reale_$ × 4 / 0,006 )      ($1 ≈ €1, conservativo)
         └ markup 4x ┘   └ €0,006 = prezzo credito worst-case ┘
```

> I numeri vanno in **config (env/DB), non hardcoded**: i prezzi dei modelli cambiano (vedi modelli-ai-reference).

### Costo crediti per azione — scala illustrativa (da calibrare con pilot)

Calcolati con la formula sopra sui modelli di maggio 2026. Per le azioni BT testuali la baseline calibrata esiste già nel codice (`creditCosts.ts`: interview 8–15, copilot 20–35).

| Azione | Costo reale ~ | Crediti ~ |
|---|---|---|
| BT — interview session | $0,05 | 33 |
| BT — visibility report | (calibrato BT) | 20 |
| BT — copilot analysis | (calibrato BT) | 35 |
| CT — estrazione KB da fonte (Haiku) | $0,008 | 6 |
| CT — content artifact breve (Sonnet 4.6) | $0,02 | 14 |
| CT — articolo blog longform (Opus 4.7) | $0,30 | 200 |
| CT — brand voice distillation | $0,15 | 100 |
| CT — image Mode A (nano-banana-pro) | $0,04 | 27 |
| CT — image Mode B preservation + check | $0,10 | 67 |
| ET — scheda audioguida (testo) | $0,03 | 20 |
| ET — TTS audio 90s (ElevenLabs v3) | $0,30 | 200 |
| WT — site optimization loop (per ciclo) | $0,12 | 80 |

> ⚠️ Media e TTS costano molti più crediti del testo **perché costano di più davvero** — non è markup arbitrario. Un cliente content/audio-heavy consuma di più → sale di tier o compra pack. Trasparente.

### Credit packs (overflow, non scadono) — reali BT

| Pack | Crediti | Prezzo | €/1.000 |
|---|---|---|---|
| Small | 2.000 | €15 | 7,50 |
| Medium | 6.000 | €39 | 6,50 |
| Large | 15.000 | €89 | 5,93 |

> Per la suite media/audio-heavy questi pack si esauriscono in fretta: valutare pack più grandi (es. 50k/100k) in fase pilot. Struttura invariata, scala da tarare.

---

## 4. Subscription tiers (reali BT, estesi verso l'alto)

Prezzi **mensili** veri di BT (annuale-equiv tra parentesi, sconto ~29%).

| Tier | Crediti/mese | €/mese | Ruolo nel go-to-market |
|---|---|---|---|
| Free | 500 | €0 | trial / lead capture |
| **Partner** ⭐ | 10.000 | €29 (€0 con 3+ clienti) | **canale** freelance/agenzie |
| Starter | 6.000 | €69 (€49) | entry diretto |
| **Pro** ⭐ | 20.000 | €199 (€149) | flagship diretto + agenzia con progetti-cliente |
| Business | 40.000 | €399 (€299) | strutturati + white-label |
| Scale *(nuovo)* | ~100.000 | ~€699 | content/audio-heavy |
| Enterprise | fair-use unlimited | €999+ | luxury / enti grandi |

**Tutti sotto il costo di un freelance.** I due motori principali: **Partner** (€29, canale) e **Pro** (€199, diretto/agenzia).

> **Recalibrazione crediti/tier**: i budget crediti BT (6k–40k) sono tarati su azioni BT economiche. Le azioni CT/media/TTS costano molto di più → il tier **Scale** copre l'uso pesante. I budget esatti vanno tarati sul consumo CT reale nei pilot; la **struttura** è quella giusta.

### Enterprise = crediti unlimited (fair use)

Clienti enterprise/luxury preferiscono "tutto incluso flat" (no metering anxiety). Usage-based per Free→Scale, **flat fair-use** per Enterprise.

---

## 5. Account model: Organization / Project / Moduli

Il modello che regge sia il diretto sia il canale (risolve anche il nodo "dual credit model"):

```
Organization (= l'account che paga: agenzia, azienda, o freelance)
  ├── Tier/abbonamento        → feature access + crediti mensili
  ├── Wallet crediti          → CONDIVISO fra tutti i progetti
  └── Project (= un cliente, o un brand/sito)
        ├── purchasedModules: [business_tuner, content_tuner, experience_tuner, web_tuner]
        └── Bridge BT↔CT       → opera DENTRO il progetto (isolamento fra clienti)
```

**Regole**:
- **Tier e wallet sono a livello Organization** — un'agenzia su Pro ha 20k crediti condivisi fra tutti i suoi progetti-cliente.
- **I moduli sono per-Project** — ogni cliente attiva solo ciò che serve.
- **Progetti illimitati** in tutti i tier a pagamento (come BT: `maxProjects: -1`).
- **Bridge per-Project**: collega BT e CT *dello stesso progetto*. Conseguenza: **isolamento dei dati fra clienti** di un'agenzia (cliente A mai mischiato a cliente B). Un'agenzia con 15 clienti = 1 Org, 15 progetti, 15 bridge indipendenti.

---

## 6. Activation packages (sales-led, reference pricing)

Setup skilled + onboarding + primi mesi crediti, in un prezzo "activation". **Sempre via interlocuzione commerciale** (preventivo), non checkout self-serve. Leggera per l'entry, ricca solo in alto.

| Livello | Per chi | Cosa include | Range |
|---|---|---|---|
| **Guided self-setup** | entry / case study | onboarding assistito, KB templata, 1 brand voice | €0–1.500 (o gratis vs impegno annuale) |
| **Light** | museo piccolo/medio | KB ~30 fatti + lenti base + tension map + 1 voice + 2 mesi crediti | €1.500–4.000 |
| **Standard** | brand strutturato | KB ~100 fatti + lenti complete + brand voice raffinata + 3 mesi crediti | €4.000–8.000 |
| **Deep** | **solo** luxury/enti grandi | KB ~300+ multi-lingua + brand voice avanzata + 3 mesi crediti | €8.000–16.000 |

Per modulo:
- **BT activation**: config monitoring + interview bot + baseline strategia → €1.5–6k
- **CT activation**: la più editoriale (KB + lenti + tension + brand voice) → range tabella sopra
- **ET activation**: spatial graph + POI + narratori + audioguide content → €2–8k
- **WT**: design + build sito + migration + SEO → €4–25k **bespoke** (puro sales-led)

`★ Insight ─────────────────────────────────────`
La complessità sta nel **setup**, non in un prezzo-prodotto arbitrario. Ma per vincere l'entry il setup dev'essere **leggero e templato** (€1.5–4k o guided self-setup), non un progetto. Il setup ricco (€16k) esiste, ma è l'eccezione luxury — non la porta d'ingresso.
`─────────────────────────────────────────────────`

---

## 7. Managed retainer (opzionale — la leva done-for-you)

Per clienti senza team interno. Prezzato **a livello freelance**, così è una vera alternativa.

| Retainer | €/mese | Cosa include |
|---|---|---|
| Light | 500–1.000 | ~10 contenuti/mese gestiti + review (compete col freelance junior) |
| Standard | 1.500–2.500 | ~20-30 contenuti/mese + calendario + ottimizzazione |
| Full | 5.000+ | produzione completa multi-canale + sito + audioguide management |

I crediti consumati dal lavoro retainer sono inclusi o fatturati a parte secondo accordo. Il retainer è **servizio**; i crediti sono **prodotto**. Offerto, non spinto.

---

## 8. Feature gating matrix (on/off + livello — nessun cap di quantità)

Riusa la struttura `PlanFeatures` di BT (boolean / `base`|`full`). **Quanti canali, brand voices, progetti usi NON è limitato** — lo regola il consumo crediti.

| Feature | Free | Partner | Starter | Pro | Business | Scale | Enterprise |
|---|---|---|---|---|---|---|---|
| BT interview/training/chatbot | base | full | full | full | full | full | full |
| BT monitoring (visibility/site/tips/copilot) | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| CT content | ❌ | full | base | full | full | full | full |
| CT preservation media (Mode B) | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| CT style transfer (Mode C) | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| ET audioguide | ❌ | ✅ base | ❌ | ✅ base | ✅ Pro | ✅ | ✅ + nativa Expo |
| WT website | ❌ | ❌ | ❌ | ❌ | ✅ template | ✅ | ✅ bespoke |
| **Bridge BT↔CT** | **sempre attivo con 2+ moduli — NON gated** |
| White-label | ❌ | con 10+ clienti | ❌ | ❌ | ✅ | ✅ | ✅ |
| Multi-client dashboard | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Progetti | 1 | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ |
| SLA | — | — | — | — | — | — | 99,5% |

> **API access per i clienti: NON esiste ancora.** Il flag `apiAccess` nel config BT (`plans.ts`) è un flag morto — dichiarato ma mai cablato come gate. Le route `/api/v1/*` di BT sono integrazioni **interne** service-to-service (chiave condivisa `BT_INTERNAL_API_KEY`), non un'API per-cliente. Un'API pubblica gated per tier è **roadmap futura**, non una feature attuale: non venderla finché non è costruita.

---

## 9. Go-to-market: mix freelance + diretto

Due motori in parallelo dall'inizio. Tre personaggi, mappati su Organization/Project (§5):

| Personaggio | Come compra | Note |
|---|---|---|
| **Agenzia/freelance strutturato** | account proprio su **Pro** (→ Business/Scale crescendo), **1 progetto per cliente** | motore principale di volume; fa lui il setup → costo di delivery basso per Voler; scaling **usage-based puro** (no cap progetti); passa a **Business** quando vuole **white-label** |
| **Freelance poco strutturato** | si iscrive **Partner**, fa aprire un account Pro/Business a ogni cliente | più raro; Partner = €29 (€0 con 3+ clienti), dashboard multi-cliente, commissione |
| **Azienda con marketing team** | account proprio Pro/Business, **via intermediazione Voler o partner** | diretto flagship; case study |

**Delivery hybrid**: Voler.ai gestisce flagship/enterprise/bespoke + primi pilot; partner certificati coprono SMB e volume (estende il partner program BT). Voler incassa sempre activation + crediti ricorrenti, indipendentemente da chi fa il setup.

---

## 10. Self-serve (Stripe) vs sales-led (preventivo)

Distinzione netta — replica la logica BT (`PURCHASABLE_PLANS` self-serve, Enterprise sales-led):

| Acquistabile online (Stripe checkout) | Solo trattativa (reference pricing → preventivo) |
|---|---|
| Abbonamenti Free→Business + Partner | **Activation packages** |
| Credit packs (overflow) | **Managed retainer** |
| | **Web Tuner** (bespoke) |
| | **Enterprise** + (probabilmente) **Scale** |

---

## 11. Esempi cliente (realistici)

### Agenzia digital strutturata (motore principale)
```
Account: Pro €199/mese (20k crediti condivisi), 8 progetti-cliente
Setup: lo fa l'agenzia (Voler costo ~0)
Crescita: arriva a 15 clienti → consumo sale → Business €399 (white-label) o pack
Ricavo Voler: €199-399/mese + pack occasionali, delivery a costo zero
→ scala col canale, non con le ore di Voler
```

### Museo medio diretto (flagship / case study)
```
ACTIVATION: Light €2.500 (KB ~30 fatti + brand voice + 2 mesi crediti)
RICORRENTE: Pro €199/mese (CT + ET base)
LTV 24 mesi: €2.500 + (€199 × 24) ≈ €7.276
→ sostenibile per un museo medio; sotto il costo di un freelance
```

### Brand small senza team — done-for-you
```
Retainer Light €800/mese all-in (lavoro + crediti inclusi)
Activation: guided self-setup ~€1.000
→ sostituisce direttamente il freelance digital
LTV 24 mesi: €1.000 + (€800 × 24) ≈ €20.200
```

### Luxury / ente grande (alto di gamma, eccezione)
```
ACTIVATION: Deep €12.000–16.000 (KB ricca multi-lingua)
RICORRENTE: Scale €699 o Enterprise €999+ (team interno usa la piattaforma)
LTV 24 mesi: ~€28.000–40.000
→ esiste, ma NON è la porta d'ingresso
```

---

## 12. Prerequisiti tecnici

1. **Consolidare crediti su Organization**: BT ha crediti per-`User` (`plans.ts`: "piani per utente"). Il modello suite richiede wallet a livello **Organization** condiviso fra progetti. Consolidare prima di estendere. ~2-3 giorni durante refactor monorepo Stadio 2.

2. **Project come container multi-cliente**: confermare `purchasedModules` per-Project + `maxProjects: -1`. Il tier/feature gating è Org-level, i moduli sono Project-level.

3. **Bridge per-Project con isolamento**: il bridge BT↔CT opera dentro il singolo progetto; garantire che i dati non escano dal progetto (privacy fra clienti di un'agenzia).

4. **`@voler/billing` package**: estrae il credit system BT, integra `LlmUsage` (Toolia) per cost mapping, aggiunge feature gating per tier. Cost mapping in **config** (markup 4x, €0,006/credito), non hardcoded.

5. **Stripe products**: ristrutturare i prodotti BT per i nuovi tier (Scale) + credit packs; activation/retainer/WT restano fuori da Stripe self-serve (sales-led, fatturazione manuale o checkout custom).

---

## 13. Open questions (da validare con pilot)

1. **Budget crediti per tier**: tarare 6k/20k/40k/100k sul consumo CT/media reale (le azioni media costano molto più di BT testuale).
2. **Pack più grandi**: servono pack 50k/100k per content/audio-heavy?
3. **Activation S/M/L thresholds**: cosa definisce Light/Standard/Deep (n. fatti KB? POI? lingue?).
4. **Mesi di crediti nell'activation**: 2? 3?
5. **Scale: self-serve o sales-led?** (€699, content-heavy).
6. **Markup 4x**: validare margine reale con dati di consumo pilot.
7. **Partner economics**: commissione/wholesale per chi fa setup? Estende il partner program BT.
8. **Credit rollover**: i crediti mensili non usati scadono (BT: sì, mensili si resettano; pack no). Confermare per la suite.
9. **Overage a metà mese**: hard stop o auto-pack? (BT: warning a 70/85/95%, blocco a 100% salvo pack disponibili).
10. **Enterprise "unlimited" fair-use cap**: dove sta il limite anti-abuse?
11. **Retainer vs crediti**: i crediti del lavoro retainer inclusi o a parte?

---

## 14. Sintesi modello

```
RICAVI VOLER.AI:

1. ACTIVATION (una tantum, sales-led, bundled setup + primi mesi crediti)
   Leggera entry €1.5-4k | Standard €4-8k | Deep €8-16k (solo luxury) | WT €4-25k

2. CREDITI SUBSCRIPTION (ricorrente, self-serve Stripe, wallet Org unificato)
   Partner €29 → Pro €199 → Business €399 → Scale €699 → Enterprise €999+
   + credit packs overflow

3. MANAGED RETAINER (ricorrente opzionale, prezzo da freelance)
   €500-1.000 (Light) → €5.000+ (Full)

CREDITI: 1 ≈ €0,006 | margine 4x | costo-azione = ceil(costo$ × 4 / 0,006)
ACCOUNT: Organization (tier + wallet) → Project (cliente, moduli) → Bridge per-progetto
GATING: on/off + livello, nessun cap di quantità; bridge sempre attivo con 2+ moduli
GO-TO-MARKET: mix freelance/agenzie (canale) + diretto flagship
DELIVERY: hybrid (Voler flagship + partner volume)
```

**Principi chiave**:
- Atterraggio leggero: entry sotto il costo di un freelance, alto di gamma come upside.
- Crediti unificati ancorati ai numeri reali BT (€0,006, 4x).
- Niente cap di quantità: i crediti sono il metro, i tier sbloccano feature.
- Agenzia = 1 account Pro + N progetti-cliente (usage-based, white-label → Business).
- Bridge per-progetto = integrazione + isolamento dati fra clienti.
- Margine protetto da usage-based mapping; scala via canale partner.
