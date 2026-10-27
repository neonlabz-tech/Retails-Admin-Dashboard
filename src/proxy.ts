import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await isValidSession(token);

  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isAuthApi = pathname.startsWith("/api/auth");
  const isHealthApi = pathname === "/api/health";
  const isApiPath = pathname.startsWith("/api");

  if (isPublicPath) {
    if (authenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isAuthApi || isHealthApi) {
    return NextResponse.next();
  }

  if (!authenticated) {
    if (isApiPath) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and the Next.js internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads|images).*)",
  ],
};
