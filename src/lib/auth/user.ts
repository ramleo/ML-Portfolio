import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/** Q3 M4a — "any signed-in user" gate for the self-serve chatbot platform.
 *
 * The edge proxy already guarantees a session on gated routes; this confirms it inside
 * a route handler and hands back the user. Isolation is NOT this gate's job — every
 * tenant query is scoped by `owner_id = user.id`, so one user can never read another's
 * bots. (Use `isOwnerEmail` from ./owner only for owner-exempt checks, e.g. unlimited
 * plan.) */
export async function getAuthedUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}
