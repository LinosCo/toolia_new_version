# Fase 0 — TDD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilizzare la base tecnica di Toolia Studio in 1-2 settimane: fix sicurezza, API keys server-side, async hardening, bug fixes minori, cost tracking LLM per progetto. Niente cambio architetturale, solo solidificazione.

**Architecture:**
- Tutte le modifiche sono additive o sostitutive di singoli moduli esistenti (no refactor strutturale)
- Test framework introdotto qui (Vitest) per supportare le fasi successive
- Ogni sotto-progetto è auto-contenuto e mergiabile separatamente
- Database test isolato via `DATABASE_URL_TEST`

**Tech Stack additions:**
- **Vitest 3.x** per unit + integration testing
- **@vitest/coverage-v8** per coverage report
- **dotenv-cli** per environment switching test/dev

**Prerequisites of execution:**
- Branch: `feat/fase-0-stabilizzazione` (creare con `git checkout -b feat/fase-0-stabilizzazione`)
- Database test: container Postgres locale separato (`postgres:16-alpine` su porta 5433)
- Env file `.env.test` con `DATABASE_URL` puntato al DB test

---

## Task 0: Setup testing foundation

**Why:** Tutta la Fase 0 si appoggia su Vitest. Da fare per primo.

**Files:**
- Modify: `mvp/package.json`
- Create: `mvp/vitest.config.ts`, `mvp/test/setup.ts`, `mvp/test/helpers/prisma.ts`, `mvp/.env.test`

- [ ] **Step 0.1: Aggiungere dipendenze test al package.json**

Esegui:
```bash
cd mvp
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom dotenv-cli
```

Aspettati: nessun errore, package-lock.json aggiornato.

- [ ] **Step 0.2: Creare `mvp/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    env: {
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**", "src/app/api/**"],
      exclude: ["**/*.d.ts", "**/generated/**"],
    },
    poolOptions: {
      threads: {
        singleThread: true, // evita race su Prisma client
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 0.3: Creare `mvp/test/setup.ts`**

```typescript
import { beforeAll, afterAll } from "vitest";
import { config } from "dotenv";

config({ path: ".env.test", quiet: true });

beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error(
      "DATABASE_URL must contain 'test' in name. Refusing to run tests on non-test DB.",
    );
  }
});

afterAll(() => {
  // pulizia globale se necessario
});
```

- [ ] **Step 0.4: Creare `mvp/test/helpers/prisma.ts`**

```typescript
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let testClient: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!testClient) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL not set");
    testClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  return testClient;
}

export async function resetDb(): Promise<void> {
  const prisma = getTestPrisma();
  // ordine inverso di dipendenza per evitare FK violations
  await prisma.audioAsset.deleteMany();
  await prisma.scheda.deleteMany();
  await prisma.familyMission.deleteMany();
  await prisma.assistantQA.deleteMany();
  await prisma.path.deleteMany();
  await prisma.narratorProfile.deleteMany();
  await prisma.editorialLens.deleteMany();
  await prisma.driverPersonaWeight.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.projectDriverConfig.deleteMany();
  await prisma.kBFact.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.source.deleteMany();
  await prisma.brief.deleteMany();
  await prisma.mapAnchor.deleteMany();
  await prisma.pOI.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.theme.deleteMany();
  await prisma.job.deleteMany();
  await prisma.project.deleteMany();
  await prisma.clientEntity.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

export async function seedTenantAndUser(): Promise<{ tenantId: string; userId: string }> {
  const prisma = getTestPrisma();
  const tenant = await prisma.tenant.create({
    data: { name: "Test Tenant", settingsJson: {} },
  });
  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      tenantId: tenant.id,
      role: "Admin",
    },
  });
  return { tenantId: tenant.id, userId: user.id };
}
```

- [ ] **Step 0.5: Creare `mvp/.env.test`**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/toolia_test
NODE_ENV=test
NEXTAUTH_SECRET=test-secret-not-for-prod
AUTH_SECRET=test-secret-not-for-prod
```

- [ ] **Step 0.6: Aggiungere script test al `package.json`**

Modifica `mvp/package.json` scripts:

```json
"scripts": {
  "dev": "next dev -p 3001",
  "build": "prisma generate && next build",
  "start": "prisma migrate deploy && next start",
  "lint": "eslint",
  "postinstall": "prisma generate",
  "test": "dotenv -e .env.test -- vitest run",
  "test:watch": "dotenv -e .env.test -- vitest",
  "test:coverage": "dotenv -e .env.test -- vitest run --coverage",
  "test:db:reset": "dotenv -e .env.test -- prisma migrate reset --force --skip-seed"
}
```

- [ ] **Step 0.7: Avviare Postgres test container**

```bash
docker run -d --name toolia-test-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=toolia_test \
  -p 5433:5432 \
  postgres:16-alpine
```

Verifica: `docker ps | grep toolia-test-db`

- [ ] **Step 0.8: Applicare schema al DB test**

```bash
cd mvp && npm run test:db:reset
```

Aspettati: `Database reset successful` + tutte le migrations applicate.

- [ ] **Step 0.9: Smoke test — scrivere un test base che passa**

Crea `mvp/test/smoke.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "./helpers/prisma";

describe("smoke", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("can seed a tenant and user", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    expect(tenantId).toBeTruthy();
    expect(userId).toBeTruthy();
    const prisma = getTestPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.tenantId).toBe(tenantId);
  });
});
```

- [ ] **Step 0.10: Eseguire il test**

```bash
cd mvp && npm run test
```

Aspettati: `1 passed`. Se fallisce, debug la connessione DB test.

- [ ] **Step 0.11: Commit**

