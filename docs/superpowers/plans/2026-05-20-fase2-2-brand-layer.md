# Fase 2.2 — Brand Layer (BrandAsset → Evidence → BrandSkill) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Costruire il Brand Layer nel repo Toolia (`mvp/`): caricamento asset di brand → estrazione evidenze (vision/text LLM) → distillazione di un `BrandSkill` manifest versionato (palette, typography, logo, tone, imagery), con UI per gestirlo. Tutto realmente funzionante e testato.

**Architecture:** Mirror della struttura provata di Business Tuner (`BrandAsset` / `BrandEvidence` / `BrandSkill`), adattata allo stack Toolia (Prisma 7, OpenAI SDK nativo, helper `getTenantApiKey`/`logLlmCall`/`rbac`/`db`). Storage asset **inline** nel DB (text o data URL) come gli stopgap esistenti del repo (audio/sources) — migrazione a R2 è follow-up noto. Vision LLM col pattern già presente in `analyze-planimetria` (chat.completions + `image_url`). Async **inline** + `maxDuration` (no job queue). Ogni campo del manifest porta `citations` = ID delle `BrandEvidence` (anti-allucinazione/tracciabilità). Distillazione versionata: la nuova `CURRENT` retrocede la precedente a `SUPERSEDED` in transazione.

**Tech Stack:** Next.js 16 App Router, React 19, TS strict, Prisma 7 (`@prisma/adapter-pg`, generator `prisma-client` → `@/generated/prisma`), OpenAI SDK nativo, Zod v4, Vitest 4 (`fileParallelism:false`).

---

## File Structure

| File | Responsabilità |
|---|---|
| `mvp/prisma/schema.prisma` (modifica) | enum + model `BrandAsset`/`BrandEvidence`/`BrandSkill` + relazioni su `Project` |
| `mvp/prisma/migrations/<ts>_brand_layer/migration.sql` (auto, `migrate dev`) | tabelle + enum |
| `mvp/src/lib/brand/manifest.ts` (nuovo) | tipo + zod `brandSkillManifestSchema` (il contratto) |
| `mvp/src/lib/brand/extractor.ts` (nuovo) | `extractBrandAsset()` — asset → BrandEvidence |
| `mvp/src/lib/brand/distiller.ts` (nuovo) | `distillBrandSkill()` — evidence → BrandSkill versionato |
| `mvp/src/lib/brand/skill.ts` (nuovo) | `getCurrentBrandSkill()` — lettura manifest corrente |
| `mvp/src/app/api/projects/[id]/brand/assets/route.ts` (nuovo) | POST crea asset / GET lista |
| `mvp/src/app/api/projects/[id]/brand/assets/[assetId]/extract/route.ts` (nuovo) | POST estrai evidenze |
| `mvp/src/app/api/projects/[id]/brand/distill/route.ts` (nuovo) | POST distilla skill |
| `mvp/src/app/api/projects/[id]/brand/skill/route.ts` (nuovo) | GET manifest corrente |
| `mvp/src/app/progetti/[id]/brand/page.tsx` (nuovo) | shell server |
| `mvp/src/app/progetti/[id]/brand/brand-workspace.tsx` (nuovo) | UI client (upload/estrai/distilla/manifest) |
| `mvp/test/lib/brand/manifest.test.ts` … `extractor/distiller/skill` + `test/api/brand-*.test.ts` (nuovi) | test |
| `mvp/test/helpers/prisma.ts` (modifica) | `resetDb()` + tabelle brand |

---

## Task 1: Schema Brand (Asset/Evidence/Skill) + migrazione

**Files:** Modify `prisma/schema.prisma`; migration via `migrate dev`; Modify `test/helpers/prisma.ts`; Test `test/lib/brand/schema.test.ts`.

- [ ] **Step 1: Enum + model in `prisma/schema.prisma` (in fondo)**

