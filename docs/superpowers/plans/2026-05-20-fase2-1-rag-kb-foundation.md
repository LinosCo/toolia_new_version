# Fase 2.1 — Fondazione RAG/KB (Content Engine) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire la fondazione RAG del Content Engine nel repo Toolia (`mvp/`): pgvector abilitato, una tabella di embedding multi-tenant, una pipeline di chunking+embedding dei fatti KB, una retrieval API a similarità coseno filtrata per tenant/progetto, e un playground UI curato per testarla — tutto realmente funzionante e testato, non un mockup.

**Architecture:** pgvector su Postgres (zero servizi esterni). La colonna vettoriale è `Unsupported("vector(1536)")` in Prisma (Prisma non sa interrogarla): **insert via `$executeRaw`, retrieval via `$queryRaw` (`<=>` coseno), delete via Prisma client**. Embedding model `text-embedding-3-small` (1536 dim — sotto il limite 2000 dell'indice HNSW; `text-embedding-3-large` a 3072 NON è indicizzabile). Si riusa l'infra esistente: `getTenantApiKey`, `logLlmCall`, `prisma` singleton, pattern auth `getSessionUser`/`handleAuthError`. Async inline (no job queue in Fase 2.1: reindex sincrono con `maxDuration`).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Prisma 7 (`@prisma/adapter-pg`, generator `prisma-client` → `@/generated/prisma`), pgvector (HNSW cosine), OpenAI SDK nativo (`openai`), Vitest 4 (`fileParallelism:false`).

---

## File Structure

| File | Responsabilità |
|---|---|
| `mvp/prisma/schema.prisma` (modifica) | model `ContentEmbedding` + enum `EmbeddingSourceType` + relazione su `Project` |
| `mvp/prisma/migrations/<ts>_content_embedding/migration.sql` (nuovo, editato a mano) | `CREATE EXTENSION vector` + tabella + indice HNSW |
| `mvp/src/lib/content/chunk.ts` (nuovo) | `chunkText()` — splitting deterministico, funzione pura |
| `mvp/src/lib/content/embeddings.ts` (nuovo) | `createEmbeddings()` — chiama OpenAI, logga uso |
| `mvp/src/lib/content/indexer.ts` (nuovo) | `indexSource()`, `indexProjectKB()` — chunk→embed→upsert |
| `mvp/src/lib/content/retrieval.ts` (nuovo) | `retrieveContent()` — query coseno raw, filtro tenant |
| `mvp/src/app/api/projects/[id]/content/reindex/route.ts` (nuovo) | POST: re-indicizza i KBFact approvati del progetto |
| `mvp/src/app/api/projects/[id]/content/retrieve/route.ts` (nuovo) | POST: ricerca semantica |
| `mvp/src/app/progetti/[id]/content/page.tsx` (nuovo) | Playground UI (server component shell) |
| `mvp/src/app/progetti/[id]/content/retrieval-playground.tsx` (nuovo) | Playground UI (client: search + risultati) |
| `mvp/test/lib/content/chunk.test.ts` (nuovo) | unit chunk |
| `mvp/test/lib/content/embeddings.test.ts` (nuovo) | unit embeddings (mock openai) |
| `mvp/test/lib/content/indexer.test.ts` (nuovo) | integration indexer (DB reale di test) |
| `mvp/test/lib/content/retrieval.test.ts` (nuovo) | integration retrieval |
| `mvp/test/api/content-retrieve.test.ts` (nuovo) | route test retrieve |
| `mvp/test/api/content-reindex.test.ts` (nuovo) | route test reindex |
| `mvp/test/helpers/prisma.ts` (modifica) | aggiungere `ContentEmbedding` a `resetDb()` |

---

## Task 1: Schema `ContentEmbedding` + migrazione pgvector

**Files:**
- Modify: `mvp/prisma/schema.prisma`
- Create: `mvp/prisma/migrations/<timestamp>_content_embedding/migration.sql` (via `migrate dev --create-only`, poi editato)

- [ ] **Step 1: Aggiungere enum + model allo schema**

In `mvp/prisma/schema.prisma`, aggiungere in fondo (colonne mappate snake_case per avere SQL raw pulito):

```prisma
enum EmbeddingSourceType {
  KB_FACT
  POI_SEMANTIC
  BRIEF
  TENSION
  SCHEDA
  SOURCE
}

model ContentEmbedding {
  id         String              @id @default(cuid())
  tenantId   String              @map("tenant_id")
  projectId  String              @map("project_id")
  sourceType EmbeddingSourceType @map("source_type")
  sourceId   String              @map("source_id")
  chunkIndex Int                 @map("chunk_index")
  content    String
  embedding  Unsupported("vector(1536)")
  model      String
  dim        Int
  tokens     Int                 @default(0)
  createdAt  DateTime            @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([tenantId, projectId])
  @@index([sourceType, sourceId])
  @@map("content_embeddings")
}
```

- [ ] **Step 2: Aggiungere la relazione inversa su `Project`**

Nel model `Project` di `mvp/prisma/schema.prisma`, aggiungere fra le relazioni esistenti:

```prisma
  contentEmbeddings ContentEmbedding[]
```

- [ ] **Step 3: Generare la migrazione SENZA applicarla**

Run: `cd mvp && npx dotenv -e .env -- npx prisma migrate dev --name content_embedding --create-only`
Expected: crea `prisma/migrations/<timestamp>_content_embedding/migration.sql` (NON applicata). Se il comando fallisce sulla riga `vector(1536)` perché l'estensione non esiste, è atteso: si corregge la SQL nello step 4 e si applica nello step 5.

- [ ] **Step 4: Editare la migrazione SQL — estensione + indice HNSW**

Aprire il file `migration.sql` appena creato. **In cima** al file, prima di ogni `CREATE TABLE`, aggiungere:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**In fondo** al file, dopo il `CREATE TABLE "content_embeddings"` e i suoi indici, aggiungere l'indice vettoriale (Prisma non lo genera per colonne `Unsupported`):

```sql
CREATE INDEX "content_embeddings_embedding_idx"
  ON "content_embeddings" USING hnsw (embedding vector_cosine_ops);
```

> Nota: l'utente Postgres deve poter eseguire `CREATE EXTENSION` (di solito serve il ruolo owner/superuser; su Railway il ruolo di default lo consente).

- [ ] **Step 5: Applicare la migrazione**

Run: `cd mvp && npx dotenv -e .env -- npx prisma migrate dev`
Expected: la migrazione viene applicata; `npx prisma generate` rigenera il client in `src/generated/prisma`. Nessun errore.

- [ ] **Step 6: Test di verifica low-level (estensione + insert/query vettoriale)**

Create `mvp/test/lib/content/indexer.test.ts` con un PRIMO test che prova il giro vettoriale grezzo (gli altri test del file si aggiungono al Task 4):

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../helpers/prisma";

describe("pgvector foundation", () => {
  beforeEach(async () => { await resetDb(); });

  it("supports inserting and cosine-querying a vector", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });

    const vec = `[${Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0)).join(",")}]`;
    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO content_embeddings
        (id, tenant_id, project_id, source_type, source_id, chunk_index, content, embedding, model, dim, tokens, created_at)
      VALUES
        (${id}, ${tenantId}, ${project.id}, 'KB_FACT', 'src1', 0, 'hello', ${vec}::vector, 'text-embedding-3-small', 1536, 3, now())
    `;

    const rows = await prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
      SELECT id, 1 - (embedding <=> ${vec}::vector) AS similarity
      FROM content_embeddings
      WHERE tenant_id = ${tenantId} AND project_id = ${project.id}
      ORDER BY embedding <=> ${vec}::vector
      LIMIT 1
    `;
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].similarity)).toBeCloseTo(1, 5);
  });
});
```

- [ ] **Step 7: Aggiornare `resetDb()` con la nuova tabella**

In `mvp/test/helpers/prisma.ts`, dentro `resetDb()`, aggiungere la cancellazione di `ContentEmbedding` **prima** di `project` (per via della FK):

```typescript
  await prisma.contentEmbedding.deleteMany();
