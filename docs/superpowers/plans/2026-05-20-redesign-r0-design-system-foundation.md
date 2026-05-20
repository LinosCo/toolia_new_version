# Redesign R0 — Design System Foundation (allineamento a BT, palette CT) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps con checkbox (`- [ ]`).

**Goal:** Stabilire il design system condiviso della suite, allineato a Business Tuner come *linguaggio* (token, primitivi, shell, tipografia, estetica gradient/glassy SaaS) ma con la **palette di Content Tuner (azzurro/verde)** e i font di BT (Inter + Plus Jakarta Sans). È di fatto `@voler/ui` costruito in anticipo, themeable. Dopo questa foundation, ~70% della UI esistente si ri-tematizza da sola (usa token semantici + shadcn).

**Architecture:** **Solo cambi additivi e di valore — nessun rename di token, nessuna rottura di API dei componenti** → le ~30 pagine esistenti continuano a compilare e si ri-stilano automaticamente; la suite di test (logica) resta un guard di regressione. Tailwind v4 + shadcn (già presenti in Toolia) + OKLCH (mantenuto). Si **unifica `--primary` = `--brand` = azzurro CT** (oggi `--primary` è scuro), si aggiunge un secondo colore brand **verde** (token nuovo, NON lo shadcn `--accent` che resta neutro per gli hover), gradient/glow/mesh tinti, dark mode mantenuta. Font via `next/font/google`.

**Tech Stack:** Next.js 16, React 19, Tailwind v4 (`@theme inline` in globals.css), shadcn primitives, OKLCH, `next/font`, lucide-react, `cn()` (clsx+tailwind-merge).

**Verifica:** la UI è difficile da unit-testare → i gate sono `npx tsc --noEmit` (no errori nuovi), `npx next build` (compila), full `vitest run` (nessuna regressione logica), + screenshot visivo (Claude Preview se disponibile). Vincolo: nessun nuovo errore tsc nei file toccati; suite resta verde.

---

## File Structure

| File | Responsabilità |
|---|---|
| `mvp/src/app/globals.css` (mod) | token azzurro/verde + gradient/glow/mesh + font mapping; nomi invariati |
| `mvp/src/lib/design-system.ts` (nuovo) | costanti palette/gradient (themeable, mirror del pattern BT) |
| `mvp/src/app/layout.tsx` (mod) | Inter + Plus Jakarta Sans via next/font; set CSS vars |
| `mvp/src/components/ui/button.tsx` (mod) | variante primary a gradiente + glow (additivo) |
| `mvp/src/components/ui/card.tsx` (mod, opz) | utility glass/elevated |
| `mvp/src/components/app-sidebar.tsx` (mod) | sidebar collassabile (persistenza localStorage) |
| `mvp/src/app/.../layout` dashboard (mod) | sfondo mesh + container max-w |
| `mvp/test/lib/design-system.test.ts` (nuovo) | unit sui costanti palette |

---

## Task R0.1: Token tema (azzurro/verde) + design-system.ts

**Files:** mod `src/app/globals.css`; create `src/lib/design-system.ts`; test `test/lib/design-system.test.ts`.

- [ ] **Step 1 — globals.css `:root`**: cambiare SOLO i valori (nomi invariati). Sostituire questi token:
```css
  --primary: oklch(0.58 0.13 235);          /* azzurro CT */
  --primary-foreground: oklch(0.99 0.01 235);
  --ring: oklch(0.58 0.13 235);
  --brand: oklch(0.58 0.13 235);            /* unificato con primary */
  --brand-foreground: oklch(0.99 0.01 235);
  --chart-1: oklch(0.58 0.13 235);          /* azzurro */
  --chart-2: oklch(0.68 0.15 165);          /* verde */
  --sidebar-primary: oklch(0.58 0.13 235);
  --sidebar-primary-foreground: oklch(0.99 0.01 235);
  --sidebar-ring: oklch(0.58 0.13 235);
```
Aggiungere (nuovi token, dopo `--brand-foreground`):
```css
  --brand-2: oklch(0.68 0.15 165);          /* verde CT (secondo colore brand) */
  --brand-2-foreground: oklch(0.99 0.01 165);
  --gradient-primary: linear-gradient(135deg, oklch(0.58 0.13 235), oklch(0.68 0.15 165));
  --shadow-glow: 0 8px 32px -8px oklch(0.58 0.13 235 / 0.30);
```
> NON toccare `--accent`/`--accent-foreground` (restano neutri: shadcn li usa per gli hover). NON toccare `--background`/`--foreground`/`--muted`/`--border` (struttura invariata).