```prisma
enum BrandAssetKind { UPLOAD_IMAGE UPLOAD_TEXT URL_PAGE }
enum BrandAssetCategory { LOGO COLOR_PALETTE TYPOGRAPHY BRAND_BOOK PAST_CONTENT MOODBOARD PRODUCT_PHOTO OTHER }
enum BrandAssetStatus { PENDING EXTRACTING READY FAILED ARCHIVED }
enum BrandSkillStatus { CURRENT SUPERSEDED DRAFT }

model BrandAsset {
  id            String             @id @default(cuid())
  projectId     String             @map("project_id")
  tenantId      String             @map("tenant_id")
  label         String?
  kind          BrandAssetKind
  category      BrandAssetCategory @default(OTHER)
  status        BrandAssetStatus   @default(PENDING)
  content       String?            // testo, oppure data URL immagine, oppure URL
  mimeType      String?            @map("mime_type")
  sourceUrl     String?            @map("source_url")
  extractorError String?           @map("extractor_error")
  extractedAt   DateTime?          @map("extracted_at")
  createdAt     DateTime           @default(now()) @map("created_at")
  updatedAt     DateTime           @updatedAt @map("updated_at")
  project  Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  evidence BrandEvidence[]
  @@index([projectId])
  @@map("brand_assets")
}

model BrandEvidence {
  id          String   @id @default(cuid())
  projectId   String   @map("project_id")
  assetId     String   @map("asset_id")
  field       String
  value       Json
  description String?
  confidence  Float?
  sourceModel String?  @map("source_model")
  createdAt   DateTime @default(now()) @map("created_at")
  asset BrandAsset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  @@index([projectId])
  @@index([assetId])
  @@map("brand_evidence")
}

model BrandSkill {
  id                  String           @id @default(cuid())
  projectId           String           @map("project_id")
  version             Int
  status              BrandSkillStatus @default(CURRENT)
  manifest            Json
  builtFromEvidenceIds Json            @map("built_from_evidence_ids")
  distillerModel      String?          @map("distiller_model")
  distillerTokensIn   Int?             @map("distiller_tokens_in")
  distillerTokensOut  Int?             @map("distiller_tokens_out")
  distilledAt         DateTime         @default(now()) @map("distilled_at")
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@index([projectId, status])
  @@map("brand_skills")
}
```

- [ ] **Step 2: Relazioni inverse su `Project`** — aggiungere fra le relazioni esistenti del model `Project` esattamente queste due righe:

```prisma
  brandAssets BrandAsset[]
  brandSkills BrandSkill[]
```

- [ ] **Step 3: Generare e applicare la migrazione**

Run: `cd mvp && npx dotenv -e .env.test -- npx prisma migrate dev --name brand_layer`
Expected: migrazione creata e applicata; client rigenerato. (Nessun pgvector qui → flusso standard.) Se Prisma rileva drift stale di un index `Scheda_*` come in passato, rimuovere la riga `DropIndex` stale dalla migration prima che venga applicata (raro; se non appare, ignorare).

- [ ] **Step 4: `resetDb()` in `test/helpers/prisma.ts`** — aggiungere PRIMA della delete di `project` (e prima di `contentEmbedding` va bene qualunque ordine fra tabelle brand purché evidence/skill non dipendano da project prima della cancellazione; il cascade copre comunque):

```typescript
  await prisma.brandEvidence.deleteMany();
  await prisma.brandSkill.deleteMany();
  await prisma.brandAsset.deleteMany();
```

- [ ] **Step 5: Test schema** — Create `test/lib/brand/schema.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../helpers/prisma";

describe("brand schema", () => {
  beforeEach(async () => { await resetDb(); });

  it("creates asset, evidence and a versioned skill", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });

    const asset = await prisma.brandAsset.create({
      data: { projectId: project.id, tenantId, kind: "UPLOAD_TEXT", category: "PAST_CONTENT", content: "ciao", status: "READY" },
    });
    await prisma.brandEvidence.create({
      data: { projectId: project.id, assetId: asset.id, field: "palette.primary", value: "#112233", confidence: 0.8 },
    });
    const skill = await prisma.brandSkill.create({
      data: { projectId: project.id, version: 1, status: "CURRENT", manifest: { summary: "x" }, builtFromEvidenceIds: [] },
    });

    expect(asset.status).toBe("READY");
    const ev = await prisma.brandEvidence.findMany({ where: { assetId: asset.id } });
    expect(ev).toHaveLength(1);
    expect(skill.version).toBe(1);
  });
});
```

- [ ] **Step 6: Run** `cd mvp && npx dotenv -e .env.test -- npx vitest run test/lib/brand/schema.test.ts` → PASS (1).

- [ ] **Step 7: Commit**

```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/prisma/schema.prisma mvp/prisma/migrations mvp/src/generated/prisma mvp/test/helpers/prisma.ts mvp/test/lib/brand/schema.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brand): schema BrandAsset/Evidence/Skill + migration"
```

---

## Task 2: `brandSkillManifestSchema` (il contratto)

**Files:** Create `src/lib/brand/manifest.ts`; Test `test/lib/brand/manifest.test.ts`.

- [ ] **Step 1: Test che fallisce** — Create `test/lib/brand/manifest.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { brandSkillManifestSchema } from "@/lib/brand/manifest";

describe("brandSkillManifestSchema", () => {
  it("accepts a sparse valid manifest", () => {
    const r = brandSkillManifestSchema.safeParse({
      palette: { primary: "#112233", citations: ["e1"] },
      tone: { descriptors: ["caldo", "autorevole"], citations: [] },
      summary: "Brand X",
    });
    expect(r.success).toBe(true);
  });

  it("accepts an empty manifest (all optional)", () => {
    expect(brandSkillManifestSchema.safeParse({}).success).toBe(true);
  });

  it("rejects wrong types", () => {
    const r = brandSkillManifestSchema.safeParse({ tone: { descriptors: "nope" } });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run** → FAIL (module not found).

- [ ] **Step 3: Implementare** — Create `src/lib/brand/manifest.ts`:

```typescript
import { z } from "zod";

