# Fase 1 — TDD Implementation Plan (Fondazione architetturale)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) for tracking.

**Goal:** Introdurre i 3 layer architetturali mancanti dal piano legacy: Segment Graph (Step 2), Editorial Lenses come asse di generazione contenuti (Step 3-5), Narrative Tension Map (Step 1). Questa è la **fondazione** su cui Fase 2 (Content Engine RAG) e Fase 3+ (audioguide evoluta) verranno costruite.

**Architecture:**
- 3 sotto-progetti sequenziali con dipendenze chiare (1.1 → 1.2 → 1.3 raccomandato)
- Schema changes additivi dove possibile; refactor invasivi quando necessario per allineamento strategico (constraint Scheda)
- Decision-from-user: **reset progetti demo** invece di migration scripts — nuovi progetti usano nuovo modello, demo precedenti si ricreano
- Test-first ogni volta che il codice ha logica branching o stato

**Tech Stack additions:**
- Nessuna nuova dipendenza — sfruttiamo Prisma 7, Vitest, e librerie esistenti
- Eventualmente in 1.1: libreria di rendering grafico forza-diretta per la "vista logica" del segment graph (libreria a scelta dell'implementer in base al peso bundle: `d3-force` per controllo, oppure `reactflow` per UI ricca)

**Prerequisites (Fase 0 deployed):**
- Branch `claude/musing-mestorf-3a54ee` (o nuovo branch da `main`)
- Test DB Postgres su porta 5433 running
- `.env.test` configurato
- Postgres `main` su Railway aggiornato (verificare dashboard Railway)
- `mvp/src/lib/tenant-keys.ts` esiste (per server-side LLM calls)
- `mvp/src/lib/llm-usage.ts` esiste (per tracking dei nuovi prompt LLM)

---

## Decisione strategica — ordine di esecuzione

| Sub | Why first/last | Effort |
|---|---|---|
| **1.1 Segment Graph** | Fondazione spaziale. Sblocca compositore di percorsi futuri. Tocca schema nuovo, UI map-first nuova. | 8-12 giorni |
| **1.2 Editorial Lenses** | Refactor invasivo (constraint Scheda). Beneficia di lavoro UI già fatto in 1.1. Cambio paradigma di generazione contenuto. | 10-15 giorni |
| **1.3 Narrative Tension Map** | Indipendente da 1.1 e 1.2. Beneficia di leggere KB già esistenti. Può essere fatto in parallelo con 1.2 se più persone. | 5-7 giorni |

**Raccomandazione**: sequenziale 1.1 → 1.2 → 1.3 con 1 dev FT. Parallelizzabile 1.2+1.3 con 2 dev.

---

## Sub-project 1.1 — Segment Graph

**Why:** Piano legacy: *"la verità operativa della visita"*. Senza grafo dei segmenti, il compositore di Step 4-6 opera al buio: impossibile calcolare costi di percorrenza realistici, attriti di deviazione, percorribilità fisica. I percorsi attuali (`Path.poiOrderJson`) sono sequenze cieche non grafi.

**What:**
- 2 nuovi modelli Prisma: `MapNode`, `Segment`
- API CRUD endpoint `/api/projects/[id]/graph` (full-replace pattern come `/map` esistente)
- AI endpoint `POST /api/ai/propose-graph` che propone nodi+segmenti da planimetria+POI esistenti
- UI component `<GraphEditor>` map-first integrato in `/progetti/[id]/luogo/`
- Compose-visit può opzionalmente usare segments per tempi realistici

### Task 1.1.0 — Setup branch + verifica baseline

**Files:** none

- [ ] **Step 1: Verifica stato git**

```bash
cd /Users/tommycinti/Documents/GitHub/toolia_studio/.claude/worktrees/musing-mestorf-3a54ee
git status
git log --oneline -3
```

Expected: clean working tree, recent commits include Fase 0.

- [ ] **Step 2: Pull main**

```bash
git pull origin main --ff-only
```

- [ ] **Step 3: Verify test suite baseline**

```bash
cd mvp && npm run test 2>&1 | tail -5
```

Note the baseline count. Will be the reference for "no regression".

### Task 1.1.1 — Schema migration MapNode + Segment

**Files:**
- Modify: `mvp/prisma/schema.prisma`
- Create: `mvp/prisma/migrations/<timestamp>_segment_graph/migration.sql`

- [ ] **Step 1: Add models to schema**

Append to `mvp/prisma/schema.prisma`:

```prisma
// ============================================================
// SEGMENT GRAPH (Fase 1.1) — verità spaziale del progetto
// ============================================================

model MapNode {
  id           String   @id @default(cuid())
  projectId    String
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  kind         NodeKind
  lat          Float?
  lng          Float?
  planimetriaX Float?
  planimetriaY Float?
  label        String?
  orderIndex   Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  segmentsFrom Segment[] @relation("SegmentFrom")
  segmentsTo   Segment[] @relation("SegmentTo")
  poisHere     POI[]    @relation("POIOnNode")
  @@index([projectId])
}

enum NodeKind {
  accesso
  bivio
  transizione
  rientro
}

model Segment {
  id            String      @id @default(cuid())
  projectId     String
  project       Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  fromNodeId    String
  fromNode      MapNode     @relation("SegmentFrom", fields: [fromNodeId], references: [id], onDelete: Cascade)
  toNodeId      String
  toNode        MapNode     @relation("SegmentTo", fields: [toNodeId], references: [id], onDelete: Cascade)
  kind          SegmentKind
  traversalSec  Int?
  detourCost    Float?      // 0-1
  poiIds        String[]    @default([])  // POI che vivono lungo questo segmento
  bidirectional Boolean     @default(true)
  label         String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  @@index([projectId])
  @@index([fromNodeId])
  @@index([toNodeId])
}

enum SegmentKind {
  passaggio
  ramo
  loop
  connessione
}
```

Then modify `model POI {` to add optional FK to node:

```prisma
model POI {
  // ... existing fields ...
  nodeId       String?
  node         MapNode? @relation("POIOnNode", fields: [nodeId], references: [id], onDelete: SetNull)
  // ... rest unchanged ...
}
```

Then modify `model Project {` to add reverse relations:

```prisma
model Project {
  // ... existing relations ...
  mapNodes     MapNode[]
  segments     Segment[]
}
```

- [ ] **Step 2: Create migration manually**

Create directory: `mvp/prisma/migrations/20260520000000_segment_graph/migration.sql`

```sql
-- Enums
CREATE TYPE "NodeKind" AS ENUM ('accesso', 'bivio', 'transizione', 'rientro');
CREATE TYPE "SegmentKind" AS ENUM ('passaggio', 'ramo', 'loop', 'connessione');

-- MapNode
CREATE TABLE "MapNode" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "kind" "NodeKind" NOT NULL,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "planimetriaX" DOUBLE PRECISION,
  "planimetriaY" DOUBLE PRECISION,
  "label" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MapNode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MapNode_projectId_idx" ON "MapNode"("projectId");
ALTER TABLE "MapNode" ADD CONSTRAINT "MapNode_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Segment
CREATE TABLE "Segment" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "fromNodeId" TEXT NOT NULL,
  "toNodeId" TEXT NOT NULL,
  "kind" "SegmentKind" NOT NULL,
  "traversalSec" INTEGER,
  "detourCost" DOUBLE PRECISION,
  "poiIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "bidirectional" BOOLEAN NOT NULL DEFAULT true,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Segment_projectId_idx" ON "Segment"("projectId");
CREATE INDEX "Segment_fromNodeId_idx" ON "Segment"("fromNodeId");
CREATE INDEX "Segment_toNodeId_idx" ON "Segment"("toNodeId");
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_fromNodeId_fkey"
  FOREIGN KEY ("fromNodeId") REFERENCES "MapNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_toNodeId_fkey"
  FOREIGN KEY ("toNodeId") REFERENCES "MapNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- POI.nodeId
ALTER TABLE "POI" ADD COLUMN "nodeId" TEXT;
ALTER TABLE "POI" ADD CONSTRAINT "POI_nodeId_fkey"
  FOREIGN KEY ("nodeId") REFERENCES "MapNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "POI_nodeId_idx" ON "POI"("nodeId");
```

- [ ] **Step 3: Apply to test DB + regenerate client**

```bash
cd mvp
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/toolia_test" \
  PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=yes \
  npx prisma migrate deploy
npx prisma generate
```

- [ ] **Step 4: Update test helpers**

Modify `mvp/test/helpers/prisma.ts` resetDb function — add to top of cleanup (before audioAsset/scheda):

```typescript
await prisma.segment.deleteMany();
await prisma.mapNode.deleteMany();
```

- [ ] **Step 5: Run test suite — verify migration didn't break anything**

```bash
npm run test 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add mvp/prisma/ mvp/test/helpers/prisma.ts
git commit -m "$(cat <<'EOF'
feat(graph): add MapNode + Segment schema for segment graph

Introduces the spatial graph foundation per legacy Step 2 plan.
Nodes have 4 kinds (accesso/bivio/transizione/rientro).
Segments have 4 kinds (passaggio/ramo/loop/connessione) with
optional traversal seconds and detour cost.

POI.nodeId optional FK supports the "POI on node" pattern.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.1.2 — CRUD endpoint `/api/projects/[id]/graph`

**Files:**
- Create: `mvp/src/app/api/projects/[id]/graph/route.ts`
- Test: `mvp/test/api/graph.test.ts`

- [ ] **Step 1: Write test**

`mvp/test/api/graph.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, seedTenantAndUser, getTestPrisma } from "../helpers/prisma";