- [ ] **Step 2 — globals.css `.dark`**: stessi token, versione dark:
```css
  --primary: oklch(0.66 0.14 235);
  --primary-foreground: oklch(0.14 0.02 235);
  --ring: oklch(0.66 0.14 235);
  --brand: oklch(0.66 0.14 235);
  --brand-foreground: oklch(0.14 0.02 235);
  --chart-1: oklch(0.66 0.14 235);
  --chart-2: oklch(0.72 0.15 165);
  --sidebar-primary: oklch(0.66 0.14 235);
  --sidebar-primary-foreground: oklch(0.14 0.02 235);
  --sidebar-ring: oklch(0.66 0.14 235);
```
Aggiungere in `.dark`:
```css
  --brand-2: oklch(0.72 0.15 165);
  --brand-2-foreground: oklch(0.14 0.02 165);
  --gradient-primary: linear-gradient(135deg, oklch(0.66 0.14 235), oklch(0.72 0.15 165));
  --shadow-glow: 0 8px 32px -8px oklch(0.66 0.14 235 / 0.35);
```

- [ ] **Step 3 — @theme inline**: aggiungere i mapping per i nuovi token (dopo `--color-brand-foreground`):
```css
  --color-brand-2: var(--brand-2);
  --color-brand-2-foreground: var(--brand-2-foreground);
```

- [ ] **Step 4 — utility CSS (mesh + glow + glass)**: aggiungere in fondo a globals.css:
```css
/* Suite design language — gradient/glass/mesh */
.bg-mesh {
  background-color: var(--background);
  background-image:
    radial-gradient(at 20% 0%, oklch(0.58 0.13 235 / 0.06) 0px, transparent 50%),
    radial-gradient(at 80% 20%, oklch(0.68 0.15 165 / 0.05) 0px, transparent 50%);
}
.shadow-glow { box-shadow: var(--shadow-glow); }
.bg-gradient-brand { background-image: var(--gradient-primary); }
.glass-card {
  background-color: oklch(1 0 0 / 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
}
.dark .glass-card { background-color: oklch(0.185 0.01 55 / 0.6); }
```

- [ ] **Step 5 — design-system.ts**: create `src/lib/design-system.ts`:
```typescript
/** Palette e gradienti della suite (themeable). I valori riflettono i token CSS di Content Tuner. */
export const BRAND = {
  primary: "oklch(0.58 0.13 235)",   // azzurro
  secondary: "oklch(0.68 0.15 165)", // verde
} as const;

export const GRADIENTS = {
  primary: "linear-gradient(135deg, oklch(0.58 0.13 235), oklch(0.68 0.15 165))",
} as const;

/** Hue OKLCH per prodotto (per il theming futuro in @voler/ui). */
export const PRODUCT_HUE = { businessTuner: 40, contentTuner: 235, experienceTuner: 300 } as const;
```

- [ ] **Step 6 — test**: create `test/lib/design-system.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { BRAND, GRADIENTS, PRODUCT_HUE } from "@/lib/design-system";

describe("design-system constants", () => {
  it("exposes CT brand colors", () => {
    expect(BRAND.primary).toContain("235");
    expect(BRAND.secondary).toContain("165");
  });
  it("gradient goes azzurro -> verde", () => {
    expect(GRADIENTS.primary).toContain("235");
    expect(GRADIENTS.primary).toContain("165");
  });
  it("maps a distinct hue per product", () => {
    expect(PRODUCT_HUE.contentTuner).toBe(235);
    expect(PRODUCT_HUE.businessTuner).not.toBe(PRODUCT_HUE.contentTuner);
  });
});
```

