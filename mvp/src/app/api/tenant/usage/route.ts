import { getSessionUser, requireRole, handleAuthError } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin"]);
    const url = new URL(req.url);
    const from = url.searchParams.get("from")
      ? new Date(url.searchParams.get("from")!)
      : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const to = url.searchParams.get("to")
      ? new Date(url.searchParams.get("to")!)
      : new Date();
    const projectIdParam = url.searchParams.get("projectId");

    const records = await prisma.llmUsage.findMany({
      where: {
        tenantId: user.tenantId,
        createdAt: { gte: from, lte: to },
        ...(projectIdParam ? { projectId: projectIdParam } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        operation: true,
        provider: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        audioSeconds: true,
        costUsd: true,
        projectId: true,
        createdAt: true,
      },
    });

    const totalUsd = records.reduce((sum, r) => sum + r.costUsd, 0);
    const byOperation = records.reduce<Record<string, { count: number; costUsd: number }>>(
      (acc, r) => {
        if (!acc[r.operation]) acc[r.operation] = { count: 0, costUsd: 0 };
        acc[r.operation].count++;
        acc[r.operation].costUsd += r.costUsd;
        return acc;
      },
      {},
    );
    const byProject = records.reduce<Record<string, { count: number; costUsd: number }>>(
      (acc, r) => {
        const k = r.projectId ?? "(tenant-level)";
        if (!acc[k]) acc[k] = { count: 0, costUsd: 0 };
        acc[k].count++;
        acc[k].costUsd += r.costUsd;
        return acc;
      },
      {},
    );

    // Resolve project names for byProject
    const projectIds = Object.keys(byProject).filter((k) => k !== "(tenant-level)");
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    });
    const projectNames = new Map(projects.map((p) => [p.id, p.name]));

    return NextResponse.json({
      totalUsd,
      byOperation,
      byProject: Object.entries(byProject).map(([id, v]) => ({
        projectId: id === "(tenant-level)" ? null : id,
        projectName: id === "(tenant-level)" ? null : projectNames.get(id) ?? id,
        ...v,
      })),
      records: records.slice(0, 100), // last 100 for table
      from,
      to,
    });
  } catch (err) {
    const e = handleAuthError(err);
    if (e) return e;
    throw err;
  }
}