const cited = { citations: z.array(z.string()).default([]) };

export const brandSkillManifestSchema = z.object({
  palette: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    background: z.string().optional(),
    text: z.string().optional(),
    ...cited,
  }).optional(),
  typography: z.object({
    heading: z.string().max(200).optional(),
    body: z.string().max(200).optional(),
    notes: z.string().max(400).optional(),
    ...cited,
  }).optional(),
  logo: z.object({
    description: z.string().max(400),
    hasTextmark: z.boolean().optional(),
    hasSymbol: z.boolean().optional(),
    ...cited,
  }).optional(),
  tone: z.object({
    descriptors: z.array(z.string().max(40)).max(8).default([]),
    do_say: z.array(z.string().max(200)).max(8).optional(),
    dont_say: z.array(z.string().max(200)).max(8).optional(),
    signature_phrases: z.array(z.string().max(200)).max(6).optional(),
    ...cited,
  }).optional(),
  imagery: z.object({
    style: z.string().max(300),
    subjects: z.array(z.string().max(80)).max(8).optional(),
    mood: z.string().max(120).optional(),
    forbidden: z.array(z.string().max(120)).max(6).optional(),
    ...cited,
  }).optional(),
  formats: z.object({
    preferred: z.array(z.string().max(40)).max(6).default([]),
    aspect_ratios: z.array(z.string().max(12)).max(6).optional(),
    ...cited,
  }).optional(),
  summary: z.string().max(1200).optional(),
});

export type BrandSkillManifest = z.infer<typeof brandSkillManifestSchema>;
```

- [ ] **Step 4: Run** → PASS (3).

- [ ] **Step 5: Commit**

```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/lib/brand/manifest.ts mvp/test/lib/brand/manifest.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brand): BrandSkill manifest schema (the contract)"
```

---

## Task 3: `extractBrandAsset()` — asset → BrandEvidence (vision/text LLM)

**Files:** Create `src/lib/brand/extractor.ts`; Test `test/lib/brand/extractor.test.ts`.

- [ ] **Step 1: Test che fallisce** — Create `test/lib/brand/extractor.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../helpers/prisma";

const mockCreate = vi.fn();
vi.mock("openai", () => ({ default: class { chat = { completions: { create: mockCreate } }; } }));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { extractBrandAsset } from "@/lib/brand/extractor";

describe("extractBrandAsset", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); vi.mocked(getTenantApiKey).mockResolvedValue("sk-test"); });

  it("extracts evidence rows and marks asset READY", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const asset = await prisma.brandAsset.create({ data: { projectId: project.id, tenantId, kind: "UPLOAD_TEXT", content: "Tono caldo, colore #112233" } });

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ evidence: [
        { field: "palette.primary", value: "#112233", confidence: 0.9 },
        { field: "tone.descriptor", value: "caldo", confidence: 0.8 },
      ] }) } }],
      usage: { prompt_tokens: 100, completion_tokens: 20 },
    });

    const res = await extractBrandAsset({ assetId: asset.id });

    expect(res.evidenceCount).toBe(2);
    expect(res.status).toBe("READY");
    const ev = await prisma.brandEvidence.findMany({ where: { assetId: asset.id } });
    expect(ev).toHaveLength(2);
    const updated = await prisma.brandAsset.findUnique({ where: { id: asset.id } });
    expect(updated?.status).toBe("READY");
  });

  it("replaces previous evidence on re-extract", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const asset = await prisma.brandAsset.create({ data: { projectId: project.id, tenantId, kind: "UPLOAD_TEXT", content: "x" } });
    await prisma.brandEvidence.create({ data: { projectId: project.id, assetId: asset.id, field: "old", value: "stale" } });

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ evidence: [{ field: "tone.descriptor", value: "nuovo" }] }) } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    });

    await extractBrandAsset({ assetId: asset.id });
    const ev = await prisma.brandEvidence.findMany({ where: { assetId: asset.id } });
    expect(ev).toHaveLength(1);
    expect(ev[0].field).toBe("tone.descriptor");
  });

  it("marks FAILED when no API key", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const asset = await prisma.brandAsset.create({ data: { projectId: project.id, tenantId, kind: "UPLOAD_TEXT", content: "x" } });
    vi.mocked(getTenantApiKey).mockResolvedValue(null);

    const res = await extractBrandAsset({ assetId: asset.id });
    expect(res.status).toBe("FAILED");
    const updated = await prisma.brandAsset.findUnique({ where: { id: asset.id } });
    expect(updated?.status).toBe("FAILED");
  });
});
```

- [ ] **Step 2: Run** → FAIL (module not found).

- [ ] **Step 3: Implementare** — Create `src/lib/brand/extractor.ts`:

```typescript
import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";

// Modello vision/multimodale. Verificare l'id esatto contro docs/strategy/2026-05-20-modelli-ai-reference.md.
export const BRAND_VISION_MODEL = "gpt-5.5";