vi.mock("@/lib/rbac", () => ({
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  handleAuthError: vi.fn().mockReturnValue(null),
}));

import { getSessionUser } from "@/lib/rbac";

describe("/api/projects/[id]/graph", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  it("GET returns empty arrays when no graph exists", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { GET } = await import("@/app/api/projects/[id]/graph/route");
    const res = await GET(new Request("http://x"), {
      params: Promise.resolve({ id: project.id }),
    });
    const body = await res.json();
    expect(body).toEqual({ nodes: [], segments: [] });
  });

  it("PUT replaces entire graph (full-replace pattern)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { PUT } = await import("@/app/api/projects/[id]/graph/route");
    const res = await PUT(new Request("http://x", {
      method: "PUT",
      body: JSON.stringify({
        nodes: [
          { id: "tmp-n1", kind: "accesso", lat: 45.4, lng: 11.2, label: "Ingresso" },
          { id: "tmp-n2", kind: "bivio", lat: 45.41, lng: 11.21, label: "Bivio scale" },
        ],
        segments: [
          { id: "tmp-s1", fromNodeId: "tmp-n1", toNodeId: "tmp-n2", kind: "passaggio", traversalSec: 60 },
        ],
      }),
    }), { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(200);
    const stored = await prisma.mapNode.findMany({ where: { projectId: project.id } });
    expect(stored).toHaveLength(2);
    const segments = await prisma.segment.findMany({ where: { projectId: project.id } });
    expect(segments).toHaveLength(1);
  });

  it("PUT enforces tenant isolation (other tenant gets 404)", async () => {
    const t1 = await seedTenantAndUser();
    const t2 = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId: t1.tenantId, name: "P" } });
    vi.mocked(getSessionUser).mockResolvedValue({
      id: t2.userId, email: "b@b.c", tenantId: t2.tenantId, role: "Admin" as any,
    });
    const { PUT } = await import("@/app/api/projects/[id]/graph/route");
    const res = await PUT(new Request("http://x", {
      method: "PUT",
      body: JSON.stringify({ nodes: [], segments: [] }),
    }), { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement `mvp/src/app/api/projects/[id]/graph/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import type { NodeKind, SegmentKind } from "@/generated/prisma/enums";

const VALID_NODE_KINDS = new Set<NodeKind>(["accesso", "bivio", "transizione", "rientro"]);
const VALID_SEGMENT_KINDS = new Set<SegmentKind>(["passaggio", "ramo", "loop", "connessione"]);

interface InputNode {
  id: string;
  kind: string;
  lat?: number | null;
  lng?: number | null;
  planimetriaX?: number | null;
  planimetriaY?: number | null;
  label?: string | null;
  orderIndex?: number;
}

interface InputSegment {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  kind: string;
  traversalSec?: number | null;
  detourCost?: number | null;
  poiIds?: string[];
  bidirectional?: boolean;
  label?: string | null;
}

interface GraphBody {
  nodes: InputNode[];
  segments: InputSegment[];
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getSessionUser();
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) return new Response("Not found", { status: 404 });

    const [nodes, segments] = await Promise.all([
      prisma.mapNode.findMany({ where: { projectId: id }, orderBy: { orderIndex: "asc" } }),
      prisma.segment.findMany({ where: { projectId: id } }),
    ]);

    return NextResponse.json({ nodes, segments });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) return new Response("Not found", { status: 404 });

    const body: GraphBody = await req.json();
    if (!Array.isArray(body.nodes) || !Array.isArray(body.segments)) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    // Validate kinds
    for (const n of body.nodes) {
      if (!VALID_NODE_KINDS.has(n.kind as NodeKind)) {
        return NextResponse.json({ error: "invalid_node_kind", kind: n.kind }, { status: 400 });
      }
    }
    for (const s of body.segments) {
      if (!VALID_SEGMENT_KINDS.has(s.kind as SegmentKind)) {
        return NextResponse.json({ error: "invalid_segment_kind", kind: s.kind }, { status: 400 });
      }
    }

    // Full-replace: delete all, recreate from body
    // Note: Prisma cascade on segments will trigger when nodes are deleted, so we delete segments first explicitly
    await prisma.$transaction([
      prisma.segment.deleteMany({ where: { projectId: id } }),
      prisma.mapNode.deleteMany({ where: { projectId: id } }),
    ]);

    // Map temp IDs to real CUIDs to support segment references
    const idMap = new Map<string, string>();
    const nodesToCreate = body.nodes.map((n) => {
      const realId = n.id.startsWith("tmp-") || !n.id ? undefined : n.id;
      return { input: n, realId };
    });

    const createdNodes = await Promise.all(
      nodesToCreate.map(async ({ input, realId }) => {
        const created = await prisma.mapNode.create({
          data: {
            ...(realId ? { id: realId } : {}),
            projectId: id,
            kind: input.kind as NodeKind,
            lat: input.lat ?? null,
            lng: input.lng ?? null,
            planimetriaX: input.planimetriaX ?? null,
            planimetriaY: input.planimetriaY ?? null,
            label: input.label ?? null,
            orderIndex: input.orderIndex ?? 0,
          },
        });
        idMap.set(input.id, created.id);
        return created;
      }),
    );

    const createdSegments = await Promise.all(
      body.segments.map(async (s) => {
        const fromId = idMap.get(s.fromNodeId) ?? s.fromNodeId;
        const toId = idMap.get(s.toNodeId) ?? s.toNodeId;
        return prisma.segment.create({
          data: {
            projectId: id,
            fromNodeId: fromId,
            toNodeId: toId,
            kind: s.kind as SegmentKind,
            traversalSec: s.traversalSec ?? null,
            detourCost: s.detourCost ?? null,
            poiIds: s.poiIds ?? [],
            bidirectional: s.bidirectional ?? true,
            label: s.label ?? null,
          },
        });
      }),
    );

    return NextResponse.json({ nodes: createdNodes, segments: createdSegments });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add mvp/src/app/api/projects/[id]/graph/ mvp/test/api/graph.test.ts
git commit -m "feat(graph): CRUD endpoint for MapNode + Segment with full-replace pattern

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.1.3 — AI endpoint `/api/ai/propose-graph`

**Files:**
- Create: `mvp/src/app/api/ai/propose-graph/route.ts`

- [ ] **Step 1: Implement route**

Pattern simile a `propose-luogo` ma per il grafo:

```typescript
import { NextResponse } from "next/server";
import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { getTenantApiKey, type TenantApiProvider } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import OpenAI from "openai";

export const maxDuration = 120;

const SYSTEM_PROMPT = `Sei un planner di percorsi per audioguide AI di siti culturali.

Dato un set di POI (con coordinate planimetria normalizzate 0-1 o lat/lng) e una descrizione del luogo, identifica:
- NODI TOPOLOGICI: punti di controllo del movimento. 4 tipi:
  * "accesso" — ingressi e uscite
  * "bivio" — punti dove i percorsi si dividono
  * "transizione" — passaggi fra zone narrative diverse
  * "rientro" — punti dove un percorso ramificato torna sul backbone
- SEGMENTI: collegamenti fra nodi. 4 tipi:
  * "passaggio" — tratto lineare standard
  * "ramo" — deviazione opzionale
  * "loop" — anello che torna al punto di partenza
  * "connessione" — collegamento fra zone distanti

REGOLE FERREE:
- NON inventare connessioni implausibili dato il layout
- Privilegia la verità fisica del luogo sulla narrazione
- POI possono coincidere con un nodo (settando POI.nodeId) o vivere lungo un segmento (Segment.poiIds)
- Tempo di percorrenza in secondi (stima realistica)
- Segmenti bidirezionali di default (esplicitare bidirectional:false se uni-direzionale)

Output JSON:
{
  "nodes": [
    {"tempId": "n1", "kind": "accesso", "lat": ?, "lng": ?, "planimetriaX": ?, "planimetriaY": ?, "label": "Ingresso principale", "orderIndex": 0}
  ],
  "segments": [
    {"tempId": "s1", "fromTempId": "n1", "toTempId": "n2", "kind": "passaggio", "traversalSec": 60, "detourCost": 0, "poiIds": ["..."], "bidirectional": true, "label": "Atrio → Sala armi"}
  ]
}

Restituisci SOLO il JSON, niente markdown, niente commenti.`;

interface Body {
  projectId: string;
  poiIds: string[];
  poisData: Array<{ id: string; name: string; planimetriaX?: number; planimetriaY?: number; lat?: number; lng?: number }>;
  description?: string;
  provider?: TenantApiProvider;
}

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

  const body: Body = await req.json();
  const provider = body.provider ?? "openai";
  const apiKey = await getTenantApiKey(tenantId, provider);
  if (!apiKey) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 400 });
  }

  const userPrompt = `POI del progetto:
${body.poisData.map((p) => `- ${p.id} "${p.name}" pos: ${p.planimetriaX ?? "?"},${p.planimetriaY ?? "?"} GPS: ${p.lat ?? "?"},${p.lng ?? "?"}`).join("\n")}

${body.description ? `Descrizione luogo: ${body.description}` : ""}

Proponi nodi e segmenti.`;

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 8000,
    response_format: { type: "json_object" },
  });

  await logLlmCall({
    tenantId,
    projectId: body.projectId,
    operation: "propose-graph",
    provider: "openai",
    model: "gpt-4o",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: "no_response" }, { status: 500 });
  }
  try {
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: "invalid_json", raw: content }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add mvp/src/app/api/ai/propose-graph/
git commit -m "feat(graph): AI endpoint propose-graph for node+segment suggestions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.1.4 — UI `<GraphEditor>` component

