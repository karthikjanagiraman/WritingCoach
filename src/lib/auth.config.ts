import type { NextAuthConfig } from "next-auth";

// Lightweight auth config for Edge middleware — no Prisma, no bcrypt
export const authConfig: NextAuthConfig = {
  providers: [], // Providers are added in auth.ts (server-side only)
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/auth/");
      const isAuthApi = nextUrl.pathname.startsWith("/api/auth/");

      if (isAuthPage || isAuthApi) {
        return true;
      }

      if (!isLoggedIn) {
        return false;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.userId = token.userId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
