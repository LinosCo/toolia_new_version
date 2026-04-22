import type { NextAuthConfig } from "next-auth";

const PUBLIC_PATHS = ["/auth/signin", "/auth/verify", "/auth/error"];

// Config edge-safe: no adapter, no Prisma.
// Usata dal middleware per decidere allow/redirect.
// La config completa con adapter + providers vive in auth.ts.
export const authConfig = {
  providers: [],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