const visionSchema = z.object({
  evidence: z.array(z.object({
    field: z.string(),
    value: z.unknown(),
    description: z.string().optional(),
    confidence: z.number().optional(),
  })).default([]),
});

const SYSTEM = `Sei un analista di brand. Estrai FATTI ATOMICI di brand dall'asset fornito.
Restituisci JSON {"evidence":[{field,value,description?,confidence?}]}.
field usa dot-notation: palette.primary, palette.accent, typography.heading, logo.description,
tone.descriptor, imagery.style, imagery.subject, formats.preferred. value è il valore osservato
(es. "#112233", "caldo", "fotografia naturale"). confidence 0..1. Non inventare: estrai solo ciò che vedi.`;

export interface ExtractResult { evidenceCount: number; status: "READY" | "FAILED"; model: string; error?: string }

export async function extractBrandAsset(args: { assetId: string }): Promise<ExtractResult> {
  const asset = await prisma.brandAsset.findUnique({ where: { id: args.assetId } });
  if (!asset) return { evidenceCount: 0, status: "FAILED", model: BRAND_VISION_MODEL, error: "asset_not_found" };

  await prisma.brandAsset.update({ where: { id: asset.id }, data: { status: "EXTRACTING" } });

  try {
    const apiKey = await getTenantApiKey(asset.tenantId, "openai");
    if (!apiKey) throw new Error("OpenAI API key non configurata per il tenant");

    const client = new OpenAI({ apiKey });
    const userContent =
      asset.kind === "UPLOAD_IMAGE" && asset.content
        ? [
            { type: "text" as const, text: "Analizza questo asset visivo di brand." },
            { type: "image_url" as const, image_url: { url: asset.content, detail: "high" as const } },
          ]
        : `Analizza questo asset di brand (testo):\n\n${asset.content ?? asset.sourceUrl ?? ""}`;

    const completion = await client.chat.completions.create({
      model: BRAND_VISION_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent as never },
      ],
    });

    await logLlmCall({
      tenantId: asset.tenantId, projectId: asset.projectId, operation: "brand_extract",
      provider: "openai", model: BRAND_VISION_MODEL,
      inputTokens: completion.usage?.prompt_tokens ?? 0, outputTokens: completion.usage?.completion_tokens ?? 0,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = visionSchema.safeParse(JSON.parse(raw));
    const rows = parsed.success ? parsed.data.evidence : [];

    await prisma.$transaction([
      prisma.brandEvidence.deleteMany({ where: { assetId: asset.id } }),
      ...rows.map((r) =>
        prisma.brandEvidence.create({
          data: {
            projectId: asset.projectId, assetId: asset.id,
            field: r.field, value: r.value as never,
            description: r.description, confidence: r.confidence, sourceModel: BRAND_VISION_MODEL,
          },
        }),
      ),
      prisma.brandAsset.update({ where: { id: asset.id }, data: { status: "READY", extractedAt: new Date(), extractorError: null } }),
    ]);

    return { evidenceCount: rows.length, status: "READY", model: BRAND_VISION_MODEL };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "extract_failed";
    await prisma.brandAsset.update({ where: { id: asset.id }, data: { status: "FAILED", extractorError: msg } });
    return { evidenceCount: 0, status: "FAILED", model: BRAND_VISION_MODEL, error: msg };
  }
}
```

- [ ] **Step 4: Run** → PASS (3).

- [ ] **Step 5: Commit**

```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/lib/brand/extractor.ts mvp/test/lib/brand/extractor.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brand): extractBrandAsset (vision/text -> evidence)"
```

---

## Task 4: `distillBrandSkill()` + `getCurrentBrandSkill()` — evidence → manifest versionato

**Files:** Create `src/lib/brand/distiller.ts`, `src/lib/brand/skill.ts`; Test `test/lib/brand/distiller.test.ts`.

- [ ] **Step 1: Test che fallisce** — Create `test/lib/brand/distiller.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../helpers/prisma";

const mockCreate = vi.fn();
vi.mock("openai", () => ({ default: class { chat = { completions: { create: mockCreate } }; } }));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { distillBrandSkill } from "@/lib/brand/distiller";
import { getCurrentBrandSkill } from "@/lib/brand/skill";

async function seedEvidence(prisma: ReturnType<typeof getTestPrisma>, projectId: string, tenantId: string) {
  const asset = await prisma.brandAsset.create({ data: { projectId, tenantId, kind: "UPLOAD_TEXT", content: "x", status: "READY" } });
  await prisma.brandEvidence.createMany({ data: [
    { projectId, assetId: asset.id, field: "palette.primary", value: "#112233" },
    { projectId, assetId: asset.id, field: "tone.descriptor", value: "caldo" },
  ] });
}