**Files:**
- Create: `mvp/src/components/graph-editor.tsx`
- Modify: `mvp/src/app/progetti/[id]/luogo/page.tsx` (add new tab)
- Add types in `mvp/src/lib/project-store.ts`

- [ ] **Step 1: Add types to project-store.ts**

In `mvp/src/lib/project-store.ts`, add:

```typescript
export type NodeKind = "accesso" | "bivio" | "transizione" | "rientro";
export type SegmentKind = "passaggio" | "ramo" | "loop" | "connessione";

export interface MapNode {
  id: string;
  kind: NodeKind;
  lat?: number | null;
  lng?: number | null;
  planimetriaX?: number | null;
  planimetriaY?: number | null;
  label?: string | null;
  orderIndex: number;
}

export interface Segment {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  kind: SegmentKind;
  traversalSec?: number | null;
  detourCost?: number | null;
  poiIds: string[];
  bidirectional: boolean;
  label?: string | null;
}

export interface GraphData {
  nodes: MapNode[];
  segments: Segment[];
}

export async function loadGraph(projectId: string): Promise<GraphData> {
  const res = await fetch(`/api/projects/${projectId}/graph`);
  if (!res.ok) throw new Error("Failed to load graph");
  return res.json();
}

export async function saveGraph(projectId: string, data: GraphData): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/graph`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save graph");
}
```

- [ ] **Step 2: Implement `<GraphEditor>` component**

This is the largest UI in Fase 1. Two views:
- **Topological view**: SVG/Canvas with nodes as circles + segments as lines. Click empty space to add node, click node-then-node to add segment.
- **Spatial view**: overlay on planimetria image (if available). Drag nodes to position on planimetria.

`mvp/src/components/graph-editor.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MapNode, Segment, NodeKind, SegmentKind, GraphData } from "@/lib/project-store";
import { loadGraph, saveGraph } from "@/lib/project-store";

interface Props {
  projectId: string;
  planimetriaUrl?: string;
  poiList?: Array<{ id: string; name: string }>;
  onChange?: (g: GraphData) => void;
}

type Mode = "view" | "add_node" | "add_segment" | "edit";

const NODE_KIND_LABELS: Record<NodeKind, string> = {
  accesso: "Accesso",
  bivio: "Bivio",
  transizione: "Transizione",
  rientro: "Rientro",
};

const NODE_KIND_COLORS: Record<NodeKind, string> = {
  accesso: "#22c55e",
  bivio: "#f59e0b",
  transizione: "#3b82f6",
  rientro: "#a855f7",
};

const SEGMENT_KIND_STYLES: Record<SegmentKind, string> = {
  passaggio: "stroke-current",
  ramo: "stroke-current opacity-60 stroke-dasharray-4",
  loop: "stroke-current stroke-2",
  connessione: "stroke-current stroke-1 opacity-40",
};