```bash
git add mvp/package.json mvp/package-lock.json mvp/vitest.config.ts mvp/test/ mvp/.env.test
git commit -m "$(cat <<'EOF'
chore: setup Vitest testing foundation with isolated test DB

- Vitest config con alias @/, jsdom env, coverage v8
- Helpers prisma per reset + seed
- .env.test isolato, requires 'test' in DATABASE_URL
- Smoke test passa

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Sub-project 0.1 — Sicurezza & deploy hardening

### Task 0.1.a — Guard NODE_ENV su DEV_BYPASS_AUTH

**Files:**
- Modify: `mvp/src/lib/rbac.ts:48`
- Modify: `mvp/src/auth.config.ts:25`
- Test: `mvp/test/rbac.test.ts`

- [ ] **Step 1: Scrivere test fallente**

Crea `mvp/test/rbac.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("DEV_BYPASS_AUTH guards", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalBypass = process.env.DEV_BYPASS_AUTH;

  afterEach(() => {
    if (originalNodeEnv) process.env.NODE_ENV = originalNodeEnv;
    if (originalBypass !== undefined) process.env.DEV_BYPASS_AUTH = originalBypass;
    else delete process.env.DEV_BYPASS_AUTH;
    vi.resetModules();
  });

  it("authConfig.authorized returns true in dev with bypass", async () => {
    process.env.NODE_ENV = "development";
    process.env.DEV_BYPASS_AUTH = "true";
    const { authConfig } = await import("@/auth.config");
    const result = authConfig.callbacks!.authorized!({
      auth: null,
      request: { nextUrl: new URL("http://x/progetti") } as any,
    } as any);
    expect(result).toBe(true);
  });

  it("authConfig.authorized IGNORES bypass in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.DEV_BYPASS_AUTH = "true";
    vi.resetModules();
    const { authConfig } = await import("@/auth.config");
    const result = authConfig.callbacks!.authorized!({
      auth: null,
      request: { nextUrl: new URL("http://x/progetti") } as any,
    } as any);
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Eseguire test — verifica che fallisca**

```bash
cd mvp && npm run test -- rbac
```

Aspettati: secondo test fallisce con `expected true to be false`.

- [ ] **Step 3: Fix `mvp/src/auth.config.ts:25`**

Modifica la condizione bypass:

```typescript
// Vecchio:
//   if (process.env.DEV_BYPASS_AUTH === "true") return true;
// Nuovo:
authorized({ auth, request }) {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_BYPASS_AUTH === "true"
  ) return true;
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return true;
  if (PUBLIC_API_PATTERNS.some((p) => p.test(pathname))) return true;
  return !!auth?.user;
},
```

- [ ] **Step 4: Fix `mvp/src/lib/rbac.ts:48`**

Cambia la condizione `getDevBypassUser()`:

```typescript
export async function getSessionUser(): Promise<SessionUser> {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_BYPASS_AUTH === "true"
  ) {
    return getDevBypassUser();
  }
  const session = await auth();
  // ... resto invariato
}
```

- [ ] **Step 5: Rieseguire test — verifica passino**

```bash
npm run test -- rbac
```

Aspettati: `2 passed`.

- [ ] **Step 6: Commit**

```bash
git add mvp/src/auth.config.ts mvp/src/lib/rbac.ts mvp/test/rbac.test.ts
git commit -m "$(cat <<'EOF'
fix(auth): block DEV_BYPASS_AUTH in production

Prevents accidental .env.production leak from exposing Studio.
NODE_ENV=production now always enforces real auth.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 0.1.b — Migration deploy automatico

**Files:**
- Modify: `mvp/package.json` (verificare lo start command)

- [ ] **Step 1: Verifica lo start script attuale**

Lo start script è già stato modificato in Task 0 step 0.6 a `"start": "prisma migrate deploy && next start"`. Verifica:

```bash
cd mvp && cat package.json | grep '"start"'
```

Aspettati: `"start": "prisma migrate deploy && next start"`.

- [ ] **Step 2: Su Railway, impostare Start Command esplicito**

Railway UI → Service → Settings → Deploy → Custom Start Command: `npm run start`

Senza questo, Nixpacks usa il default `next start` e salta migrate deploy.

- [ ] **Step 3: Test deploy con migration vuota**

Crea una migration no-op per testare:

```bash
cd mvp && npx prisma migrate dev --create-only --name test_deploy_pipeline
```

Apri la migration creata, aggiungi un commento SQL no-op:

```sql
-- Test deploy pipeline
SELECT 1;
```

- [ ] **Step 4: Commit + push + verifica deploy**

```bash
git add mvp/prisma/migrations/
git commit -m "chore: test deploy pipeline migration"
git push
```

Railway: verifica log di deploy contengono `Applying migration test_deploy_pipeline`.

- [ ] **Step 5: Verifica `prisma migrate status` in remoto**

Dopo deploy, da Railway shell o connettendoti al DB:

```bash
cd mvp && DATABASE_URL=<railway-db-url> npx prisma migrate status
```

Aspettati: `Database schema is up to date!`.

### Task 0.1.c — Auth su /api/scrape

**Files:**
- Modify: `mvp/src/app/api/scrape/route.ts`
- Test: `mvp/test/api/scrape.test.ts`

- [ ] **Step 1: Scrivere test fallente**

Crea `mvp/test/api/scrape.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/scrape/route";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
  ),
  UnauthorizedError: class extends Error {},
  ForbiddenError: class extends Error {},
}));

import { getSessionUser, UnauthorizedError } from "@/lib/rbac";

