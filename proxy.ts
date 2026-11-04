import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./lib/supabase/env";

const publicRoutes = new Set([
  "/entrar",
  "/cadastrar",
  "/auth/confirmar",
  "/manifest.webmanifest",
  "/sw.js",
  "/pwa/icon-180.png",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/offline.html",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Cover artwork is public. The Next.js optimizer requests it without cookies.
  if (publicRoutes.has(pathname) || /^\/album\/[^/]+\/capa$/.test(pathname)) {
    return NextResponse.next();
  }

  const unauthorized = () =>
    request.nextUrl.pathname === "/api/logs"
      ? NextResponse.json(
          { error: "Entre para acessar seu diário." },
          { status: 401, headers: { "Cache-Control": "private, no-store" } },
        )
      : NextResponse.redirect(new URL("/entrar", request.url));

  const env = getSupabaseEnv({ required: false });
  if (!env) return unauthorized();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims.sub) {
    const denied = unauthorized();
    for (const cookie of response.cookies.getAll()) denied.cookies.set(cookie);
    response = denied;
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static/|_next/image$|album-placeholder[.]svg$|favicon\\.ico$).*)",
  ],
};