```

- [ ] **Step 8: Eseguire il test**

Run: `cd mvp && npx dotenv -e .env.test -- npx vitest run test/lib/content/indexer.test.ts`
Expected: PASS (1 test).

- [ ] **Step 9: Commit**

```bash
git add mvp/prisma/schema.prisma mvp/prisma/migrations mvp/src/generated/prisma mvp/test/lib/content/indexer.test.ts mvp/test/helpers/prisma.ts
git commit -m "feat(content): pgvector + ContentEmbedding model (RAG foundation)"
```

---

## Task 2: `chunkText()` — splitting deterministico (funzione pura)

**Files:**
- Create: `mvp/src/lib/content/chunk.ts`
- Test: `mvp/test/lib/content/chunk.test.ts`

- [ ] **Step 1: Scrivere il test che fallisce**

Create `mvp/test/lib/content/chunk.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/content/chunk";

describe("chunkText", () => {
  it("returns one chunk for short text", () => {
    const out = chunkText("ciao mondo", { size: 100, overlap: 10 });
    expect(out).toEqual(["ciao mondo"]);
  });

  it("returns empty array for empty/whitespace input", () => {
    expect(chunkText("   ", { size: 100, overlap: 10 })).toEqual([]);
  });

  it("splits long text into overlapping chunks", () => {
    const text = "a".repeat(250);
    const out = chunkText(text, { size: 100, overlap: 20 });
    // step = size - overlap = 80 → chunks start at 0,80,160,240
    expect(out.length).toBe(4);
    expect(out[0].length).toBe(100);
    expect(out[3]).toBe("a".repeat(10)); // tail
  });

  it("does not produce empty trailing chunk when text divides evenly", () => {
    const text = "a".repeat(80);
    const out = chunkText(text, { size: 100, overlap: 20 });
    expect(out).toEqual([text]);
  });
});
```

- [ ] **Step 2: Eseguire il test (deve fallire)**

Run: `cd mvp && npx dotenv -e .env.test -- npx vitest run test/lib/content/chunk.test.ts`
Expected: FAIL con "Cannot find module '@/lib/content/chunk'".

- [ ] **Step 3: Implementare**

Create `mvp/src/lib/content/chunk.ts`:

```typescript
export interface ChunkOptions {
  /** dimensione massima del chunk in caratteri */
  size: number;
  /** sovrapposizione fra chunk consecutivi in caratteri */
  overlap: number;
}

