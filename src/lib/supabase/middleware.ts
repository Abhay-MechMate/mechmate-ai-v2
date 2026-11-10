import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routeDecision } from "@/lib/auth/routing";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          supabaseResponse.headers.set(name, value),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  const target = routeDecision(
    request.nextUrl.pathname,
    request.nextUrl.search,
    Boolean(data?.claims),
  );

  if (target) {
    const redirect = NextResponse.redirect(new URL(target, request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      redirect.cookies.set(cookie),
    );
    return redirect;
  }

  return supabaseResponse;
}
