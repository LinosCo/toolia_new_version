# Fase 2.4 — Content Studio (workflow editoriale + calendario) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (consigliato) o superpowers:executing-plans. Steps con checkbox (`- [ ]`).

**Goal:** Una Content Studio per gestire i `ContentDraft`: lista filtrabile, **workflow editoriale a stato singolo** con transizioni nominate e role-gated (draft → in_review → client_review → published → archived), editor del draft, e **calendario** editoriale. Migliora concretamente il content-hub di Business Tuner (che esponeva 4 macchine di stato parallele, calendario in un hub separato, editor monolitico).

**Architecture:** UNA sola macchina di stato (`ContentDraftStatus`, già pulita). Il contratto `src/lib/content/workflow.ts` (tabella transizioni role-gated) guida SIA l'enforcement API SIA i pulsanti UI (DRY). Aggiunto `scheduledAt` a `ContentDraft` per il calendario. La pagina `content` diventa a tab: **Studio** (lista, default) | **Genera** (retrieval + generate, esistenti) | **Calendario**. Riuso dei pattern Toolia già buoni: filter-pill + STATUS_LABELS/COLORS (da schede), checklist gate (da pubblica). API REST standard, auth `getSessionUser`/`requireRole`/`handleAuthError`.

**Tech Stack:** Next.js 16, React 19, TS strict, Prisma 7, Zod v4, Vitest 4 (`fileParallelism:false`), Tailwind v4 + lucide-react.

---

## File Structure

| File | Responsabilità |
|---|---|
| `mvp/prisma/schema.prisma` (mod) | `ContentDraft.scheduledAt` + index |
| `mvp/prisma/migrations/<ts>_content_draft_scheduled/migration.sql` (auto, **rimuovere DROP HNSW**) | colonna scheduled_at |
| `mvp/src/lib/content/workflow.ts` | macchina di stato: tabella transizioni + `allowedTransitions` + `canTransition` |
| `mvp/src/app/api/projects/[id]/content/drafts/route.ts` | GET lista (filtri status/format) |
| `mvp/src/app/api/projects/[id]/content/drafts/[draftId]/route.ts` | GET dettaglio + PATCH (title/body/scheduledAt/channel) |
| `mvp/src/app/api/projects/[id]/content/drafts/[draftId]/transition/route.ts` | POST transizione di stato (role-gated) |
| `mvp/src/app/progetti/[id]/content/content-tabs.tsx` | shell a tab (Studio/Genera/Calendario) |
| `mvp/src/app/progetti/[id]/content/draft-list.tsx` | lista + filtri + metriche + transizioni + editor inline |
| `mvp/src/app/progetti/[id]/content/draft-calendar.tsx` | calendario mensile per `scheduledAt` |
| `mvp/src/app/progetti/[id]/content/page.tsx` (mod) | renderizza `<ContentTabs>` |
| test corrispondenti |  |

---

## Task 1: Schema `scheduledAt` + migrazione

**Files:** mod `prisma/schema.prisma`; migrazione; Test `test/lib/content/brain/schema-scheduled.test.ts`.

- [ ] **Step 1**: In `model ContentDraft` aggiungere il campo (dopo `version`):
```prisma
  scheduledAt      DateTime?          @map("scheduled_at")
```
e l'indice (accanto agli altri `@@index`):
```prisma
  @@index([projectId, scheduledAt])
```

- [ ] **Step 2**: `npx dotenv -e .env.test -- npx prisma migrate dev --name content_draft_scheduled --create-only`

- [ ] **Step 3**: ⚠️ Aprire la `migration.sql`. Se contiene `DROP INDEX "content_embeddings_embedding_idx";` (gotcha pgvector ricorrente — vedi piano F2.1), **RIMUOVERLA**.

