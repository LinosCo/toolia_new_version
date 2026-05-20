# Fase 2.5 — Media Pipeline preservation-first (MVP) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps con checkbox (`- [ ]`).

**Goal:** Pipeline media con **preservation-first** come cuore: genera immagini da prompt (Mode A) e **modifica foto reali preservandone l'identità** (Mode B) con **identity-preservation check** automatico (vision compara sorgente vs output; sotto soglia → rejected). MVP cablato su OpenAI (`images.generate`/`images.edit` + vision), storage dataURL inline, provider premium (Flux/Gemini) e Mode C/D come follow-up — la **cascade e lo storage sono astratti** così si innestano dopo senza riscrivere.

**Architecture:** `MediaAsset` model (mode/prompt/source/output/identity-check/status). Libreria `src/lib/media/`: `identity-check.ts` (vision compare → {preserved, confidence}), `generate.ts` (cascade per mode; Mode A = `images.generate`, Mode B = `images.edit` + identity check). API `/api/projects/[id]/media/generate` (+ list). UI pannello media nell'area Content. Pattern riusati: `generate-poi-image` (images.generate→dataURL), `analyze-planimetria` (vision `image_url`), `AudioAsset` (storage dataURL), `getTenantApiKey`/`logLlmCall`/rbac. Async inline + `maxDuration`. **Identity check OBBLIGATORIO per Mode B** (e C in futuro).

**Tech Stack:** Next.js 16, React 19, TS strict, Prisma 7, OpenAI SDK v6 (`images.generate`/`images.edit`/`toFile`/vision), Zod v4, Vitest 4 (`fileParallelism:false`).

---

## File Structure

| File | Responsabilità |
|---|---|
| `mvp/prisma/schema.prisma` (mod) | `MediaAsset` + `MediaMode`/`MediaStatus` + relazione Project |
| `mvp/prisma/migrations/<ts>_media_asset/migration.sql` (auto, **rimuovere DROP HNSW**) | tabella media_assets |
| `mvp/src/lib/media/identity-check.ts` | `checkIdentityPreservation()` — vision compare |
| `mvp/src/lib/media/generate.ts` | `generateMedia()` — cascade Mode A/B + storage |
| `mvp/src/app/api/projects/[id]/media/generate/route.ts` | POST genera+persiste |
| `mvp/src/app/api/projects/[id]/media/route.ts` | GET lista |
| `mvp/src/app/progetti/[id]/content/media-panel.tsx` + tab in `content-tabs.tsx` | UI |
| test corrispondenti + `test/helpers/prisma.ts` (resetDb) |  |

---

## Task 1: Schema `MediaAsset` + migrazione

**Files:** mod `prisma/schema.prisma`; migrazione; mod `test/helpers/prisma.ts`; Test `test/lib/media/schema.test.ts`.

- [ ] **Step 1** — In `prisma/schema.prisma` (in fondo):
```prisma
enum MediaMode {
  GENERATION
  PRESERVATION_EDIT
  STYLE_TRANSFER
  LAYOUT
}

enum MediaStatus {
  pending
  generating
  ready
  failed
  rejected
}

model MediaAsset {
  id             String      @id @default(cuid())
  projectId      String      @map("project_id")
  tenantId       String      @map("tenant_id")
  mode           MediaMode
  prompt         String?     @db.Text
  sourceUrl      String?     @db.Text @map("source_url")
  outputUrl      String?     @db.Text @map("output_url")
  model          String?
  status         MediaStatus @default(pending)
  identityScore  Float?      @map("identity_score")
  identityPassed Boolean?    @map("identity_passed")
  identityNotes  String?     @map("identity_notes")
  error          String?
  createdAt      DateTime    @default(now()) @map("created_at")
  updatedAt      DateTime    @updatedAt @map("updated_at")
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@index([projectId, status])
  @@map("media_assets")
}
```
Aggiungere a `Project`: `mediaAssets MediaAsset[]`.

- [ ] **Step 2** — `npx dotenv -e .env.test -- npx prisma migrate dev --name media_asset --create-only`