/**
 * Divide il testo in chunk sovrapposti, deterministico.
 * step = size - overlap. Restituisce [] per input vuoto/whitespace.
 */
export function chunkText(text: string, opts: ChunkOptions): string[] {
  const clean = text.trim();
  if (clean.length === 0) return [];
  const size = Math.max(1, opts.size);
  const overlap = Math.min(Math.max(0, opts.overlap), size - 1);
  const step = size - overlap;
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  for (let start = 0; start < clean.length; start += step) {
    const piece = clean.slice(start, start + size);
    chunks.push(piece);
    if (start + size >= clean.length) break;
  }
  return chunks;
}
```

- [ ] **Step 4: Eseguire il test (deve passare)**

Run: `cd mvp && npx dotenv -e .env.test -- npx vitest run test/lib/content/chunk.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add mvp/src/lib/content/chunk.ts mvp/test/lib/content/chunk.test.ts
git commit -m "feat(content): chunkText deterministic splitter"
```

---

## Task 3: `createEmbeddings()` — client OpenAI + logging uso

**Files:**
- Create: `mvp/src/lib/content/embeddings.ts`
- Test: `mvp/test/lib/content/embeddings.test.ts`

- [ ] **Step 1: Scrivere il test che fallisce**

Create `mvp/test/lib/content/embeddings.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("openai", () => ({
  default: vi.fn(() => ({ embeddings: { create: mockCreate } })),
}));
vi.mock("@/lib/tenant-keys", () => ({ getTenantApiKey: vi.fn() }));
vi.mock("@/lib/llm-usage", () => ({ logLlmCall: vi.fn() }));

import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import { createEmbeddings, EMBEDDING_MODEL, EMBEDDING_DIM } from "@/lib/content/embeddings";

