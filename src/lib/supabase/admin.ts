import { createClient } from "@supabase/supabase-js";

/** Service-role Supabase client — bypasses RLS. SERVER ONLY (route handlers,
 * server components). Never import this into client code: the service-role key
 * must never reach the browser. Used for owner-managed tables (recruiter_links)
 * and for validating a recruiter token when there is no user session. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