- [ ] **Step 3** — ⚠️ Aprire la `migration.sql`; se contiene `DROP INDEX "content_embeddings_embedding_idx";`, **RIMUOVERLA** (gotcha pgvector ricorrente, vedi piano F2.1).

- [ ] **Step 4** — `npx dotenv -e .env.test -- npx prisma migrate dev` (applica+genera). Verificare HNSW: `npx dotenv -e .env.test -- node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});(async()=>{await c.connect();const r=await c.query(\"SELECT 1 FROM pg_indexes WHERE indexname='content_embeddings_embedding_idx'\");console.log(r.rowCount===1?'HNSW OK':'HNSW MISSING');await c.end();})()"` → `HNSW OK` (se MISSING, restore migration con `CREATE INDEX IF NOT EXISTS ... USING hnsw (embedding vector_cosine_ops)` + `migrate deploy`).

- [ ] **Step 5** — In `test/helpers/prisma.ts` `resetDb()`, aggiungere prima di `project`:
```typescript
  await prisma.mediaAsset.deleteMany();
```

- [ ] **Step 6** — Create `test/lib/media/schema.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../helpers/prisma";

describe("MediaAsset schema", () => {
  beforeEach(async () => { await resetDb(); });
  it("stores a preservation-edit asset with identity check fields", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const m = await prisma.mediaAsset.create({
      data: { projectId: project.id, tenantId, mode: "PRESERVATION_EDIT", prompt: "schiarisci", sourceUrl: "data:...", outputUrl: "data:...", status: "ready", identityScore: 0.9, identityPassed: true },
    });
    expect(m.mode).toBe("PRESERVATION_EDIT");
    expect(m.identityPassed).toBe(true);
    expect(m.status).toBe("ready");
  });
});
```

- [ ] **Step 7** — `npx dotenv -e .env.test -- npx vitest run test/lib/media/schema.test.ts` → PASS (1).

- [ ] **Step 8** — Commit:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/prisma/schema.prisma mvp/prisma/migrations mvp/src/generated/prisma mvp/test/helpers/prisma.ts mvp/test/lib/media/schema.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(media): MediaAsset schema + migration"
```

---

## Task 2: `checkIdentityPreservation()` (vision compare)

**Files:** Create `src/lib/media/identity-check.ts`; Test `test/lib/media/identity-check.test.ts`.

- [ ] **Step 1: Test** — Create `test/lib/media/identity-check.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockCreate = vi.fn();
vi.mock("openai", () => ({ default: class { chat = { completions: { create: mockCreate } }; } }));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { checkIdentityPreservation, IDENTITY_THRESHOLD } from "@/lib/media/identity-check";

const ctx = { tenantId: "t", projectId: "p", sourceUrl: "data:image/png;base64,AAA", outputUrl: "data:image/png;base64,BBB" };