describe("POST /api/scrape", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session", async () => {
    vi.mocked(getSessionUser).mockRejectedValue(new UnauthorizedError());
    const req = new Request("http://x/api/scrape", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test — fail**

```bash
npm run test -- scrape
```

Aspettati: test fallisce perché la route non chiama auth.

- [ ] **Step 3: Modificare `mvp/src/app/api/scrape/route.ts`**

Aggiungi all'inizio del handler POST:

```typescript
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
  } catch (err) {
    const errResponse = handleAuthError(err);
    if (errResponse) return errResponse;
    throw err;
  }
  // ... resto invariato
}
```

- [ ] **Step 4: Run test — pass**

```bash
npm run test -- scrape
```

Aspettati: pass.

- [ ] **Step 5: Verifica manuale**

```bash
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

Aspettati: `{"error":"unauthorized"}` con HTTP 401.

- [ ] **Step 6: Commit**

```bash
git add mvp/src/app/api/scrape/route.ts mvp/test/api/scrape.test.ts
git commit -m "$(cat <<'EOF'
fix(security): require auth on /api/scrape

Closes proxy-abuse vector — only Admin/Editor can scrape URLs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 0.1.d — POST /checklist ricontrolla blockers automatici

**Files:**
- Modify: `mvp/src/app/api/projects/[id]/checklist/route.ts`
- Modify: `mvp/src/app/api/projects/[id]/readiness/route.ts` (estrarre logica blockers in helper)
- Create: `mvp/src/lib/readiness.ts`
- Test: `mvp/test/api/checklist.test.ts`

- [ ] **Step 1: Scrivere test fallente — pubblicazione con zero schede deve fallire**

Crea `mvp/test/api/checklist.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));

import { getSessionUser } from "@/lib/rbac";

describe("POST /api/projects/[id]/checklist (publish)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("rejects publish when checklist OK but blockers exist (no schede published)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({
      data: {
        tenantId,
        name: "Test",
        settingsJson: {
          qualityChecklist: {
            revisione_contenuti: true,
            verifica_fatti: true,
            qualita_immagini: true,
            approvazione_cliente: true,
          },
        },
      },
    });

    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });

    const { POST } = await import("@/app/api/projects/[id]/checklist/route");
    const res = await POST(
      new Request("http://x/api/projects/X/checklist", { method: "POST" }),
      { params: Promise.resolve({ id: project.id }) },
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("blockers_present");
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
npm run test -- checklist
```

- [ ] **Step 3: Estrarre helper `mvp/src/lib/readiness.ts`**

```typescript
import { prisma } from "@/lib/db";

export interface ReadinessBlocker {
  kind: "block" | "warn";
  code: string;
  message: string;
}

export interface ReadinessReport {
  blockers: ReadinessBlocker[];
  metrics: {
    audioCoverage: number;
    imageCoverage: number;
    poiCoverage: number;
    schedePublished: number;
    poisTotal: number;
    narratorsTotal: number;
    pathsTotal: number;
  };
  canPublish: boolean;
  level: "green" | "amber" | "red";
}

export async function computeReadiness(projectId: string): Promise<ReadinessReport> {
  const [pois, schede, narratori, paths] = await Promise.all([
    prisma.pOI.findMany({ where: { projectId } }),
    prisma.scheda.findMany({ where: { projectId } }),
    prisma.narratorProfile.findMany({ where: { projectId } }),
    prisma.path.findMany({ where: { projectId } }),
  ]);

  const schedePublished = schede.filter((s) => s.status === "published");
  const audioAssets = await prisma.audioAsset.findMany({
    where: { schedaId: { in: schedePublished.map((s) => s.id) } },
  });
  const audioCoverage = schedePublished.length === 0
    ? 0
    : audioAssets.filter((a) => !a.isStale).length / schedePublished.length;

  const imageCoverage = pois.length === 0
    ? 0
    : pois.filter((p) => p.imageUrl).length / pois.length;

  const poisWithSchede = new Set(schedePublished.map((s) => s.poiId));
  const poiCoverage = pois.length === 0 ? 0 : poisWithSchede.size / pois.length;

  const blockers: ReadinessBlocker[] = [];
  if (schedePublished.length === 0)
    blockers.push({ kind: "block", code: "no_published_schede", message: "Nessuna scheda pubblicata" });
  if (pois.length === 0)
    blockers.push({ kind: "block", code: "no_pois", message: "Nessun POI definito" });
  if (narratori.length === 0)
    blockers.push({ kind: "block", code: "no_narrators", message: "Nessun narratore" });
  if (paths.length === 0)
    blockers.push({ kind: "block", code: "no_paths", message: "Nessun percorso" });
  if (audioAssets.some((a) => a.isStale))
    blockers.push({ kind: "block", code: "stale_audio", message: "Audio obsoleto su schede pubblicate" });

  if (audioCoverage < 0.8 && schedePublished.length > 0)
    blockers.push({ kind: "warn", code: "low_audio_coverage", message: `Audio coverage ${Math.round(audioCoverage * 100)}%` });
  if (imageCoverage < 0.5)
    blockers.push({ kind: "warn", code: "low_image_coverage", message: `Image coverage ${Math.round(imageCoverage * 100)}%` });
  if (poiCoverage < 0.7 && pois.length > 0)
    blockers.push({ kind: "warn", code: "low_poi_coverage", message: `POI coverage ${Math.round(poiCoverage * 100)}%` });

  const hardBlockers = blockers.filter((b) => b.kind === "block");
  const warnings = blockers.filter((b) => b.kind === "warn");
  const level = hardBlockers.length > 0 ? "red" : warnings.length > 0 ? "amber" : "green";
  const canPublish = hardBlockers.length === 0;

  return {
    blockers,
    metrics: {
      audioCoverage,
      imageCoverage,
      poiCoverage,
      schedePublished: schedePublished.length,
      poisTotal: pois.length,
      narratorsTotal: narratori.length,
      pathsTotal: paths.length,
    },
    canPublish,
    level,
  };
}
```

- [ ] **Step 4: Refactor `readiness/route.ts` per usare l'helper**

In `mvp/src/app/api/projects/[id]/readiness/route.ts`, sostituisci il calcolo inline con:

```typescript
import { computeReadiness } from "@/lib/readiness";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getSessionUser();
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) return new Response("Not found", { status: 404 });

    const report = await computeReadiness(id);
    return NextResponse.json(report);
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
```

- [ ] **Step 5: Modificare POST `checklist/route.ts` per ricontrollare blockers**

```typescript
import { computeReadiness } from "@/lib/readiness";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) return new Response("Not found", { status: 404 });

    const settings = project.settingsJson as Record<string, unknown>;
    const checklist = (settings?.qualityChecklist ?? {}) as Record<string, boolean>;
    const KEYS = ["revisione_contenuti", "verifica_fatti", "qualita_immagini", "approvazione_cliente"];
    const checklistOk = KEYS.every((k) => checklist[k] === true);
    if (!checklistOk) {
      return NextResponse.json({ error: "checklist_incomplete" }, { status: 400 });
    }

    // NUOVO: riesegui anche i blockers automatici
    const report = await computeReadiness(id);
    if (!report.canPublish) {
      return NextResponse.json(
        { error: "blockers_present", blockers: report.blockers.filter((b) => b.kind === "block") },
        { status: 400 },
      );
    }

    await prisma.project.update({
      where: { id },
      data: { status: "published" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
```

- [ ] **Step 6: Run test — pass**

```bash
npm run test -- checklist
```

- [ ] **Step 7: Commit**

```bash
git add mvp/src/lib/readiness.ts mvp/src/app/api/projects/[id]/checklist/route.ts mvp/src/app/api/projects/[id]/readiness/route.ts mvp/test/api/checklist.test.ts
git commit -m "$(cat <<'EOF'
fix(checklist): re-validate automatic blockers on publish

Server now refuses publish if blockers exist, even with manual checklist OK.
Closes bypass-via-API vector.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Sub-project 0.2 — API keys server-side per-tenant

**Premessa:** è il sub-progetto più invasivo della Fase 0 (tocca 18+ route AI). Procedere incrementalmente, una route alla volta, con feature flag temporaneo.

### Task 0.2.a — Schema settings + helper get-tenant-key

**Files:**
- Modify: `mvp/prisma/schema.prisma` (commento, no schema change — `Tenant.settingsJson` Json esiste già)
- Create: `mvp/src/lib/tenant-keys.ts`
- Test: `mvp/test/lib/tenant-keys.test.ts`

- [ ] **Step 1: Scrivere test**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";
import { getTenantApiKey, setTenantApiKey, listTenantApiKeys } from "@/lib/tenant-keys";

describe("tenant-keys", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns null when key not set", async () => {
    const { tenantId } = await seedTenantAndUser();
    const k = await getTenantApiKey(tenantId, "openai");
    expect(k).toBeNull();
  });

  it("stores and retrieves a key", async () => {
    const { tenantId } = await seedTenantAndUser();
    await setTenantApiKey(tenantId, "openai", "sk-test-123");
    const k = await getTenantApiKey(tenantId, "openai");
    expect(k).toBe("sk-test-123");
  });

  it("listTenantApiKeys returns providers configured, no values", async () => {
    const { tenantId } = await seedTenantAndUser();
    await setTenantApiKey(tenantId, "openai", "sk-1");
    await setTenantApiKey(tenantId, "elevenlabs", "el-1");
    const list = await listTenantApiKeys(tenantId);
    expect(list).toEqual(expect.arrayContaining([
      { provider: "openai", configured: true },
      { provider: "elevenlabs", configured: true },
    ]));
    expect(JSON.stringify(list)).not.toContain("sk-1");
  });
});
```

- [ ] **Step 2: Implementare `mvp/src/lib/tenant-keys.ts`**

```typescript
import { prisma } from "@/lib/db";

export type TenantApiProvider = "openai" | "anthropic" | "kimi" | "elevenlabs" | "googleMaps";

interface TenantSettings {
  apiKeys?: Partial<Record<TenantApiProvider, string>>;
}

export async function getTenantApiKey(
  tenantId: string,
  provider: TenantApiProvider,
): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });
  if (!tenant) return null;
  const settings = tenant.settingsJson as TenantSettings;
  return settings?.apiKeys?.[provider] ?? null;
}

export async function setTenantApiKey(
  tenantId: string,
  provider: TenantApiProvider,
  value: string,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });
  if (!tenant) throw new Error("Tenant not found");
  const settings = (tenant.settingsJson as TenantSettings) ?? {};
  settings.apiKeys = { ...(settings.apiKeys ?? {}), [provider]: value };
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { settingsJson: settings as object },
  });
}

export async function deleteTenantApiKey(
  tenantId: string,
  provider: TenantApiProvider,
): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });
  if (!tenant) return;
  const settings = (tenant.settingsJson as TenantSettings) ?? {};
  if (settings.apiKeys) {
    delete settings.apiKeys[provider];
  }
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { settingsJson: settings as object },
  });
}

export async function listTenantApiKeys(
  tenantId: string,
): Promise<Array<{ provider: TenantApiProvider; configured: boolean }>> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });
  const settings = (tenant?.settingsJson as TenantSettings) ?? {};
  const providers: TenantApiProvider[] = ["openai", "anthropic", "kimi", "elevenlabs", "googleMaps"];
  return providers.map((p) => ({
    provider: p,
    configured: !!settings?.apiKeys?.[p],
  }));
}
```

- [ ] **Step 3: Run test — pass**

```bash
npm run test -- tenant-keys
```

- [ ] **Step 4: Commit**

```bash
git add mvp/src/lib/tenant-keys.ts mvp/test/lib/tenant-keys.test.ts
git commit -m "feat(api-keys): server-side tenant API keys helper"
```

### Task 0.2.b — Endpoint REST per gestire le keys

**Files:**
- Create: `mvp/src/app/api/tenant/api-keys/route.ts`
- Test: `mvp/test/api/tenant-api-keys.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));
import { getSessionUser } from "@/lib/rbac";

describe("/api/tenant/api-keys", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("GET returns providers with configured=false initially", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { GET } = await import("@/app/api/tenant/api-keys/route");
    const res = await GET(new Request("http://x"));
    const body = await res.json();
    expect(body.keys).toContainEqual({ provider: "openai", configured: false });
  });

  it("PUT stores a key, GET returns configured=true (without value)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { PUT, GET } = await import("@/app/api/tenant/api-keys/route");
    await PUT(new Request("http://x", {
      method: "PUT",
      body: JSON.stringify({ provider: "openai", value: "sk-abc" }),
    }));
    const res = await GET(new Request("http://x"));
    const body = await res.json();
    expect(body.keys).toContainEqual({ provider: "openai", configured: true });
    expect(JSON.stringify(body)).not.toContain("sk-abc");
  });
});
```

- [ ] **Step 2: Implementare la route**

`mvp/src/app/api/tenant/api-keys/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import {
  listTenantApiKeys,
  setTenantApiKey,
  deleteTenantApiKey,
  TenantApiProvider,
} from "@/lib/tenant-keys";

const VALID_PROVIDERS: TenantApiProvider[] = [
  "openai", "anthropic", "kimi", "elevenlabs", "googleMaps",
];

export async function GET() {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin"]);
    const keys = await listTenantApiKeys(user.tenantId);
    return NextResponse.json({ keys });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin"]);
    const body = await req.json();
    if (!VALID_PROVIDERS.includes(body.provider)) {
      return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
    }
    if (typeof body.value !== "string" || body.value.trim() === "") {
      return NextResponse.json({ error: "invalid_value" }, { status: 400 });
    }
    await setTenantApiKey(user.tenantId, body.provider, body.value.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin"]);
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") as TenantApiProvider;
    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
    }
    await deleteTenantApiKey(user.tenantId, provider);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
```

- [ ] **Step 3: Run + commit**

```bash
npm run test -- tenant-api-keys
git add mvp/src/app/api/tenant/api-keys/ mvp/test/api/tenant-api-keys.test.ts
git commit -m "feat(api-keys): /api/tenant/api-keys CRUD endpoint (Admin only)"
```

### Task 0.2.c — Migrare extract-kb-single per usare server key + feature flag

**Premessa pattern:** Per ogni route AI, accettiamo **sia** `body.apiKey` (legacy) **sia** lookup server-side. Quando il body manda apiKey, lo ignoriamo se la chiave server c'è. Altrimenti fallback al body. Quando tutte le UI sono migrate, rimuoviamo il fallback.

**Files:**
- Modify: `mvp/src/app/api/ai/extract-kb-single/route.ts`
- Test: `mvp/test/api/extract-kb-single.test.ts`

- [ ] **Step 1: Test — chiave server preferita al body**

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser } from "../helpers/prisma";
import { setTenantApiKey } from "@/lib/tenant-keys";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));

