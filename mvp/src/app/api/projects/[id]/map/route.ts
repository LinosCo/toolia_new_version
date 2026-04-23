import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";
import type {
  ZoneFunction,
  PoiType,
  SpatialMode,
} from "@/generated/prisma/enums";

interface ClientZone {
  id: string;
  name: string;
  narrativePromise?: string;
  function: string;
  order?: number;
}
interface ClientPoi {
  id: string;
  name: string;
  description?: string;
  lat?: number | null;
  lng?: number | null;
  type?: string;
  minStaySeconds?: number;
  zoneId?: string | null;
  order?: number;
  image?: string | null;
  planimetriaX?: number | null;
  planimetriaY?: number | null;
  fromPlanimetriaN?: number | null;
}
interface ClientAnchor {
  poiId: string;
  lat: number;
  lng: number;
  planimetriaX: number;
  planimetriaY: number;
}

const ZF: ZoneFunction[] = ["apertura", "sviluppo", "climax", "chiusura"];
const PT: PoiType[] = ["indoor", "outdoor"];
const SM: SpatialMode[] = ["gps", "indoor", "hybrid"];

async function assertProject(id: string, tenantId: string) {
  return prisma.project.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    const p = await assertProject(id, user.tenantId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const [project, zones, pois, anchors] = await Promise.all([
      prisma.project.findUnique({
        where: { id },
        select: { spatialMode: true, settingsJson: true },
      }),
      prisma.zone.findMany({
        where: { projectId: id },
        orderBy: { order: "asc" },
      }),
      prisma.pOI.findMany({
        where: { projectId: id },
        orderBy: { orderIndex: "asc" },
      }),
      prisma.mapAnchor.findMany({ where: { projectId: id } }),
    ]);

    const settings =
      (project?.settingsJson as Record<string, unknown> | null) ?? {};
    const centerLat =
      typeof settings.centerLat === "number" ? settings.centerLat : undefined;
    const centerLng =
      typeof settings.centerLng === "number" ? settings.centerLng : undefined;

    return NextResponse.json({
      map: {
        spatialMode: project?.spatialMode ?? "hybrid",
        centerLat,
        centerLng,
        zones: zones.map((z) => ({
          id: z.id,
          name: z.name,
          narrativePromise: z.narrativePromise ?? "",
          function: z.function,
          order: z.order,
        })),
        pois: pois.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? "",
          lat: p.lat ?? undefined,
          lng: p.lng ?? undefined,
          type: p.type,
          minStaySeconds: p.minStaySeconds,
          zoneId: p.zoneId ?? undefined,
          order: p.orderIndex,
          image: p.imageUrl ?? undefined,
          planimetriaX: p.planimetriaX ?? undefined,
          planimetriaY: p.planimetriaY ?? undefined,
        })),
        anchors: anchors.map((a) => ({
          poiId: a.label,
          lat: a.lat,
          lng: a.lng,
          planimetriaX: a.planimetriaX,
          planimetriaY: a.planimetriaY,
        })),
      },
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api map GET]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    requireRole(user, ["Admin", "Editor"]);
    const p = await assertProject(id, user.tenantId);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const body = await req.json();
    const zones: ClientZone[] = Array.isArray(body?.zones) ? body.zones : [];
    const pois: ClientPoi[] = Array.isArray(body?.pois) ? body.pois : [];
    const anchors: ClientAnchor[] = Array.isArray(body?.anchors)
      ? body.anchors
      : [];
    const spatialMode: SpatialMode = SM.includes(body?.spatialMode)
      ? body.spatialMode
      : "hybrid";
    const centerLat =
      typeof body?.centerLat === "number" ? body.centerLat : null;
    const centerLng =
      typeof body?.centerLng === "number" ? body.centerLng : null;

    // Strategia full-replace per MVP: cancella tutto e riscrive.
    // Riutilizziamo gli id client-side (cuid) per coerenza anche in relazioni future.
    await prisma.$transaction(async (tx) => {
      await tx.mapAnchor.deleteMany({ where: { projectId: id } });
      await tx.pOI.deleteMany({ where: { projectId: id } });
      await tx.zone.deleteMany({ where: { projectId: id } });

      for (const z of zones) {
        await tx.zone.create({
          data: {
            id: z.id,
            projectId: id,
            name: z.name,
            narrativePromise: z.narrativePromise ?? null,
            function: ZF.includes(z.function as ZoneFunction)
              ? (z.function as ZoneFunction)
              : "sviluppo",
            order: z.order ?? 0,
          },
        });
      }

      for (const poi of pois) {
        await tx.pOI.create({
          data: {
            id: poi.id,
            projectId: id,
            zoneId: poi.zoneId ?? null,
            name: poi.name,
            description: poi.description ?? null,
            lat: poi.lat ?? null,
            lng: poi.lng ?? null,
            type: PT.includes(poi.type as PoiType)
              ? (poi.type as PoiType)
              : "indoor",
            minStaySeconds: poi.minStaySeconds ?? 60,
            imageUrl: poi.image ?? null,
            orderIndex: poi.order ?? 0,
            planimetriaX: poi.planimetriaX ?? null,
            planimetriaY: poi.planimetriaY ?? null,
          },
        });
      }

      for (const a of anchors) {
        await tx.mapAnchor.create({
          data: {
            projectId: id,
            label: a.poiId,
            lat: a.lat,
            lng: a.lng,
            planimetriaX: a.planimetriaX,
            planimetriaY: a.planimetriaY,
          },
        });
      }

      const existing = await tx.project.findUnique({
        where: { id },
        select: { settingsJson: true },
      });
      const settingsRaw =
        (existing?.settingsJson as Record<string, unknown> | null) ?? {};
      await tx.project.update({
        where: { id },
        data: {
          spatialMode,
          settingsJson: {
            ...settingsRaw,
            centerLat,
            centerLng,
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[api map PUT]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