describe("checkIdentityPreservation", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getTenantApiKey).mockResolvedValue("sk-test"); });

  it("passes when preserved and confidence >= threshold", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ preserved: true, confidence: 0.92, notes: "ok" }) } }], usage: { prompt_tokens: 50 } });
    const r = await checkIdentityPreservation(ctx);
    expect(r.passed).toBe(true);
    expect(r.confidence).toBeCloseTo(0.92);
  });

  it("fails when preserved=false", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ preserved: false, confidence: 0.95, notes: "cambiato luogo" }) } }], usage: {} });
    const r = await checkIdentityPreservation(ctx);
    expect(r.passed).toBe(false);
  });

  it("fails when confidence below threshold", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ preserved: true, confidence: 0.5, notes: "incerto" }) } }], usage: {} });
    const r = await checkIdentityPreservation(ctx);
    expect(r.passed).toBe(false);
    expect(IDENTITY_THRESHOLD).toBe(0.7);
  });

  it("sends BOTH images to the vision model", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ preserved: true, confidence: 0.8 }) } }], usage: {} });
    await checkIdentityPreservation(ctx);
    const msgs = mockCreate.mock.calls[0][0].messages;
    const imageParts = JSON.stringify(msgs).match(/image_url/g) ?? [];
    expect(imageParts.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implementare** — Create `src/lib/media/identity-check.ts`:
```typescript
import OpenAI from "openai";
import { z } from "zod";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";

// Modello vision per il check identità. Verificare id contro modelli-ai-reference (gemini-3-1-pro / claude-opus-4-7 i primary; gpt-4o cablabile su OpenAI).
export const IDENTITY_CHECK_MODEL = "gpt-4o";
export const IDENTITY_THRESHOLD = 0.7;

const schema = z.object({ preserved: z.boolean(), confidence: z.number().min(0).max(1), notes: z.string().optional() });

export interface IdentityResult { passed: boolean; preserved: boolean; confidence: number; notes?: string }

const SYSTEM = `Sei un revisore di fedeltà visiva. Ti vengono date due immagini: SORGENTE (foto reale del cliente) e OUTPUT (versione modificata).
Verifica che l'OUTPUT PRESERVI l'identità: stessi luoghi/edifici/prodotti/persone, stesse proporzioni e disposizione; NON deve aver inventato o sostituito elementi reali. Modifiche di luce/colore/stile sono OK; cambi di soggetto/struttura NO.
Restituisci JSON {"preserved": boolean, "confidence": 0..1, "notes": string}.`;

export async function checkIdentityPreservation(args: {
  tenantId: string; projectId: string; sourceUrl: string; outputUrl: string;
}): Promise<IdentityResult> {
  const apiKey = await getTenantApiKey(args.tenantId, "openai");
  if (!apiKey) throw new Error("OpenAI API key non configurata per il tenant");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: IDENTITY_CHECK_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: [
        { type: "text", text: "SORGENTE:" },
        { type: "image_url", image_url: { url: args.sourceUrl, detail: "high" } },
        { type: "text", text: "OUTPUT:" },
        { type: "image_url", image_url: { url: args.outputUrl, detail: "high" } },
      ] as never },
    ],
  });

  await logLlmCall({
    tenantId: args.tenantId, projectId: args.projectId, operation: "media_identity_check",
    provider: "openai", model: IDENTITY_CHECK_MODEL,
    inputTokens: completion.usage?.prompt_tokens ?? 0, outputTokens: completion.usage?.completion_tokens ?? 0,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { preserved?: boolean; confidence?: number; notes?: string } = {};
  try { parsed = schema.parse(JSON.parse(raw)); } catch { return { passed: false, preserved: false, confidence: 0, notes: "check non valutabile" }; }

  const preserved = parsed.preserved === true;
  const confidence = parsed.confidence ?? 0;
  return { passed: preserved && confidence >= IDENTITY_THRESHOLD, preserved, confidence, notes: parsed.notes };
}
```

- [ ] **Step 4: Run** → PASS (4).

- [ ] **Step 5: Commit**:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/lib/media/identity-check.ts mvp/test/lib/media/identity-check.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(media): identity-preservation check (vision compare, threshold 0.7)"
```

---

## Task 3: `generateMedia()` — cascade Mode A (generate) + Mode B (edit + identity)

**Files:** Create `src/lib/media/generate.ts`; Test `test/lib/media/generate.test.ts`.

- [ ] **Step 1: Test** — Create `test/lib/media/generate.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGenerate = vi.fn();
const mockEdit = vi.fn();
vi.mock("openai", () => ({
  default: class { images = { generate: mockGenerate, edit: mockEdit }; },
  toFile: vi.fn(async () => ({ name: "f.png" })),
}));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));
vi.mock("@/lib/media/identity-check", () => ({ checkIdentityPreservation: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { checkIdentityPreservation } from "@/lib/media/identity-check";
import { generateMedia } from "@/lib/media/generate";

const base = { tenantId: "t", projectId: "p" };

describe("generateMedia", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(getTenantApiKey).mockResolvedValue("sk-test"); });

  it("Mode A (GENERATION): returns a data URL, status ready, no identity check", async () => {
    mockGenerate.mockResolvedValue({ data: [{ b64_json: "AAA" }] });
    const r = await generateMedia({ ...base, mode: "GENERATION", prompt: "un'illustrazione" });
    expect(r.status).toBe("ready");
    expect(r.outputUrl).toMatch(/^data:image\/png;base64,/);
    expect(checkIdentityPreservation).not.toHaveBeenCalled();
  });

  it("Mode B (PRESERVATION_EDIT): edits, runs identity check, ready when passed", async () => {
    mockEdit.mockResolvedValue({ data: [{ b64_json: "BBB" }] });
    vi.mocked(checkIdentityPreservation).mockResolvedValue({ passed: true, preserved: true, confidence: 0.9, notes: "ok" });
    const r = await generateMedia({ ...base, mode: "PRESERVATION_EDIT", prompt: "schiarisci", sourceUrl: "data:image/png;base64,SRC" });
    expect(mockEdit).toHaveBeenCalled();
    expect(checkIdentityPreservation).toHaveBeenCalled();
    expect(r.status).toBe("ready");
    expect(r.identityPassed).toBe(true);
  });

  it("Mode B: status REJECTED when identity check fails", async () => {
    mockEdit.mockResolvedValue({ data: [{ b64_json: "BBB" }] });
    vi.mocked(checkIdentityPreservation).mockResolvedValue({ passed: false, preserved: false, confidence: 0.4, notes: "cambiato" });
    const r = await generateMedia({ ...base, mode: "PRESERVATION_EDIT", prompt: "x", sourceUrl: "data:image/png;base64,SRC" });
    expect(r.status).toBe("rejected");
    expect(r.identityPassed).toBe(false);
    expect(r.outputUrl).toBeTruthy(); // l'output esiste comunque, ma marcato rejected
  });

  it("Mode B without sourceUrl throws", async () => {
    await expect(generateMedia({ ...base, mode: "PRESERVATION_EDIT", prompt: "x" })).rejects.toThrow();
  });

  it("cascade: falls back to the next model when the first generate throws", async () => {
    mockGenerate.mockRejectedValueOnce(new Error("model down")).mockResolvedValueOnce({ data: [{ b64_json: "AAA" }] });
    const r = await generateMedia({ ...base, mode: "GENERATION", prompt: "x" });
    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(r.status).toBe("ready");
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implementare** — Create `src/lib/media/generate.ts`:
```typescript
import OpenAI, { toFile } from "openai";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import { checkIdentityPreservation } from "@/lib/media/identity-check";

type Mode = "GENERATION" | "PRESERVATION_EDIT" | "STYLE_TRANSFER" | "LAYOUT";

// Cascade modelli — verificare id contro modelli-ai-reference. Premium (Flux/Gemini) = follow-up (nuovi provider).
export const GEN_MODELS = ["gpt-image-2", "dall-e-3"];
export const EDIT_MODELS = ["gpt-image-2"];

export interface GenerateArgs {
  tenantId: string; projectId: string; mode: Mode; prompt?: string; sourceUrl?: string;
}
export interface GenerateResult {
  outputUrl: string | null; model: string | null; status: "ready" | "rejected" | "failed";
  identityPassed?: boolean; identityScore?: number; identityNotes?: string; error?: string;
}

function dataUrl(b64: string): string { return `data:image/png;base64,${b64}`; }

function dataUrlToBuffer(url: string): Buffer {
  const b64 = url.includes(",") ? url.split(",")[1] : url;
  return Buffer.from(b64, "base64");
}

export async function generateMedia(args: GenerateArgs): Promise<GenerateResult> {
  const apiKey = await getTenantApiKey(args.tenantId, "openai");
  if (!apiKey) throw new Error("OpenAI API key non configurata per il tenant");
  const client = new OpenAI({ apiKey });

  if (args.mode === "STYLE_TRANSFER" || args.mode === "LAYOUT") {
    return { outputUrl: null, model: null, status: "failed", error: "mode_not_yet_supported" };
  }
  if (args.mode === "PRESERVATION_EDIT" && !args.sourceUrl) {
    throw new Error("PRESERVATION_EDIT richiede sourceUrl");
  }

  // --- Mode A: generation cascade ---
  if (args.mode === "GENERATION") {
    let lastErr: unknown;
    for (const model of GEN_MODELS) {
      try {
        const res = await client.images.generate({ model, prompt: args.prompt ?? "", size: "1024x1024" } as never);
        const b64 = res.data?.[0]?.b64_json;
        if (!b64) throw new Error("no_image");
        await logLlmCall({ tenantId: args.tenantId, projectId: args.projectId, operation: "media_generate", provider: "openai", model });
        return { outputUrl: dataUrl(b64), model, status: "ready" };
      } catch (e) { lastErr = e; }
    }
    return { outputUrl: null, model: null, status: "failed", error: lastErr instanceof Error ? lastErr.message : "generation_failed" };
  }

  // --- Mode B: preservation edit + identity check ---
  let lastErr: unknown;
  for (const model of EDIT_MODELS) {
    try {
      const file = await toFile(dataUrlToBuffer(args.sourceUrl!), "source.png", { type: "image/png" });
      const res = await client.images.edit({ model, image: file, prompt: args.prompt ?? "" } as never);
      const b64 = res.data?.[0]?.b64_json;
      if (!b64) throw new Error("no_image");
      const outputUrl = dataUrl(b64);
      await logLlmCall({ tenantId: args.tenantId, projectId: args.projectId, operation: "media_edit", provider: "openai", model });

      const identity = await checkIdentityPreservation({ tenantId: args.tenantId, projectId: args.projectId, sourceUrl: args.sourceUrl!, outputUrl });
      return {
        outputUrl, model,
        status: identity.passed ? "ready" : "rejected",
        identityPassed: identity.passed, identityScore: identity.confidence, identityNotes: identity.notes,
      };
    } catch (e) { lastErr = e; }
  }
  return { outputUrl: null, model: null, status: "failed", error: lastErr instanceof Error ? lastErr.message : "edit_failed" };
}
```

- [ ] **Step 4: Run** → PASS (5).

- [ ] **Step 5: Commit**:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/lib/media/generate.ts mvp/test/lib/media/generate.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(media): generateMedia cascade (Mode A generate + Mode B edit+identity)"
```

---

## Task 4: API `media/generate` (+ list)

**Files:** Create `src/app/api/projects/[id]/media/generate/route.ts`, `src/app/api/projects/[id]/media/route.ts`; Test `test/api/media-generate.test.ts`.

- [ ] **Step 1: Test** — Create `test/api/media-generate.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
vi.mock("@/lib/media/generate", () => ({ generateMedia: vi.fn() }));
import { getSessionUser } from "@/lib/rbac";
import { generateMedia } from "@/lib/media/generate";

describe("POST /api/projects/[id]/media/generate", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("persists a MediaAsset and returns it (Mode A)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(generateMedia).mockResolvedValue({ outputUrl: "data:image/png;base64,AAA", model: "gpt-image-2", status: "ready" });

    const { POST } = await import("@/app/api/projects/[id]/media/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ mode: "GENERATION", prompt: "x" }) }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.asset.status).toBe("ready");
    const stored = await prisma.mediaAsset.findUnique({ where: { id: body.asset.id } });
    expect(stored?.outputUrl).toContain("base64");
  });

  it("persists rejected status when identity fails (Mode B)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(generateMedia).mockResolvedValue({ outputUrl: "data:image/png;base64,BBB", model: "gpt-image-2", status: "rejected", identityPassed: false, identityScore: 0.4, identityNotes: "cambiato" });

    const { POST } = await import("@/app/api/projects/[id]/media/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ mode: "PRESERVATION_EDIT", prompt: "x", sourceUrl: "data:image/png;base64,SRC" }) }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).asset.status).toBe("rejected");
  });

  it("400 invalid body (PRESERVATION_EDIT without sourceUrl)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/media/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ mode: "PRESERVATION_EDIT", prompt: "x" }) }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(400);
  });

  it("404 cross-tenant", async () => {
    const { userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId: "other", role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/media/generate/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ mode: "GENERATION", prompt: "x" }) }) as never, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implementare generate route** — `src/app/api/projects/[id]/media/generate/route.ts`:
```typescript
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { generateMedia } from "@/lib/media/generate";

export const maxDuration = 300;

const Body = z.object({
  mode: z.enum(["GENERATION", "PRESERVATION_EDIT", "STYLE_TRANSFER", "LAYOUT"]),
  prompt: z.string().optional(),
  sourceUrl: z.string().optional(),
}).refine((b) => b.mode !== "PRESERVATION_EDIT" || !!b.sourceUrl, { message: "sourceUrl required for PRESERVATION_EDIT" });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

    const result = await generateMedia({ tenantId: user.tenantId, projectId: project.id, ...parsed.data });

    const asset = await prisma.mediaAsset.create({
      data: {
        projectId: project.id, tenantId: user.tenantId,
        mode: parsed.data.mode, prompt: parsed.data.prompt, sourceUrl: parsed.data.sourceUrl,
        outputUrl: result.outputUrl, model: result.model, status: result.status,
        identityScore: result.identityScore, identityPassed: result.identityPassed, identityNotes: result.identityNotes,
        error: result.error,
      },
    });
    return Response.json({ asset });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implementare list route** — `src/app/api/projects/[id]/media/route.ts`:
```typescript
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });
    const assets = await prisma.mediaAsset.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, mode: true, prompt: true, outputUrl: true, status: true, identityPassed: true, identityScore: true, identityNotes: true, createdAt: true },
    });
    return Response.json({ assets });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run** → PASS (4).