describe("distillBrandSkill", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); vi.mocked(getTenantApiKey).mockResolvedValue("sk-test"); });

  it("creates v1 CURRENT skill from evidence", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    await seedEvidence(prisma, project.id, tenantId);
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ palette: { primary: "#112233", citations: [] }, tone: { descriptors: ["caldo"], citations: [] }, summary: "Brand" }) } }],
      usage: { prompt_tokens: 50, completion_tokens: 30 },
    });

    const res = await distillBrandSkill({ projectId: project.id, tenantId });
    expect(res.ok).toBe(true);
    if (res.ok) { expect(res.version).toBe(1); expect(res.manifest.summary).toBe("Brand"); }

    const current = await getCurrentBrandSkill(project.id);
    expect(current?.version).toBe(1);
    expect((current?.manifest as { palette?: { primary?: string } }).palette?.primary).toBe("#112233");
  });

  it("bumps version and supersedes the previous current", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    await seedEvidence(prisma, project.id, tenantId);
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ summary: "v" }) } }], usage: { prompt_tokens: 1, completion_tokens: 1 } });

    await distillBrandSkill({ projectId: project.id, tenantId });
    const second = await distillBrandSkill({ projectId: project.id, tenantId });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.version).toBe(2);

    const all = await prisma.brandSkill.findMany({ where: { projectId: project.id }, orderBy: { version: "asc" } });
    expect(all.map((s) => s.status)).toEqual(["SUPERSEDED", "CURRENT"]);
  });

  it("fails when there is no evidence", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const res = await distillBrandSkill({ projectId: project.id, tenantId });
    expect(res.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run** → FAIL (modules not found).

- [ ] **Step 3: Implementare `src/lib/brand/skill.ts`**:

```typescript
import { prisma } from "@/lib/db";
import type { BrandSkillManifest } from "@/lib/brand/manifest";

export interface CurrentBrandSkill { id: string; version: number; manifest: BrandSkillManifest }

/** Ritorna lo BrandSkill CURRENT del progetto, o null. */
export async function getCurrentBrandSkill(projectId: string): Promise<CurrentBrandSkill | null> {
  const skill = await prisma.brandSkill.findFirst({
    where: { projectId, status: "CURRENT" },
    orderBy: { version: "desc" },
  });
  if (!skill) return null;
  return { id: skill.id, version: skill.version, manifest: skill.manifest as BrandSkillManifest };
}
```

- [ ] **Step 4: Implementare `src/lib/brand/distiller.ts`**:

```typescript
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import { brandSkillManifestSchema, type BrandSkillManifest } from "@/lib/brand/manifest";

// Modello per la distillazione (ragionamento testuale sulle evidenze). Verificare id contro modelli-ai-reference.
export const BRAND_DISTILL_MODEL = "gpt-5.5";

const SYSTEM = `Sei un brand strategist. Dato un elenco di EVIDENZE atomiche di brand (con id),
sintetizza un BrandSkill manifest JSON con i campi: palette, typography, logo, tone, imagery, formats, summary.
Per OGNI campo popolato, includi "citations": gli id delle evidenze che lo supportano. Non inventare:
usa solo ciò che le evidenze supportano. Restituisci SOLO il JSON del manifest.`;

export type DistillationResult =
  | { ok: true; skillId: string; version: number; manifest: BrandSkillManifest }
  | { ok: false; error: string };

export async function distillBrandSkill(args: { projectId: string; tenantId: string }): Promise<DistillationResult> {
  const evidence = await prisma.brandEvidence.findMany({
    where: { projectId: args.projectId },
    select: { id: true, field: true, value: true, confidence: true },
    take: 500,
  });
  if (evidence.length === 0) return { ok: false, error: "no_evidence" };

  const apiKey = await getTenantApiKey(args.tenantId, "openai");
  if (!apiKey) return { ok: false, error: "no_api_key" };

  const client = new OpenAI({ apiKey });
  const evidenceText = evidence.map((e) => `- [${e.id}] ${e.field} = ${JSON.stringify(e.value)} (conf ${e.confidence ?? "?"})`).join("\n");

  const completion = await client.chat.completions.create({
    model: BRAND_DISTILL_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Evidenze:\n${evidenceText}` },
    ],
  });

  await logLlmCall({
    tenantId: args.tenantId, projectId: args.projectId, operation: "brand_distill",
    provider: "openai", model: BRAND_DISTILL_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? 0, outputTokens: completion.usage?.completion_tokens ?? 0,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = brandSkillManifestSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return { ok: false, error: "invalid_manifest" };

  const created = await prisma.$transaction(async (tx) => {
    await tx.brandSkill.updateMany({ where: { projectId: args.projectId, status: "CURRENT" }, data: { status: "SUPERSEDED" } });
    const last = await tx.brandSkill.findFirst({ where: { projectId: args.projectId }, orderBy: { version: "desc" }, select: { version: true } });
    const version = (last?.version ?? 0) + 1;
    return tx.brandSkill.create({
      data: {
        projectId: args.projectId, version, status: "CURRENT",
        manifest: parsed.data as never,
        builtFromEvidenceIds: evidence.map((e) => e.id) as never,
        distillerModel: BRAND_DISTILL_MODEL,
        distillerTokensIn: completion.usage?.prompt_tokens ?? 0,
        distillerTokensOut: completion.usage?.completion_tokens ?? 0,
      },
    });
  });

  return { ok: true, skillId: created.id, version: created.version, manifest: parsed.data };
}
```

- [ ] **Step 5: Run** → PASS (3).

- [ ] **Step 6: Commit**

```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/lib/brand/distiller.ts mvp/src/lib/brand/skill.ts mvp/test/lib/brand/distiller.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brand): distillBrandSkill (versioned) + getCurrentBrandSkill"
```

---

## Task 5: API routes (assets create/list, extract, distill, skill)

**Files:** Create the 4 route files; Tests `test/api/brand-assets.test.ts`, `test/api/brand-distill.test.ts`.

- [ ] **Step 1: Test assets+skill (fallisce)** — Create `test/api/brand-assets.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
import { getSessionUser } from "@/lib/rbac";

