# Voler.ai Tuner Suite — Design System Canonico (`@voler/ui`)

> **Data**: 20 maggio 2026
> **Status**: spec canonica approvata in conversazione. Riferimento di implementazione: **Content Tuner R0** (già conforme).
> **Companion**: [suite-architecture](./2026-05-20-suite-architecture-cervello-flywheel.md), [decisioni-strategiche](./2026-05-19-decisioni-strategiche.md)
> **Scope**: il contratto del design system condiviso della suite — token, componenti, tipografia, theming per-prodotto — a cui far convergere BT, CT, ET. Diventerà il package `@voler/ui` nella monorepo.

---

## 0. Principio

**Un solo design system, tematizzabile per prodotto.** Il *linguaggio* (struttura token, componenti, layout, tipografia, estetica) è identico in tutta la suite; cambia **solo la tinta** per prodotto (BT arancio, CT azzurro/verde, ET viola). Non si "copia BT com'è": BT ha incongruenze interne (vedi §6). Il riferimento canonico è la versione **pulita** implementata in **Content Tuner R0**.

**Regola d'oro (non negoziabile):** *nessun colore hardcoded nei componenti/pagine.* Ogni colore passa da un token semantico. Questo è ciò che rende il theming una variabile, non un refactor di centinaia di file.

---

## 1. Theming per prodotto

Un'unica tabella token; la tinta deriva da un **hue OKLCH** per prodotto. Cambiare prodotto = cambiare l'hue del brand in `:root`/`.dark`.

| Prodotto | Hue brand (OKLCH) | Secondo colore | Note |
|---|---|---|---|
| Business Tuner | ~40 (arancio/coral) | amber | esistente |
| **Content Tuner** | **235 (azzurro)** | **165 (verde)** | **riferimento canonico (R0)** |
| Experience Tuner | ~300 (viola) | TBD | futuro |

Codificato in `src/lib/design-system.ts` → `PRODUCT_HUE`. Nella monorepo, `@voler/ui` esporrà un `ThemeProvider` che setta i token brand dal prodotto.

---

## 2. Token contract (semantici, OKLCH)

Set canonico (nomi fissi — non rinominare mai). Light + dark obbligatori.

**Neutri/struttura** (uguali fra prodotti): `--background`, `--foreground`, `--card(+foreground)`, `--popover(+foreground)`, `--muted(+foreground)`, `--accent(+foreground)` *(neutro: hover shadcn, NON il brand)*, `--border`, `--input`, `--destructive`.

**Brand (per-prodotto)**: `--primary(+foreground)` = colore brand principale; `--brand(+foreground)` = alias di primary (compat); `--brand-2(+foreground)` = secondo colore brand; `--ring` = brand; `--sidebar-primary`/`--sidebar-ring` = brand; `--chart-1` = brand, `--chart-2` = secondo brand.

**Espressivi**: `--gradient-primary` (brand→brand-2), `--shadow-glow` (brand-tinted), `--radius` (0.75rem) + scala `--radius-sm…4xl`.

**Mapping Tailwind v4**: tutti via `@theme inline { --color-*: var(--*) }` in `globals.css` → utility `bg-primary`, `bg-brand`, `bg-brand-2`, `ring-primary`, ecc.

> ❌ Vietato: `bg-amber-500`, `text-slate-900`, `ring-blue-600`, hex literali nei componenti. ✅ Solo: `bg-primary`, `bg-brand-2`, `text-muted-foreground`, `border-border`…

---

## 3. Componenti — un solo set, CVA + `cn()`

**Una sola libreria** (`components/ui/`), nessun set duplicato. Ogni primitivo: `class-variance-authority` per varianti + `cn()` (clsx+tailwind-merge), classi **token-driven**.

| Componente | Contratto canonico |
|---|---|
| **Button** | CVA. `variant: default(=brand gradient+glow) \| secondary \| outline \| ghost \| destructive \| link`; `size: sm\|default\|lg\|icon`. Primary usa `bg-gradient-brand` + `shadow-glow` + `text-primary-foreground`. |
| **Badge** | CVA token-driven. `default` usa brand/neutro semantico (mai `slate-900` hardcoded). |
| **Input/Textarea/Select** | `focus-visible:ring-ring`/`ring-primary` (mai `ring-amber-500`). `border-input`, `bg-background`. |
| **Card** | `bg-card border-border rounded-xl`. Variante "glass" via utility `.glass-card`. |
| **Tabs/Dialog/Dropdown/Tooltip** | Radix + `cn()`, token-driven. |

