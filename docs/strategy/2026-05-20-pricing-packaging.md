# Voler.ai Tuner Suite — Pricing & Packaging

> **Data**: 20 maggio 2026
> **Status**: draft v1 — numeri da validare con pilot
> **Companion**: [2026-05-19-decisioni-strategiche.md](./2026-05-19-decisioni-strategiche.md), [2026-05-20-modelli-ai-reference.md](./2026-05-20-modelli-ai-reference.md)
> **Scope**: modello di ricavo completo della suite — crediti unificati, activation packages, retainer, feature gating, delivery model

---

## 1. Filosofia di pricing: tech-enabled service

`Voler.ai NON è un puro self-serve SaaS.` È un **tech-enabled service**: il setup richiede competenza umana skilled (non è "clicca un bottone"), il valore ricorrente è prodottizzato via crediti.

Tre verità che guidano il modello:

1. **Il setup è skilled work.** Costruire una KB CT di qualità (lenti editoriali + tension map + brand voice) o configurare interview bot BT richiede expertise. Non è prodottizzabile come self-serve puro.

2. **L'usage è prodottizzabile.** Una volta fatto il setup, l'uso ricorrente (generare contenuti, audio, insight) è misurabile e fatturabile via crediti.

3. **Molti clienti target non hanno team interno.** Musei, ville, brand heritage spesso non hanno content team — vogliono che qualcuno faccia il lavoro (managed retainer opzionale).

---

## 2. I tre layer di ricavo

```
┌──────────────────────────────────────────────────────────┐
│ 1. ACTIVATION PACKAGE (una tantum)                       │
│    Setup skilled + onboarding + primi mesi crediti       │
│    bundled in un unico prezzo "activation"               │
│    → riduce friction, blend service+product              │
├──────────────────────────────────────────────────────────┤
│ 2. CREDITI SUBSCRIPTION (ricorrente)                     │
│    Wallet unificato cross-suite (BT+CT+ET+WT)            │
│    Tier che estendono i tier BT esistenti                │
│    → prodotto, margine usage-based protetto              │
├──────────────────────────────────────────────────────────┤
│ 3. MANAGED RETAINER (ricorrente, OPZIONALE/secondario)  │
│    Voler/partner fa il lavoro per te                     │
│    → servizio, per clienti senza team interno           │
│    → ~3x LTV ma non spinto come default                 │
└──────────────────────────────────────────────────────────┘
```

**Decisioni prese (2026-05-20)**:
- Activation: **bundled** (setup + primi mesi crediti in un pacchetto unico) — non setup fee separato
- Managed retainer: **sì ma opzionale/secondario** (offerto, non spinto; focus primario self-serve+crediti)
- Delivery: **hybrid** (Voler.ai flagship/enterprise, partner certificati per volume)

---

## 3. Sistema crediti unificato

### Principio

Un **wallet crediti a livello Organization**, spendibile su qualsiasi prodotto della suite. Riusa l'infrastruttura crediti esistente di Business Tuner (`OrgCreditPack`, `CreditTransaction`, Stripe) estesa a tutta la suite.

`★ Distinzione chiave: crediti ≠ feature access.`
- **Crediti** = quanto consumi (usage). Spesi da azioni AI.
- **Tier** = cosa puoi fare (feature access). Sblocca capability.
- Servono ENTRAMBI: un Pro ha più crediti E più feature di uno Starter.

### Cost mapping (LlmUsage → crediti)

Toolia ha già `LlmUsage` (Fase 0.5) che traccia il costo reale per azione. Pipeline:

```
Azione → LlmUsage registra costo reale $ → mapping (1 credito = €0.01 costo × markup) → deduct dal wallet
```

Markup raccomandato: **3x** sul costo sottostante (copre infra, margine, R&D). Da calibrare con i pilot.

### Costo crediti per azione (markup 3x, 1 credito = €0.01)

