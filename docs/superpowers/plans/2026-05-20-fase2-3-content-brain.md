# Fase 2.3 — Content Brain (orchestratore a 4 strati) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) o superpowers:executing-plans. Steps con checkbox (`- [ ]`).

**Goal:** Il cuore di Content Tuner: un cervello di produzione a **4 strati** (assemblaggio contesto → pianificazione sistemica → produttori verticali → gate di verifica) che fonde le fonti disponibili in Toolia (KB/RAG, BrandSkill, tension map, lente, narratore, brief) e produce un `ContentDraft` ancorato e on-brand, con un loop di critica mirato. Tutto realmente funzionante e testato.

**Architecture:** Generalizza il pattern "tutto-in-un-prompt" di `generate-scheda` in 4 unità isolate e testabili. Strato 0 (`context.ts`) assembla il contesto dalle fonti reali. Strato 1 (`planner.ts`) ragiona PRIMA di scrivere → `ContentPlan`. Strato 2 (`producers.ts`) = registro di produttori per formato. Strato 3 (`verifier.ts`) = controllo **deterministico** (copertura mustTell + assenza avoid). L'orchestratore (`orchestrator.ts`) wira 0→1→2→3 con UN loop di correzione mirato e persiste il `ContentDraft`. Gli input BT (ProjectTip, performance, signals) e la Craft Library NON esistono ancora in Toolia: lasciati come **hook pluggabili** (campi opzionali del context + commenti), non costruiti. LLM nativo OpenAI, `response_format json_object`, `getTenantApiKey`+`logLlmCall`, async inline+`maxDuration`.

**Tech Stack:** Next.js 16, React 19, TS strict, Prisma 7 (`@prisma/adapter-pg`, generator `prisma-client` → `@/generated/prisma`), OpenAI SDK nativo, Zod v4, Vitest 4 (`fileParallelism:false`).

---

## File Structure

| File | Responsabilità |
|---|---|
| `mvp/prisma/schema.prisma` (mod) | `ContentDraft` + `ContentDraftStatus` + relazione su `Project` |
| `mvp/prisma/migrations/<ts>_content_draft/migration.sql` (auto, **rimuovere DROP HNSW**) | tabella content_drafts |
| `mvp/src/lib/content/brain/types.ts` | contratti: ContentRequest, ContentContext, ContentPlan (zod), GeneratedArtifact, VerificationResult |
| `mvp/src/lib/content/brain/context.ts` | Strato 0 — `assembleContentContext()` |
| `mvp/src/lib/content/brain/planner.ts` | Strato 1 — `planContent()` |
| `mvp/src/lib/content/brain/producers.ts` | Strato 2 — registro + `produceArtifact()` |
| `mvp/src/lib/content/brain/verifier.ts` | Strato 3 — `verifyArtifact()` (deterministico) |
| `mvp/src/lib/content/brain/orchestrator.ts` | `generateContent()` — wira + loop + persist |
| `mvp/src/app/api/projects/[id]/content/generate/route.ts` | POST genera contenuto |
| `mvp/src/app/progetti/[id]/content/generate-panel.tsx` + mod `content/page.tsx` | UI generazione |
| test corrispondenti + `test/helpers/prisma.ts` (mod resetDb) | test |

---

## Task 1: Schema `ContentDraft` + migrazione (rimuovere DROP HNSW)

**Files:** mod `prisma/schema.prisma`; migrazione; mod `test/helpers/prisma.ts`; Test `test/lib/content/brain/schema.test.ts`.

- [ ] **Step 1: enum + model in `prisma/schema.prisma` (in fondo)**

```prisma
enum ContentDraftStatus {
  draft
  in_review
  client_review
  published
  archived
}

model ContentDraft {
  id               String             @id @default(cuid())
  projectId        String             @map("project_id")
  tenantId         String             @map("tenant_id")
  format           String
  channel          String?
  lensId           String?            @map("lens_id")
  narratorId       String?            @map("narrator_id")
  language         String             @default("it")
  title            String
  body             String             @db.Text
  status           ContentDraftStatus @default(draft)
  planJson         Json               @default("{}") @map("plan_json")
  verificationJson Json               @default("{}") @map("verification_json")
  citationsJson    Json               @default("[]") @map("citations_json")
  model            String?
  version          Int                @default(1)
  createdAt        DateTime           @default(now()) @map("created_at")
  updatedAt        DateTime           @updatedAt @map("updated_at")
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@index([projectId, status])
  @@map("content_drafts")
}
```

- [ ] **Step 2: relazione inversa su `Project`** — aggiungere:
```prisma
  contentDrafts ContentDraft[]
```

- [ ] **Step 3: generare la migrazione**
`npx dotenv -e .env.test -- npx prisma migrate dev --name content_draft --create-only`

- [ ] **Step 4: ⚠️ rimuovere il DROP spurio dell'indice HNSW**
Aprire la `migration.sql` generata. Se contiene `DROP INDEX "content_embeddings_embedding_idx";` (Prisma lo rigenera perché non vede la colonna vettoriale `Unsupported`), **rimuovere quella riga** (e il suo commento `-- DropIndex`). Lasciare eventuali altri DROP legittimi. Questo è il gotcha ricorrente documentato nel piano F2.1.