- [ ] **Step 7 — verifica**: `cd mvp && npx dotenv -e .env.test -- npx vitest run test/lib/design-system.test.ts` → PASS (3). Poi `npx tsc --noEmit 2>&1 | grep -E "globals|design-system" || echo OK`.

- [ ] **Step 8 — commit**:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/app/globals.css mvp/src/lib/design-system.ts mvp/test/lib/design-system.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(ui): CT azzurro/verde tokens + gradient/glow/mesh (suite design language)"
```

---

## Task R0.2: Font BT (Inter + Plus Jakarta Sans)

**Files:** mod `src/app/layout.tsx`, `src/app/globals.css`.

- [ ] **Step 1**: leggere `src/app/layout.tsx`. Sostituire i font Geist/Instrument-Serif con Inter + Plus Jakarta Sans via `next/font/google`, mantenendo i nomi delle CSS var attese da globals (vedi sotto). Esempio del pattern (adattare ai nomi esistenti nel file):
```tsx
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["500", "600", "700", "800"], display: "swap" });
// nel <html className={`${inter.variable} ${jakarta.variable}`}> (mantenere eventuali altre classi/attributi esistenti, es. suppressHydrationWarning, theme provider)
```
Se il mono serve ancora, mantenere Geist Mono o sostituire con un mono a scelta; non è critico.

- [ ] **Step 2 — globals.css @theme**: ripuntare i font:
```css
  --font-sans: var(--font-inter);
  --font-heading: var(--font-jakarta);
```
(rimuovere/aggiornare `--font-serif`/`--font-geist-sans` se non più usati; mantenere `--font-mono` se Geist Mono resta).

- [ ] **Step 3 — `.font-heading` utility** in globals.css: cambiare la `font-family` in `var(--font-heading)`:
```css
.font-heading {
  font-family: var(--font-heading);
  font-feature-settings: "kern", "liga", "clig", "calt";
  letter-spacing: -0.01em;
}
```
(le pagine che usano `font-heading italic` continueranno a compilare; il corsivo su un sans è accettabile, oppure rimuovere `italic` è un dettaglio del retrofit successivo — NON necessario ora).

- [ ] **Step 4 — verifica build**: `cd mvp && npx next build 2>&1 | tail -20` (oppure se troppo lento: `npx tsc --noEmit 2>&1 | grep -E "layout" || echo OK`). Atteso: nessun errore sui font.

- [ ] **Step 5 — commit**:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/app/layout.tsx mvp/src/app/globals.css
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(ui): adopt BT typography (Inter + Plus Jakarta Sans)"
```

---

## Task R0.3: Primitivi ri-stilati (button gradiente+glow, card glass) — additivo

**Files:** mod `src/components/ui/button.tsx`; (opz) `src/components/ui/card.tsx`. Test `test/ui/button-variants.test.tsx` (smoke, opzionale).

- [ ] **Step 1**: leggere `src/components/ui/button.tsx` (shadcn). VERIFICARE l'API delle varianti (probabile CVA con `variant: default|destructive|outline|secondary|ghost|link` e `size`). **Senza rinominare/rimuovere varianti**, modificare la variante `default` per avere il look BT (gradiente brand + glow) — esempio (adattare alla struttura CVA reale del file):
```ts
// nella mappa variants.variant:
default:
  "bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-95 hover:shadow-glow",
```
Mantenere INVARIATE `destructive|outline|secondary|ghost|link` (cambia solo `default`). Se preferisci non rischiare la `default`, aggiungi una NUOVA variante `brand` col look gradiente e lasciala opzionale — ma allineare la `default` dà il "wow" su tutti i CTA esistenti senza toccare le pagine. Scegli `default` se la struttura CVA lo consente in sicurezza.

- [ ] **Step 2** (opzionale, se rapido): in `src/components/ui/card.tsx`, NON cambiare l'API; le pagine che vogliono il look glass useranno la classe utility `.glass-card` (già definita in Task R0.1). Nessuna modifica necessaria qui se Card resta com'è.

- [ ] **Step 3 — verifica**: `cd mvp && npx tsc --noEmit 2>&1 | grep -E "components/ui/button" || echo OK`. Le pagine che usano `<Button>` devono continuare a compilare (variant API invariata). Eseguire la full suite per regressione: `npx dotenv -e .env.test -- npx vitest run 2>&1 | tail -4`.

