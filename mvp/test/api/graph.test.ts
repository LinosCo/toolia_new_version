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
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.nodes).toEqual([]);
    expect(body.segments).toEqual([]);
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
    // Verify segment references resolved tempIds to real IDs
    const firstSegment = segments[0];
    const validNodeIds = stored.map((n) => n.id);
    expect(validNodeIds).toContain(firstSegment.fromNodeId);
    expect(validNodeIds).toContain(firstSegment.toNodeId);
  });

  it("PUT replaces (deletes previous graph)", async () => {
    const { tenantId, userId } = await seedTenantAndUser();
    const prisma = getTestPrisma();
    const project = await prisma.project.create({ data: { tenantId, name: "P" } });

    // Create initial graph
    const n1 = await prisma.mapNode.create({
      data: { projectId: project.id, kind: "accesso", label: "A" },
    });
    const n2 = await prisma.mapNode.create({
      data: { projectId: project.id, kind: "bivio", label: "B" },
    });
    await prisma.segment.create({
      data: { projectId: project.id, fromNodeId: n1.id, toNodeId: n2.id, kind: "passaggio" },
    });

    vi.mocked(getSessionUser).mockResolvedValue({
      id: userId, email: "a@b.c", tenantId, role: "Admin" as any,
    });
    const { PUT } = await import("@/app/api/projects/[id]/graph/route");
    await PUT(new Request("http://x", {
      method: "PUT",
      body: JSON.stringify({ nodes: [], segments: [] }),
    }), { params: Promise.resolve({ id: project.id }) });

    const afterNodes = await prisma.mapNode.findMany({ where: { projectId: project.id } });
    const afterSegments = await prisma.segment.findMany({ where: { projectId: project.id } });
    expect(afterNodes).toHaveLength(0);
    expect(afterSegments).toHaveLength(0);
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

  it("PUT validates node kind", async () => {
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
        nodes: [{ id: "n1", kind: "invalid_kind" }],
        segments: [],
      }),
    }), { params: Promise.resolve({ id: project.id }) });
    expect(res.status).toBe(400);
  });
});
