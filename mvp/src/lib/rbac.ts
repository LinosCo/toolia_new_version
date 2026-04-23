import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

export interface SessionUser {
  id: string;
  email: string;
  tenantId: string;
  role: Role;
}

let devUserCache: SessionUser | null = null;

async function getDevBypassUser(): Promise<SessionUser> {
  if (devUserCache) return devUserCache;
  const admin = await prisma.user.findFirst({
    where: { role: "Admin" },
    select: { id: true, email: true, tenantId: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) {
    throw new UnauthorizedError();
  }
  devUserCache = {
    id: admin.id,
    email: admin.email,
    tenantId: admin.tenantId,
    role: admin.role,
  };
  return devUserCache;
}

export async function getSessionUser(): Promise<SessionUser> {
  if (process.env.DEV_BYPASS_AUTH === "true") {
    return getDevBypassUser();
  }
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u?.tenantId || !u?.role || !u?.email) {
    throw new UnauthorizedError();
  }
  return {
    id: u.id,
    email: u.email,
    tenantId: u.tenantId,
    role: u.role,
  };
}

export function requireRole(user: SessionUser, roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new ForbiddenError();
  }
}

export function handleAuthError(err: unknown): Response | null {
  if (err instanceof UnauthorizedError) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  if (err instanceof ForbiddenError) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}
