import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/home",
    "/dashboard/:path*",
    "/lesson/:path*",
    "/placement/:path*",
    "/curriculum/:path*",
    "/portfolio/:path*",
    "/badges/:path*",
    "/api/((?!auth).*)",
  ],
};
