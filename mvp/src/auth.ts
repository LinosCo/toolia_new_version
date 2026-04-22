import NextAuth, { type DefaultSession } from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { authConfig } from "@/auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    tenantId?: string;
    role?: Role;
  }
}

// Whitelist admin — possono registrarsi + diventano Admin.
// TODO: sostituire con sistema Invitation DB-based in Fase 2.
const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS ?? "social@linosandco.com,tommaso@linos.co"
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isAllowedEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Adapter standard con override di createUser per assegnare Tenant + Role.
// - Primo utente mai registrato → Admin, crea Tenant "Toolia"
// - Email in ADMIN_EMAILS → Admin
// - Altri → Editor (ma il signIn callback blocca se non whitelist)
const baseAdapter = PrismaAdapter(prisma);
const adapter = {
  ...baseAdapter,
  createUser: async (data: {
    email: string;
    name?: string | null;
    image?: string | null;
    emailVerified?: Date | null;
  }) => {
    const existingUsers = await prisma.user.count();
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({ data: { name: "Toolia" } });
    }
    const isFirst = existingUsers === 0;
    const isAdmin = isAllowedEmail(data.email);
    const role: Role = isFirst || isAdmin ? "Admin" : "Editor";
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name ?? null,
        image: data.image ?? null,
        emailVerified: data.emailVerified ?? null,
        tenantId: tenant.id,
        role,
      },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
    };
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // biome-ignore lint/suspicious/noExplicitAny: adapter custom con shape compatibile
  adapter: adapter as any,
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();
      // Utenti già in DB → sempre autorizzati (anche se poi rimossi da ADMIN_EMAILS)
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) return true;
      // Nuovi utenti → solo se in whitelist admin
      return isAllowedEmail(email);
    },
    async jwt({ token, user }) {
      // Primo login (user presente) → salva id, tenantId, role nel JWT
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, tenantId: true, role: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.tenantId = dbUser.tenantId;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id;
        if (token.tenantId) session.user.tenantId = token.tenantId;
        if (token.role) session.user.role = token.role;
      }
      return session;
    },
  },
});