// Mock OpenAI per non chiamare l'API reale
const mockCreate = vi.fn();
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

import { getSessionUser } from "@/lib/rbac";

describe("extract-kb-single uses server key when configured", () => {
  beforeEach(async () => {
    await resetDb();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ facts: [] }) } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    });
  });

  it("uses tenant server key when present, ignores body.apiKey", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    await setTenantApiKey(tenantId, "openai", "sk-server-key");
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { POST } = await import("@/app/api/ai/extract-kb-single/route");
    await POST(new Request("http://x", {
      method: "POST",
      body: JSON.stringify({
        apiKey: "sk-body-key", // should be ignored
        provider: "openai",
        title: "test",
        content: "test content",
        importance: "primaria",
        reliability: "alta",
      }),
    }));
    // verify OpenAI was called with server key, not body key
    const openaiCtor = (await import("openai")).default as any;
    expect(openaiCtor).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "sk-server-key" }));
  });
});
```

- [ ] **Step 2: Modificare la route**

In `mvp/src/app/api/ai/extract-kb-single/route.ts`, all'inizio del handler POST aggiungere:

```typescript
import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { getTenantApiKey } from "@/lib/tenant-keys";

export async function POST(req: Request) {
  let tenantId: string;
  try {
    const user = await getSessionUser();
    tenantId = user.tenantId;
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }

  const body = await req.json();
  const provider = body.provider ?? "openai";

  // Priority: server key > body key (transitional)
  const serverKey = await getTenantApiKey(tenantId, provider);
  const apiKey = serverKey ?? body.apiKey;
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_api_key", message: `Nessuna chiave configurata per ${provider}` },
      { status: 400 },
    );
  }

  // resto invariato, usare `apiKey` invece di `body.apiKey`
  // ...
}
```

- [ ] **Step 3: Run test — pass**

```bash
npm run test -- extract-kb-single
```

- [ ] **Step 4: Commit**

```bash
git add mvp/src/app/api/ai/extract-kb-single/route.ts mvp/test/api/extract-kb-single.test.ts
git commit -m "feat(api-keys): extract-kb-single prefers server key, falls back to body"
```

### Task 0.2.d — Migrare le altre 17 route AI (batch)

**Pattern**: applicare la stessa modifica del Task 0.2.c a tutte le route `/api/ai/*`. Per ogni route, lo stesso pattern.

Lista delle route da migrare:
1. ~~extract-kb-single~~ (fatta)
2. `extract-kb` (legacy, candidato a rimozione futura, ma si migra comunque)
3. `interview-questions`
4. `analyze-planimetria`
5. `generate-bridges`
6. `generate-brief`
7. `generate-family-missions`
8. `generate-narrator-portrait`
9. `generate-poi-image`
10. `generate-qa-pack`
11. `generate-scheda`
12. `generate-semantic-base`
13. `match-images-to-poi`
14. `propose-drivers-personas`
15. `propose-luogo`
16. `propose-narrators`
17. `propose-paths`
18. `suggest-zones`
19. `schede/[schedaId]/audio` (TTS ElevenLabs)

Per ognuna, ripetere il pattern:

- [ ] **Per ognuna delle 17+1 route**:
  1. Aprire il file
  2. Aggiungere import `getSessionUser`, `handleAuthError`, `getTenantApiKey`
  3. All'inizio del handler, lookup chiave server + fallback
  4. Sostituire usi di `body.apiKey` con la variabile `apiKey` calcolata
  5. Commit individuale: `feat(api-keys): migrate <route> to server-side keys`

**Per la route audio (TTS ElevenLabs)**: invece di `process.env.ELEVENLABS_API_KEY`, usare `await getTenantApiKey(tenantId, "elevenlabs")` con fallback all'env per backward compat:

```typescript
const tenantElKey = await getTenantApiKey(user.tenantId, "elevenlabs");
const elKey = tenantElKey ?? process.env.ELEVENLABS_API_KEY;
if (!elKey) return NextResponse.json({ error: "missing_elevenlabs_key" }, { status: 400 });
```

- [ ] **Smoke test manuale dopo aver migrato tutto:**
  1. Avvia dev locale
  2. Configura una chiave OpenAI da UI Impostazioni (ancora vecchia UI, va bene)
  3. Su un progetto demo, prova a generare una scheda
  4. Verifica nei log che non ci sia più `body.apiKey` in transito (DevTools → Network → Request payload, NON deve contenere `sk-...`)

### Task 0.2.e — UI Impostazioni gestisce le chiavi server-side

**Files:**
- Modify: `mvp/src/app/impostazioni/page.tsx` (sezione API keys)
- Remove: dipendenza da `mvp/src/lib/api-keys.ts`

- [ ] **Step 1: Refactor UI per chiamare la nuova route**

Modificare la sezione "API Keys" di Impostazioni:

```tsx
// In Impostazioni page (sezione API keys):
const { data, mutate } = useSWR<{ keys: Array<{ provider: string; configured: boolean }> }>(
  "/api/tenant/api-keys",
  (url: string) => fetch(url).then((r) => r.json()),
);

async function saveKey(provider: string, value: string) {
  const res = await fetch("/api/tenant/api-keys", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, value }),
  });
  if (!res.ok) {
    toast.error("Errore salvataggio chiave");
    return;
  }
  await mutate();
  toast.success("Chiave salvata");
}

// UI: per ogni provider, mostrare "Configurata ✓" o input "Incolla la chiave"
// Non mostrare mai il valore vecchio (è solo "configured: true|false")
```

- [ ] **Step 2: Aggiungere banner di migrazione**

In cima alla pagina Impostazioni:

```tsx
{showMigrationBanner && (
  <Alert>
    Le chiavi API sono ora salvate sul server (più sicuro). Ti chiediamo di incollarle di nuovo.
  </Alert>
)}
```

`showMigrationBanner` = true se `localStorage.getItem("toolia-api-keys")` esiste (cleanup dopo conferma).

- [ ] **Step 3: Smoke test manuale**
  1. Apri Impostazioni
  2. Configura chiave OpenAI nella nuova UI
  3. Verifica che esista in DB: `SELECT settings_json FROM "Tenant" WHERE id = ...`
  4. Aggiorna pagina → la chiave appare come "configurata" senza valore

- [ ] **Step 4: Commit**

```bash
git add mvp/src/app/impostazioni/
git commit -m "feat(api-keys): Impostazioni UI uses server-side API keys endpoint"
```

### Task 0.2.f — Rimuovere lib/api-keys.ts deprecato

**Premessa:** solo quando tutti i client che usavano `loadApiKeys()` sono stati migrati.

- [ ] **Step 1: Grep usi rimanenti**

```bash
cd mvp && grep -r "from \"@/lib/api-keys\"" src/
```

Aspettati: zero match (se ne restano, vanno migrati prima).

- [ ] **Step 2: Cancellare il file**

```bash
rm mvp/src/lib/api-keys.ts
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(api-keys): remove deprecated localStorage api-keys module"
```

---

## Sub-project 0.3 — Async hardening (semplificato v2)

### Task 0.3.a — maxDuration sulle 3 route lente

**Files:**
- Modify: `mvp/src/app/api/projects/[id]/schede/[schedaId]/audio/route.ts`
- Modify: `mvp/src/app/api/ai/extract-kb-single/route.ts`
- Modify: `mvp/src/app/api/ai/generate-semantic-base/route.ts`

- [ ] **Step 1: Aggiungere maxDuration in ognuna delle 3 route**

In cima al file (dopo gli imports):

```typescript
export const maxDuration = 120; // secondi
```

- [ ] **Step 2: Verificare la configurazione Railway**

Per route Next.js, `maxDuration` viene rispettato automaticamente da Vercel e da Railway/Nixpacks. Verifica nei log Railway che una request lunga (TTS scheda 2000 parole) **non timeoutta più**.

- [ ] **Step 3: Commit**

```bash
git add mvp/src/app/api/projects/[id]/schede/[schedaId]/audio/route.ts mvp/src/app/api/ai/extract-kb-single/route.ts mvp/src/app/api/ai/generate-semantic-base/route.ts
git commit -m "perf(api): extend maxDuration to 120s for TTS and long LLM ops"
```

### Task 0.3.b — Bulk generation server-side con SSE

**Files:**
- Create: `mvp/src/app/api/projects/[id]/schede/bulk-generate/route.ts`
- Modify: `mvp/src/app/progetti/[id]/schede/page.tsx`

- [ ] **Step 1: Implementare la route SSE**

```typescript
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { getTenantApiKey } from "@/lib/tenant-keys";

export const maxDuration = 300; // 5 minuti

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) return new Response("Not found", { status: 404 });

    const body = await req.json();
    const poiIds: string[] = body.poiIds ?? [];
    const narratorIds: string[] = body.narratorIds ?? [];
    const language = body.language ?? "it";

    const apiKey = await getTenantApiKey(user.tenantId, "openai");
    if (!apiKey) return new Response("missing_api_key", { status: 400 });

    const total = poiIds.length * narratorIds.length;
    let completed = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Concurrency: max 5 in parallel
        const queue: Array<() => Promise<void>> = [];
        for (const poiId of poiIds) {
          for (const narratorId of narratorIds) {
            queue.push(async () => {
              try {
                // chiamare generate-scheda internamente (o duplicare la logica)
                // ... (per brevità: chiamata fetch interna o import diretto del builder)
                completed++;
                send({ type: "progress", completed, total, current: { poiId, narratorId } });
              } catch (e) {
                send({ type: "error", poiId, narratorId, error: String(e) });
              }
            });
          }
        }

        // Eseguire con concorrenza limitata
        const CONCURRENCY = 5;
        const running: Promise<void>[] = [];
        for (const task of queue) {
          const p = task().finally(() => {
            running.splice(running.indexOf(p), 1);
          });
          running.push(p);
          if (running.length >= CONCURRENCY) {
            await Promise.race(running);
          }
        }
        await Promise.all(running);

        send({ type: "done", completed, total });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
```

- [ ] **Step 2: Modificare frontend schede page**

In `mvp/src/app/progetti/[id]/schede/page.tsx`, sostituire `bulkGenerateAll` con:

```typescript
async function bulkGenerateAll() {
  const res = await fetch(`/api/projects/${projectId}/schede/bulk-generate`, {
    method: "POST",
    body: JSON.stringify({ poiIds, narratorIds, language: "it" }),
  });
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = JSON.parse(line.slice(6));
      if (data.type === "progress") {
        setBulkProgress({ completed: data.completed, total: data.total });
      } else if (data.type === "done") {
        toast.success(`Generati ${data.completed}/${data.total}`);
      } else if (data.type === "error") {
        toast.error(`Errore su ${data.poiId}`);
      }
    }
  }
}
```

- [ ] **Step 3: Smoke test manuale**

Su un progetto demo con 5 POI × 2 narratori = 10 schede:
- Click "Bulk generate"
- Vedi toast "Generazione 1/10... 2/10... ..."
- Al termine, le 10 schede sono in DB

- [ ] **Step 4: Commit**

```bash
git add mvp/src/app/api/projects/[id]/schede/bulk-generate/ mvp/src/app/progetti/[id]/schede/page.tsx
git commit -m "feat(schede): server-side bulk generation with SSE progress streaming"
```

### Task 0.3.c — Documentare Job table come riservata

- [ ] **Step 1: Aggiungere commento allo schema**

In `mvp/prisma/schema.prisma`, sopra il `model Job`:

```prisma
// Reserved for future async export/import + long-running operations.
// MVP uses inline maxDuration + SSE streaming for bulk operations (see 0.3.b).
model Job { ... }
```

- [ ] **Step 2: Commit**

```bash
git add mvp/prisma/schema.prisma
git commit -m "docs(schema): mark Job model as reserved for future use"
```

---

## Sub-project 0.4 — Bug fixes minori (batch)

### Task 0.4.a — ZoneFunction.chiusura accessibile

**Files:**
- Modify: `mvp/src/lib/project-store.ts:227,932-943`
- Modify: `mvp/src/app/progetti/[id]/luogo/page.tsx:76-86`

- [ ] **Step 1: Test**

`mvp/test/lib/project-store.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { normalizeZoneFunction } from "@/lib/project-store";

describe("normalizeZoneFunction", () => {
  it("maps 'closure' to 'chiusura', not 'sviluppo'", () => {
    expect(normalizeZoneFunction("closure")).toBe("chiusura");
  });
  it("maps 'chiusura' to itself", () => {
    expect(normalizeZoneFunction("chiusura")).toBe("chiusura");
  });
});
```

- [ ] **Step 2: Modificare il tipo `ZoneFunction` in `project-store.ts:227`**

```typescript
export type ZoneFunction = "apertura" | "sviluppo" | "climax" | "chiusura";
```

- [ ] **Step 3: Modificare `normalizeZoneFunction` in `project-store.ts:932-943`**

```typescript
export function normalizeZoneFunction(raw: unknown): ZoneFunction {
  if (typeof raw !== "string") return "sviluppo";
  const v = raw.toLowerCase();
  if (v === "apertura" || v === "opening") return "apertura";
  if (v === "climax") return "climax";
  if (v === "chiusura" || v === "closure") return "chiusura";
  return "sviluppo";
}
```

- [ ] **Step 4: Modificare UI in `luogo/page.tsx:76-86`**

```typescript
const ZONE_FUNCTION_LABEL: Record<ZoneFunction, string> = {
  apertura: "Apertura",
  sviluppo: "Sviluppo",
  climax: "Climax",
  chiusura: "Chiusura",
};
const ZONE_FUNCTION_HINT: Record<ZoneFunction, string> = {
  apertura: "Primi punti dell'esperienza",
  sviluppo: "Cuore della visita",
  climax: "Momento più forte",
  chiusura: "Chiusura emotiva o pratica",
};
```

- [ ] **Step 5: Run test + commit**

```bash
npm run test -- project-store
git add mvp/src/lib/project-store.ts mvp/src/app/progetti/[id]/luogo/page.tsx mvp/test/lib/project-store.test.ts
git commit -m "fix(zone): make 'chiusura' function reachable from luogo step"
```

### Task 0.4.b — suggest-zones ritorna funzioni italiane

**Files:**
- Modify: `mvp/src/app/api/ai/suggest-zones/route.ts`

- [ ] **Step 1: Cambiare prompt e validation**

In `mvp/src/app/api/ai/suggest-zones/route.ts`:

```typescript
// Prompt: cambia esempi e enum nel system prompt da
//   '"function": "opening|development|climax|closure"'
// a
//   '"function": "apertura|sviluppo|climax|chiusura"'

// Validation: in luogo di
//   new Set(["opening", "development", "climax", "closure"])
// usare
const VALID_FUNCTIONS = new Set(["apertura", "sviluppo", "climax", "chiusura"]);
```

- [ ] **Step 2: Smoke test**

Chiamata manuale: `curl POST /api/ai/suggest-zones` con un payload demo → response JSON deve contenere `apertura|sviluppo|climax|chiusura`.

- [ ] **Step 3: Commit**

```bash
git add mvp/src/app/api/ai/suggest-zones/route.ts
git commit -m "fix(zone): suggest-zones returns Italian function values"
```

### Task 0.4.c — Soft delete narratori e percorsi

**Files:**
- Modify: `mvp/prisma/schema.prisma`
- Migration: `mvp/prisma/migrations/<timestamp>_narrator_path_soft_delete/`
- Modify: `mvp/src/app/api/projects/[id]/narrators/[narratorId]/route.ts:96`
- Modify: `mvp/src/app/api/projects/[id]/paths/[pathId]/route.ts:89`
- Modify: tutte le `findMany` su NarratorProfile e Path che dovrebbero filtrare `archived: false`

- [ ] **Step 1: Aggiungere campo `archived` allo schema**

```prisma
model NarratorProfile {
  // ... esistente ...
  archived Boolean @default(false)
  @@index([projectId])
}

model Path {
  // ... esistente ...
  archived Boolean @default(false)
  @@index([projectId])
}
```

- [ ] **Step 2: Creare migration**

```bash
cd mvp && npx prisma migrate dev --name narrator_path_soft_delete
```

- [ ] **Step 3: Test**

```typescript
// mvp/test/api/narrator-delete.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));
import { getSessionUser } from "@/lib/rbac";

describe("DELETE narrator", () => {
  beforeEach(async () => { await resetDb(); });

  it("archives instead of hard-deleting", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const narrator = await prisma.narratorProfile.create({
      data: { projectId: project.id, name: "N", voiceStyle: "neutro" },
    });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { DELETE } = await import("@/app/api/projects/[id]/narrators/[narratorId]/route");
    await DELETE(new Request("http://x", { method: "DELETE" }), {
      params: Promise.resolve({ id: project.id, narratorId: narrator.id }),
    });
    const stillExists = await prisma.narratorProfile.findUnique({ where: { id: narrator.id } });
    expect(stillExists?.archived).toBe(true);
  });
});
```

- [ ] **Step 4: Refactor DELETE handler narratori**

```typescript
export async function DELETE(_req: Request, { params }) {
  const { id, narratorId } = await params;
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) return new Response("Not found", { status: 404 });
    await prisma.narratorProfile.update({
      where: { id: narratorId },
      data: { archived: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) { /* ... */ }
}
```

- [ ] **Step 5: Stesso pattern per Path**

In `mvp/src/app/api/projects/[id]/paths/[pathId]/route.ts:89`, sostituire `prisma.path.delete()` con `prisma.path.update({ data: { archived: true } })`.

- [ ] **Step 6: Aggiungere filtro `archived: false` alle findMany**

Cerca tutte le query Prisma su NarratorProfile e Path che NON dovrebbero ritornare archiviati:

```bash
grep -rn "narratorProfile.findMany\|path.findMany" mvp/src/
```

Aggiungere `where: { archived: false }` (o estendere il where esistente).

- [ ] **Step 7: Run test + commit**

```bash
npm run test -- narrator
git add mvp/prisma/ mvp/src/app/api/projects/[id]/narrators/ mvp/src/app/api/projects/[id]/paths/ mvp/test/api/narrator-delete.test.ts
git commit -m "fix: soft-delete narrators and paths (archived flag)"
```

### Task 0.4.d — Workflow status su FamilyMission

**Files:**
- Modify: `mvp/prisma/schema.prisma`
- Migration
- Modify: route `family-missions` per filtrare

- [ ] **Step 1: Schema**

```prisma
model FamilyMission {
  // ... esistente ...
  status SchedaStatus @default(draft)  // riusa enum esistente
}
```

- [ ] **Step 2: Migration**

```bash
npx prisma migrate dev --name family_mission_status
```

- [ ] **Step 3: Filtrare visitor data**

In `mvp/src/app/api/projects/[id]/visitor-data/route.ts`, dove le family missions sono incluse, aggiungere `where: { status: "published" }`.

- [ ] **Step 4: Commit**

```bash
git add mvp/prisma/ mvp/src/app/api/projects/[id]/visitor-data/route.ts
git commit -m "feat(family): add status workflow to FamilyMission (only published in visitor)"
```

### Task 0.4.e — Race condition unique scheda → 409 invece di 500

**Files:**
- Modify: `mvp/src/app/api/projects/[id]/schede/route.ts`

- [ ] **Step 1: Test race**

Test concettuale (full race è difficile da scrivere, basta unit testing del catch):

```typescript
// mvp/test/api/schede-create.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));
import { getSessionUser } from "@/lib/rbac";