export function GraphEditor({ projectId, planimetriaUrl, poiList, onChange }: Props) {
  const [graph, setGraph] = useState<GraphData>({ nodes: [], segments: [] });
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("view");
  const [selectedNodeKind, setSelectedNodeKind] = useState<NodeKind>("transizione");
  const [selectedSegmentKind, setSelectedSegmentKind] = useState<SegmentKind>("passaggio");
  const [pendingFromNode, setPendingFromNode] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [view, setView] = useState<"topological" | "spatial">(planimetriaUrl ? "spatial" : "topological");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGraph(projectId)
      .then((g) => setGraph(g))
      .finally(() => setLoading(false));
  }, [projectId]);

  const persistDebounced = useCallback(async (g: GraphData) => {
    try {
      await saveGraph(projectId, g);
      onChange?.(g);
    } catch (e) {
      console.error("Failed to save graph:", e);
    }
  }, [projectId, onChange]);

  function addNodeAtPosition(x: number, y: number, kind: NodeKind) {
    const node: MapNode = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind,
      planimetriaX: x,
      planimetriaY: y,
      orderIndex: graph.nodes.length,
    };
    const next = { ...graph, nodes: [...graph.nodes, node] };
    setGraph(next);
    persistDebounced(next);
  }

  function startSegmentFromNode(nodeId: string) {
    if (pendingFromNode === nodeId) {
      setPendingFromNode(null);
    } else if (pendingFromNode) {
      const segment: Segment = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fromNodeId: pendingFromNode,
        toNodeId: nodeId,
        kind: selectedSegmentKind,
        poiIds: [],
        bidirectional: true,
      };
      const next = { ...graph, segments: [...graph.segments, segment] };
      setGraph(next);
      persistDebounced(next);
      setPendingFromNode(null);
    } else {
      setPendingFromNode(nodeId);
    }
  }

  function deleteNode(nodeId: string) {
    if (!confirm("Eliminare il nodo e i segmenti collegati?")) return;
    const next = {
      nodes: graph.nodes.filter((n) => n.id !== nodeId),
      segments: graph.segments.filter((s) => s.fromNodeId !== nodeId && s.toNodeId !== nodeId),
    };
    setGraph(next);
    persistDebounced(next);
    setSelectedNodeId(null);
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "add_node") return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    addNodeAtPosition(x, y, selectedNodeKind);
    setMode("view");
  }

  if (loading) return <div className="p-6">Caricamento grafo...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setMode("view")}
          className={`px-3 py-1.5 rounded text-sm ${mode === "view" ? "bg-foreground text-background" : "bg-muted"}`}
        >
          Visualizza
        </button>
        <button
          type="button"
          onClick={() => setMode("add_node")}
          className={`px-3 py-1.5 rounded text-sm ${mode === "add_node" ? "bg-foreground text-background" : "bg-muted"}`}
        >
          + Nodo
        </button>
        {mode === "add_node" && (
          <select
            value={selectedNodeKind}
            onChange={(e) => setSelectedNodeKind(e.target.value as NodeKind)}
            className="px-2 py-1 rounded text-sm border"
          >
            {Object.entries(NODE_KIND_LABELS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setMode("add_segment")}
          className={`px-3 py-1.5 rounded text-sm ${mode === "add_segment" ? "bg-foreground text-background" : "bg-muted"}`}
        >
          + Segmento
        </button>
        {mode === "add_segment" && (
          <>
            <select
              value={selectedSegmentKind}
              onChange={(e) => setSelectedSegmentKind(e.target.value as SegmentKind)}
              className="px-2 py-1 rounded text-sm border"
            >
              {(["passaggio", "ramo", "loop", "connessione"] as SegmentKind[]).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              {pendingFromNode ? `Da: ${graph.nodes.find((n) => n.id === pendingFromNode)?.label ?? "nodo"} — clicca destinazione` : "Clicca il nodo di partenza"}
            </span>
          </>
        )}
        <div className="ml-auto flex gap-1">
          {planimetriaUrl && (
            <button
              type="button"
              onClick={() => setView("spatial")}
              className={`px-3 py-1.5 rounded text-sm ${view === "spatial" ? "bg-foreground text-background" : "bg-muted"}`}
            >
              Planimetria
            </button>
          )}
          <button
            type="button"
            onClick={() => setView("topological")}
            className={`px-3 py-1.5 rounded text-sm ${view === "topological" ? "bg-foreground text-background" : "bg-muted"}`}
          >
            Logica
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className="relative aspect-[3/2] border rounded-lg overflow-hidden bg-muted cursor-crosshair"
        style={{ cursor: mode === "add_node" ? "crosshair" : "default" }}
      >
        {view === "spatial" && planimetriaUrl && (
          <img src={planimetriaUrl} alt="Planimetria" className="absolute inset-0 w-full h-full object-contain opacity-70" />
        )}
        {/* Segments */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {graph.segments.map((s) => {
            const from = graph.nodes.find((n) => n.id === s.fromNodeId);
            const to = graph.nodes.find((n) => n.id === s.toNodeId);
            if (!from || !to) return null;
            const fx = (from.planimetriaX ?? 0.5) * 100;
            const fy = (from.planimetriaY ?? 0.5) * 100;
            const tx = (to.planimetriaX ?? 0.5) * 100;
            const ty = (to.planimetriaY ?? 0.5) * 100;
            return (
              <line
                key={s.id}
                x1={`${fx}%`}
                y1={`${fy}%`}
                x2={`${tx}%`}
                y2={`${ty}%`}
                stroke="currentColor"
                strokeWidth={2}
                strokeOpacity={0.6}
                strokeDasharray={s.kind === "ramo" ? "4" : undefined}
              />
            );
          })}
        </svg>
        {/* Nodes */}
        {graph.nodes.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (mode === "add_segment") {
                startSegmentFromNode(n.id);
              } else {
                setSelectedNodeId(n.id === selectedNodeId ? null : n.id);
              }
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 transition-all ${pendingFromNode === n.id ? "ring-4 ring-blue-300" : ""} ${selectedNodeId === n.id ? "ring-4 ring-yellow-300" : ""}`}
            style={{
              left: `${(n.planimetriaX ?? 0.5) * 100}%`,
              top: `${(n.planimetriaY ?? 0.5) * 100}%`,
              backgroundColor: NODE_KIND_COLORS[n.kind],
              borderColor: "white",
            }}
            title={`${NODE_KIND_LABELS[n.kind]}${n.label ? `: ${n.label}` : ""}`}
          />
        ))}
      </div>

      {/* Selected node panel */}
      {selectedNodeId && (() => {
        const n = graph.nodes.find((nn) => nn.id === selectedNodeId);
        if (!n) return null;
        return (
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="font-semibold mb-2">Nodo selezionato</h3>
            <label className="block text-sm">
              Tipo:
              <select
                value={n.kind}
                onChange={(e) => {
                  const next = {
                    ...graph,
                    nodes: graph.nodes.map((nn) => nn.id === n.id ? { ...nn, kind: e.target.value as NodeKind } : nn),
                  };
                  setGraph(next);
                  persistDebounced(next);
                }}
                className="ml-2 border rounded px-2 py-1"
              >
                {Object.entries(NODE_KIND_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm mt-2">
              Etichetta:
              <input
                type="text"
                value={n.label ?? ""}
                onChange={(e) => {
                  const next = {
                    ...graph,
                    nodes: graph.nodes.map((nn) => nn.id === n.id ? { ...nn, label: e.target.value } : nn),
                  };
                  setGraph(next);
                  persistDebounced(next);
                }}
                className="ml-2 border rounded px-2 py-1 w-64"
                placeholder="es. Ingresso est"
              />
            </label>
            <button
              type="button"
              onClick={() => deleteNode(n.id)}
              className="mt-3 px-3 py-1 rounded bg-red-100 text-red-700 text-sm hover:bg-red-200"
            >
              Elimina nodo
            </button>
          </div>
        );
      })()}

      <div className="text-xs text-muted-foreground">
        {graph.nodes.length} nodi · {graph.segments.length} segmenti
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Integrate in luogo page**

In `mvp/src/app/progetti/[id]/luogo/page.tsx`, add a new tab "Grafo" that renders `<GraphEditor>`. Pass planimetriaUrl and poiList from existing state.

The integration depends on the page's existing tabs/sections structure. The intent is: add a section "Grafo dei segmenti" below or next to the POI editor with the GraphEditor component.

- [ ] **Step 4: Commit**

```bash
git add mvp/src/components/graph-editor.tsx mvp/src/lib/project-store.ts mvp/src/app/progetti/[id]/luogo/page.tsx
git commit -m "feat(graph): GraphEditor component with topological + spatial views

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.1.5 — "Proponi grafo" button + integration with propose-graph endpoint

**Files:**
- Modify: `mvp/src/components/graph-editor.tsx` (or parent)

- [ ] **Step 1: Add "Proponi grafo" button**

In the GraphEditor toolbar, add:

```tsx
<button
  type="button"
  onClick={async () => {
    if (graph.nodes.length > 0 && !confirm("Esiste già un grafo. Sovrascriverlo?")) return;
    const res = await fetch(`/api/ai/propose-graph`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        poiIds: poiList?.map((p) => p.id) ?? [],
        poisData: poiList?.map((p) => ({ id: p.id, name: p.name /* + coords */ })) ?? [],
        provider: "openai",
      }),
    });
    if (!res.ok) {
      alert("Errore nella proposta");
      return;
    }
    const proposed = await res.json();
    // Map tempIds: AI uses tempId fields, our state expects id
    const nodes = proposed.nodes.map((n: any) => ({
      ...n,
      id: n.tempId ?? n.id,
      orderIndex: n.orderIndex ?? 0,
    }));
    const segments = proposed.segments.map((s: any) => ({
      ...s,
      id: s.tempId ?? s.id,
      fromNodeId: s.fromTempId ?? s.fromNodeId,
      toNodeId: s.toTempId ?? s.toNodeId,
      poiIds: s.poiIds ?? [],
      bidirectional: s.bidirectional ?? true,
    }));
    const next = { nodes, segments };
    setGraph(next);
    await persistDebounced(next);
  }}
  className="px-3 py-1.5 rounded text-sm bg-blue-100 text-blue-700"
>
  ✨ Proponi con AI
</button>
```

- [ ] **Step 2: Commit**

```bash
git add mvp/src/components/graph-editor.tsx
git commit -m "feat(graph): integrate propose-graph AI in GraphEditor toolbar

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.1.6 — compose-visit usa segments (opzionale ma high-value)

**Files:**
- Modify: `mvp/src/app/api/projects/[id]/compose-visit/route.ts`

Se segments esistono per il progetto, compose-visit può usarli per:
- Calcolare tempo realistico di percorrenza (somma traversalSec dei segmenti attraversati)
- Considerare detourCost per scoraggiare deviazioni inutili

- [ ] **Step 1: Refactor compose-visit**

In `mvp/src/app/api/projects/[id]/compose-visit/route.ts`, dopo aver caricato il progetto, aggiungere:

```typescript
const segments = await prisma.segment.findMany({ where: { projectId: id } });
const nodes = await prisma.mapNode.findMany({ where: { projectId: id } });

// If graph exists, use it to compute realistic timings
const hasGraph = segments.length > 0 && nodes.length > 0;
```

Quando computi il budget tempo per ogni POI selezionato:
- Se hasGraph: per ogni coppia consecutiva (POI A → POI B), trova il path nel grafo (BFS o shortest path con `traversalSec` come peso) e accumula il tempo
- Se !hasGraph: fallback al comportamento attuale (assume tempi medi)

- [ ] **Step 2: Commit**

```bash
git add mvp/src/app/api/projects/[id]/compose-visit/route.ts
git commit -m "feat(graph): compose-visit uses segment graph for realistic timing

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Checkpoint Sub-project 1.1

- [ ] Schema migration applicata in test + prod
- [ ] CRUD endpoint con full-replace funzionante + tenant isolation
- [ ] AI propose-graph genera nodi+segmenti coerenti su demo project
- [ ] UI GraphEditor renderizza correttamente sia in topological view che spatial view
- [ ] Click "Proponi" sostituisce il grafo dopo conferma
- [ ] compose-visit usa segments quando presenti
- [ ] Test suite passa (verificare regressions on existing tests)
- [ ] 6 commit (uno per task)

---

## Sub-project 1.2 — Editorial Lenses come asse di generazione

**Why:** Piano legacy: *"le personas servono a capire il visitatore, le lenti editoriali servono a produrre contenuto"*. Oggi Scheda è `(POI × narrator × language)` — il narratore meccanicamente surroga la lente. Risultato: stesso narratore + stesso POI = stessa scheda anche se la persona target è diversa. La promessa "stesso luogo, letture diverse" non è mantenuta.

**What:**
- Espandere il modello `EditorialLens` (oggi esiste in schema ma è vuoto in produzione)
- Cambiare Scheda da `(POI × narrator × lang)` a `(POI × lens × narrator × lang × depth)`
- Tabelle `Driver`, `Persona`, `DriverPersonaWeight` popolate (non più JSONB blob)
- Modificare `generate-scheda` per accettare `lensId` e adattare il prompt
- UI Schede mostra matrice lens × narrator per ogni POI
- compose-visit sceglie la lens giusta in base alla persona dominante visitor

### Task 1.2.1 — Schema EditorialLens ampliato + Scheda constraint changes

**Files:**
- Modify: `mvp/prisma/schema.prisma`
- Migration

- [ ] **Step 1: Amplia EditorialLens nel schema**

Il modello EditorialLens esistente (`mvp/prisma/schema.prisma:405`) ha solo `driverId/personaId/tone`. Ampliarlo:

```prisma
model EditorialLens {
  id                 String   @id @default(cuid())
  projectId          String
  project            Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name               String                          // "Storia per famiglie", "Architettura per esperti"
  primaryDriverId    String?
  primaryDriver      Driver?  @relation("PrimaryDriverLens", fields: [primaryDriverId], references: [id])
  secondaryDriverIds String[] @default([])
  personaIds         String[] @default([])
  tone               String?  @db.Text
  description        String   @db.Text             // come si caratterizza
  active             Boolean  @default(true)       // solo 3-4 attive di default
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  schede             Scheda[]
  @@index([projectId])
}
```

Modifica `model Driver {` per aggiungere reverse relation:

```prisma
model Driver {
  // ... existing fields ...
  primaryLenses EditorialLens[] @relation("PrimaryDriverLens")
}
```

Modifica `model Scheda {`:

```prisma
model Scheda {
  // ... existing fields ...
  lensId         String?
  lens           EditorialLens? @relation(fields: [lensId], references: [id], onDelete: SetNull)
  depth          SchedaDepth   @default(primary)
  // CHANGE unique constraint:
  @@unique([poiId, lensId, narratorId, language, depth])  // was [poiId, narratorId, language]
}

enum SchedaDepth {
  primary
  deep_dive
}
```

- [ ] **Step 2: Migration**

Create `mvp/prisma/migrations/20260520010000_editorial_lens_axis/migration.sql`:

```sql
-- Ampliare EditorialLens
ALTER TABLE "EditorialLens" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Lens';
ALTER TABLE "EditorialLens" ADD COLUMN "primaryDriverId" TEXT;
ALTER TABLE "EditorialLens" ADD COLUMN "secondaryDriverIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "EditorialLens" ADD COLUMN "personaIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "EditorialLens" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EditorialLens" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "EditorialLens" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DROP old unique constraint
ALTER TABLE "EditorialLens" DROP CONSTRAINT IF EXISTS "EditorialLens_driverId_personaId_projectId_key";
-- The old EditorialLens had driverId/personaId required; we drop those FKs (data will be migrated to new fields if needed)
ALTER TABLE "EditorialLens" DROP CONSTRAINT IF EXISTS "EditorialLens_driverId_fkey";
ALTER TABLE "EditorialLens" DROP CONSTRAINT IF EXISTS "EditorialLens_personaId_fkey";
ALTER TABLE "EditorialLens" DROP COLUMN IF EXISTS "driverId";
ALTER TABLE "EditorialLens" DROP COLUMN IF EXISTS "personaId";

-- Add primaryDriverId FK
ALTER TABLE "EditorialLens" ADD CONSTRAINT "EditorialLens_primaryDriverId_fkey"
  FOREIGN KEY ("primaryDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enum SchedaDepth
CREATE TYPE "SchedaDepth" AS ENUM ('primary', 'deep_dive');

-- Scheda changes
ALTER TABLE "Scheda" ADD COLUMN "lensId" TEXT;
ALTER TABLE "Scheda" ADD COLUMN "depth" "SchedaDepth" NOT NULL DEFAULT 'primary';
ALTER TABLE "Scheda" ADD CONSTRAINT "Scheda_lensId_fkey"
  FOREIGN KEY ("lensId") REFERENCES "EditorialLens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old unique, add new unique
ALTER TABLE "Scheda" DROP CONSTRAINT IF EXISTS "Scheda_poiId_narratorId_language_key";
ALTER TABLE "Scheda" ADD CONSTRAINT "Scheda_poiId_lensId_narratorId_language_depth_key"
  UNIQUE ("poiId", "lensId", "narratorId", "language", "depth");
```

NOTA: Il rationale di droppare driverId/personaId dall'EditorialLens è che la struttura cambia significativamente. Per il reset progetti demo (decisione utente), perdere quei dati è accettabile.

- [ ] **Step 3: Apply + regenerate**

```bash
cd mvp
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/toolia_test" \
  PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=yes \
  npx prisma migrate deploy
npx prisma generate
```

- [ ] **Step 4: Run test — verify schema valid**

```bash
npm run test
```

- [ ] **Step 5: Commit**

```bash
git add mvp/prisma/
git commit -m "feat(lens): expand EditorialLens schema + Scheda lens+depth axis

BREAKING: Scheda unique now (poiId, lensId, narratorId, language, depth).
Old EditorialLens driverId/personaId dropped (per reset demo policy).
SchedaDepth enum added (primary, deep_dive).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.2.2 — API CRUD lenses + driver/persona/weight tables popolate

**Files:**
- Create: `mvp/src/app/api/projects/[id]/lenses/route.ts`
- Create: `mvp/src/app/api/projects/[id]/lenses/[lensId]/route.ts`
- Modify: `mvp/src/app/api/projects/[id]/drivers-personas/route.ts` (PUT ora popola le tabelle normalizzate)

- [ ] **Step 1: New CRUD endpoint for lenses**

`mvp/src/app/api/projects/[id]/lenses/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getSessionUser();
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) return new Response("Not found", { status: 404 });

    const lenses = await prisma.editorialLens.findMany({
      where: { projectId: id },
      include: { primaryDriver: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ lenses });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}

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
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }

    const lens = await prisma.editorialLens.create({
      data: {
        projectId: id,
        name: body.name.trim(),
        primaryDriverId: body.primaryDriverId ?? null,
        secondaryDriverIds: body.secondaryDriverIds ?? [],
        personaIds: body.personaIds ?? [],
        tone: body.tone ?? null,
        description: body.description ?? "",
        active: body.active ?? true,
      },
    });
    return NextResponse.json(lens);
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
```

`mvp/src/app/api/projects/[id]/lenses/[lensId]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { prisma } from "@/lib/db";

async function assertOwnership(projectId: string, lensId: string, tenantId: string) {
  const lens = await prisma.editorialLens.findFirst({
    where: { id: lensId, projectId, project: { tenantId } },
  });
  return lens;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; lensId: string }> }) {
  const { id, lensId } = await params;
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const lens = await assertOwnership(id, lensId, user.tenantId);
    if (!lens) return new Response("Not found", { status: 404 });

    const body = await req.json();
    const updated = await prisma.editorialLens.update({
      where: { id: lensId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.primaryDriverId !== undefined && { primaryDriverId: body.primaryDriverId }),
        ...(body.secondaryDriverIds && { secondaryDriverIds: body.secondaryDriverIds }),
        ...(body.personaIds && { personaIds: body.personaIds }),
        ...(body.tone !== undefined && { tone: body.tone }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.active !== undefined && { active: body.active }),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; lensId: string }> }) {
  const { id, lensId } = await params;
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const lens = await assertOwnership(id, lensId, user.tenantId);
    if (!lens) return new Response("Not found", { status: 404 });

    await prisma.editorialLens.delete({ where: { id: lensId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
```

- [ ] **Step 2: Refactor drivers-personas/route.ts to populate normalized tables**

In `mvp/src/app/api/projects/[id]/drivers-personas/route.ts` PUT handler, instead of just saving to `settingsJson.driversPersonas` blob, also populate `Driver`, `Persona`, `DriverPersonaWeight`, `EditorialLens` tables.

Pattern: full-replace for these tables on PUT (similar to graph in 1.1):

```typescript
await prisma.$transaction([
  prisma.driverPersonaWeight.deleteMany({ where: { driver: { projectId: id } } }),
  prisma.editorialLens.deleteMany({ where: { projectId: id } }),
  prisma.persona.deleteMany({ where: { projectId: id } }),
  prisma.driver.deleteMany({ where: { projectId: id } }),
]);

// Then create from body
const idMapDriver = new Map<string, string>();
for (const d of body.drivers) {
  const created = await prisma.driver.create({
    data: {
      projectId: id,
      name: d.name,
      domain: d.domain,
      description: d.description,
      narrativeValue: d.narrativeValue,
      isPrimary: d.isPrimary ?? false,
    },
  });
  idMapDriver.set(d.id, created.id);
}

const idMapPersona = new Map<string, string>();
for (const p of body.personas) {
  const created = await prisma.persona.create({
    data: {
      projectId: id,
      name: p.name,
      motivation: p.motivation,
      payoff: p.payoff,
      preferredDuration: p.preferredDuration,
    },
  });
  idMapPersona.set(p.id, created.id);
}

// Weights
for (const w of body.matrix ?? []) {
  const driverId = idMapDriver.get(w.driverId);
  const personaId = idMapPersona.get(w.personaId);
  if (!driverId || !personaId) continue;
  await prisma.driverPersonaWeight.create({
    data: { driverId, personaId, weight: w.weight },
  });
}

// Lenses (NEW — was only in JSONB before)
for (const lens of body.lenses ?? []) {
  const primaryDriverId = lens.primaryDriverId ? idMapDriver.get(lens.primaryDriverId) : null;
  await prisma.editorialLens.create({
    data: {
      projectId: id,
      name: lens.name,
      primaryDriverId,
      secondaryDriverIds: (lens.secondaryDriverIds ?? []).map((did: string) => idMapDriver.get(did)).filter(Boolean),
      personaIds: (lens.personaIds ?? []).map((pid: string) => idMapPersona.get(pid)).filter(Boolean),
      tone: lens.tone,
      description: lens.description ?? "",
      active: lens.active ?? true,
    },
  });
}

// ALSO keep the JSONB for backward compat (legacy UI components might still read it)
await prisma.project.update({
  where: { id },
  data: { settingsJson: { ...(project.settingsJson as object), driversPersonas: body } },
});
```

- [ ] **Step 3: Test lens CRUD**

Create `mvp/test/api/lenses.test.ts` covering: create, list, patch, delete + tenant isolation.

- [ ] **Step 4: Commit**

```bash
git add mvp/src/app/api/projects/[id]/lenses/ mvp/src/app/api/projects/[id]/drivers-personas/route.ts mvp/test/api/lenses.test.ts
git commit -m "feat(lens): CRUD endpoint + populate normalized Driver/Persona/Lens tables

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.2.3 — generate-scheda accetta lensId + adapt prompt

**Files:**
- Modify: `mvp/src/app/api/ai/generate-scheda/route.ts`

- [ ] **Step 1: Accept lensId + load lens context**

In `generate-scheda/route.ts`, add to body interface:

```typescript
interface Body {
  // ... existing fields ...
  lensId?: string | null;
}
```

After auth + key resolution, if `lensId` is provided:

```typescript
let lensContext = "";
if (body.lensId) {
  const lens = await prisma.editorialLens.findFirst({
    where: { id: body.lensId, projectId: body.projectId },
    include: { primaryDriver: true },
  });
  if (lens) {
    lensContext = `

## Lente editoriale: ${lens.name}
${lens.description}
${lens.tone ? `Tono: ${lens.tone}` : ""}
${lens.primaryDriver ? `Driver dominante: ${lens.primaryDriver.name} (${lens.primaryDriver.domain})` : ""}
`;
  }
}
```

- [ ] **Step 2: Inject lensContext into the system prompt**

Find where the system prompt is constructed. Add `lensContext` to the user message (or system depending on existing structure).

Example modification:

```typescript
const userPrompt = `${existingUserPrompt}
${lensContext}`;
```

- [ ] **Step 3: Update logLlmCall**

When logging, include lens info if relevant (optional, the operation name "generate-scheda" already groups them):

```typescript
await logLlmCall({
  ...,
  operation: body.lensId ? "generate-scheda-lens" : "generate-scheda",
  ...
});
```

- [ ] **Step 4: Commit**

```bash
git add mvp/src/app/api/ai/generate-scheda/route.ts
git commit -m "feat(lens): generate-scheda accepts lensId + injects lens context in prompt

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.2.4 — UI Schede mostra matrice (lens × narrator)

**Files:**
- Modify: `mvp/src/app/progetti/[id]/schede/page.tsx`
- Modify: `mvp/src/app/api/projects/[id]/schede/route.ts` (POST accetta lensId + depth)

- [ ] **Step 1: schede route accetta lensId + depth**

Modifica POST in `mvp/src/app/api/projects/[id]/schede/route.ts`:

```typescript
const body = await req.json();
// Add to data:
const created = await prisma.scheda.create({
  data: {
    projectId: id,
    poiId: body.poiId,
    narratorId: body.narratorId,
    language: body.language,
    title: body.title,
    scriptText: body.scriptText,
    lensId: body.lensId ?? null,
    depth: body.depth ?? "primary",
  },
});
```

GET aggiungi `lensId` al where filter opzionale.

- [ ] **Step 2: UI matrice in Schede page**

In `mvp/src/app/progetti/[id]/schede/page.tsx`, ripensare il layout:

- Per ogni POI: una tabella con righe = narratori, colonne = lenti attive
- Ogni cella = "+" (genera) o stato della scheda esistente (draft/published)
- Cliccando una cella vuota → genera la scheda per quella combinazione

```tsx
{pois.map((poi) => (
  <Card key={poi.id}>
    <CardHeader>{poi.name}</CardHeader>
    <CardContent>
      <table>
        <thead>
          <tr>
            <th></th>
            {activeLenses.map((lens) => (
              <th key={lens.id}>{lens.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {narratori.map((n) => (
            <tr key={n.id}>
              <td>{n.name}</td>
              {activeLenses.map((lens) => {
                const scheda = schedeByPoiLensNarrator.get(`${poi.id}-${lens.id}-${n.id}`);
                return (
                  <td key={lens.id}>
                    {scheda ? (
                      <Link href={`#${scheda.id}`}>{scheda.status}</Link>
                    ) : (
                      <button onClick={() => generateScheda(poi.id, lens.id, n.id)}>+ Genera</button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent>
  </Card>
))}
```

- [ ] **Step 3: Update bulk-generate to take lens into account**

Modificare `mvp/src/app/api/projects/[id]/schede/bulk-generate/route.ts` per loopare anche su lenti attive:

```typescript
const activeLenses = await prisma.editorialLens.findMany({
  where: { projectId: id, active: true },
});

// For each POI × narrator × lens combination:
for (const poiId of body.poiIds) {
  for (const narratorId of body.narratorIds) {
    for (const lens of activeLenses) {
      schedaTasks.push(async () => { /* generate scheda with lensId */ });
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add mvp/src/app/progetti/[id]/schede/page.tsx mvp/src/app/api/projects/[id]/schede/route.ts mvp/src/app/api/projects/[id]/schede/bulk-generate/route.ts
git commit -m "feat(lens): UI matrix (lens × narrator) per POI + bulk generates per lens

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.2.5 — compose-visit usa lens in base alla persona dominante

**Files:**
- Modify: `mvp/src/app/api/projects/[id]/compose-visit/route.ts`

- [ ] **Step 1: Selezione lens runtime**

In compose-visit, dopo aver determinato la persona dominante del visitor (via wizard), selezionare la lens corrispondente:

```typescript
// Find lens that targets the dominant persona
const allLenses = await prisma.editorialLens.findMany({
  where: { projectId: id, active: true },
});

const dominantPersonaId = body.personaId; // from wizard
const chosenLens = allLenses.find((l) => l.personaIds.includes(dominantPersonaId)) ?? allLenses[0];
```

Quando seleziona le schede per il visitor:

```typescript
const schede = await prisma.scheda.findMany({
  where: {
    projectId: id,
    status: "published",
    language,
    ...(chosenLens ? { lensId: chosenLens.id } : {}),
  },
});
```

Se la combo lens specifica non esiste, fallback a lens=null o ad altre lenti (graceful degradation).

- [ ] **Step 2: Commit**

```bash
git add mvp/src/app/api/projects/[id]/compose-visit/route.ts
git commit -m "feat(lens): compose-visit selects lens by dominant persona

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Checkpoint Sub-project 1.2

- [ ] Schema migration applicata
- [ ] CRUD endpoint lenses funzionante
- [ ] Drivers-personas PUT popola tabelle normalizzate
- [ ] generate-scheda accetta lensId + prompt include lens context
- [ ] UI schede mostra matrice lens × narrator
- [ ] compose-visit usa lens corretta per persona dominante
- [ ] Test suite passa
- [ ] Demo project: stesso POI con 2 lenti diverse → 2 schede testualmente diverse

---

## Sub-project 1.3 — Narrative Tension Map

**Why:** Piano legacy Step 1: *"output minimo dello step"*. Oggetto editoriale esplicito che rende leggibile cosa il cliente vuole spingere vs cosa le fonti sostengono vs cosa è narrativamente forte vs cauto vs fuori. Senza, ogni decisione AI parte da capo e l'arbitrato editoriale è sepolto in prompt ad-hoc.

**What:**
- Modello `NarrativeTension` (1 per progetto)
- API endpoint CRUD
- AI endpoint `propose-tension-map` da KB+brief+intervista
- UI sezione "Mappa delle tensioni" nello Step Brief
- Integrazione con `generate-semantic-base` (warning su argomenti `avoid`)
- Warning in Step Pubblica se `verify` non confermati

### Task 1.3.1 — Schema + migration

**Files:**
- Modify: `mvp/prisma/schema.prisma`
- Migration

- [ ] **Step 1: Add to schema**

```prisma
model NarrativeTension {
  id             String   @id @default(cuid())
  projectId      String   @unique
  project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  mustTellJson   Json     @default("[]")    // array di {title, why, sourceIds}
  niceToTellJson Json     @default("[]")
  avoidJson      Json     @default("[]")    // {topic, reason}
  verifyJson     Json     @default("[]")    // {claim, source, status: pending|verified|rejected}
  tensionsJson   Json     @default("[]")    // {clientWants, sourcesSay, recommendation}
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

Add reverse relation in Project:

```prisma
model Project {
  // ... existing relations ...
  narrativeTension NarrativeTension?
}
```

- [ ] **Step 2: Migration**

Create `mvp/prisma/migrations/20260520020000_narrative_tension/migration.sql`:

```sql
CREATE TABLE "NarrativeTension" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "mustTellJson" JSONB NOT NULL DEFAULT '[]',
  "niceToTellJson" JSONB NOT NULL DEFAULT '[]',
  "avoidJson" JSONB NOT NULL DEFAULT '[]',
  "verifyJson" JSONB NOT NULL DEFAULT '[]',
  "tensionsJson" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NarrativeTension_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NarrativeTension_projectId_key" UNIQUE ("projectId")
);
ALTER TABLE "NarrativeTension" ADD CONSTRAINT "NarrativeTension_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Apply + commit**

```bash
cd mvp
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/toolia_test" \
  PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=yes \
  npx prisma migrate deploy
npx prisma generate

git add mvp/prisma/
git commit -m "feat(tension): add NarrativeTension schema (1 per project)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.3.2 — CRUD endpoint

**Files:**
- Create: `mvp/src/app/api/projects/[id]/narrative-tension/route.ts`

- [ ] **Step 1: Implement**

Pattern GET + PUT (upsert):

```typescript
import { NextResponse } from "next/server";
import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getSessionUser();
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) return new Response("Not found", { status: 404 });

    const tension = await prisma.narrativeTension.findUnique({
      where: { projectId: id },
    });
    return NextResponse.json(tension ?? {
      mustTellJson: [],
      niceToTellJson: [],
      avoidJson: [],
      verifyJson: [],
      tensionsJson: [],
    });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const project = await prisma.project.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!project) return new Response("Not found", { status: 404 });

    const body = await req.json();
    const upserted = await prisma.narrativeTension.upsert({
      where: { projectId: id },
      update: {
        mustTellJson: body.mustTellJson ?? [],
        niceToTellJson: body.niceToTellJson ?? [],
        avoidJson: body.avoidJson ?? [],
        verifyJson: body.verifyJson ?? [],
        tensionsJson: body.tensionsJson ?? [],
      },
      create: {
        projectId: id,
        mustTellJson: body.mustTellJson ?? [],
        niceToTellJson: body.niceToTellJson ?? [],
        avoidJson: body.avoidJson ?? [],
        verifyJson: body.verifyJson ?? [],
        tensionsJson: body.tensionsJson ?? [],
      },
    });
    return NextResponse.json(upserted);
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add mvp/src/app/api/projects/[id]/narrative-tension/
git commit -m "feat(tension): GET/PUT endpoint for NarrativeTension

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.3.3 — AI endpoint `propose-tension-map`

**Files:**
- Create: `mvp/src/app/api/ai/propose-tension-map/route.ts`

- [ ] **Step 1: Implement**

```typescript
import { NextResponse } from "next/server";
import { getSessionUser, handleAuthError } from "@/lib/rbac";
import { getTenantApiKey } from "@/lib/tenant-keys";
import { logLlmCall } from "@/lib/llm-usage";
import OpenAI from "openai";

export const maxDuration = 60;

const SYSTEM_PROMPT = `Sei un editor strategico per audioguide AI di siti culturali.

Dato:
- Brief strategico del progetto (obiettivo, target, tono)
- Knowledge Base verificata (fatti classificati)
- Trascrizione intervista col cliente

Produci una "Narrative Tension Map" che renda esplicito:
1. mustTell — storie obbligatorie identitarie del progetto
2. niceToTell — elementi interessanti ma non portanti
3. avoid — argomenti che il cliente non vuole / rischiano fraintendimenti
4. verify — claim promettenti ma ancora da confermare
5. tensions — conflitti reali fra cosa cliente vuole vs cosa le fonti sostengono

PER OGNI ITEM include WHY (la motivazione editoriale).

Output JSON:
{
  "mustTell": [{"title": "...", "why": "...", "sourceIds": ["fact_id_1"]}],
  "niceToTell": [{"title": "...", "why": "...", "sourceIds": [...]}],
  "avoid": [{"topic": "...", "reason": "..."}],
  "verify": [{"claim": "...", "source": "...", "status": "pending"}],
  "tensions": [{"clientWants": "...", "sourcesSay": "...", "recommendation": "..."}]
}

Restituisci SOLO il JSON.`;

interface Body {
  projectId: string;
  kbFacts: Array<{ id: string; category: string; content: string; reliability: string }>;
  brief?: object;
  interviewTranscript?: string;
}

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

  const body: Body = await req.json();
  const apiKey = await getTenantApiKey(tenantId, "openai");
  if (!apiKey) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 400 });
  }

  const userPrompt = `Brief: ${JSON.stringify(body.brief ?? {}, null, 2)}

KBFacts:
${body.kbFacts.slice(0, 50).map((f) => `[${f.category}·${f.reliability}] ${f.id}: ${f.content}`).join("\n")}

${body.interviewTranscript ? `Intervista:\n${body.interviewTranscript.slice(0, 5000)}` : ""}

Produci la Narrative Tension Map.`;

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 6000,
    response_format: { type: "json_object" },
  });

  await logLlmCall({
    tenantId,
    projectId: body.projectId,
    operation: "propose-tension-map",
    provider: "openai",
    model: "gpt-4o",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return NextResponse.json({ error: "no_response" }, { status: 500 });

  try {
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add mvp/src/app/api/ai/propose-tension-map/
git commit -m "feat(tension): AI endpoint propose-tension-map

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.3.4 — UI in Brief page

**Files:**
- Modify: `mvp/src/app/progetti/[id]/brief/page.tsx`

- [ ] **Step 1: Aggiungere sezione "Mappa delle tensioni narrative"**

Nuova sezione dopo il brief principale. 4 colonne (Must Tell / Nice to Tell / Avoid / Verify) + accordion "Tensioni rilevate":

```tsx
const [tension, setTension] = useState<NarrativeTension | null>(null);

useEffect(() => {
  fetch(`/api/projects/${projectId}/narrative-tension`)
    .then((r) => r.json())
    .then(setTension);
}, [projectId]);

async function proposeTensionMap() {
  const kbRes = await fetch(`/api/projects/${projectId}/kb`);
  const kb = await kbRes.json();
  const res = await fetch("/api/ai/propose-tension-map", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      kbFacts: kb.facts ?? [],
      brief: existingBrief,
      interviewTranscript: existingInterview?.transcript,
    }),
  });
  const proposed = await res.json();
  setTension({
    mustTellJson: proposed.mustTell,
    niceToTellJson: proposed.niceToTell,
    avoidJson: proposed.avoid,
    verifyJson: proposed.verify,
    tensionsJson: proposed.tensions,
  } as any);
}

async function saveTension() {
  await fetch(`/api/projects/${projectId}/narrative-tension`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tension),
  });
}

// UI:
<Card>
  <CardHeader>
    <h2>Mappa delle tensioni narrative</h2>
    <button onClick={proposeTensionMap}>✨ Proponi con AI</button>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <h3>Must Tell</h3>
        {(tension?.mustTellJson as any[])?.map((item, i) => (
          <div key={i}>
            <strong>{item.title}</strong>
            <p>{item.why}</p>
          </div>
        ))}
      </div>
      {/* Same for niceToTell, avoid, verify */}
    </div>

    <Accordion>
      <h3>Tensioni rilevate</h3>
      {(tension?.tensionsJson as any[])?.map((t, i) => (
        <div key={i}>
          <p><strong>Cliente vuole:</strong> {t.clientWants}</p>
          <p><strong>Fonti dicono:</strong> {t.sourcesSay}</p>
          <p><strong>Raccomandazione:</strong> {t.recommendation}</p>
        </div>
      ))}
    </Accordion>

    <button onClick={saveTension}>Salva</button>
  </CardContent>
</Card>
```

- [ ] **Step 2: Commit**

```bash
git add mvp/src/app/progetti/[id]/brief/page.tsx
git commit -m "feat(tension): UI section in Brief step for tension map

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.3.5 — Integration with generate-semantic-base

**Files:**
- Modify: `mvp/src/app/api/ai/generate-semantic-base/route.ts`

- [ ] **Step 1: Load tension map**

```typescript
const tension = await prisma.narrativeTension.findUnique({
  where: { projectId: body.projectId },
});

const tensionContext = tension ? `

## Vincoli editoriali della Narrative Tension Map
MUST TELL: ${(tension.mustTellJson as any[]).map((m) => m.title).join(", ")}
AVOID: ${(tension.avoidJson as any[]).map((a) => a.topic).join(", ")}
VERIFY (uso cauto): ${(tension.verifyJson as any[]).filter((v) => v.status === "pending").map((v) => v.claim).join(", ")}
` : "";
```

Iniettare `tensionContext` nel system prompt. Aggiungere istruzione: "Se la scheda toccherebbe un argomento AVOID, escludi quel contenuto. Se attinge a un fatto VERIFY non confermato, segnala come `editorialWarning`."

- [ ] **Step 2: Commit**

```bash
git add mvp/src/app/api/ai/generate-semantic-base/route.ts
git commit -m "feat(tension): generate-semantic-base respects tension map constraints

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.3.6 — Warning in Step Pubblica per verify non confermati

**Files:**
- Modify: `mvp/src/lib/readiness.ts`

- [ ] **Step 1: Add tension-related blockers**

In `mvp/src/lib/readiness.ts` `computeReadiness`:

```typescript
const tension = await prisma.narrativeTension.findUnique({
  where: { projectId },
});

if (tension) {
  const verifyItems = tension.verifyJson as any[];
  const pendingVerify = verifyItems.filter((v) => v.status === "pending");
  if (pendingVerify.length > 0) {
    blockers.push({
      kind: "warn",
      code: "pending_verify",
      message: `${pendingVerify.length} claim non ancora verificati`,
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add mvp/src/lib/readiness.ts
git commit -m "feat(tension): readiness warns on pending verify items

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Checkpoint Sub-project 1.3

- [ ] Schema NarrativeTension applicato
- [ ] CRUD endpoint funzionante
- [ ] AI propose-tension-map genera output coerente su demo project
- [ ] UI Brief page mostra mappa + bottone propose
- [ ] generate-semantic-base rispetta i vincoli avoid/verify
- [ ] Step Pubblica mostra warning su verify pending
- [ ] Test suite passa

---

## Final Checkpoint Fase 1

- [ ] **Tutti i sotto-progetti 1.1/1.2/1.3 completati**
- [ ] **Demo project end-to-end** verifica:
  - Posso creare un progetto da zero
  - Disegnare il grafo (Step 2 nuovo)
  - Definire 3 lenti editoriali (Step 3)
  - Generare una scheda per (POI × lens1 × narrator) e per (POI × lens2 × narrator) → testualmente diverse
  - Configurare tension map → vedo i vincoli applicati nelle schede generate
- [ ] **Test suite stato finale**: verifica regression rate accettabile
- [ ] **TypeScript**: `npx tsc --noEmit` pulito
- [ ] **Build**: `npm run build` successo
- [ ] **Deploy Railway verde**

## Pre-execution checklist

- [ ] Branch da `main` aggiornato
- [ ] Test DB running (`docker ps | grep toolia-test-db` o equivalent)
- [ ] `.env.test` configurato
- [ ] Conoscenza del codice da Fase 0 (tenant-keys, llm-usage, readiness lib)
- [ ] Stima tempo: 16-25 giorni di lavoro effettivo per i 3 sotto-progetti

## Cosa NON è in questo piano

- App nativa Expo (Fase 4.4 — dopo DeliveryPack di Fase 3)
- Pre-existing test isolation issues (sotto-progetto dedicato dopo Fase 1)
- Migration di progetti esistenti (decisione utente: reset demo projects)
- Visual Asset Layer + R2 (Fase 3.1)
- Content engine RAG (Fase 2)