describe("createEmbeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantApiKey).mockResolvedValue("sk-test");
  });

  it("embeds inputs and logs usage", async () => {
    mockCreate.mockResolvedValue({
      data: [{ embedding: new Array(EMBEDDING_DIM).fill(0.1) }],
      usage: { prompt_tokens: 42, total_tokens: 42 },
    });

    const out = await createEmbeddings(["ciao"], {
      tenantId: "t1", projectId: "p1", operation: "content_embed",
    });

    expect(out).toHaveLength(1);
    expect(out[0]).toHaveLength(EMBEDDING_DIM);
    expect(mockCreate).toHaveBeenCalledWith({ model: EMBEDDING_MODEL, input: ["ciao"] });
    expect(logLlmCall).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1", projectId: "p1", provider: "openai", model: EMBEDDING_MODEL, inputTokens: 42 }),
    );
  });

  it("throws a clear error when no API key", async () => {
    vi.mocked(getTenantApiKey).mockResolvedValue(null);
    await expect(
      createEmbeddings(["x"], { tenantId: "t1", projectId: "p1", operation: "content_embed" }),
    ).rejects.toThrow("OpenAI API key non configurata");
  });

  it("returns [] for empty input without calling the API", async () => {
    const out = await createEmbeddings([], { tenantId: "t1", projectId: "p1", operation: "content_embed" });
    expect(out).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Eseguire il test (deve fallire)**

Run: `cd mvp && npx dotenv -e .env.test -- npx vitest run test/lib/content/embeddings.test.ts`
Expected: FAIL con "Cannot find module '@/lib/content/embeddings'".

- [ ] **Step 3: Implementare**

Create `mvp/src/lib/content/embeddings.ts`:

```typescript
import OpenAI from "openai";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIM = 1536;

export interface EmbeddingContext {
  tenantId: string;
  projectId: string;
  operation: string;
}

/** Restituisce un embedding per ogni testo in input (stesso ordine). */
export async function createEmbeddings(
  inputs: string[],
  ctx: EmbeddingContext,
): Promise<number[][]> {
  if (inputs.length === 0) return [];

  const apiKey = await getTenantApiKey(ctx.tenantId, "openai");
  if (!apiKey) throw new Error("OpenAI API key non configurata per il tenant");

  const client = new OpenAI({ apiKey });
  const res = await client.embeddings.create({ model: EMBEDDING_MODEL, input: inputs });

  await logLlmCall({
    tenantId: ctx.tenantId,
    projectId: ctx.projectId,
    operation: ctx.operation,
    provider: "openai",
    model: EMBEDDING_MODEL,
    inputTokens: res.usage?.prompt_tokens ?? 0,
    outputTokens: 0,
  });

  return res.data.map((d) => d.embedding as number[]);
}
```

- [ ] **Step 4: Eseguire il test (deve passare)**

Run: `cd mvp && npx dotenv -e .env.test -- npx vitest run test/lib/content/embeddings.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add mvp/src/lib/content/embeddings.ts mvp/test/lib/content/embeddings.test.ts
git commit -m "feat(content): createEmbeddings client + usage logging"
```

---

## Task 4: `indexSource()` / `indexProjectKB()` — pipeline di indicizzazione

**Files:**
- Create: `mvp/src/lib/content/indexer.ts`
- Test: `mvp/test/lib/content/indexer.test.ts` (estende il file del Task 1)

- [ ] **Step 1: Scrivere i test che falliscono**

In `mvp/test/lib/content/indexer.test.ts`, aggiungere in cima ai mock e un nuovo `describe` (lasciando intatto il test "pgvector foundation"):

```typescript
import { vi } from "vitest";
vi.mock("@/lib/content/embeddings", async (orig) => {
  const actual = await orig<typeof import("@/lib/content/embeddings")>();
  return {
    ...actual,
    createEmbeddings: vi.fn(async (inputs: string[]) =>
      inputs.map((_, i) => {
        const v = new Array(actual.EMBEDDING_DIM).fill(0);
        v[i % actual.EMBEDDING_DIM] = 1;
        return v;
      }),
    ),
  };
});

import { indexSource, indexProjectKB } from "@/lib/content/indexer";

describe("indexSource", () => {
  beforeEach(async () => { await resetDb(); });

  it("chunks, embeds and stores rows for a source", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });

    const n = await indexSource({
      tenantId, projectId: project.id, sourceType: "KB_FACT", sourceId: "fact1",
      text: "a".repeat(250),
    });

    const stored = await prisma.contentEmbedding.findMany({ where: { sourceId: "fact1" } });
    expect(n).toBe(stored.length);
    expect(stored.length).toBeGreaterThan(1);
    expect(stored[0].model).toBe("text-embedding-3-small");
  });

  it("replaces old chunks on re-index (no duplicates)", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });

    await indexSource({ tenantId, projectId: project.id, sourceType: "KB_FACT", sourceId: "f", text: "a".repeat(250) });
    await indexSource({ tenantId, projectId: project.id, sourceType: "KB_FACT", sourceId: "f", text: "short" });

    const stored = await prisma.contentEmbedding.findMany({ where: { sourceId: "f" } });
    expect(stored.length).toBe(1);
    expect(stored[0].content).toBe("short");
  });

  it("indexProjectKB indexes only approved KBFacts", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    await prisma.kBFact.create({ data: { projectId: project.id, content: "fatto approvato", category: "storia", approved: true } });
    await prisma.kBFact.create({ data: { projectId: project.id, content: "bozza", category: "storia", approved: false } });

    const res = await indexProjectKB({ tenantId, projectId: project.id });

    expect(res.facts).toBe(1);
    const stored = await prisma.contentEmbedding.findMany({ where: { projectId: project.id, sourceType: "KB_FACT" } });
    expect(stored.length).toBe(1);
    expect(stored[0].content).toContain("fatto approvato");
  });
});
```

> Nota: verificare in `schema.prisma` i nomi reali dei campi `KBFact` usati qui (`content`, `category`, `approved`, `projectId`). Se differiscono, allineare test e implementazione.

- [ ] **Step 2: Eseguire i test (devono fallire)**

Run: `cd mvp && npx dotenv -e .env.test -- npx vitest run test/lib/content/indexer.test.ts`
Expected: FAIL con "Cannot find module '@/lib/content/indexer'".

- [ ] **Step 3: Implementare**

Create `mvp/src/lib/content/indexer.ts`:

```typescript
import { prisma } from "@/lib/db";
import { chunkText } from "@/lib/content/chunk";
import { createEmbeddings, EMBEDDING_MODEL, EMBEDDING_DIM } from "@/lib/content/embeddings";

type SourceType = "KB_FACT" | "POI_SEMANTIC" | "BRIEF" | "TENSION" | "SCHEDA" | "SOURCE";

const CHUNK = { size: 2000, overlap: 200 };

export interface IndexSourceArgs {
  tenantId: string;
  projectId: string;
  sourceType: SourceType;
  sourceId: string;
  text: string;
}

/** (Re)indicizza una singola sorgente: cancella i chunk vecchi, ricrea i nuovi. Ritorna il n. di chunk. */
export async function indexSource(args: IndexSourceArgs): Promise<number> {
  const { tenantId, projectId, sourceType, sourceId, text } = args;
  const chunks = chunkText(text, CHUNK);

  // delete-then-insert: i chunk si cancellano via Prisma client (colonna vettoriale non coinvolta)
  await prisma.contentEmbedding.deleteMany({ where: { tenantId, projectId, sourceType: sourceType as never, sourceId } });
  if (chunks.length === 0) return 0;

  const vectors = await createEmbeddings(chunks, { tenantId, projectId, operation: "content_index" });

  for (let i = 0; i < chunks.length; i++) {
    const vec = `[${vectors[i].join(",")}]`;
    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO content_embeddings
        (id, tenant_id, project_id, source_type, source_id, chunk_index, content, embedding, model, dim, tokens, created_at)
      VALUES
        (${id}, ${tenantId}, ${projectId}, ${sourceType}::"EmbeddingSourceType", ${sourceId}, ${i}, ${chunks[i]}, ${vec}::vector, ${EMBEDDING_MODEL}, ${EMBEDDING_DIM}, 0, now())
    `;
  }
  return chunks.length;
}

