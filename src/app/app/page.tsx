import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/owner";

export const metadata = { title: "AIRaML" };

/** Post-login router. There is no separate "workspace" page — a signed-in normal
 * user just uses the real site (homepage + tools), signed in. So:
 *   - the OWNER goes to /portfolio (their portfolio + recruiter-link manager),
 *   - everyone else goes to the homepage, now with Account/Sign out in the navbar.
 * The edge proxy guarantees a session before this runs. */
export default async function AppRouter() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(isOwnerEmail(user?.email) ? "/portfolio" : "/");
}
