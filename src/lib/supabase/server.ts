import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server-side Supabase client bound to the request's cookies (Server
 * Components, Route Handlers, Server Actions). Reads the session the browser
 * client wrote; writes refreshed tokens back. Anon key only — RLS applies, so a
 * user sees only what their policies allow.
 *
 * In a Server Component the cookie store is read-only and the setAll writes
 * throw; that is expected and safe to swallow because middleware (proxy.ts) is
 * what actually refreshes the session cookie on each request.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* called from a Server Component — middleware refreshes instead */
          }
        },
      },
    },
  );
}