- [ ] **Step 6: Commit**:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add "mvp/src/app/api/projects/[id]/media" mvp/test/api/media-generate.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(media): media generate + list API (persists identity check)"
```

---

## Task 5: UI — pannello Media (tab nell'area Content)

**Obiettivo UX**: nuova tab **Media** in `content-tabs.tsx`. Pannello: scelta modalità (Genera da prompt / Modifica preservando), campo prompt, (per Mode B) campo per incollare una **data URL immagine sorgente**, bottone Genera. Risultato: l'immagine generata + **badge identity** (✓ verde "identità preservata {score}%" / ✗ destructive "rifiutato — {notes}"). Stati loading/error. Chiama le route reali. Usa i token del design system (R0): `bg-brand`/gradient CTA, `border-border`, `rounded-xl`, `bg-destructive/[0.06]`.

**Files:** Create `src/app/progetti/[id]/content/media-panel.tsx`; mod `content-tabs.tsx` (aggiungere tab "Media").

- [ ] **Step 1**: Create `src/app/progetti/[id]/content/media-panel.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Loader2, ImagePlus, Check, X } from "lucide-react";

interface MediaResult { id: string; mode: string; outputUrl: string | null; status: string; identityPassed?: boolean | null; identityScore?: number | null; identityNotes?: string | null }

