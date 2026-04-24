import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, handleAuthError, requireRole } from "@/lib/rbac";

export async function GET() {
  try {
    const user = await getSessionUser();
    requireRole(user, ["Admin"]);

    const [tenants, users, projects] = await Promise.all([
      prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: { select: { users: true, projects: true } },
        },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          tenantId: true,
          createdAt: true,
        },
      }),
      prisma.project.findMany({
        select: {
          id: true,
          name: true,
          tenantId: true,
          status: true,
          createdAt: true,
          _count: {
            select: { pois: true, schede: true, narrators: true, paths: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenants,
      users,
      projects,
    });
  } catch (err) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("[debug db-check]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
