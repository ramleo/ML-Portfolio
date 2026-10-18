import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client for auth (sign in / up / out, password reset).
 *
 * Uses the PUBLIC anon key — never the service-role key, which stays server-side
 * only (it bypasses RLS). @supabase/ssr stores the session in cookies the server
 * client and middleware can read, so a login here is visible to route guards.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