- [ ] **Step 4 — commit**:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/components/ui/button.tsx mvp/src/components/ui/card.tsx
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(ui): brand gradient + glow primary button (BT look, CT palette)"
```

---

## Task R0.4: App shell (sidebar collassabile + mesh background + container)

**Files:** mod `src/components/app-sidebar.tsx`; mod il layout che la renderizza (probabile `src/app/(dashboard)/layout.tsx` o `src/app/layout.tsx`/`src/app/progetti/[id]/layout.tsx` — VERIFICARE dove `AppSidebar` è usata e dove sta il container principale).

- [ ] **Step 1**: leggere `src/components/app-sidebar.tsx` + il layout che la usa. Aggiungere alla sidebar:
  - stato `collapsed` con persistenza in `localStorage` (chiave es. `"toolia.sidebar.collapsed"`), default expanded;
  - un bottone toggle (chevron) in alto;
  - quando collapsed: larghezza ridotta (es. `w-16`) e solo icone (nascondere le label); quando expanded: `w-64` come ora.
  Mantenere la struttura nav esistente (main + secondary). Usare i token (`bg-sidebar`, `border-sidebar-border`, `text-sidebar-foreground`).

- [ ] **Step 2**: nel layout principale del dashboard, applicare lo sfondo mesh e il container: il wrapper del contenuto principale → aggiungere classe `bg-mesh` sul contenitore a tutta altezza, e il container interno `mx-auto max-w-[1200px] px-4 md:px-8 py-6`. (Adattare alle classi esistenti senza rompere il layout flex sidebar+content.)

- [ ] **Step 3 — verifica build**: `cd mvp && npx tsc --noEmit 2>&1 | grep -E "app-sidebar|layout" || echo OK`. La sidebar deve compilare; il toggle funziona client-side.

- [ ] **Step 4 — commit**:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/components/app-sidebar.tsx "mvp/src/app"
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(ui): collapsible sidebar + mesh background + content container (BT shell)"
```

---

## Task R0.5: Integrazione + verifica visiva

- [ ] **Step 1 — full suite (regressione)**: `cd mvp && npx dotenv -e .env.test -- npx vitest run` → tutti PASS (nessuna regressione logica dal redesign).
- [ ] **Step 2 — type check**: `cd mvp && npx tsc --noEmit 2>&1 | grep -E "error TS" | grep -vE "(test/|visitor-data)" | head -20` → nessun errore NUOVO introdotto dal redesign (gli errori pre-esistenti in test/ e visitor-data restano).
- [ ] **Step 3 — build**: `cd mvp && npx next build 2>&1 | tail -25` → build OK.
- [ ] **Step 4 — verifica visiva (se possibile)**: avviare il dev server e fare uno screenshot di una pagina (es. lista progetti + una pagina content) per confermare l'estetica azzurro/verde + gradient + shell. (Controller: usare Claude Preview se disponibile; in alternativa lasciare all'utente la verifica manuale.)
- [ ] **Step 5 — commit residui + (controller) push.**

---

## Note per l'esecutore
- **VINCOLO**: solo cambi additivi/di valore. NON rinominare token, NON rimuovere/rinominare varianti di componenti, NON cambiare le firme. Le 30 pagine devono continuare a compilare.
- **`--accent` resta neutro** (shadcn hover). Il verde brand è `--brand-2` / `bg-brand-2`, non `--accent`.
- **Shadcn**: NON eseguire `npx shadcn add` (BT non è shadcn). Modificare i primitivi esistenti a mano.
- **Font**: Inter (sans) + Plus Jakarta Sans (heading). Il `font-heading italic` esistente compila comunque (corsivo su sans); pulizia del corsivo è retrofit successivo.
- **Dark mode mantenuta** (Toolia ce l'ha; BT no — è una feature in più, non un conflitto).
- **Palette provvisoria**: azzurro hue 235 / verde hue 165 sono provvisori e tunabili (decisioni-strategiche §7). Cambiare i valori in `:root`/`.dark` ricolora tutto.
- Usare sempre `.env.test` per vitest.
