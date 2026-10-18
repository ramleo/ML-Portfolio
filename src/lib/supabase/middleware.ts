import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/** Build a Supabase client bound to the middleware (proxy) request/response so
 * the session cookie is refreshed on every matched request, and return it next
 * to the response that carries the refreshed cookies.
 *
 * The caller must use THIS response object (or copy its cookies) for the request
 * to stay signed in — that is how @supabase/ssr keeps tokens fresh at the edge.
 */
export function createMiddlewareClient(req: NextRequest) {
  const response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  return { supabase, response };
}
