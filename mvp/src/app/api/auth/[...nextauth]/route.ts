import type { NextRequest } from "next/server";

const DEV_BYPASS = process.env.DEV_BYPASS_AUTH === "true";

const json = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  });

const devSession = () =>
  json({
    user: {
      id: "dev-user",
      name: "Dev",
      email: "social@linosandco.com",
      tenantId: "dev-tenant",
      role: "Admin",
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });

export async function GET(req: NextRequest) {
  if (DEV_BYPASS) {
    if (req.nextUrl.pathname.endsWith("/session")) return devSession();
    return json({});
  }
  const { handlers } = await import("@/auth");
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  if (DEV_BYPASS) return json({});
  const { handlers } = await import("@/auth");
  return handlers.POST(req);
}