/** Reindicizza tutti i KBFact approvati di un progetto. */
export async function indexProjectKB(args: { tenantId: string; projectId: string }): Promise<{ facts: number; chunks: number }> {
  const facts = await prisma.kBFact.findMany({
    where: { projectId: args.projectId, approved: true },
    select: { id: true, content: true, category: true },
  });

  let chunks = 0;
  for (const f of facts) {
    const text = `[${f.category}] ${f.content}`;
    chunks += await indexSource({
      tenantId: args.tenantId, projectId: args.projectId,
      sourceType: "KB_FACT", sourceId: f.id, text,
    });
  }
  return { facts: facts.length, chunks };
}
```

- [ ] **Step 4: Eseguire i test (devono passare)**

Run: `cd mvp && npx dotenv -e .env.test -- npx vitest run test/lib/content/indexer.test.ts`
Expected: PASS (tutti i test del file, incluso "pgvector foundation").

- [ ] **Step 5: Commit**

```bash
git add mvp/src/lib/content/indexer.ts mvp/test/lib/content/indexer.test.ts
git commit -m "feat(content): index pipeline (chunk -> embed -> upsert)"
```

---

## Task 5: `retrieveContent()` — ricerca semantica raw

**Files:**
- Create: `mvp/src/lib/content/retrieval.ts`
- Test: `mvp/test/lib/content/retrieval.test.ts`

- [ ] **Step 1: Scrivere i test che falliscono**

Create `mvp/test/lib/content/retrieval.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../../helpers/prisma";

vi.mock("@/lib/content/embeddings", async (orig) => {
  const actual = await orig<typeof import("@/lib/content/embeddings")>();
  // query embedding: vettore unitario su un asse scelto dal testo ("axis:3" => asse 3)
  return {
    ...actual,
    createEmbeddings: vi.fn(async (inputs: string[]) =>
      inputs.map((t) => {
        const v = new Array(actual.EMBEDDING_DIM).fill(0);
        const m = /axis:(\d+)/.exec(t);
        v[m ? Number(m[1]) : 0] = 1;
        return v;
      }),
    ),
  };
});

import { indexSource } from "@/lib/content/indexer";
import { retrieveContent } from "@/lib/content/retrieval";