describe("POST schede unique constraint", () => {
  beforeEach(async () => { await resetDb(); });

  it("returns 409 on duplicate (poi, narrator, language)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    const poi = await prisma.pOI.create({ data: { projectId: project.id, name: "POI" } });
    const narrator = await prisma.narratorProfile.create({
      data: { projectId: project.id, name: "N", voiceStyle: "neutro" },
    });
    await prisma.scheda.create({
      data: {
        projectId: project.id, poiId: poi.id, narratorId: narrator.id,
        language: "it", title: "T", scriptText: "txt",
      },
    });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { POST } = await import("@/app/api/projects/[id]/schede/route");
    const res = await POST(new Request("http://x", {
      method: "POST",
      body: JSON.stringify({
        poiId: poi.id, narratorId: narrator.id, language: "it",
        title: "T2", scriptText: "txt2",
      }),
    }), { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Fix handler**

In `mvp/src/app/api/projects/[id]/schede/route.ts`, nel POST aggiungere catch P2002:

```typescript
try {
  const created = await prisma.scheda.create({ data: { ... } });
  return NextResponse.json(created);
} catch (e: unknown) {
  if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
    return NextResponse.json({ error: "already_exists" }, { status: 409 });
  }
  throw e;
}
```

- [ ] **Step 3: Run + commit**

```bash
npm run test -- schede-create
git add mvp/src/app/api/projects/[id]/schede/route.ts mvp/test/api/schede-create.test.ts
git commit -m "fix(schede): return 409 on unique constraint violation instead of 500"
```

### Task 0.4.f — Stale audio su modifica semantic base

**Files:**
- Modify: `mvp/src/app/api/projects/[id]/pois/[poiId]/semantic-base/route.ts`

- [ ] **Step 1: Test**

```typescript
// mvp/test/api/semantic-base-stale.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({ /* mock */ }));

describe("semantic base update marks audio stale", () => {
  beforeEach(async () => { await resetDb(); });

  it("marks all related audio as stale when semantic base changes", async () => {
    // setup: project + poi + narrator + scheda + audio
    // PUT semantic base
    // verify all audios with this poi are isStale=true
  });
});
```

- [ ] **Step 2: Modificare PUT handler**

In `mvp/src/app/api/projects/[id]/pois/[poiId]/semantic-base/route.ts`, dopo l'update:

```typescript
await prisma.pOI.update({
  where: { id: poiId },
  data: { semanticBaseJson: body },
});
// NEW: mark all derived audios as stale
await prisma.audioAsset.updateMany({
  where: { scheda: { poiId } },
  data: { isStale: true },
});
```

- [ ] **Step 3: Commit**

```bash
git add mvp/src/app/api/projects/[id]/pois/[poiId]/semantic-base/route.ts mvp/test/api/semantic-base-stale.test.ts
git commit -m "fix(audio): mark derived audio as stale when POI semantic base changes"
```

### Task 0.4.g — Fix link /v/[id]/lingua rotto

**Files:**
- Modify: il componente che genera il link (probabilmente `mvp/src/components/visitor/visitor-home.tsx`)

- [ ] **Step 1: Trovare il link**

```bash
cd mvp && grep -rn "/lingua" src/
```

- [ ] **Step 2: Rimuovere o sostituire**

Se non esiste pagina `/v/[id]/lingua`, semplicemente rimuovere il link o farlo puntare a `/v/[id]/scegli`.

- [ ] **Step 3: Commit**

```bash
git add mvp/src/components/visitor/
git commit -m "fix(visitor): remove dead /lingua link (404)"
```

### Task 0.4.h — Debounce brief PUT

**Files:**
- Modify: `mvp/src/app/progetti/[id]/brief/page.tsx:162-170`

- [ ] **Step 1: Aggiungere debounce hook**

Crea `mvp/src/lib/hooks/use-debounce.ts`:

```typescript
import { useEffect, useRef } from "react";

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);
  return ((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }) as T;
}
```

- [ ] **Step 2: Usare hook nel brief page**

In `mvp/src/app/progetti/[id]/brief/page.tsx`:

```typescript
import { useDebouncedCallback } from "@/lib/hooks/use-debounce";

const debouncedPersist = useDebouncedCallback(persist, 800);
// sostituire le chiamate dirette a persist() con debouncedPersist()
```

- [ ] **Step 3: Smoke test manuale**

Aprire il brief, digitare velocemente in un textarea, verificare in DevTools → Network che siano max ~1 PUT al secondo.

- [ ] **Step 4: Commit**

```bash
git add mvp/src/lib/hooks/use-debounce.ts mvp/src/app/progetti/[id]/brief/page.tsx
git commit -m "perf(brief): debounce PUT calls to 800ms"
```

---

## Sub-project 0.5 — Cost tracking LLM per-tenant + per-progetto

### Task 0.5.a — Schema LlmUsage migration

**Files:**
- Modify: `mvp/prisma/schema.prisma`
- Migration

- [ ] **Step 1: Aggiungere modello**

```prisma
model LlmUsage {
  id           String   @id @default(cuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  projectId    String?
  project      Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  operation    String   // "extract-kb", "generate-scheda", "tts", etc.
  provider     String   // "openai", "anthropic", "elevenlabs"
  model        String
  inputTokens  Int      @default(0)
  outputTokens Int      @default(0)
  audioSeconds Int      @default(0)  // for TTS
  costUsd      Float    @default(0)
  createdAt    DateTime @default(now())
  @@index([tenantId, createdAt])
  @@index([projectId])
}
```

Aggiungere `llmUsages LlmUsage[]` alle relazioni Tenant e Project.

- [ ] **Step 2: Migration**

```bash
npx prisma migrate dev --name llm_usage_tracking
```

- [ ] **Step 3: Commit**

```bash
git add mvp/prisma/
git commit -m "feat(cost): add LlmUsage table for per-tenant per-project tracking"
```

### Task 0.5.b — Helper logLlmCall con pricing table

**Files:**
- Create: `mvp/src/lib/llm-usage.ts`
- Test: `mvp/test/lib/llm-usage.test.ts`

- [ ] **Step 1: Test**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";
import { logLlmCall, calculateCost } from "@/lib/llm-usage";

describe("LLM usage tracking", () => {
  beforeEach(async () => { await resetDb(); });

  it("calculateCost GPT-4o", () => {
    // GPT-4o: $2.50/1M input, $10/1M output
    const cost = calculateCost({ provider: "openai", model: "gpt-4o", inputTokens: 1000, outputTokens: 500 });
    expect(cost).toBeCloseTo(0.0025 + 0.005, 5);
  });

  it("calculateCost ElevenLabs TTS by seconds", () => {
    // ElevenLabs: $0.18/1000 seconds (semplificato)
    const cost = calculateCost({ provider: "elevenlabs", model: "eleven_multilingual_v2", audioSeconds: 60 });
    expect(cost).toBeGreaterThan(0);
  });

  it("logLlmCall stores record", async () => {
    const { tenantId } = await seedTenantAndUser();
    await logLlmCall({
      tenantId, projectId: null,
      operation: "extract-kb",
      provider: "openai", model: "gpt-4o",
      inputTokens: 1000, outputTokens: 500,
    });
    const prisma = getTestPrisma();
    const records = await prisma.llmUsage.findMany({ where: { tenantId } });
    expect(records).toHaveLength(1);
    expect(records[0].operation).toBe("extract-kb");
  });
});
```

- [ ] **Step 2: Implementare helper**

```typescript
// mvp/src/lib/llm-usage.ts
import { prisma } from "@/lib/db";

interface PriceInput {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
}

// Prezzi aggiornati 2026-05. TODO: spostare in env vars o tabella DB.
const PRICES: Record<string, { in: number; out: number }> = {
  "openai:gpt-4o": { in: 2.5 / 1_000_000, out: 10 / 1_000_000 },
  "openai:gpt-4o-mini": { in: 0.15 / 1_000_000, out: 0.6 / 1_000_000 },
  "openai:text-embedding-3-small": { in: 0.02 / 1_000_000, out: 0 },
  "anthropic:claude-sonnet-4-6": { in: 3 / 1_000_000, out: 15 / 1_000_000 },
  "anthropic:claude-opus-4-7": { in: 15 / 1_000_000, out: 75 / 1_000_000 },
  "anthropic:claude-haiku-4-5": { in: 0.8 / 1_000_000, out: 4 / 1_000_000 },
};

// ElevenLabs: 30k char/month nel piano Creator → semplificato a costo per secondo
const ELEVENLABS_PER_SECOND = 0.00033; // approx; updated according to plan

export function calculateCost(input: PriceInput): number {
  if (input.provider === "elevenlabs") {
    return (input.audioSeconds ?? 0) * ELEVENLABS_PER_SECOND;
  }
  const key = `${input.provider}:${input.model}`;
  const price = PRICES[key];
  if (!price) return 0;
  return (input.inputTokens ?? 0) * price.in + (input.outputTokens ?? 0) * price.out;
}

export interface LogLlmCallInput {
  tenantId: string;
  projectId: string | null;
  operation: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
}

export async function logLlmCall(input: LogLlmCallInput): Promise<void> {
  const costUsd = calculateCost(input);
  try {
    await prisma.llmUsage.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        operation: input.operation,
        provider: input.provider,
        model: input.model,
        inputTokens: input.inputTokens ?? 0,
        outputTokens: input.outputTokens ?? 0,
        audioSeconds: input.audioSeconds ?? 0,
        costUsd,
      },
    });
  } catch (e) {
    // Log fail must not break the AI call
    console.error("[llm-usage] failed to log call:", e);
  }
}
```

- [ ] **Step 3: Run + commit**

```bash
npm run test -- llm-usage
git add mvp/src/lib/llm-usage.ts mvp/test/lib/llm-usage.test.ts
git commit -m "feat(cost): helper logLlmCall with pricing table"
```

### Task 0.5.c — Integrare logging nelle route AI (batch)

**Pattern:** dopo ogni risposta LLM, estrarre `usage` e chiamare `logLlmCall`.

Esempio per `extract-kb-single`:

```typescript
const response = await openai.chat.completions.create({ ... });
await logLlmCall({
  tenantId: user.tenantId,
  projectId: body.projectId ?? null,
  operation: "extract-kb",
  provider: "openai",
  model: "gpt-4o",
  inputTokens: response.usage?.prompt_tokens ?? 0,
  outputTokens: response.usage?.completion_tokens ?? 0,
});
```

- [ ] **Per ognuna delle 18 route AI** (lista in 0.2.d):
  - Aggiungi import `logLlmCall` da `@/lib/llm-usage`
  - Dopo la chiamata OpenAI/Anthropic, chiamare `logLlmCall` con i token usage
  - Per le route che hanno `projectId` (es. `generate-scheda` ne riceve uno), passarlo. Per quelle senza, passare `null`
  - Per audio TTS: usare `audioSeconds` invece di token (ElevenLabs ritorna `character_count`, convertire in seconds approssimando 150 char/min → secondi)
  - Commit individuale o batch per blocchi di 3-5 route

### Task 0.5.d — Dashboard Impostazioni > Consumo

**Files:**
- Create: `mvp/src/app/impostazioni/consumo/page.tsx`
- Create: `mvp/src/app/api/tenant/usage/route.ts`

- [ ] **Step 1: API per aggregare**

```typescript
// mvp/src/app/api/tenant/usage/route.ts
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin"]);
    const url = new URL(req.url);
    const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : new Date();
    const projectId = url.searchParams.get("projectId") ?? undefined;

    const records = await prisma.llmUsage.findMany({
      where: {
        tenantId: user.tenantId,
        createdAt: { gte: from, lte: to },
        ...(projectId ? { projectId } : {}),
      },
      select: {
        operation: true, provider: true, model: true,
        inputTokens: true, outputTokens: true, audioSeconds: true,
        costUsd: true, projectId: true, createdAt: true,
      },
    });

    const totalUsd = records.reduce((sum, r) => sum + r.costUsd, 0);
    const byOperation = records.reduce<Record<string, { count: number; costUsd: number }>>((acc, r) => {
      const k = r.operation;
      if (!acc[k]) acc[k] = { count: 0, costUsd: 0 };
      acc[k].count++;
      acc[k].costUsd += r.costUsd;
      return acc;
    }, {});
    const byProject = records.reduce<Record<string, { count: number; costUsd: number }>>((acc, r) => {
      const k = r.projectId ?? "(tenant-level)";
      if (!acc[k]) acc[k] = { count: 0, costUsd: 0 };
      acc[k].count++;
      acc[k].costUsd += r.costUsd;
      return acc;
    }, {});

    return NextResponse.json({ totalUsd, byOperation, byProject, records: records.slice(0, 100) });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
```

- [ ] **Step 2: UI page**

```tsx
// mvp/src/app/impostazioni/consumo/page.tsx
"use client";
import useSWR from "swr";

export default function ConsumoPage() {
  const { data } = useSWR("/api/tenant/usage", (url: string) => fetch(url).then(r => r.json()));
  if (!data) return <div>Caricamento...</div>;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Consumo AI ultimi 30 giorni</h1>
      <div className="text-4xl font-bold mb-6">${data.totalUsd.toFixed(2)}</div>

      <h2 className="text-lg font-medium mt-6 mb-2">Per operazione</h2>
      <table className="w-full text-sm">
        <thead><tr><th>Operazione</th><th>Chiamate</th><th>Costo</th></tr></thead>
        <tbody>
          {Object.entries(data.byOperation).map(([op, v]: [string, any]) => (
            <tr key={op}>
              <td>{op}</td>
              <td>{v.count}</td>
              <td>${v.costUsd.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-lg font-medium mt-6 mb-2">Per progetto</h2>
      <table className="w-full text-sm">
        <thead><tr><th>Progetto</th><th>Chiamate</th><th>Costo</th></tr></thead>
        <tbody>
          {Object.entries(data.byProject).map(([pid, v]: [string, any]) => (
            <tr key={pid}>
              <td>{pid}</td>
              <td>{v.count}</td>
              <td>${v.costUsd.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Aggiungere link nel menu Impostazioni**

In `mvp/src/app/impostazioni/page.tsx` (o sidebar Impostazioni), aggiungere link "Consumo AI" che porta a `/impostazioni/consumo`.

- [ ] **Step 4: Smoke test**

Dopo aver generato qualche scheda con cost tracking attivo, aprire `/impostazioni/consumo` e verificare numeri ragionevoli.

- [ ] **Step 5: Commit**

```bash
git add mvp/src/app/api/tenant/usage/ mvp/src/app/impostazioni/consumo/
git commit -m "feat(cost): dashboard /impostazioni/consumo with operation + project breakdown"
```

### Task 0.5.e — Widget per-project cost

**Files:**
- Modify: `mvp/src/app/progetti/[id]/page.tsx` (overview progetto)

- [ ] **Step 1: Endpoint per-project**

`GET /api/projects/[id]/usage` (riusa logica già in `/api/tenant/usage` con filtro projectId):

Già coperto da `/api/tenant/usage?projectId=...`.

- [ ] **Step 2: Widget UI**

In `mvp/src/app/progetti/[id]/page.tsx` (project overview), aggiungere card:

```tsx
const { data: usage } = useSWR(`/api/tenant/usage?projectId=${id}`, ...);
// ...
<Card>
  <CardHeader>Costo AI di questo progetto</CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">${usage?.totalUsd?.toFixed(2) ?? "..."}</div>
    <div className="text-sm text-muted">Totale dall'inizio</div>
  </CardContent>
</Card>
```

- [ ] **Step 3: Commit**

```bash
git add mvp/src/app/progetti/[id]/page.tsx
git commit -m "feat(cost): per-project AI cost widget in project overview"
```

---

## Checkpoint finale Fase 0

- [ ] **Tutti i test passano**: `cd mvp && npm run test`
- [ ] **Coverage minimo accettabile**: `npm run test:coverage` mostra >50% sui moduli toccati
- [ ] **Lint pulito**: `npm run lint`
- [ ] **TypeScript pulito**: `npx tsc --noEmit`
- [ ] **Build successo locale**: `npm run build`
- [ ] **Deploy Railway verde** + migrate automatico verificato
- [ ] **Smoke test manuale completo:**
  - [ ] Login funziona, no bypass in prod
  - [ ] Configuro chiave OpenAI in Impostazioni → vedo "configurata"
  - [ ] Genero KB da una fonte → niente apiKey nel network payload (DevTools verify)
  - [ ] Genero una scheda → cost tracking visibile in `/impostazioni/consumo`
  - [ ] Cancello narratore → archiviato, schede preservate
  - [ ] Modifico testo scheda pubblicata → torna a draft + version++ + audio stale
  - [ ] Modifico semantic base POI → tutte le audio derivate marcate stale
  - [ ] POST /api/scrape senza session → 401
  - [ ] Cerco di pubblicare con zero schede → 400 blockers_present
  - [ ] Creo zona "chiusura" → si salva correttamente
  - [ ] Brief debounced → max 1 PUT/sec digitando
- [ ] **Branch mergiata su `main`** o tenuta separata fino al review umano

**Tempo stimato totale Fase 0:** 6-10 giorni di lavoro (1-2 settimane calendar con margine per debug).

---

## Cosa NON è in questo piano (per scelta)

- Setup Playwright E2E test: rimandato a Fase 1 quando il codice diventa più complesso
- Refactor di tutti i 25+ posti che usavano `loadApiKeys()` dal frontend: copre solo Impostazioni in 0.2.e, gli altri (chiamate AI dai vari step) vengono via via aggiornati nelle migrate route 0.2.d
- Storia/audit log delle chiavi API: per ora basta CRUD, l'audit completo è Fase 1.4 Editorial Operations
- Quote enforcement: la dashboard mostra il consumo, ma niente hard stop. Aggiungere quando un cliente vorrà cap

---

## Pre-execution checklist (prima di iniziare)

- [ ] Confermato il branch `feat/fase-0-stabilizzazione` su `main`
- [ ] Postgres test container in esecuzione (`docker ps | grep toolia-test-db`)
- [ ] `.env.test` configurato con DATABASE_URL test
- [ ] `npm install` eseguito con dipendenze test aggiunte (Task 0)
- [ ] Familiarità con `npm run test`, `npm run test:watch`, `npm run test:coverage`
- [ ] Railway service identificato per `Start Command` change (Task 0.1.b)

Quando tutto questo è verde, sei pronto a partire dal **Task 0** (setup testing) e procedere sequenzialmente.