- [ ] **Step 5: applicare** `npx dotenv -e .env.test -- npx prisma migrate dev` → applica + genera client. Poi verificare che l'indice esista ancora: `npx dotenv -e .env.test -- node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});(async()=>{await c.connect();const r=await c.query(\"SELECT 1 FROM pg_indexes WHERE indexname='content_embeddings_embedding_idx'\");console.log(r.rowCount===1?'HNSW OK':'HNSW MISSING');await c.end();})()"` → deve stampare `HNSW OK`. Se MISSING, ricrearlo: `CREATE INDEX IF NOT EXISTS "content_embeddings_embedding_idx" ON "content_embeddings" USING hnsw (embedding vector_cosine_ops);` via una migrazione di restore.

- [ ] **Step 6: `resetDb()` in `test/helpers/prisma.ts`** — aggiungere prima di `project`:
```typescript
  await prisma.contentDraft.deleteMany();
```

- [ ] **Step 7: Test** — Create `test/lib/content/brain/schema.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../../helpers/prisma";

describe("content_drafts schema", () => {
  beforeEach(async () => { await resetDb(); });

  it("creates a draft with plan/verification json", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const d = await prisma.contentDraft.create({
      data: { projectId: project.id, tenantId, format: "social_post", language: "it", title: "T", body: "B", planJson: { coreMessage: "x" }, verificationJson: { passed: true }, citationsJson: ["e1"] },
    });
    expect(d.status).toBe("draft");
    expect((d.planJson as { coreMessage: string }).coreMessage).toBe("x");
  });
});
```

- [ ] **Step 8: Run** `npx dotenv -e .env.test -- npx vitest run test/lib/content/brain/schema.test.ts` → PASS (1).

- [ ] **Step 9: Commit**
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/prisma/schema.prisma mvp/prisma/migrations mvp/src/generated/prisma mvp/test/helpers/prisma.ts mvp/test/lib/content/brain/schema.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brain): ContentDraft schema + migration"
```

---

## Task 2: Contratti (`types.ts`)

**Files:** Create `src/lib/content/brain/types.ts`; Test `test/lib/content/brain/types.test.ts`.

- [ ] **Step 1: Test** — Create `test/lib/content/brain/types.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { contentPlanSchema } from "@/lib/content/brain/types";