- [ ] **Step 4**: `npx dotenv -e .env.test -- npx prisma migrate dev` (applica + genera). Poi verificare HNSW: `npx dotenv -e .env.test -- node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});(async()=>{await c.connect();const r=await c.query(\"SELECT 1 FROM pg_indexes WHERE indexname='content_embeddings_embedding_idx'\");console.log(r.rowCount===1?'HNSW OK':'HNSW MISSING');await c.end();})()"` → `HNSW OK` (se MISSING, ricrea con `CREATE INDEX IF NOT EXISTS ... USING hnsw (embedding vector_cosine_ops)` via restore migration + `migrate deploy`).

- [ ] **Step 5**: Test — Create `test/lib/content/brain/schema-scheduled.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../../helpers/prisma";

describe("ContentDraft.scheduledAt", () => {
  beforeEach(async () => { await resetDb(); });
  it("stores a scheduledAt date", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const when = new Date("2026-06-01T09:00:00Z");
    const d = await prisma.contentDraft.create({ data: { projectId: project.id, tenantId, format: "social_post", title: "T", body: "B", scheduledAt: when } });
    expect(d.scheduledAt?.toISOString()).toBe(when.toISOString());
  });
});
```

- [ ] **Step 6**: `npx dotenv -e .env.test -- npx vitest run test/lib/content/brain/schema-scheduled.test.ts` → PASS (1).

- [ ] **Step 7**: Commit:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/prisma/schema.prisma mvp/prisma/migrations mvp/src/generated/prisma mvp/test/lib/content/brain/schema-scheduled.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(studio): ContentDraft.scheduledAt + migration"
```

---

## Task 2: Macchina di stato `workflow.ts` (il contratto)

**Files:** Create `src/lib/content/workflow.ts`; Test `test/lib/content/workflow.test.ts`.

- [ ] **Step 1: Test** — Create `test/lib/content/workflow.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { allowedTransitions, canTransition } from "@/lib/content/workflow";