describe("retrieveContent", () => {
  beforeEach(async () => { await resetDb(); });

  it("returns the most similar chunk first, scoped to tenant+project", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });

    await indexSource({ tenantId, projectId: project.id, sourceType: "KB_FACT", sourceId: "a", text: "axis:0 contenuto A" });
    await indexSource({ tenantId, projectId: project.id, sourceType: "KB_FACT", sourceId: "b", text: "axis:5 contenuto B" });

    const hits = await retrieveContent({ tenantId, projectId: project.id, query: "axis:5 cerco B", topK: 5 });
    expect(hits[0].sourceId).toBe("b");
    expect(hits[0].similarity).toBeGreaterThan(hits[1].similarity);
  });

  it("does not leak rows from another project", async () => {
    const { tenantId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const p1 = await prisma.project.create({ data: { tenantId, name: "P1" } });
    const p2 = await prisma.project.create({ data: { tenantId, name: "P2" } });
    await indexSource({ tenantId, projectId: p2.id, sourceType: "KB_FACT", sourceId: "x", text: "axis:1 altro progetto" });

    const hits = await retrieveContent({ tenantId, projectId: p1.id, query: "axis:1 q", topK: 5 });
    expect(hits).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Eseguire i test (devono fallire)**

Run: `cd mvp && npx dotenv -e .env.test -- npx vitest run test/lib/content/retrieval.test.ts`
Expected: FAIL con "Cannot find module '@/lib/content/retrieval'".

- [ ] **Step 3: Implementare**

Create `mvp/src/lib/content/retrieval.ts`:

```typescript
import { prisma } from "@/lib/db";
import { createEmbeddings } from "@/lib/content/embeddings";

export interface RetrieveArgs {
  tenantId: string;
  projectId: string;
  query: string;
  topK?: number;
}

export interface RetrievalHit {
  id: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export async function retrieveContent(args: RetrieveArgs): Promise<RetrievalHit[]> {
  const topK = Math.min(Math.max(1, args.topK ?? 8), 50);
  const [queryVec] = await createEmbeddings([args.query], {
    tenantId: args.tenantId, projectId: args.projectId, operation: "content_retrieve",
  });
  const vec = `[${queryVec.join(",")}]`;

  const rows = await prisma.$queryRaw<RetrievalHit[]>`
    SELECT id,
           source_type AS "sourceType",
           source_id   AS "sourceId",
           chunk_index AS "chunkIndex",
           content,
           1 - (embedding <=> ${vec}::vector) AS similarity
    FROM content_embeddings
    WHERE tenant_id = ${args.tenantId} AND project_id = ${args.projectId}
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${topK}
  `;
  return rows.map((r) => ({ ...r, similarity: Number(r.similarity) }));
}
```

- [ ] **Step 4: Eseguire i test (devono passare)**

Run: `cd mvp && npx dotenv -e .env.test -- npx vitest run test/lib/content/retrieval.test.ts`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add mvp/src/lib/content/retrieval.ts mvp/test/lib/content/retrieval.test.ts
git commit -m "feat(content): semantic retrieval (cosine, tenant-scoped)"
```

---

## Task 6: API routes `reindex` + `retrieve`

**Files:**
- Create: `mvp/src/app/api/projects/[id]/content/reindex/route.ts`
- Create: `mvp/src/app/api/projects/[id]/content/retrieve/route.ts`
- Test: `mvp/test/api/content-reindex.test.ts`, `mvp/test/api/content-retrieve.test.ts`

- [ ] **Step 1: Scrivere il test reindex (deve fallire)**

Create `mvp/test/api/content-reindex.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));
vi.mock("@/lib/content/indexer", () => ({ indexProjectKB: vi.fn() }));

import { getSessionUser } from "@/lib/rbac";
import { indexProjectKB } from "@/lib/content/indexer";

describe("POST /api/projects/[id]/content/reindex", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("reindexes KB and returns counts", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(indexProjectKB).mockResolvedValue({ facts: 3, chunks: 7 });

    const { POST } = await import("@/app/api/projects/[id]/content/reindex/route");
    const res = await POST(new Request("http://x", { method: "POST" }) as never, { params: Promise.resolve({ id: project.id }) });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ facts: 3, chunks: 7 });
    expect(indexProjectKB).toHaveBeenCalledWith({ tenantId, projectId: project.id });
  });

  it("404 when project belongs to another tenant", async () => {
    const { userId } = await seedTenantAndUser();
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId: "other", role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/content/reindex/route");
    const res = await POST(new Request("http://x", { method: "POST" }) as never, { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Eseguire (deve fallire)**

Run: `cd mvp && npx dotenv -e .env.test -- npx vitest run test/api/content-reindex.test.ts`
Expected: FAIL con "Cannot find module '.../content/reindex/route'".

- [ ] **Step 3: Implementare la route reindex**

Create `mvp/src/app/api/projects/[id]/content/reindex/route.ts`:

```typescript
import { prisma } from "@/lib/db";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { indexProjectKB } from "@/lib/content/indexer";

export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const result = await indexProjectKB({ tenantId: user.tenantId, projectId: project.id });
    return Response.json(result);
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Eseguire (deve passare)**

Run: `cd mvp && npx dotenv -e .env.test -- npx vitest run test/api/content-reindex.test.ts`
Expected: PASS (2 test).

- [ ] **Step 5: Scrivere il test retrieve (deve fallire)**

Create `mvp/test/api/content-retrieve.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));
vi.mock("@/lib/content/retrieval", () => ({ retrieveContent: vi.fn() }));

import { getSessionUser } from "@/lib/rbac";
import { retrieveContent } from "@/lib/content/retrieval";

describe("POST /api/projects/[id]/content/retrieve", () => {
  beforeEach(async () => { await resetDb(); vi.clearAllMocks(); });

  it("returns hits for a query", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    vi.mocked(retrieveContent).mockResolvedValue([
      { id: "1", sourceType: "KB_FACT", sourceId: "a", chunkIndex: 0, content: "x", similarity: 0.9 },
    ]);

    const { POST } = await import("@/app/api/projects/[id]/content/retrieve/route");
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ query: "ciao", topK: 5 }) }) as never,
      { params: Promise.resolve({ id: project.id }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hits).toHaveLength(1);
    expect(retrieveContent).toHaveBeenCalledWith({ tenantId, projectId: project.id, query: "ciao", topK: 5 });
  });

  it("400 when query missing", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email: "a@b.c", tenantId, role: "Editor" as never });
    const { POST } = await import("@/app/api/projects/[id]/content/retrieve/route");
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({}) }) as never, { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 6: Implementare la route retrieve**

Create `mvp/src/app/api/projects/[id]/content/retrieve/route.ts`:

```typescript
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { retrieveContent } from "@/lib/content/retrieval";

export const maxDuration = 60;

const Body = z.object({ query: z.string().min(1), topK: z.number().int().min(1).max(50).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    const { id } = await params;

    const project = await prisma.project.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!project) return Response.json({ error: "not_found" }, { status: 404 });

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });

    const hits = await retrieveContent({
      tenantId: user.tenantId, projectId: project.id,
      query: parsed.data.query, topK: parsed.data.topK,
    });
    return Response.json({ hits });
  } catch (err) {
    const authResp = handleAuthError(err);
    if (authResp) return authResp;
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 7: Eseguire entrambi i test route**

Run: `cd mvp && npx dotenv -e .env.test -- npx vitest run test/api/content-retrieve.test.ts test/api/content-reindex.test.ts`
Expected: PASS (4 test).

- [ ] **Step 8: Commit**

```bash
git add mvp/src/app/api/projects/[id]/content mvp/test/api/content-retrieve.test.ts mvp/test/api/content-reindex.test.ts
git commit -m "feat(content): reindex + retrieve API routes"
```

---

## Task 7: Playground UI di retrieval (funzionale + UX curata)

**Obiettivo UX**: un'unica schermata dove l'operatore digita una domanda e vede **istantaneamente** i fatti verificati che corrispondono, con **barra di similarità**, **provenienza** (tipo sorgente + id) e stati chiari (vuoto / caricamento / errore / nessun risultato). Il "wow" qui è: *"scrivo una domanda e vedo la mia knowledge base rispondere, con il punteggio di pertinenza"*. Niente mockup: chiama le route reali del Task 6.

**Files:**
- Create: `mvp/src/app/progetti/[id]/content/page.tsx`
- Create: `mvp/src/app/progetti/[id]/content/retrieval-playground.tsx`

- [ ] **Step 1: Server shell della pagina**

Create `mvp/src/app/progetti/[id]/content/page.tsx`:

```tsx
import { RetrievalPlayground } from "./retrieval-playground";

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Content Engine — Retrieval</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Interroga la knowledge base verificata del progetto. Ogni risultato mostra la pertinenza e la fonte.
        </p>
      </header>
      <RetrievalPlayground projectId={id} />
    </main>
  );
}
```

- [ ] **Step 2: Client component (search + risultati + reindex + stati)**

Create `mvp/src/app/progetti/[id]/content/retrieval-playground.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Search, Loader2, RefreshCw, FileText, AlertCircle } from "lucide-react";

