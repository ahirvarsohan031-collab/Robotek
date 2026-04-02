import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse, NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);
 
export const runtime = "edge";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await auth(); 

  const isAuthPage = pathname.startsWith("/login");

  if (isAuthPage) {
    if (session?.user) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();

  return NextResponse.next();
}

export const config = {
  // Protect all routes except static files and api routes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