describe("content workflow state machine", () => {
  it("Editor can send draft -> in_review", () => {
    expect(canTransition("Editor", "draft", "in_review")).toBe(true);
  });
  it("Editor CANNOT publish from in_review (only Reviewer/Admin)", () => {
    expect(canTransition("Editor", "in_review", "published")).toBe(false);
    expect(canTransition("Reviewer", "in_review", "published")).toBe(true);
    expect(canTransition("Admin", "in_review", "published")).toBe(true);
  });
  it("ClientEditor can request changes (client_review -> in_review) but not publish", () => {
    expect(canTransition("ClientEditor", "client_review", "in_review")).toBe(true);
    expect(canTransition("ClientEditor", "client_review", "published")).toBe(false);
  });
  it("rejects non-existent transitions", () => {
    expect(canTransition("Admin", "draft", "published")).toBe(false); // must go through in_review
    expect(canTransition("Admin", "published", "in_review")).toBe(false);
  });
  it("allowedTransitions returns role-filtered options with labels", () => {
    const opts = allowedTransitions("in_review", "Reviewer");
    const tos = opts.map((o) => o.to);
    expect(tos).toContain("published");
    expect(tos).toContain("client_review");
    expect(opts.every((o) => typeof o.label === "string" && o.label.length > 0)).toBe(true);
  });
  it("ClientViewer has no transitions", () => {
    expect(allowedTransitions("in_review", "ClientViewer")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implementare** — Create `src/lib/content/workflow.ts`:
```typescript
export type DraftStatus = "draft" | "in_review" | "client_review" | "published" | "archived";
export type Role = "Admin" | "Editor" | "Reviewer" | "ClientViewer" | "ClientEditor";

export interface Transition {
  to: DraftStatus;
  label: string;
  roles: Role[];
}

// UNA sola macchina di stato, role-gated. Guida sia l'API sia i pulsanti UI.
const TRANSITIONS: Record<DraftStatus, Transition[]> = {
  draft: [
    { to: "in_review", label: "Manda in revisione", roles: ["Admin", "Editor"] },
    { to: "archived", label: "Archivia", roles: ["Admin", "Editor"] },
  ],
  in_review: [
    { to: "client_review", label: "Manda al cliente", roles: ["Admin", "Editor", "Reviewer"] },
    { to: "published", label: "Pubblica", roles: ["Admin", "Reviewer"] },
    { to: "draft", label: "Rimanda in bozza", roles: ["Admin", "Editor"] },
    { to: "archived", label: "Archivia", roles: ["Admin", "Editor"] },
  ],
  client_review: [
    { to: "published", label: "Pubblica", roles: ["Admin", "Reviewer"] },
    { to: "in_review", label: "Richiedi modifiche", roles: ["Admin", "Editor", "Reviewer", "ClientEditor"] },
    { to: "archived", label: "Archivia", roles: ["Admin", "Editor"] },
  ],
  published: [
    { to: "archived", label: "Archivia", roles: ["Admin", "Editor"] },
  ],
  archived: [
    { to: "draft", label: "Ripristina", roles: ["Admin", "Editor"] },
  ],
};

/** Transizioni consentite da uno stato per un dato ruolo (con label per la UI). */
export function allowedTransitions(from: DraftStatus, role: Role): Transition[] {
  return (TRANSITIONS[from] ?? []).filter((t) => t.roles.includes(role));
}

/** Una transizione from→to è consentita per il ruolo? */
export function canTransition(role: Role, from: DraftStatus, to: DraftStatus): boolean {
  return allowedTransitions(from, role).some((t) => t.to === to);
}
```

- [ ] **Step 4: Run** → PASS (6).

- [ ] **Step 5: Commit**:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add mvp/src/lib/content/workflow.ts mvp/test/lib/content/workflow.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(studio): single-machine editorial workflow (role-gated transitions)"
```

---

## Task 3: API lista draft (`GET drafts`)

**Files:** Create `src/app/api/projects/[id]/content/drafts/route.ts`; Test `test/api/content-drafts-list.test.ts`.

- [ ] **Step 1: Test** — Create `test/api/content-drafts-list.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
import { getSessionUser } from "@/lib/rbac";

describe("GET /api/projects/[id]/content/drafts", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("lists drafts, filterable by status", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    await prisma.contentDraft.create({ data: { projectId: project.id, tenantId, format: "social_post", title: "A", body: "x", status: "draft" } });
    await prisma.contentDraft.create({ data: { projectId: project.id, tenantId, format: "article", title: "B", body: "y", status: "published" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });

    const { GET } = await import("@/app/api/projects/[id]/content/drafts/route");
    const all = await GET(new Request("http://x/api") as never, { params: Promise.resolve({ id: project.id }) });
    expect((await all.json()).drafts).toHaveLength(2);

    const onlyDraft = await GET(new Request("http://x/api?status=draft") as never, { params: Promise.resolve({ id: project.id }) });
    const body = await onlyDraft.json();
    expect(body.drafts).toHaveLength(1);
    expect(body.drafts[0].title).toBe("A");
  });

  it("404 cross-tenant", async () => {
    const { userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId: "other", role: "Editor" as never });
    const { GET } = await import("@/app/api/projects/[id]/content/drafts/route");
    const res = await GET(new Request("http://x/api") as never, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implementare** — Create `src/app/api/projects/[id]/content/drafts/route.ts`:
```typescript
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";

const STATUSES = new Set(["draft", "in_review", "client_review", "published", "archived"]);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    const { id } = await params;
    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const format = url.searchParams.get("format");

    const drafts = await prisma.contentDraft.findMany({
      where: {
        projectId: project.id,
        ...(status && STATUSES.has(status) ? { status: status as never } : {}),
        ...(format ? { format } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, format: true, channel: true, status: true, scheduledAt: true, verificationJson: true, updatedAt: true },
    });
    return Response.json({ drafts });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run** → PASS (2).

- [ ] **Step 5: Commit**:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add "mvp/src/app/api/projects/[id]/content/drafts/route.ts" mvp/test/api/content-drafts-list.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(studio): GET content drafts (filterable)"
```

---

## Task 4: API dettaglio/PATCH + transizione

**Files:** Create `.../drafts/[draftId]/route.ts` (GET+PATCH) e `.../drafts/[draftId]/transition/route.ts` (POST); Test `test/api/content-draft-detail.test.ts`, `test/api/content-draft-transition.test.ts`.

- [ ] **Step 1: Test detail/patch** — Create `test/api/content-draft-detail.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
import { getSessionUser } from "@/lib/rbac";

describe("content draft detail + patch", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("GET returns the full draft; PATCH updates title/body/scheduledAt", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const draft = await prisma.contentDraft.create({ data: { projectId: project.id, tenantId, format: "social_post", title: "A", body: "x" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });

    const mod = await import("@/app/api/projects/[id]/content/drafts/[draftId]/route");
    const got = await mod.GET(new Request("http://x") as never, { params: Promise.resolve({ id: project.id, draftId: draft.id }) });
    expect((await got.json()).draft.title).toBe("A");

    const when = "2026-06-01T09:00:00.000Z";
    const patched = await mod.PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ title: "A2", body: "y", scheduledAt: when }) }) as never, { params: Promise.resolve({ id: project.id, draftId: draft.id }) });
    expect(patched.status).toBe(200);
    const after = await prisma.contentDraft.findUnique({ where: { id: draft.id } });
    expect(after?.title).toBe("A2");
    expect(after?.scheduledAt?.toISOString()).toBe(when);
  });

  it("PATCH 404 cross-tenant", async () => {
    const { userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId: "other", role: "Editor" as never });
    const mod = await import("@/app/api/projects/[id]/content/drafts/[draftId]/route");
    const res = await mod.PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ title: "z" }) }) as never, { params: Promise.resolve({ id: "nope", draftId: "nope" }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implementare** — Create `src/app/api/projects/[id]/content/drafts/[draftId]/route.ts`:
```typescript
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";

async function findDraft(projectId: string, draftId: string, tenantId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, tenantId }, select: { id: true } });
  if (!project) return null;
  return prisma.contentDraft.findFirst({ where: { id: draftId, projectId, tenantId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; draftId: string }> }) {
  try {
    const user = await getSessionUser();
    const { id, draftId } = await params;
    const draft = await findDraft(id, draftId, user.tenantId);
    if (!draft) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ draft });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}

const PatchBody = z.object({
  title: z.string().min(1).optional(),
  body: z.string().optional(),
  channel: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; draftId: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id, draftId } = await params;
    const draft = await findDraft(id, draftId, user.tenantId);
    if (!draft) return Response.json({ error: "not_found" }, { status: 404 });

    const parsed = PatchBody.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

    const { scheduledAt, ...rest } = parsed.data;
    const updated = await prisma.contentDraft.update({
      where: { id: draft.id },
      data: { ...rest, ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}) },
    });
    return Response.json({ draft: updated });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run** → PASS (2).

- [ ] **Step 5: Test transition** — Create `test/api/content-draft-transition.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ getSessionUser: vi.fn(), requireRole: vi.fn(), handleAuthError: vi.fn().mockReturnValue(null) }));
import { getSessionUser } from "@/lib/rbac";

async function setup(role: string, status: string) {
  const { tenantId, userId } = await seedTenantAndUser();
  const prisma = getTestPrisma();
  const project = await prisma.project.create({ data: { tenantId, name: "P" } });
  const draft = await prisma.contentDraft.create({ data: { projectId: project.id, tenantId, format: "social_post", title: "A", body: "x", status: status as never } });
  vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: role as never });
  return { prisma, project, draft };
}

describe("POST content draft transition", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("Editor: draft -> in_review (200)", async () => {
    const { prisma, project, draft } = await setup("Editor", "draft");
    const { POST } = await import("@/app/api/projects/[id]/content/drafts/[draftId]/transition/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ to: "in_review" }) }) as never, { params: Promise.resolve({ id: project.id, draftId: draft.id }) });
    expect(res.status).toBe(200);
    const after = await prisma.contentDraft.findUnique({ where: { id: draft.id } });
    expect(after?.status).toBe("in_review");
  });

  it("Editor: in_review -> published is FORBIDDEN (403), status unchanged", async () => {
    const { prisma, project, draft } = await setup("Editor", "in_review");
    const { POST } = await import("@/app/api/projects/[id]/content/drafts/[draftId]/transition/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ to: "published" }) }) as never, { params: Promise.resolve({ id: project.id, draftId: draft.id }) });
    expect(res.status).toBe(403);
    const after = await prisma.contentDraft.findUnique({ where: { id: draft.id } });
    expect(after?.status).toBe("in_review");
  });

  it("400 on invalid target status", async () => {
    const { project, draft } = await setup("Admin", "draft");
    const { POST } = await import("@/app/api/projects/[id]/content/drafts/[draftId]/transition/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ to: "nonsense" }) }) as never, { params: Promise.resolve({ id: project.id, draftId: draft.id }) });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 6: Implementare** — Create `src/app/api/projects/[id]/content/drafts/[draftId]/transition/route.ts`:
```typescript
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { canTransition, type DraftStatus, type Role } from "@/lib/content/workflow";

const Body = z.object({ to: z.enum(["draft", "in_review", "client_review", "published", "archived"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string; draftId: string }> }) {
  try {
    const user = await getSessionUser();
    const { id, draftId } = await params;

    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });
    const draft = await prisma.contentDraft.findFirst({ where: { id: draftId, projectId: id, tenantId: user.tenantId }, select: { id: true, status: true } });
    if (!draft) return Response.json({ error: "not_found" }, { status: 404 });

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "invalid_target" }, { status: 400 });

    if (!canTransition(user.role as Role, draft.status as DraftStatus, parsed.data.to)) {
      return Response.json({ error: "transition_forbidden", from: draft.status, to: parsed.data.to }, { status: 403 });
    }

    const updated = await prisma.contentDraft.update({ where: { id: draft.id }, data: { status: parsed.data.to } });
    return Response.json({ draft: { id: updated.id, status: updated.status } });
  } catch (err) {
    const a = handleAuthError(err); if (a) return a;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 7: Run** entrambi i test (`content-draft-detail.test.ts content-draft-transition.test.ts`) → PASS (5).

- [ ] **Step 8: Commit**:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add "mvp/src/app/api/projects/[id]/content/drafts" mvp/test/api/content-draft-detail.test.ts mvp/test/api/content-draft-transition.test.ts
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(studio): draft detail/PATCH + role-gated transition API"
```

---

## Task 5: UI — Content Studio (tab + lista + transizioni + editor inline)

**Obiettivo UX**: la pagina `content` diventa a tab: **Studio** (default) | **Genera** | **Calendario**. Lo Studio mostra: barra metriche (conteggi per stato), **filter pill** per stato (Tutte/Bozza/In revisione/Al cliente/Pubblicata/Archiviata), e una lista di draft-card con: pill di stato colorata, formato, badge di verifica (✓/✗ da `verificationJson`), data programmata, e **pulsanti di transizione nominati role-aware** (da `allowedTransitions`). Click su una card → editor inline (title/body/scheduledAt) con salvataggio PATCH. Migliora BT: una sola macchina di stato, transizioni come azioni chiare, niente navigazione a pagina piena.

**Files:** Create `content-tabs.tsx`, `draft-list.tsx`; modify `content/page.tsx`.

- [ ] **Step 1: Tab shell** — Create `src/app/progetti/[id]/content/content-tabs.tsx`:
```tsx
"use client";

import { useState } from "react";
import { RetrievalPlayground } from "./retrieval-playground";
import { GeneratePanel } from "./generate-panel";
import { DraftList } from "./draft-list";
import { DraftCalendar } from "./draft-calendar";

const TABS = [
  { key: "studio", label: "Studio", desc: "Gestisci i contenuti e il loro stato" },
  { key: "genera", label: "Genera", desc: "Crea nuovi contenuti dalla KB" },
  { key: "calendario", label: "Calendario", desc: "Pianifica le pubblicazioni" },
] as const;

export function ContentTabs({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("studio");
  return (
    <div>
      <nav className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} title={t.desc}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "studio" && <DraftList projectId={projectId} />}
      {tab === "genera" && (
        <div className="space-y-8">
          <RetrievalPlayground projectId={projectId} />
          <GeneratePanel projectId={projectId} />
        </div>
      )}
      {tab === "calendario" && <DraftCalendar projectId={projectId} />}
    </div>
  );
}
```

- [ ] **Step 2: Draft list** — Create `src/app/progetti/[id]/content/draft-list.tsx`:
```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Check, X, Calendar as CalIcon } from "lucide-react";

type Status = "draft" | "in_review" | "client_review" | "published" | "archived";
interface DraftRow { id: string; title: string; format: string; status: Status; scheduledAt: string | null; verificationJson: { passed?: boolean } | null; updatedAt: string }

const STATUS_LABEL: Record<Status, string> = { draft: "Bozza", in_review: "In revisione", client_review: "Al cliente", published: "Pubblicata", archived: "Archiviata" };
const STATUS_COLOR: Record<Status, string> = {
  draft: "bg-muted text-foreground",
  in_review: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  client_review: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  archived: "bg-muted text-muted-foreground",
};
const FILTERS: Array<{ key: Status | "all"; label: string }> = [
  { key: "all", label: "Tutte" }, { key: "draft", label: "Bozza" }, { key: "in_review", label: "In revisione" },
  { key: "client_review", label: "Al cliente" }, { key: "published", label: "Pubblicata" }, { key: "archived", label: "Archiviata" },
];

interface TransitionOpt { to: Status; label: string }
// mirror minimale di allowedTransitions per la UI (l'API resta la fonte di verità + enforcement)
const NEXT: Record<Status, TransitionOpt[]> = {
  draft: [{ to: "in_review", label: "Manda in revisione" }, { to: "archived", label: "Archivia" }],
  in_review: [{ to: "client_review", label: "Manda al cliente" }, { to: "published", label: "Pubblica" }, { to: "draft", label: "Rimanda in bozza" }],
  client_review: [{ to: "published", label: "Pubblica" }, { to: "in_review", label: "Richiedi modifiche" }],
  published: [{ to: "archived", label: "Archivia" }],
  archived: [{ to: "draft", label: "Ripristina" }],
};

export function DraftList({ projectId }: { projectId: string }) {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/projects/${projectId}/content/drafts${q}`);
      if (res.ok) setDrafts((await res.json()).drafts);
    } catch { setError("Errore di caricamento"); } finally { setLoading(false); }
  }, [projectId, filter]);

  useEffect(() => { load(); }, [load]);

  async function transition(id: string, to: Status) {
    setBusy(id); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/content/drafts/${id}/transition`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to }),
      });
      if (!res.ok) throw new Error((await res.json()).error === "transition_forbidden" ? "Transizione non consentita per il tuo ruolo" : "Errore");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Errore"); } finally { setBusy(null); }
  }

  const counts = drafts.reduce<Record<string, number>>((acc, d) => { acc[d.status] = (acc[d.status] ?? 0) + 1; return acc; }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f.key ? "bg-brand text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {f.label}{f.key !== "all" && counts[f.key] ? ` (${counts[f.key]})` : ""}
          </button>
        ))}
      </div>

      {error && <p className="rounded-md bg-destructive/[0.06] px-3 py-2 text-sm text-destructive">{error}</p>}
      {loading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Caricamento…</p>}

      {!loading && drafts.length === 0 && (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nessun contenuto. Vai su <b>Genera</b> per crearne uno.
        </p>
      )}

      <ul className="space-y-2">
        {drafts.map((d) => (
          <li key={d.id} className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[d.status]}`}>{STATUS_LABEL[d.status]}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{d.format}</span>
                  {d.verificationJson?.passed === true && <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="size-3" /> verificato</span>}
                  {d.verificationJson?.passed === false && <span className="inline-flex items-center gap-1 text-xs text-destructive"><X className="size-3" /> da rivedere</span>}
                  {d.scheduledAt && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalIcon className="size-3" /> {new Date(d.scheduledAt).toLocaleDateString("it-IT")}</span>}
                </div>
                <h3 className="truncate text-sm font-medium">{d.title}</h3>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                {NEXT[d.status].map((t) => (
                  <button key={t.to} onClick={() => transition(d.id, t.to)} disabled={busy === d.id}
                    className="rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50">
                    {busy === d.id ? <Loader2 className="size-3 animate-spin" /> : t.label}
                  </button>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```
> Nota: i pulsanti UI mostrano le transizioni *possibili dallo stato*; l'**API** applica il controllo ruolo reale (`canTransition`) e risponde 403 se il ruolo non è autorizzato (il messaggio viene mostrato). Questo tiene l'enforcement sul server senza duplicare la matrice ruoli nel client.

- [ ] **Step 3: Page** — Modify `src/app/progetti/[id]/content/page.tsx` per renderizzare `<ContentTabs projectId={id} />` al posto del contenuto attuale (mantenendo l'header):
```tsx
import { ContentTabs } from "./content-tabs";

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Content Engine</h1>
        <p className="mt-1 text-sm text-muted-foreground">Genera, gestisci e pianifica i contenuti del progetto.</p>
      </header>
      <ContentTabs projectId={id} />
    </main>
  );
}
```

- [ ] **Step 4: tsc** — `cd mvp && npx tsc --noEmit 2>&1 | grep -E "content/(content-tabs|draft-list|page)"` → nessun errore nei nuovi file. (Nota: `draft-calendar` viene creato nel Task 6; per far compilare `content-tabs` ora, creare uno stub temporaneo `draft-calendar.tsx` che esporta `export function DraftCalendar(_:{projectId:string}){return null;}` — verrà completato nel Task 6.)

- [ ] **Step 5: Commit**:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add "mvp/src/app/progetti/[id]/content"
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(studio): Content Studio tabs + draft list with role-gated transitions"
```

---

## Task 6: UI — Calendario editoriale

**Obiettivo UX**: tab Calendario = griglia mensile; i draft con `scheduledAt` appaiono nel giorno corrispondente (pill colorata per stato). Navigazione mese precedente/successivo. MVP: posizionamento statico (no drag). Click su un item → (per ora) nessuna azione o tooltip titolo. Sostituisce lo stub del Task 5.

**Files:** Create/replace `src/app/progetti/[id]/content/draft-calendar.tsx`.

- [ ] **Step 1: Implementare** — Create `src/app/progetti/[id]/content/draft-calendar.tsx`:
```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type Status = "draft" | "in_review" | "client_review" | "published" | "archived";
interface DraftRow { id: string; title: string; status: Status; scheduledAt: string | null }

const DOT: Record<Status, string> = {
  draft: "bg-muted-foreground", in_review: "bg-amber-500", client_review: "bg-blue-500", published: "bg-emerald-500", archived: "bg-muted-foreground",
};
const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export function DraftCalendar({ projectId }: { projectId: string }) {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/content/drafts`);
      if (res.ok) setDrafts(((await res.json()).drafts as DraftRow[]).filter((d) => d.scheduledAt));
    } finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => {
    const map: Record<string, DraftRow[]> = {};
    for (const d of drafts) {
      if (!d.scheduledAt) continue;
      const k = new Date(d.scheduledAt).toDateString();
      (map[k] ??= []).push(d);
    }
    return map;
  }, [drafts]);

  // Griglia: lunedì come primo giorno.
  const cells = useMemo(() => {
    const year = cursor.getFullYear(), month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // 0=lun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium capitalize">{monthLabel}</h2>
        <div className="flex gap-1">
          <button onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} className="rounded-lg border border-border p-1.5 hover:bg-muted"><ChevronLeft className="size-4" /></button>
          <button onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} className="rounded-lg border border-border p-1.5 hover:bg-muted"><ChevronRight className="size-4" /></button>
        </div>
      </div>

      {loading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Caricamento…</p>}

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {WEEKDAYS.map((w) => <div key={w} className="bg-background px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">{w}</div>)}
        {cells.map((date, i) => {
          const items = date ? (byDay[date.toDateString()] ?? []) : [];
          const isToday = date && date.toDateString() === new Date().toDateString();
          return (
            <div key={i} className="min-h-[84px] bg-background p-1.5">
              {date && (
                <>
                  <div className={`mb-1 text-[11px] ${isToday ? "font-semibold text-brand" : "text-muted-foreground"}`}>{date.getDate()}</div>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((it) => (
                      <div key={it.id} title={it.title} className="flex items-center gap-1 truncate rounded bg-muted px-1 py-0.5 text-[10px]">
                        <span className={`size-1.5 shrink-0 rounded-full ${DOT[it.status]}`} />
                        <span className="truncate">{it.title}</span>
                      </div>
                    ))}
                    {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3}</div>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: tsc** — `cd mvp && npx tsc --noEmit 2>&1 | grep -E "content/draft-calendar"` → nessun errore.

- [ ] **Step 3: Commit**:
```bash
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee add "mvp/src/app/progetti/[id]/content/draft-calendar.tsx"
git -C /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee commit -m "feat(studio): editorial calendar (monthly view by scheduledAt)"
```

---

## Task 7: Integrazione finale

- [ ] **Step 1: Full suite** — `cd mvp && npx dotenv -e .env.test -- npx vitest run` → tutti PASS.
- [ ] **Step 2: Type check F2.4** — `cd mvp && npx tsc --noEmit 2>&1 | grep -E "lib/content/workflow|content/drafts|content/(content-tabs|draft-list|draft-calendar)"` → nessun errore nei file F2.4.
- [ ] **Step 3: HNSW** ancora `HNSW OK` (snippet Task 1 Step 4).
- [ ] **Step 4: Commit residui + (controller) push.**

---

## Note per l'esecutore
- **HNSW gotcha** (Task 1): rimuovere il `DROP INDEX content_embeddings_embedding_idx` dalla migrazione generata; verificare l'indice dopo.
- **Workflow = fonte di verità**: la matrice ruoli vive in `src/lib/content/workflow.ts`; l'API la applica (403 se non consentito). La UI mostra le transizioni possibili-dallo-stato e si affida al 403 dell'API per il controllo ruolo (no duplicazione della matrice ruoli nel client). Se in futuro si vuole nascondere i pulsanti per ruolo, esporre `allowedTransitions` via un endpoint o passare il ruolo al client.
- **`requireRole`**: PATCH e (implicito) transition gestiti via workflow; il GET lista/dettaglio è leggibile da chi è autenticato nel tenant.
- **Editor inline**: il Task 5 mostra la lista + transizioni; l'editing di title/body è via PATCH (Task 4). Un editor ricco (TipTap) è enhancement futuro — per ora basta il PATCH (può essere esteso con un textarea inline se serve in fase di rifinitura UI).
- **Calendario**: posizionamento statico per data; drag-and-drop e set di `scheduledAt` da UI sono enhancement (il PATCH supporta già `scheduledAt`).
- Usare sempre `.env.test`. Mock OpenAI forma classe (non serve qui — niente LLM in F2.4).
