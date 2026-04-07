import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  // Explicitly passing secret and trustHost for Amplify middleware compatibility
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/");
      const isApiRoute = nextUrl.pathname.startsWith("/api");
      const isLoginRoute = nextUrl.pathname.startsWith("/login");

      if (isOnDashboard && !isApiRoute && !isLoginRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn && isLoginRoute) {
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
    },
  },
  providers: [], // Add providers with empty array for middleware compatibility
} satisfies NextAuthConfig;