interface Hit {
  id: string; sourceType: string; sourceId: string; chunkIndex: number; content: string; similarity: number;
}

const SOURCE_LABEL: Record<string, string> = {
  KB_FACT: "Fatto KB", POI_SEMANTIC: "POI", BRIEF: "Brief", TENSION: "Tensione", SCHEDA: "Scheda", SOURCE: "Fonte",
};

export function RetrievalPlayground({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(null); setNotice(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/content/retrieve`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, topK: 8 }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "errore");
      setHits((await res.json()).hits as Hit[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di ricerca");
    } finally {
      setLoading(false);
    }
  }

  async function reindex() {
    setReindexing(true); setError(null); setNotice(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/content/reindex`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "errore");
      const { facts, chunks } = await res.json();
      setNotice(`Indicizzati ${facts} fatti (${chunks} chunk).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di reindex");
    } finally {
      setReindexing(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Es. perché l'affresco è incompiuto?"
            className="w-full rounded-lg border bg-background py-2.5 pl-9 pr-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
          />
        </div>
        <button type="submit" disabled={loading || !query.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Cerca
        </button>
        <button type="button" onClick={reindex} disabled={reindexing} title="Reindicizza la KB del progetto"
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium disabled:opacity-50">
          {reindexing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </button>
      </form>

      {notice && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
      {error && (
        <p className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="size-4" /> {error}
        </p>
      )}

      {hits === null && !loading && (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Digita una domanda per interrogare la knowledge base.
          <br />Se non hai risultati, premi <RefreshCw className="inline size-3" /> per indicizzare i fatti approvati.
        </div>
      )}
      {hits !== null && hits.length === 0 && !loading && (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          Nessun risultato. Hai indicizzato la KB? Premi il pulsante <RefreshCw className="inline size-3" />.
        </div>
      )}

      <ul className="space-y-3">
        {hits?.map((h) => (
          <li key={h.id} className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                <FileText className="size-3" /> {SOURCE_LABEL[h.sourceType] ?? h.sourceType}
              </span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(h.similarity * 100)}%` }} />
                </div>
                <span className="tabular-nums text-xs text-muted-foreground">{(h.similarity * 100).toFixed(0)}%</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed">{h.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

> Nota UI: la classe `bg-brand` e `text-muted-foreground` seguono il design system Tailwind già usato nel repo (vedi `visitor-home.tsx`/altre pagine). Se un token non esiste, sostituire con l'equivalente presente (es. `bg-blue-600`). Le icone `lucide-react` sono già dipendenza del progetto.

- [ ] **Step 3: Verifica manuale (build + smoke)**

Run: `cd mvp && npx next build` (oppure `npm run build`)
Expected: build OK senza errori di tipo sulle nuove pagine.

> Verifica manuale opzionale (dev): avviare l'app, aprire `/progetti/<id reale>/content`, premere reindex su un progetto con KBFact approvati, poi cercare — i risultati appaiono con barra di pertinenza.

- [ ] **Step 4: Commit**

```bash
git add mvp/src/app/progetti/[id]/content
git commit -m "feat(content): retrieval playground UI"
```

---

## Task 8: Integrazione finale + suite verde

**Files:**
- (verifica) tutti i file creati

- [ ] **Step 1: Eseguire l'intera suite di test**

Run: `cd mvp && npx dotenv -e .env.test -- npx vitest run`
Expected: PASS su tutta la suite (i test esistenti + i nuovi del Content Engine). Nessun fallimento.

- [ ] **Step 2: Type check**

Run: `cd mvp && npx tsc --noEmit`
Expected: nessun errore di tipo.

- [ ] **Step 3: Commit finale (se restano modifiche non committate)**

```bash
git add -A mvp
git commit -m "test(content): full suite green for RAG/KB foundation"
```

- [ ] **Step 4: Push**

```bash
git push origin HEAD:main
```

---

## ⚠️ Prerequisito di DEPLOY (produzione)

**Il Postgres di produzione (Railway) DEVE avere l'estensione `pgvector` disponibile a livello server prima di applicare la migrazione `content_embedding`.** La migrazione fa `CREATE EXTENSION IF NOT EXISTS vector` — se i binari pgvector non sono installati sul server, la migrazione fallisce. In locale è stato risolto con `brew install pgvector` (Postgres Homebrew). Su Railway: usare un Postgres con pgvector abilitato (i template Postgres recenti di Railway lo supportano). Documentare nel runbook di deploy. Stesso vincolo per qualsiasi ambiente di staging.

## ⚠️ Gotcha ricorrente: Prisma droppa l'indice HNSW a ogni `migrate dev`

`prisma migrate dev` NON "vede" l'indice `content_embeddings_embedding_idx` (la colonna `embedding` è `Unsupported("vector(1536)")`) → ad **ogni nuova migrazione** Prisma genera uno spurio `DROP INDEX "content_embeddings_embedding_idx";`. Se applicato, l'indice vettoriale sparisce (la retrieval continua a funzionare via seq-scan, ma lenta a scala). È già successo con la migrazione `brand_layer` di F2.2.

**Regola per ogni futura `migrate dev`** che tocca lo schema:
1. Aprire la `migration.sql` generata e **rimuovere** la riga `DROP INDEX "content_embeddings_embedding_idx";` (NON quella di altri indici legittimi).
2. Se è già stata applicata, aggiungere una migrazione di ripristino come `20260520150000_restore_content_embeddings_hnsw/migration.sql` con `CREATE INDEX IF NOT EXISTS ... USING hnsw (embedding vector_cosine_ops)` e `prisma migrate deploy`.

## Note per l'esecutore

- **`.env.test`** deve puntare a un DB Postgres di test il cui ruolo possa eseguire `CREATE EXTENSION vector` (la prima esecuzione del Task 1 lo crea). Se la migrazione di test non è applicata, eseguire `cd mvp && npx dotenv -e .env.test -- npx prisma migrate deploy` prima dei test.
- **Nomi campi `KBFact`**: il piano assume `content`, `category`, `approved`, `projectId`. Verificare in `schema.prisma` (Task 4 Step 1) e allineare se diversi.
- **`logLlmCall` firma**: il piano assume `{ tenantId, projectId, operation, provider, model, inputTokens, outputTokens }`. Verificare in `mvp/src/lib/llm-usage.ts` e allineare il campo `operation` se nel codice si chiama diversamente (es. `operationType`).
- **Dimensione embedding**: fissata a 1536 (`text-embedding-3-small`). L'upgrade a large/3072 richiede `halfvec` o riduzione dimensioni (`dimensions` param) per restare sotto il limite indice HNSW — fuori scope di F2.1, tracciato come campo `model`/`dim`.