**Stato CT (R0)**: button default = gradient+glow ✅; token-driven ✅; un solo set ✅.

---

## 4. Tipografia

- **Body/UI**: Inter (`--font-inter` → `--font-sans`).
- **Titoli/display**: Plus Jakarta Sans (`--font-jakarta` → `--font-heading`, utility `.font-heading`).
- Caricamento via **`next/font`** (no `@import` CSS).
- **Stato CT (R0)**: ✅ adottato.

---

## 5. Estetica / utility del linguaggio

Utility condivise (in `globals.css`, → `@voler/ui` styles):
- `.bg-mesh` — sfondo a mesh-gradient brand-tinted (shell dashboard).
- `.glass-card` — card vetrate (blur + alpha), light+dark.
- `.bg-gradient-brand` — gradiente brand→brand-2.
- `.shadow-glow` — ombra brand-tinted (CTA).
- **Shell**: sidebar collassabile (persistita), container `max-w-[1200px]`, sfondo mesh.
- **Stato CT (R0)**: ✅ tutte presenti.

---

## 6. BT — harmonization backlog (da applicare alla migrazione monorepo, Stadio 2/3)

BT **non è token-driven** ed ha duplicazioni. Da risolvere quando BT entra in `@voler/ui` (NON a caldo ora: è in produzione, repo separato).

| # | Incongruenza BT (misurata) | Risoluzione canonica |
|---|---|---|
| 1 | **245 file** in `src/components` con colori Tailwind **hardcoded** (~**4.544** occorrenze: amber/orange/slate/emerald/…) | Sweep → sostituire con token semantici (`bg-primary`, `bg-brand-2`, `text-muted-foreground`…). È il grosso del lavoro. |
| 2 | **Doppio set componenti**: `components/ui/` + `components/ui/business-tuner/` (Button/Card/Icons/Input) | Consolidare in un solo set CVA token-driven; rimuovere il duplicato. |
| 3 | Button a **string-lookup manuale** (non CVA), gradiente hardcoded | Portare al Button CVA canonico (primary = `bg-gradient-brand`, hue 40). |
| 4 | Badge `default = slate-900` hardcoded | Variante token-driven. |
| 5 | Input `ring-amber-500` hardcoded | `ring-ring`/`ring-primary`. |
| 6 | Token **HSL** + solo light + font via `@import` | Convertire a **OKLCH** themeable (set §2) + dark + `next/font`. |

**Effort BT**: il #1 (sweep di 245 file) è **Large** (1-2 settimane); #2-#6 Small-Medium. Va fatto come fase dedicata della migrazione, con regressione visiva.

---

## 7. CT/Toolia — retrofit backlog (coda lunga, incrementale)

R0 ha già reso ~70% coerente via token+primitivi+shell. Restano:
- Residui `font-heading italic`/serif nelle pagine (ora il serif è sostituito da Jakarta; ripulire eventuali `italic` non voluti).
- Pagine con pattern hardcoded (hero a gradiente, es. `progetti/nuovo`) da allineare ai token/utility.
- Eventuali `*-[0-9]{2,3}` color literal residui nelle pagine vecchie → token (stesso principio del backlog BT, ma su superficie molto minore).
- Sweep finale: `grep -rE "(amber|orange|slate|red|emerald|blue)-[0-9]{2,3}" src/app src/components` → azzerare gli hardcoded non semantici.

---

## 8. Governance (per evitare nuova entropia)

- Nuovi componenti: **CVA + `cn()` + token-driven**. Mai colori hardcoded.
- Nuove pagine: usare i primitivi `components/ui/` + utility del linguaggio. Niente stili one-off.
- Il colore brand è UNA configurazione (hue), non una scelta per-componente.
- (Futuro) check CI/lint che fallisce su color-literal Tailwind non-semantici nei componenti.

---

## 9. Sintesi

- Riferimento canonico = **Content Tuner R0** (pulito, token-driven, themeable).
- BT converge alla migrazione monorepo (backlog §6, dominato dallo sweep di 245 file hardcoded).
- ET nascerà direttamente conforme.
- Il payoff: il design system come **prodotto** (`@voler/ui`), una tinta per brand, coerenza garantita dai token — non da disciplina manuale pagina per pagina.
