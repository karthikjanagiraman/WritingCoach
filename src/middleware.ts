export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/lesson/:path*",
    "/placement/:path*",
    "/curriculum/:path*",
    "/portfolio/:path*",
    "/badges/:path*",
    "/api/((?!auth).*)",
  ],
};