describe("contentPlanSchema", () => {
  it("accepts a valid plan", () => {
    const r = contentPlanSchema.safeParse({
      coreMessage: "msg", angle: "angolo", structure: ["intro", "corpo"],
      mustCover: ["fatto A"], avoid: ["tema X"], successCriterion: "chiarezza", citations: ["e1"],
    });
    expect(r.success).toBe(true);
  });
  it("defaults citations to [] and requires coreMessage", () => {
    const r = contentPlanSchema.safeParse({ coreMessage: "m", angle: "a", structure: [], mustCover: [], avoid: [], successCriterion: "s" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.citations).toEqual([]);
  });
  it("rejects missing coreMessage", () => {
    expect(contentPlanSchema.safeParse({ angle: "a" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implementare** — Create `src/lib/content/brain/types.ts`:
```typescript
import { z } from "zod";
import type { RetrievalHit } from "@/lib/content/retrieval";
import type { BrandSkillManifest } from "@/lib/brand/manifest";

export interface ContentRequest {
  projectId: string;
  tenantId: string;
  format: string;          // es. "social_post" | "article"
  channel?: string;
  topic: string;           // di cosa parla il contenuto (guida la RAG)
  lensId?: string;
  narratorId?: string;
  language?: string;       // default "it"
}

export interface TensionContext {
  mustTell: { title: string; why: string }[];
  avoid: { topic: string; reason: string }[];
  verify: { claim: string; status: string }[];
}

export interface ContentContext {
  facts: RetrievalHit[];
  brand: BrandSkillManifest | null;
  tension: TensionContext;
  lens: { name: string; description: string; tone: string | null } | null;
  narrator: { name: string; voiceStyle: string; characterBio: string | null } | null;
  brief: { tono?: string; promessaNarrativa?: string; mustTell?: string[]; avoid?: string[] } | null;
  // HOOK pluggabili (input BT, non ancora disponibili in Toolia): tip?, performance?, signals?, craft?
}

export const contentPlanSchema = z.object({
  coreMessage: z.string().min(1),
  angle: z.string().default(""),
  structure: z.array(z.string()).default([]),
  mustCover: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
  successCriterion: z.string().default(""),
  citations: z.array(z.string()).default([]),
});
export type ContentPlan = z.infer<typeof contentPlanSchema>;

export interface GeneratedArtifact { title: string; body: string }

export interface VerificationResult {
  passed: boolean;
  mustTellCovered: string[];
  mustTellMissing: string[];
  avoidViolations: string[];
}
```

- [ ] **Step 4: Run** → PASS (3).

- [ ] **Step 5: Commit**
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/lib/content/brain/types.ts mvp/test/lib/content/brain/types.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brain): brain contracts (context, plan, artifact, verification)"
```

---

## Task 3: Strato 0 — `assembleContentContext()`

**Files:** Create `src/lib/content/brain/context.ts`; Test `test/lib/content/brain/context.test.ts`.

- [ ] **Step 1: Test** — Create `test/lib/content/brain/context.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../../helpers/prisma";

vi.mock("@/lib/content/retrieval", () => ({ retrieveContent: vi.fn() }));
vi.mock("@/lib/brand/skill", () => ({ getCurrentBrandSkill: vi.fn() }));

import { retrieveContent } from "@/lib/content/retrieval";
import { getCurrentBrandSkill } from "@/lib/brand/skill";
import { assembleContentContext } from "@/lib/content/brain/context";

describe("assembleContentContext", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("gathers facts, brand, tension, lens, narrator, brief", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    await prisma.narrativeTension.create({ data: {
      projectId: project.id,
      mustTellJson: [{ title: "Affresco incompiuto", why: "domanda ricorrente", sourceIds: [] }],
      niceToTellJson: [], avoidJson: [{ topic: "prezzi", reason: "non pertinente" }], verifyJson: [], tensionsJson: [],
    } });
    const lens = await prisma.editorialLens.create({ data: { projectId: project.id, name: "Storico", description: "taglio storico", tone: "autorevole" } });
    const narrator = await prisma.narratorProfile.create({ data: { projectId: project.id, name: "Guida", kind: "backbone", voiceStyle: "caldo" } });
    await prisma.brief.create({ data: { projectId: project.id, contenutoJson: { tono: "evocativo", promessaNarrativa: "emozione", mustTell: ["storia"], avoid: ["tecnicismi"] } } });

    vi.mocked(retrieveContent).mockResolvedValue([{ id: "f1", sourceType: "KB_FACT", sourceId: "k1", chunkIndex: 0, content: "fatto", similarity: 0.9 }]);
    vi.mocked(getCurrentBrandSkill).mockResolvedValue({ id: "s1", version: 1, manifest: { tone: { descriptors: ["caldo"], citations: [] } } });

    const ctx = await assembleContentContext({ projectId: project.id, tenantId, format: "social_post", topic: "affresco", lensId: lens.id, narratorId: narrator.id });

    expect(ctx.facts).toHaveLength(1);
    expect(ctx.brand?.tone?.descriptors).toContain("caldo");
    expect(ctx.tension.mustTell[0].title).toBe("Affresco incompiuto");
    expect(ctx.tension.avoid[0].topic).toBe("prezzi");
    expect(ctx.lens?.name).toBe("Storico");
    expect(ctx.narrator?.name).toBe("Guida");
    expect(ctx.brief?.tono).toBe("evocativo");
    expect(retrieveContent).toHaveBeenCalledWith(expect.objectContaining({ tenantId, projectId: project.id, query: "affresco" }));
  });

  it("works with no lens/narrator/tension/brief (nulls/empties)", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(retrieveContent).mockResolvedValue([]);
    vi.mocked(getCurrentBrandSkill).mockResolvedValue(null);

    const ctx = await assembleContentContext({ projectId: project.id, tenantId, format: "article", topic: "x" });
    expect(ctx.facts).toEqual([]);
    expect(ctx.brand).toBeNull();
    expect(ctx.tension.mustTell).toEqual([]);
    expect(ctx.lens).toBeNull();
    expect(ctx.narrator).toBeNull();
    expect(ctx.brief).toBeNull();
  });
});
```
> Verificare i nomi reali dei campi `NarrativeTension`/`EditorialLens`/`NarratorProfile`/`Brief` in `schema.prisma` e allineare la seed se necessario.

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implementare** — Create `src/lib/content/brain/context.ts`:
```typescript
import { prisma } from "@/lib/db";
import { retrieveContent } from "@/lib/content/retrieval";
import { getCurrentBrandSkill } from "@/lib/brand/skill";
import type { BrandSkillManifest } from "@/lib/brand/manifest";
import type { ContentContext, ContentRequest, TensionContext } from "@/lib/content/brain/types";

export async function assembleContentContext(req: ContentRequest): Promise<ContentContext> {
  const [facts, brand, tensionRow, lensRow, narratorRow, briefRow] = await Promise.all([
    retrieveContent({ tenantId: req.tenantId, projectId: req.projectId, query: req.topic, topK: 8 }),
    getCurrentBrandSkill(req.projectId),
    prisma.narrativeTension.findUnique({ where: { projectId: req.projectId } }),
    req.lensId ? prisma.editorialLens.findFirst({ where: { id: req.lensId, projectId: req.projectId } }) : Promise.resolve(null),
    req.narratorId ? prisma.narratorProfile.findFirst({ where: { id: req.narratorId, projectId: req.projectId } }) : Promise.resolve(null),
    prisma.brief.findUnique({ where: { projectId: req.projectId } }),
  ]);

  const tension: TensionContext = {
    mustTell: ((tensionRow?.mustTellJson as { title: string; why: string }[] | undefined) ?? []).map((m) => ({ title: m.title, why: m.why })),
    avoid: ((tensionRow?.avoidJson as { topic: string; reason: string }[] | undefined) ?? []).map((a) => ({ topic: a.topic, reason: a.reason })),
    verify: ((tensionRow?.verifyJson as { claim: string; status: string }[] | undefined) ?? []).map((v) => ({ claim: v.claim, status: v.status })),
  };

  const briefJson = (briefRow?.contenutoJson as Record<string, unknown> | undefined) ?? null;
  const brief = briefJson
    ? {
        tono: briefJson.tono as string | undefined,
        promessaNarrativa: briefJson.promessaNarrativa as string | undefined,
        mustTell: briefJson.mustTell as string[] | undefined,
        avoid: briefJson.avoid as string[] | undefined,
      }
    : null;

  return {
    facts,
    brand: (brand?.manifest as BrandSkillManifest | undefined) ?? null,
    tension,
    lens: lensRow ? { name: lensRow.name, description: lensRow.description, tone: lensRow.tone ?? null } : null,
    narrator: narratorRow ? { name: narratorRow.name, voiceStyle: narratorRow.voiceStyle, characterBio: narratorRow.characterBio ?? null } : null,
    brief,
  };
}
```

- [ ] **Step 4: Run** → PASS (2).

- [ ] **Step 5: Commit**
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/lib/content/brain/context.ts mvp/test/lib/content/brain/context.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brain): Strato 0 — assembleContentContext"
```

---

## Task 4: Strato 1 — `planContent()`

**Files:** Create `src/lib/content/brain/planner.ts`; Test `test/lib/content/brain/planner.test.ts`.

- [ ] **Step 1: Test** — Create `test/lib/content/brain/planner.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockCreate = vi.fn();
vi.mock("openai", () => ({ default: class { chat = { completions: { create: mockCreate } }; } }));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import { planContent } from "@/lib/content/brain/planner";
import type { ContentContext } from "@/lib/content/brain/types";

const ctx: ContentContext = {
  facts: [{ id: "f1", sourceType: "KB_FACT", sourceId: "k1", chunkIndex: 0, content: "L'affresco è incompiuto", similarity: 0.9 }],
  brand: { tone: { descriptors: ["caldo"], citations: [] } },
  tension: { mustTell: [{ title: "Affresco incompiuto", why: "domanda" }], avoid: [{ topic: "prezzi", reason: "x" }], verify: [] },
  lens: { name: "Storico", description: "d", tone: "autorevole" },
  narrator: { name: "Guida", voiceStyle: "caldo", characterBio: null },
  brief: { tono: "evocativo", mustTell: ["storia"], avoid: ["tecnicismi"] },
};

describe("planContent", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getTenantApiKey).mockResolvedValue("sk-test"); });

  it("returns a validated ContentPlan and logs usage", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ coreMessage: "Il mistero dell'affresco", angle: "domanda", structure: ["hook", "fatto", "cta"], mustCover: ["Affresco incompiuto"], avoid: ["prezzi"], successCriterion: "curiosità", citations: ["f1"] }) } }],
      usage: { prompt_tokens: 80, completion_tokens: 40 },
    });
    const plan = await planContent(ctx, { projectId: "p", tenantId: "t", format: "social_post", topic: "affresco" });
    expect(plan.coreMessage).toBe("Il mistero dell'affresco");
    expect(plan.mustCover).toContain("Affresco incompiuto");
    expect(logLlmCall).toHaveBeenCalledWith(expect.objectContaining({ operation: "brain_plan", provider: "openai" }));
  });

  it("throws when no API key", async () => {
    vi.mocked(getTenantApiKey).mockResolvedValue(null);
    await expect(planContent(ctx, { projectId: "p", tenantId: "t", format: "social_post", topic: "x" })).rejects.toThrow();
  });

  it("falls back to a minimal plan if the LLM JSON is malformed", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: "non-json" } }], usage: {} });
    const plan = await planContent(ctx, { projectId: "p", tenantId: "t", format: "social_post", topic: "affresco" });
    expect(plan.coreMessage.length).toBeGreaterThan(0); // fallback uses topic
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implementare** — Create `src/lib/content/brain/planner.ts`:
```typescript
import OpenAI from "openai";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import { contentPlanSchema, type ContentContext, type ContentPlan, type ContentRequest } from "@/lib/content/brain/types";

// Modello di ragionamento per la pianificazione. Verificare id contro modelli-ai-reference.
export const BRAIN_PLAN_MODEL = "gpt-5.5";

const SYSTEM = `Sei un content strategist. Pianifica UN contenuto PRIMA di scriverlo.
Restituisci JSON: {coreMessage, angle, structure[], mustCover[], avoid[], successCriterion, citations[]}.
- mustCover: gli elementi che DEVONO comparire (dai mustTell della tension map e del brief).
- avoid: ciò che NON deve comparire (dagli avoid).
- citations: gli id dei fatti (facts) su cui ti basi.
Non inventare: appoggiati ai fatti forniti.`;

function buildContextBlock(ctx: ContentContext): string {
  const facts = ctx.facts.map((f) => `[${f.id}] ${f.content}`).join("\n");
  const mustTell = ctx.tension.mustTell.map((m) => `- ${m.title} (${m.why})`).join("\n");
  const avoid = [...ctx.tension.avoid.map((a) => a.topic), ...(ctx.brief?.avoid ?? [])].join(", ");
  const tone = ctx.brand?.tone?.descriptors?.join(", ") ?? ctx.brief?.tono ?? "";
  return `FATTI:\n${facts || "(nessuno)"}\n\nMUST-TELL:\n${mustTell || "(nessuno)"}\n\nAVOID: ${avoid || "(nessuno)"}\nTONO: ${tone}\nLENTE: ${ctx.lens?.name ?? "-"}\nNARRATORE: ${ctx.narrator?.name ?? "-"}`;
}

export async function planContent(ctx: ContentContext, req: ContentRequest): Promise<ContentPlan> {
  const apiKey = await getTenantApiKey(req.tenantId, "openai");
  if (!apiKey) throw new Error("OpenAI API key non configurata per il tenant");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: BRAIN_PLAN_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Formato: ${req.format}. Tema: ${req.topic}.\n\n${buildContextBlock(ctx)}` },
    ],
  });

  await logLlmCall({
    tenantId: req.tenantId, projectId: req.projectId, operation: "brain_plan",
    provider: "openai", model: BRAIN_PLAN_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? 0, outputTokens: completion.usage?.completion_tokens ?? 0,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = contentPlanSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch { /* fall through */ }

  // Fallback minimale ancorato al tema + mustTell.
  return contentPlanSchema.parse({
    coreMessage: req.topic,
    mustCover: ctx.tension.mustTell.map((m) => m.title),
    avoid: ctx.tension.avoid.map((a) => a.topic),
  });
}
```

- [ ] **Step 4: Run** → PASS (3).

- [ ] **Step 5: Commit**
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/lib/content/brain/planner.ts mvp/test/lib/content/brain/planner.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brain): Strato 1 — planContent (systemic planning)"
```

---

## Task 5: Strato 2 — `produceArtifact()` + registro produttori

**Files:** Create `src/lib/content/brain/producers.ts`; Test `test/lib/content/brain/producers.test.ts`.

- [ ] **Step 1: Test** — Create `test/lib/content/brain/producers.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockCreate = vi.fn();
vi.mock("openai", () => ({ default: class { chat = { completions: { create: mockCreate } }; } }));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { produceArtifact, SUPPORTED_FORMATS } from "@/lib/content/brain/producers";
import type { ContentContext, ContentPlan } from "@/lib/content/brain/types";

const ctx: ContentContext = { facts: [], brand: null, tension: { mustTell: [], avoid: [], verify: [] }, lens: null, narrator: null, brief: null };
const plan: ContentPlan = { coreMessage: "msg", angle: "a", structure: ["x"], mustCover: ["Affresco"], avoid: ["prezzi"], successCriterion: "s", citations: [] };

describe("produceArtifact", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getTenantApiKey).mockResolvedValue("sk-test"); });

  it("lists supported formats", () => {
    expect(SUPPORTED_FORMATS).toContain("social_post");
    expect(SUPPORTED_FORMATS).toContain("article");
  });

  it("produces title+body for a known format", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ title: "Titolo", body: "Corpo con Affresco" }) } }], usage: { prompt_tokens: 10, completion_tokens: 50 } });
    const out = await produceArtifact(plan, ctx, { projectId: "p", tenantId: "t", format: "social_post", topic: "affresco" });
    expect(out.title).toBe("Titolo");
    expect(out.body).toContain("Affresco");
  });

  it("includes critique feedback on retry", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ title: "T", body: "B" }) } }], usage: {} });
    await produceArtifact(plan, ctx, { projectId: "p", tenantId: "t", format: "social_post", topic: "x" }, { mustTellMissing: ["Affresco"], avoidViolations: [] });
    const sentUser = mockCreate.mock.calls[0][0].messages.map((m: { content: string }) => m.content).join("\n");
    expect(sentUser).toContain("Affresco");
  });

  it("throws on unknown format", async () => {
    await expect(produceArtifact(plan, ctx, { projectId: "p", tenantId: "t", format: "nope", topic: "x" })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implementare** — Create `src/lib/content/brain/producers.ts`:
```typescript
import OpenAI from "openai";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import type { ContentContext, ContentPlan, ContentRequest, GeneratedArtifact, VerificationResult } from "@/lib/content/brain/types";

// Modello scrittore. Verificare id contro modelli-ai-reference (longform potrebbe usare un modello più potente).
export const BRAIN_PRODUCE_MODEL = "gpt-5.5";

interface ProducerDef { system: string }

const PRODUCERS: Record<string, ProducerDef> = {
  social_post: { system: `Sei un copywriter social. Scrivi un post breve, incisivo, hook iniziale forte. JSON {title, body}.` },
  article: { system: `Sei un redattore. Scrivi un articolo strutturato (H2 impliciti, paragrafi). JSON {title, body}.` },
};

export const SUPPORTED_FORMATS = Object.keys(PRODUCERS);

export async function produceArtifact(
  plan: ContentPlan,
  ctx: ContentContext,
  req: ContentRequest,
  critique?: Pick<VerificationResult, "mustTellMissing" | "avoidViolations">,
): Promise<GeneratedArtifact> {
  const def = PRODUCERS[req.format];
  if (!def) throw new Error(`Formato non supportato: ${req.format}`);

  const apiKey = await getTenantApiKey(req.tenantId, "openai");
  if (!apiKey) throw new Error("OpenAI API key non configurata per il tenant");

  const tone = ctx.brand?.tone?.descriptors?.join(", ") ?? ctx.brief?.tono ?? "";
  const facts = ctx.facts.map((f) => `[${f.id}] ${f.content}`).join("\n");
  const critiqueBlock = critique
    ? `\n\nCORREGGI: includi assolutamente: ${critique.mustTellMissing.join(", ") || "-"}. Rimuovi: ${critique.avoidViolations.join(", ") || "-"}.`
    : "";

  const user = `PIANO:\n${JSON.stringify(plan)}\n\nFATTI (usa SOLO questi, cita implicitamente):\n${facts || "(nessuno)"}\n\nTONO: ${tone}\nNARRATORE: ${ctx.narrator?.voiceStyle ?? "-"}\nLingua: ${req.language ?? "it"}.${critiqueBlock}`;

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: BRAIN_PRODUCE_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [{ role: "system", content: def.system }, { role: "user", content: user }],
  });

  await logLlmCall({
    tenantId: req.tenantId, projectId: req.projectId, operation: "brain_produce",
    provider: "openai", model: BRAIN_PRODUCE_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? 0, outputTokens: completion.usage?.completion_tokens ?? 0,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { title?: unknown; body?: unknown } = {};
  try { parsed = JSON.parse(raw); } catch { /* keep empty */ }
  return {
    title: typeof parsed.title === "string" ? parsed.title : req.topic,
    body: typeof parsed.body === "string" ? parsed.body : "",
  };
}
```

- [ ] **Step 4: Run** → PASS (4).

- [ ] **Step 5: Commit**
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/lib/content/brain/producers.ts mvp/test/lib/content/brain/producers.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brain): Strato 2 — produceArtifact + producer registry"
```

---

## Task 6: Strato 3 — `verifyArtifact()` (deterministico)

**Files:** Create `src/lib/content/brain/verifier.ts`; Test `test/lib/content/brain/verifier.test.ts`.

- [ ] **Step 1: Test** — Create `test/lib/content/brain/verifier.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { verifyArtifact } from "@/lib/content/brain/verifier";
import type { ContentContext, GeneratedArtifact } from "@/lib/content/brain/types";

const baseCtx: ContentContext = {
  facts: [], brand: null,
  tension: { mustTell: [{ title: "Affresco incompiuto", why: "x" }], avoid: [{ topic: "prezzi", reason: "y" }], verify: [] },
  lens: null, narrator: null, brief: null,
};

describe("verifyArtifact", () => {
  it("passes when mustTell covered and no avoid violation", () => {
    const art: GeneratedArtifact = { title: "T", body: "Parliamo dell'affresco incompiuto della sala." };
    const r = verifyArtifact(art, baseCtx);
    expect(r.passed).toBe(true);
    expect(r.mustTellCovered).toContain("Affresco incompiuto");
    expect(r.mustTellMissing).toHaveLength(0);
  });

  it("fails when a mustTell is missing", () => {
    const art: GeneratedArtifact = { title: "T", body: "Un testo che non parla del tema chiave." };
    const r = verifyArtifact(art, baseCtx);
    expect(r.passed).toBe(false);
    expect(r.mustTellMissing).toContain("Affresco incompiuto");
  });

  it("fails when an avoid topic appears", () => {
    const art: GeneratedArtifact = { title: "T", body: "Affresco incompiuto, e parliamo anche di prezzi." };
    const r = verifyArtifact(art, baseCtx);
    expect(r.passed).toBe(false);
    expect(r.avoidViolations).toContain("prezzi");
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implementare** — Create `src/lib/content/brain/verifier.ts`:
```typescript
import type { ContentContext, GeneratedArtifact, VerificationResult } from "@/lib/content/brain/types";

const STOP = new Set(["di", "del", "della", "il", "lo", "la", "le", "un", "uno", "una", "e", "che", "in", "da", "per", "con"]);

/** Parole significative (>3 char, non stopword). */
function keyTerms(s: string): string[] {
  return s.toLowerCase().split(/[^a-zàèéìòù0-9]+/i).filter((w) => w.length > 3 && !STOP.has(w));
}

/** Un mustTell è "coperto" se ALMENO metà dei suoi termini chiave compaiono nel corpo. */
function isCovered(title: string, bodyLower: string): boolean {
  const terms = keyTerms(title);
  if (terms.length === 0) return true;
  const hits = terms.filter((t) => bodyLower.includes(t)).length;
  return hits / terms.length >= 0.5;
}

export function verifyArtifact(art: GeneratedArtifact, ctx: ContentContext): VerificationResult {
  const bodyLower = `${art.title}\n${art.body}`.toLowerCase();

  const mustTellCovered: string[] = [];
  const mustTellMissing: string[] = [];
  for (const m of ctx.tension.mustTell) {
    (isCovered(m.title, bodyLower) ? mustTellCovered : mustTellMissing).push(m.title);
  }

  const avoidViolations = ctx.tension.avoid
    .map((a) => a.topic)
    .filter((topic) => topic && bodyLower.includes(topic.toLowerCase()));

  return {
    passed: mustTellMissing.length === 0 && avoidViolations.length === 0,
    mustTellCovered,
    mustTellMissing,
    avoidViolations,
  };
}
```

- [ ] **Step 4: Run** → PASS (3).

- [ ] **Step 5: Commit**
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/lib/content/brain/verifier.ts mvp/test/lib/content/brain/verifier.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brain): Strato 3 — verifyArtifact (mustTell coverage + avoid)"
```

---

## Task 7: Orchestratore — `generateContent()` (wira + loop + persist)

**Files:** Create `src/lib/content/brain/orchestrator.ts`; Test `test/lib/content/brain/orchestrator.test.ts`.

- [ ] **Step 1: Test** — Create `test/lib/content/brain/orchestrator.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../../helpers/prisma";

vi.mock("@/lib/content/brain/context", () => ({ assembleContentContext: vi.fn() }));
vi.mock("@/lib/content/brain/planner", () => ({ planContent: vi.fn() }));
vi.mock("@/lib/content/brain/producers", () => ({ produceArtifact: vi.fn(), SUPPORTED_FORMATS: ["social_post"] }));

import { assembleContentContext } from "@/lib/content/brain/context";
import { planContent } from "@/lib/content/brain/planner";
import { produceArtifact } from "@/lib/content/brain/producers";
import { generateContent } from "@/lib/content/brain/orchestrator";

const ctx = { facts: [], brand: null, tension: { mustTell: [{ title: "Affresco incompiuto", why: "x" }], avoid: [], verify: [] }, lens: null, narrator: null, brief: null };
const plan = { coreMessage: "m", angle: "a", structure: [], mustCover: ["Affresco incompiuto"], avoid: [], successCriterion: "s", citations: ["f1"] };

describe("generateContent", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); vi.mocked(assembleContentContext).mockResolvedValue(ctx as never); vi.mocked(planContent).mockResolvedValue(plan as never); });

  it("persists a ContentDraft when verification passes first try", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(produceArtifact).mockResolvedValue({ title: "T", body: "Affresco incompiuto della sala" });

    const res = await generateContent({ projectId: project.id, tenantId, format: "social_post", topic: "affresco" });

    expect(res.draft.title).toBe("T");
    expect(res.verification.passed).toBe(true);
    expect(produceArtifact).toHaveBeenCalledTimes(1);
    const stored = await prisma.contentDraft.findUnique({ where: { id: res.draft.id } });
    expect(stored?.body).toContain("Affresco");
  });

  it("retries production ONCE with critique when verification fails, then persists", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(produceArtifact)
      .mockResolvedValueOnce({ title: "T1", body: "testo senza il tema" })
      .mockResolvedValueOnce({ title: "T2", body: "ora con Affresco incompiuto" });

    const res = await generateContent({ projectId: project.id, tenantId, format: "social_post", topic: "affresco" });

    expect(produceArtifact).toHaveBeenCalledTimes(2);
    expect(vi.mocked(produceArtifact).mock.calls[1][3]).toBeTruthy(); // critique passed on retry
    expect(res.draft.body).toContain("Affresco");
    expect(res.verification.passed).toBe(true);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implementare** — Create `src/lib/content/brain/orchestrator.ts`:
```typescript
import { prisma } from "@/lib/db";
import { assembleContentContext } from "@/lib/content/brain/context";
import { planContent } from "@/lib/content/brain/planner";
import { produceArtifact, BRAIN_PRODUCE_MODEL } from "@/lib/content/brain/producers";
import { verifyArtifact } from "@/lib/content/brain/verifier";
import type { ContentRequest, VerificationResult } from "@/lib/content/brain/types";

export interface GenerateResult {
  draft: { id: string; title: string; body: string };
  verification: VerificationResult;
}

export async function generateContent(req: ContentRequest): Promise<GenerateResult> {
  const ctx = await assembleContentContext(req);
  const plan = await planContent(ctx, req);

  let artifact = await produceArtifact(plan, ctx, req);
  let verification = verifyArtifact(artifact, ctx);

  // Loop di critica mirato: UNA correzione se la verifica fallisce.
  if (!verification.passed) {
    artifact = await produceArtifact(plan, ctx, req, {
      mustTellMissing: verification.mustTellMissing,
      avoidViolations: verification.avoidViolations,
    });
    verification = verifyArtifact(artifact, ctx);
  }

  const draft = await prisma.contentDraft.create({
    data: {
      projectId: req.projectId, tenantId: req.tenantId,
      format: req.format, channel: req.channel, lensId: req.lensId, narratorId: req.narratorId,
      language: req.language ?? "it",
      title: artifact.title, body: artifact.body,
      status: "draft",
      planJson: plan as never,
      verificationJson: verification as never,
      citationsJson: plan.citations as never,
      model: BRAIN_PRODUCE_MODEL,
    },
  });

  return { draft: { id: draft.id, title: draft.title, body: draft.body }, verification };
}
```

- [ ] **Step 4: Run** → PASS (2).

- [ ] **Step 5: Commit**
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/lib/content/brain/orchestrator.ts mvp/test/lib/content/brain/orchestrator.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brain): orchestrator generateContent (4 layers + critique loop + persist)"
```

---

## Task 8: API route `generate`

**Files:** Create `src/app/api/projects/[id]/content/generate/route.ts`; Test `test/api/content-generate.test.ts`.

- [ ] **Step 1: Test** — Create `test/api/content-generate.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
vi.mock("@/lib/content/brain/orchestrator", () => ({ generateContent: vi.fn() }));
import { getSessionUser } from "@/lib/rbac";
import { generateContent } from "@/lib/content/brain/orchestrator";

describe("POST /api/projects/[id]/content/generate", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("200 with draft+verification", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(generateContent).mockResolvedValue({ draft: { id: "d1", title: "T", body: "B" }, verification: { passed: true, mustTellCovered: [], mustTellMissing: [], avoidViolations: [] } });

    const { POST } = await import("@/app/api/projects/[id]/content/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ format: "social_post", topic: "affresco" }) }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.draft.id).toBe("d1");
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({ tenantId, projectId: project.id, format: "social_post", topic: "affresco" }));
  });

  it("400 when format/topic missing", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/content/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({}) }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(400);
  });

  it("404 cross-tenant", async () => {
    const { userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId: "other", role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/content/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ format: "social_post", topic: "x" }) }) as never, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implementare** — Create `src/app/api/projects/[id]/content/generate/route.ts`:
```typescript
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { generateContent } from "@/lib/content/brain/orchestrator";

export const maxDuration = 300;

const Body = z.object({
  format: z.string().min(1),
  topic: z.string().min(1),
  channel: z.string().optional(),
  lensId: z.string().optional(),
  narratorId: z.string().optional(),
  language: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

    const result = await generateContent({ tenantId: user.tenantId, projectId: project.id, ...parsed.data });
    return Response.json(result);
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run** → PASS (3).

- [ ] **Step 5: Commit**
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add "mvp/src/app/api/projects/[id]/content/generate" mvp/test/api/content-generate.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brain): content generate API route"
```

---

## Task 9: UI — pannello di generazione

**Obiettivo UX**: nella pagina `content`, accanto al retrieval playground, un pannello "Genera contenuto": l'operatore sceglie formato + tema (+ lente/narratore opzionali), preme Genera, e vede il **piano** (core message, struttura), il **draft** (titolo + corpo) e i **badge di verifica** (mustTell coperti/mancanti in verde/rosso, avoid violati). Il "wow": *non un blob, ma un contenuto con piano e controllo qualità visibile*. Chiama la route reale del Task 8. Adattare i token al repo (vedi `retrieval-playground.tsx`: `border-border`, `rounded-xl`, `bg-brand`, `text-muted-foreground`, `bg-destructive/[0.06]`, CTA `rounded-full`).