describe("brand assets API", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("creates and lists assets", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });

    const { POST, GET } = await import("@/app/api/projects/[id]/brand/assets/route");
    const created = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ kind: "UPLOAD_TEXT", content: "ciao", category: "PAST_CONTENT" }) }) as never,
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(created.status).toBe(201);

    const list = await GET(new Request("http://x") as never, { params: Promise.resolve({ id: project.id }) });
    expect(list.status).toBe(200);
    const body = await list.json();
    expect(body.assets).toHaveLength(1);
  });

  it("404 cross-tenant on create", async () => {
    const { userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId: "other", role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/brand/assets/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ kind: "UPLOAD_TEXT", content: "x" }) }) as never, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Implementare `src/app/api/projects/[id]/brand/assets/route.ts`**:

```typescript
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";

const CreateBody = z.object({
  kind: z.enum(["UPLOAD_IMAGE", "UPLOAD_TEXT", "URL_PAGE"]),
  category: z.enum(["LOGO", "COLOR_PALETTE", "TYPOGRAPHY", "BRAND_BOOK", "PAST_CONTENT", "MOODBOARD", "PRODUCT_PHOTO", "OTHER"]).optional(),
  label: z.string().max(200).optional(),
  content: z.string().optional(),
  mimeType: z.string().optional(),
  sourceUrl: z.string().url().optional(),
});

async function assertProject(id: string, tenantId: string) {
  return prisma.project.findFirst({ where: { id, tenantId }, select: { id: true } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id } = await params;
    const project = await assertProject(id, user.tenantId);
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const parsed = CreateBody.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

    const asset = await prisma.brandAsset.create({
      data: { projectId: project.id, tenantId: user.tenantId, kind: parsed.data.kind, category: parsed.data.category ?? "OTHER", label: parsed.data.label, content: parsed.data.content, mimeType: parsed.data.mimeType, sourceUrl: parsed.data.sourceUrl },
    });
    return Response.json({ asset }, { status: 201 });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const project = await assertProject(id, user.tenantId);
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const assets = await prisma.brandAsset.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { evidence: true } } },
    });
    return Response.json({ assets });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Implementare `src/app/api/projects/[id]/brand/assets/[assetId]/extract/route.ts`**:

```typescript
import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { extractBrandAsset } from "@/lib/brand/extractor";

export const maxDuration = 120;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; assetId: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id, assetId } = await params;

    const asset = await prisma.brandAsset.findFirst({ where: { id: assetId, projectId: id, tenantId: user.tenantId }, select: { id: true } });
    if (!asset) return Response.json({ error: "not_found" }, { status: 404 });

    const result = await extractBrandAsset({ assetId: asset.id });
    return Response.json(result, { status: result.status === "FAILED" ? 422 : 200 });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implementare `src/app/api/projects/[id]/brand/distill/route.ts`**:

```typescript
import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { distillBrandSkill } from "@/lib/brand/distiller";

export const maxDuration = 120;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const result = await distillBrandSkill({ projectId: project.id, tenantId: user.tenantId });
    return Response.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Implementare `src/app/api/projects/[id]/brand/skill/route.ts`**:

```typescript
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { getCurrentBrandSkill } from "@/lib/brand/skill";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const skill = await getCurrentBrandSkill(project.id);
    return Response.json({ skill });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Test distill route** — Create `test/api/brand-distill.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
vi.mock("@/lib/brand/distiller", () => ({ distillBrandSkill: vi.fn() }));
import { getSessionUser } from "@/lib/rbac";
import { distillBrandSkill } from "@/lib/brand/distiller";

describe("POST /api/projects/[id]/brand/distill", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("200 with skill on success", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(distillBrandSkill).mockResolvedValue({ ok: true, skillId: "s1", version: 1, manifest: { summary: "x" } });

    const { POST } = await import("@/app/api/projects/[id]/brand/distill/route");
    const res = await POST(new Request("http://x", { method: "POST" }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).version).toBe(1);
  });

  it("422 when distillation fails (no evidence)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(distillBrandSkill).mockResolvedValue({ ok: false, error: "no_evidence" });

    const { POST } = await import("@/app/api/projects/[id]/brand/distill/route");
    const res = await POST(new Request("http://x", { method: "POST" }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 7: Run** `cd mvp && npx dotenv -e .env.test -- npx vitest run test/api/brand-assets.test.ts test/api/brand-distill.test.ts` → PASS (4).

- [ ] **Step 8: Commit**

```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add "mvp/src/app/api/projects/[id]/brand" mvp/test/api/brand-assets.test.ts mvp/test/api/brand-distill.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brand): API routes (assets, extract, distill, skill)"
```

---

## Task 6: Brand Workspace UI (upload → estrai → distilla → manifest)

**Obiettivo UX**: una schermata dove l'operatore (1) aggiunge asset (incolla testo o un data URL immagine), (2) li estrae (vede lo status PENDING→READY + n. evidenze), (3) distilla, (4) vede il **manifest** reso visivamente: swatch di palette, chip di tono, stile imagery, summary. Il "wow": *vedi il tuo brand sintetizzato in una scheda visiva*. Chiama le route reali del Task 5; **adatta i token Tailwind a quelli reali del repo** (verifica `globals.css` e una pagina esistente come `progetti/[id]/content/retrieval-playground.tsx` — usa `border-border`, `rounded-xl`, `bg-brand`, `text-muted-foreground`, `bg-destructive/[0.06]`, CTA `rounded-full`).

**Files:** Create `src/app/progetti/[id]/brand/page.tsx`, `src/app/progetti/[id]/brand/brand-workspace.tsx`.

- [ ] **Step 1: Server shell** — `src/app/progetti/[id]/brand/page.tsx`:

```tsx
import { BrandWorkspace } from "./brand-workspace";

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Brand Layer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Carica gli asset di brand, estrai le evidenze e distilla il BrandSkill: la voce e l'identità visiva del progetto.
        </p>
      </header>
      <BrandWorkspace projectId={id} />
    </main>
  );
}
```

- [ ] **Step 2: Client component** — `src/app/progetti/[id]/brand/brand-workspace.tsx`. Requisiti: form per aggiungere asset (select kind, textarea content, select category, bottone "Aggiungi"); lista asset con badge status e conteggio evidenze + bottone "Estrai" per ciascuno; bottone "Distilla BrandSkill"; pannello manifest (palette come swatch colorati, tono come chip, imagery.style, summary) caricato da `GET .../brand/skill`; stati loading/error. Implementazione di riferimento (adatta i token):

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Sparkles, Plus, RefreshCw, AlertCircle } from "lucide-react";

interface AssetRow { id: string; kind: string; category: string; status: string; label: string | null; _count?: { evidence: number } }
interface Manifest { palette?: Record<string, string | string[] | undefined>; tone?: { descriptors?: string[] }; imagery?: { style?: string }; summary?: string }
interface Skill { id: string; version: number; manifest: Manifest }

export function BrandWorkspace({ projectId }: { projectId: string }) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [kind, setKind] = useState("UPLOAD_TEXT");
  const [category, setCategory] = useState("PAST_CONTENT");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/projects/${projectId}/brand`;

  const load = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([fetch(`${base}/assets`), fetch(`${base}/skill`)]);
      if (a.ok) setAssets((await a.json()).assets);
      if (s.ok) setSkill((await s.json()).skill);
    } catch { setError("Errore di caricamento"); }
  }, [base]);

  useEffect(() => { load(); }, [load]);

  async function addAsset() {
    if (!content.trim()) return;
    setBusy("add"); setError(null);
    try {
      const res = await fetch(`${base}/assets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, category, content }) });
      if (!res.ok) throw new Error("Errore creazione asset");
      setContent(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Errore"); } finally { setBusy(null); }
  }

  async function extract(assetId: string) {
    setBusy(assetId); setError(null);
    try {
      const res = await fetch(`${base}/assets/${assetId}/extract`, { method: "POST" });
      if (!res.ok) throw new Error("Estrazione fallita");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Errore"); } finally { setBusy(null); }
  }

  async function distill() {
    setBusy("distill"); setError(null);
    try {
      const res = await fetch(`${base}/distill`, { method: "POST" });
      if (!res.ok) throw new Error("Distillazione fallita (servono evidenze?)");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Errore"); } finally { setBusy(null); }
  }

  const palette = skill?.manifest.palette ?? {};
  const swatches = Object.entries(palette).filter(([k, v]) => k !== "citations" && typeof v === "string") as [string, string][];

  return (
    <div className="space-y-6">
      {error && <p className="flex items-center gap-2 rounded-md bg-destructive/[0.06] px-3 py-2 text-sm text-destructive"><AlertCircle className="size-4" />{error}</p>}

      {/* Add asset */}
      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-3 text-sm font-medium">Aggiungi asset</h2>
        <div className="flex flex-wrap gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-sm">
            <option value="UPLOAD_TEXT">Testo</option>
            <option value="UPLOAD_IMAGE">Immagine (data URL)</option>
            <option value="URL_PAGE">URL</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-sm">
            {["PAST_CONTENT","LOGO","COLOR_PALETTE","TYPOGRAPHY","BRAND_BOOK","MOODBOARD","PRODUCT_PHOTO","OTHER"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3}
          placeholder="Incolla testo di brand, una data URL immagine, o un URL…"
          className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-sm focus:ring-1 focus:ring-foreground/30 outline-none" />
        <button onClick={addAsset} disabled={busy === "add" || !content.trim()}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy === "add" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Aggiungi
        </button>
      </section>

      {/* Assets list */}
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Asset ({assets.length})</h2>
        {assets.length === 0 && <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">Nessun asset. Aggiungine uno per iniziare.</p>}
        {assets.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">{a.category}</span>
              <span className="ml-2 text-xs text-muted-foreground">{a.status} · {a._count?.evidence ?? 0} evidenze</span>
            </div>
            <button onClick={() => extract(a.id)} disabled={busy === a.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50">
              {busy === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Estrai
            </button>
          </div>
        ))}
      </section>

      {/* Distill */}
      <section>
        <button onClick={distill} disabled={busy === "distill"}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {busy === "distill" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Distilla BrandSkill
        </button>
      </section>

      {/* Manifest */}
      {skill && (
        <section className="rounded-xl border border-border p-4">
          <h2 className="mb-3 text-sm font-medium">BrandSkill v{skill.version}</h2>
          {swatches.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {swatches.map(([name, hex]) => (
                <div key={name} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1">
                  <span className="size-5 rounded" style={{ backgroundColor: hex }} />
                  <span className="text-xs text-muted-foreground">{name}: {hex}</span>
                </div>
              ))}
            </div>
          )}
          {skill.manifest.tone?.descriptors && skill.manifest.tone.descriptors.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {skill.manifest.tone.descriptors.map((d) => <span key={d} className="rounded-full bg-muted px-2 py-0.5 text-xs">{d}</span>)}
            </div>
          )}
          {skill.manifest.imagery?.style && <p className="mb-2 text-sm"><span className="text-muted-foreground">Imagery:</span> {skill.manifest.imagery.style}</p>}
          {skill.manifest.summary && <p className="text-sm leading-relaxed">{skill.manifest.summary}</p>}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verifica build/tsc** — `cd mvp && npx tsc --noEmit 2>&1 | grep -E "brand/(page|brand-workspace)"` → nessun errore nei nuovi file (errori pre-esistenti altrove ignorabili).

- [ ] **Step 4: Commit**

```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add "mvp/src/app/progetti/[id]/brand"
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brand): Brand Workspace UI (upload/extract/distill/manifest)"
```

---

## Task 7: Integrazione finale + suite verde

- [ ] **Step 1: Full suite** — `cd mvp && npx dotenv -e .env.test -- npx vitest run` → tutti i test PASS (esistenti + nuovi brand).
- [ ] **Step 2: Type check F2.2** — `cd mvp && npx tsc --noEmit 2>&1 | grep -E "lib/brand/|brand/(assets|extract|distill|skill)|progetti/\[id\]/brand"` → nessun errore nei file F2.2 (riallinea se ne emergono).
- [ ] **Step 3: Commit eventuali residui** — se restano modifiche: `git add -A mvp && git commit -m "test(brand): full suite green for brand layer"`.

---

## Note per l'esecutore
- **Modelli LLM**: `BRAND_VISION_MODEL` e `BRAND_DISTILL_MODEL` sono costanti con default `"gpt-5.5"` — verificare l'id esatto contro `docs/strategy/2026-05-20-modelli-ai-reference.md` e l'effettiva disponibilità sul provider del tenant. I test mockano l'LLM, quindi il nome non influenza i test.
- **Firma `logLlmCall`** (verificata): `{ tenantId, projectId, operation, provider, model, inputTokens?, outputTokens? }`.
- **Storage inline**: gli asset salvano `content` (testo / data URL / URL) nel DB. Migrazione a R2 è follow-up noto (come per audio/sources). Non caricare immagini enormi in DB nei test.
- **`migrate dev`**: flusso standard (niente pgvector qui). Usare sempre `.env.test` (non esiste `.env`).
- **Mock OpenAI**: usare la forma classe `class { chat = { completions: { create: mockCreate } } }` (type-safe, niente `this` implicit-any — lezione da F2.1).
- **`requireRole`**: write su Admin/Editor; il GET di `skill` resta accessibile a chi è autenticato nel tenant (read). Se serve restringere, allineare come fatto per `content/retrieve`.
