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

    // Full-replace strategy: delete all, recreate from body
    // Segments first (FK to nodes), then nodes
    await prisma.$transaction([
      prisma.segment.deleteMany({ where: { projectId: id } }),
      prisma.mapNode.deleteMany({ where: { projectId: id } }),
    ]);

    // Map temp IDs to real CUIDs to support segment references
    const idMap = new Map<string, string>();
    const createdNodes = [];

    for (const input of body.nodes) {
      const isTemp = input.id.startsWith("tmp-") || !input.id;
      const created = await prisma.mapNode.create({
        data: {
          ...(isTemp ? {} : { id: input.id }),
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
      createdNodes.push(created);
    }

    const createdSegments = [];
    for (const s of body.segments) {
      const fromId = idMap.get(s.fromNodeId) ?? s.fromNodeId;
      const toId = idMap.get(s.toNodeId) ?? s.toNodeId;
      // Validate that both nodes exist among the freshly-created ones
      const fromExists = createdNodes.some((n) => n.id === fromId);
      const toExists = createdNodes.some((n) => n.id === toId);
      if (!fromExists || !toExists) {
        return NextResponse.json({
          error: "invalid_segment_reference",
          segment: s.id,
          fromExists,
          toExists,
        }, { status: 400 });
      }
      const created = await prisma.segment.create({
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
      createdSegments.push(created);
    }

    return NextResponse.json({ nodes: createdNodes, segments: createdSegments });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