**Files:** Create `src/app/progetti/[id]/content/generate-panel.tsx`; modify `src/app/progetti/[id]/content/page.tsx` to render it under the playground.

- [ ] **Step 1: Client component** — Create `src/app/progetti/[id]/content/generate-panel.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Loader2, Wand2, Check, X } from "lucide-react";

interface Verification { passed: boolean; mustTellCovered: string[]; mustTellMissing: string[]; avoidViolations: string[] }
interface Draft { id: string; title: string; body: string }

export function GeneratePanel({ projectId }: { projectId: string }) {
  const [format, setFormat] = useState("social_post");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true); setError(null); setDraft(null); setVerification(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/content/generate`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ format, topic }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "errore");
      const data = await res.json();
      setDraft(data.draft); setVerification(data.verification);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di generazione");
    } finally { setLoading(false); }
  }

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Genera contenuto</h2>
      <form onSubmit={generate} className="flex flex-wrap gap-2">
        <select value={format} onChange={(e) => setFormat(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-sm">
          <option value="social_post">Post social</option>
          <option value="article">Articolo</option>
        </select>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Tema (es. l'affresco incompiuto)"
          className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground/30" />
        <button type="submit" disabled={loading || !topic.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} Genera
        </button>
      </form>

      {error && <p className="rounded-md bg-destructive/[0.06] px-3 py-2 text-sm text-destructive">{error}</p>}

      {draft && (
        <article className="rounded-xl border border-border p-4">
          {verification && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {verification.mustTellCovered.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"><Check className="size-3" /> {m}</span>
              ))}
              {verification.mustTellMissing.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 rounded-full bg-destructive/[0.06] px-2 py-0.5 text-xs text-destructive"><X className="size-3" /> {m}</span>
              ))}
              {verification.avoidViolations.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 rounded-full bg-destructive/[0.06] px-2 py-0.5 text-xs text-destructive"><X className="size-3" /> avoid: {a}</span>
              ))}
            </div>
          )}
          <h3 className="mb-2 text-base font-medium">{draft.title}</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{draft.body}</p>
        </article>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Render nel page** — In `src/app/progetti/[id]/content/page.tsx`, importare e renderizzare `<GeneratePanel projectId={id} />` sotto `<RetrievalPlayground .../>`:
```tsx
import { RetrievalPlayground } from "./retrieval-playground";
import { GeneratePanel } from "./generate-panel";
// ... dentro <main>, dopo <RetrievalPlayground projectId={id} />:
//   <GeneratePanel projectId={id} />
```
(Aggiungere l'import e la riga del componente; mantenere il resto della pagina invariato.)

- [ ] **Step 3: Verifica tsc** — `cd mvp && npx tsc --noEmit 2>&1 | grep -E "content/(generate-panel|page)"` → nessun errore nei file toccati.

- [ ] **Step 4: Commit**
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add "mvp/src/app/progetti/[id]/content"
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(brain): content generate panel UI (plan + draft + verification badges)"
```

---

## Task 10: Integrazione finale

- [ ] **Step 1: Full suite** — `cd mvp && npx dotenv -e .env.test -- npx vitest run` → tutti i test PASS.
- [ ] **Step 2: Type check F2.3** — `cd mvp && npx tsc --noEmit 2>&1 | grep -E "lib/content/brain/|content/generate|content/generate-panel"` → nessun errore nei file F2.3.
- [ ] **Step 3: Verifica HNSW ancora presente** (vedi Task 1 Step 5 snippet) → `HNSW OK`.
- [ ] **Step 4: Commit eventuali residui + (controller) push.**

---

## Note per l'esecutore
- **HNSW gotcha**: Task 1 genera una migrazione che Prisma riempie con `DROP INDEX "content_embeddings_embedding_idx"`. RIMUOVERLA (vedi piano F2.1). Verificare l'indice dopo l'applicazione.
- **Modelli**: `BRAIN_PLAN_MODEL` / `BRAIN_PRODUCE_MODEL` costanti default `"gpt-5.5"` — verificare id contro `docs/strategy/2026-05-20-modelli-ai-reference.md` (il produttore longform può usare un modello più potente; il pianificatore un modello di reasoning). I test mockano l'LLM.
- **Mock OpenAI**: forma classe `class { chat = { completions: { create: mockCreate } } }`.
- **Campi reali**: verificare in `schema.prisma` i nomi dei campi `NarrativeTension` (`mustTellJson` ecc.), `EditorialLens` (`name`/`description`/`tone`), `NarratorProfile` (`voiceStyle`/`characterBio`), `Brief.contenutoJson`, e allineare seed/lib se differiscono.
- **Input BT futuri**: ProjectTip, performance, signals, Craft Library NON esistono in Toolia: lasciati come hook (commenti in `types.ts`/`context.ts`), si plugano col bridge monorepo. Non costruirli ora.
- **`requireRole`**: write Admin/Editor. Lo `status` del draft nasce `draft` (workflow review/publish è fase successiva).
- Usare sempre `.env.test`.
