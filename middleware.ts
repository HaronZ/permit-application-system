import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

// Routes that require authentication
const PROTECTED = ["/", "/dashboard", "/apply", "/applications"]; // prefix match

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname, search } = req.nextUrl;

  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (needsAuth && !session) {
    const next = encodeURIComponent(pathname + (search || ""));
    const url = new URL(`/login?next=${next}`, req.url);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/", "/dashboard", "/apply/:path*", "/applications/:path*"],
};