| Azione | Costo reale | Crediti |
|---|---|---|
| BT — visibility scan | ~$0.20 | ~60 |
| BT — interview session (per conversation) | ~$0.10 | ~30 |
| BT — strategy tip generation | ~$0.05 | ~15 |
| CT — estrazione KB da fonte | ~$0.03 | ~9 |
| CT — semantic base POI/topic | ~$0.08 | ~24 |
| CT — content artifact testo (Sonnet 4.6) | ~$0.06 | ~18 |
| CT — articolo blog longform (Opus 4.7) | ~$0.25 | ~75 |
| CT — brand voice distillation | ~$0.15 | ~45 |
| CT — image generation (Mode A) | ~$0.05 | ~15 |
| CT — image preservation edit (Mode B) + check | ~$0.13 | ~39 |
| ET — scheda audioguida | ~$0.08 | ~24 |
| ET — TTS audio 90s (ElevenLabs v3) | ~$0.45 | ~135 |
| ET — delivery pack build | ~$0.02 | ~6 |
| WT — site optimization loop (per ciclo) | ~$0.30 | ~90 |

> ⚠️ Le azioni CT/media/TTS costano molti più crediti delle azioni BT testuali. Questo è **corretto e trasparente**: riflette il costo reale. Un cliente content-heavy consuma più crediti → sale di tier o compra pack. Nessun markup arbitrario "CT premium".

### Credit packs (overflow, no scadenza)

| Pack | Crediti | Prezzo |
|---|---|---|
| Small | 20.000 | €150 |
| Medium | 50.000 | €350 |
| Large | 200.000 | €1.200 |

---

## 4. Subscription tiers (estendono i tier BT esistenti)

I tier ESTENDONO i tier BT attuali (€49/€149/€299), non li contraddicono. Coerenza con gli early adopter BT.

| Tier | €/mese | Crediti/mese | Feature access |
|---|---|---|---|
| **Starter** | 49 | 6.000 | BT base + CT base (3 canali, 1 brand voice, no preservation media) |
| **Pro** | 149 | 20.000 | + CT avanzato (preservation media, 3 brand voices, tutti i canali) + ET base |
| **Business** | 299 | 40.000 | + bridge BT↔CT + ET Pro + workflow completo + API limited |
| **Scale** | 599 | 100.000 | (nuovo) per content/audio-heavy — tutte le feature |
| **Growth** | 1.499 | 300.000 | (nuovo) high volume + multi-tenant (agency) |
| **Enterprise** | 4.000+ | fair-use unlimited | white-label completo + SLA 99.5% + AM dedicato + AI Act suite |

> **Recalibrazione necessaria**: i tier BT attuali (6k-40k) sono tarati su azioni BT economiche. Le azioni CT/media costano molto di più. Un cliente CT-heavy esaurisce 40k crediti in fretta → i tier Scale/Growth coprono questo. I numeri esatti (crediti per tier, prezzi) vanno validati con i pilot — la STRUTTURA è quella giusta.

### Enterprise = crediti unlimited (fair use)

I clienti enterprise/luxury preferiscono "tutto incluso flat" (no metering anxiety). Il tier Enterprise offre **crediti fair-use unlimited** — esperienza premium senza ansia da consumo. Crediti usage-based per Starter→Growth, flat per Enterprise.

---

## 5. Activation packages (bundled, una tantum)

Setup skilled + onboarding + primi mesi crediti in un unico prezzo "activation". Riduce friction commerciale (un prezzo per partire) e blenda service+product revenue.

Ogni package include: setup gestito + onboarding training + primi 2-3 mesi di crediti del tier scelto.

| Prodotto attivato | Cosa include il setup | Activation S | Activation M | Activation L |
|---|---|---|---|---|
| **BT** | Config monitoring + interview bots + baseline strategia + 2 mesi crediti | €2.500 | €4.500 | €8.000 |
| **CT** ⭐ | KB + lenti editoriali + tension map + brand voice + 3 mesi crediti (il più editoriale) | €5.000 | €9.000 | €16.000 |
| **ET** | Spatial graph + POI + narratori + audioguide content + 2 mesi crediti | €4.000 | €7.500 | €13.000 |
| **WT** | Design + build sito + content migration + SEO + deploy | €4.000 (template) | €10.000 | €25.000+ (bespoke) |