export function MediaPanel({ projectId }: { projectId: string }) {
  const [mode, setMode] = useState<"GENERATION" | "PRESERVATION_EDIT">("GENERATION");
  const [prompt, setPrompt] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MediaResult | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    if (mode === "PRESERVATION_EDIT" && !sourceUrl.trim()) { setError("Per la modifica serve un'immagine sorgente (data URL)."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/media/generate`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, prompt, ...(mode === "PRESERVATION_EDIT" ? { sourceUrl } : {}) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "errore");
      setResult((await res.json()).asset);
    } catch (err) { setError(err instanceof Error ? err.message : "Errore di generazione"); } finally { setLoading(false); }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Media</h2>
      <form onSubmit={generate} className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="rounded-lg border border-border bg-background px-2 py-2 text-sm">
            <option value="GENERATION">Genera da prompt</option>
            <option value="PRESERVATION_EDIT">Modifica preservando (foto reale)</option>
          </select>
        </div>
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Descrivi l'immagine o la modifica…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground/30" />
        {mode === "PRESERVATION_EDIT" && (
          <textarea value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} rows={2}
            placeholder="Incolla la data URL dell'immagine sorgente (data:image/...;base64,...)"
            className="w-full rounded-lg border border-border bg-background p-2 text-xs font-mono outline-none focus:ring-1 focus:ring-foreground/30" />
        )}
        <button type="submit" disabled={loading || !prompt.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Genera
        </button>
      </form>

      {error && <p className="rounded-md bg-destructive/[0.06] px-3 py-2 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="rounded-xl border border-border p-4">
          {result.status === "rejected" && (
            <p className="mb-2 flex items-center gap-1.5 text-sm text-destructive"><X className="size-4" /> Identità non preservata{result.identityScore != null ? ` (${Math.round(result.identityScore * 100)}%)` : ""}{result.identityNotes ? ` — ${result.identityNotes}` : ""}</p>
          )}
          {result.status === "ready" && result.identityPassed && (
            <p className="mb-2 flex items-center gap-1.5 text-sm text-emerald-600"><Check className="size-4" /> Identità preservata{result.identityScore != null ? ` (${Math.round(result.identityScore * 100)}%)` : ""}</p>
          )}
          {result.status === "failed" && <p className="mb-2 text-sm text-destructive">Generazione fallita.</p>}
          {result.outputUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.outputUrl} alt={result.prompt ?? "media"} className={`max-h-96 w-auto rounded-lg border border-border ${result.status === "rejected" ? "opacity-60" : ""}`} />
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2**: In `content-tabs.tsx`, importare `MediaPanel` e aggiungere una tab `{ key: "media", label: "Media", desc: "Genera e modifica immagini" }`, renderizzando `<MediaPanel projectId={projectId} />` quando attiva. Mantenere le tab esistenti (Studio/Genera/Calendario).

- [ ] **Step 3: tsc** — `cd mvp && npx tsc --noEmit 2>&1 | grep -E "content/(media-panel|content-tabs)" || echo "no TS error"`.

- [ ] **Step 4: Commit**:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add "mvp/src/app/progetti/[id]/content"
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(media): media panel UI (generate/preserve + identity badge)"
```

---

## Task 6: Integrazione finale

- [ ] **Step 1**: Full suite — `cd mvp && npx dotenv -e .env.test -- npx vitest run` → tutti PASS.
- [ ] **Step 2**: tsc F2.5 — `cd mvp && npx tsc --noEmit 2>&1 | grep -E "lib/media/|content/media-panel|api/projects/\[id\]/media" || echo "no new TS errors"`.
- [ ] **Step 3**: HNSW ancora `HNSW OK`.
- [ ] **Step 4**: Commit residui + (controller) push.

---

## Note per l'esecutore
- **HNSW gotcha** (Task 1): rimuovere il `DROP INDEX content_embeddings_embedding_idx` dalla migrazione generata; verificare l'indice.
- **Modelli immagine**: `GEN_MODELS`/`EDIT_MODELS`/`IDENTITY_CHECK_MODEL` sono costanti; verificare gli id esatti contro `docs/strategy/2026-05-20-modelli-ai-reference.md`. I test mockano OpenAI, quindi i nomi non influenzano i test. La route esistente `generate-poi-image` usa ancora `gpt-image-1.5` → questo MVP usa `gpt-image-2`; allineare la vecchia route è retrofit separato.
- **`images.edit` input**: la sorgente è una dataURL → convertita a Buffer → `toFile()` (OpenAI SDK). In test `toFile` e `images.edit` sono mockati.
- **Storage**: dataURL inline su `MediaAsset.outputUrl` (stopgap, come `AudioAsset`). `outputUrl` accetta anche un URL R2 in futuro (swap non-breaking).
- **Mock OpenAI**: forma classe; per le immagini il mock espone `images.generate`/`images.edit` (+ named export `toFile`).
- **FOLLOW-UP (non in questo MVP)**: Mode C (style transfer) + Mode D (Puppeteer layout); provider premium FLUX.2 max (Replicate) e Nano Banana / Gemini image + identity check con gemini-3-1-pro (richiedono nuovi tipi di chiave `replicate`/`google` in `tenant-keys.ts`); upload R2.
- Usare sempre `.env.test`.