**S/M/L = complessità del progetto** (es. CT: S = piccola KB ~30 fatti / M = media ~100 / L = grande ~300+ con multi-lingua).

`★ Insight ─────────────────────────────────────`
**CT ha l'activation più alto della suite** (più di BT), perché costruire una KB editoriale con lenti+tension+brand voice è il lavoro più skilled. Questo CORREGGE l'errore precedente: non "CT è SaaS leggero a €499", ma "CT richiede l'onboarding più profondo, fatturato come activation, poi usage via crediti coerenti con BT". La complessità sta nel setup, non in un prezzo prodotto arbitrario.
`─────────────────────────────────────────────────`

---

## 6. Managed retainer (opzionale, secondario)

Per clienti senza team interno (la maggioranza heritage/premium). Voler.ai o partner certificato FA il lavoro ricorrente.

| Retainer | €/mese | Cosa include |
|---|---|---|
| Light | 1.000 | ~10 contenuti/mese gestiti + review |
| Standard | 2.500 | ~20-30 contenuti/mese + calendario + ottimizzazione |
| Full | 5.000+ | Produzione completa multi-canale + sito + audioguide management |

I crediti consumati dal lavoro retainer sono fatturati a parte (o inclusi nel retainer a seconda dell'accordo). Il retainer è **servizio**, i crediti sono **prodotto**.

**Posizionamento**: offerto ma non spinto. Il default commerciale è self-serve (activation + crediti); il retainer è per chi esplicitamente non vuole/può gestire in casa.

---

## 7. Feature gating matrix

Crediti = consumo. Tier = accesso. Questa matrice definisce cosa sblocca ogni tier:

| Feature | Starter | Pro | Business | Scale | Growth | Enterprise |
|---|---|---|---|---|---|---|
| BT monitoring | ✅ base | ✅ | ✅ | ✅ | ✅ | ✅ |
| BT interview/training/chatbot | ✅ base | ✅ | ✅ | ✅ | ✅ | ✅ |
| CT content (canali) | 3 | tutti | tutti | tutti | tutti | tutti |
| CT brand voices | 1 | 3 | 3 | 5 | 10 | unlimited |
| CT preservation media (Mode B) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CT style transfer (Mode C) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ET audioguide | ❌ | ✅ base | ✅ Pro | ✅ | ✅ | ✅ + nativa Expo |
| WT website | ❌ | ❌ | ✅ template | ✅ | ✅ | ✅ bespoke |
| Bridge BT↔CT | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| API access | ❌ | ❌ | limited | ✅ | ✅ | full |
| White-label | ❌ | ❌ | ❌ | ❌ | parziale | ✅ completo |
| Multi-tenant (agency) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| SLA | — | — | — | — | — | 99.5% |

---

## 8. Delivery model (hybrid)

```
SETUP/ACTIVATION delivery:
├── Voler.ai team    → flagship, enterprise, bespoke complessi, primi pilot
└── Partner certificati → SMB, progetti standard, volume
    (estende il partner program BT esistente)

Voler.ai prende:
- Activation revenue (diretta o wholesale ai partner)
- Crediti ricorrenti (sempre, indipendente da chi fa setup)
- Eventuale referral/margin sui partner-delivered setup
```

Modello tipo HubSpot/Shopify: la piattaforma scala via partner ecosystem, Voler.ai mantiene il prodotto + i clienti enterprise diretti.

---

## 9. Esempi cliente completi

### Museo medio (managed, suite completa)
```
ACTIVATION (una tantum):
  CT Activation M:  €9.000   (KB + lenti + tension + brand voice + 3 mesi crediti)
  ET Activation M:  €7.500   (audioguide + 2 mesi crediti)
  Totale:          €16.500

RICORRENTE (mensile):
  Tier Scale:       €599    (100k crediti)
  Retainer Standard: €2.500 (Voler produce 20-30 contenuti/mese)
  Totale:          €3.099/mese

LTV 24 mesi: €16.500 + (€3.099 × 24) = ~€90.876
```

### Brand luxury (self-serve, solo content)
```
ACTIVATION:
  CT Activation L:  €16.000  (KB ricca multi-lingua + brand voice raffinata)

RICORRENTE:
  Tier Growth:      €1.499   (300k crediti, team interno usa la piattaforma)

LTV 24 mesi: €16.000 + (€1.499 × 24) = ~€52.000
```

### Cantina (self-serve, suite, team interno)
```
ACTIVATION:
  CT Activation M:  €9.000
  ET Activation S:  €4.000   (audioguida visita degustazione semplice)
  Totale:          €13.000

RICORRENTE:
  Tier Pro:         €149     (20k crediti — uso moderato)
  + credit pack occasionale quando serve

LTV 24 mesi: €13.000 + (€149 × 24) + pack ≈ ~€18.500
```

### Agency (5 clienti, multi-tenant)
```
ACTIVATION:
  CT Activation M × 5: €45.000 (o scontato volume)

RICORRENTE:
  Tier Growth:      €1.499 (300k crediti condivisi sui 5 clienti)
  o Enterprise:     €4.000 (unlimited multi-tenant)

LTV alta + l'agency diventa partner certificato (fa setup per altri)
```

---

## 10. Prerequisiti tecnici

1. **Consolidare dual credit model BT**: l'audit ha rilevato che sia `User` che `Organization` hanno campi crediti (vestigia migrazione). Consolidare su **Organization-only** prima di estendere alla suite. ~2-3 giorni durante refactor monorepo Stadio 2.

2. **`@voler/billing` package**: estrae il credit system di BT in package condiviso. Integra con `LlmUsage` (Toolia) per cost mapping. Aggiunge feature gating per tier.

3. **Cost mapping config**: la tabella crediti-per-azione e il markup devono essere in config (env/DB), NON hardcoded. I prezzi dei modelli cambiano (vedi modelli-ai-reference).

4. **Stripe products**: ristrutturare i prodotti Stripe BT per i nuovi tier + activation packages + credit packs + retainer.

---

## 11. Open questions (da validare con pilot)

1. **Markup esatto**: 3x è ipotesi. Validare margine reale con dati di consumo pilot.
2. **Crediti per tier**: i numeri (6k/20k/40k/100k/300k) vanno tarati su consumo CT/media reale.
3. **Activation S/M/L thresholds**: cosa definisce S vs M vs L per ogni prodotto (numero fatti KB? POI? pagine sito?).
4. **Quanti mesi di crediti nell'activation bundle**: 2? 3? Impatta il framing "activation include onboarding".
5. **Retainer pricing**: €1k-5k è ipotesi, dipende da quanto lavoro si delega.
6. **Partner economics**: che % / wholesale rate per i partner che fanno setup?
7. **Annual discount**: BT ha -29% annuale. Applicarlo a tier + activation?
8. **Credit rollover**: i crediti mensili non usati si accumulano o scadono? (BT pack: no scadenza; monthly: TBD)
9. **Downgrade/overage behaviour**: cosa succede quando i crediti finiscono a metà mese? Hard stop o auto-pack?
10. **Enterprise "unlimited" fair-use cap**: dove sta il limite del "fair use" per evitare abuse?

---

## 12. Sintesi modello

```
RICAVI VOLER.AI:

1. ACTIVATION (una tantum, bundled setup + onboarding + primi mesi crediti)
   BT €2.5-8k | CT €5-16k | ET €4-13k | WT €4-25k

2. CREDITI SUBSCRIPTION (ricorrente, wallet unificato)
   Starter €49 → Enterprise €4.000+ (estende tier BT)
   + credit packs overflow

3. MANAGED RETAINER (ricorrente opzionale)
   €1-5k/mese per clienti senza team interno

DELIVERY: hybrid (Voler flagship/enterprise + partner volume)
GATING: tier sblocca feature, crediti misurano consumo
COST MAPPING: LlmUsage → crediti (markup 3x configurable)
```

**Principi chiave**:
- Tech-enabled service (setup skilled + usage prodottizzato)
- Crediti unificati (no disproporzione CT vs BT — un wallet coerente)
- CT activation più alto (più editoriale) ma usage coerente con BT
- Margine protetto da usage-based mapping
- Scala via partner ecosystem
