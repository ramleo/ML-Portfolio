import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Identity for the signed-in user, for the navbar profile menu.
 *   { email, role, isOwner }  — or { email: null } when signed out.
 * Keeps OWNER_EMAIL server-side: the client learns *whether* it is the owner,
 * never the owner address itself. role comes from the user's own profile row
 * (readable under the profiles_self_read RLS policy). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ email: null });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    email: user.email,
    role: profile?.role ?? "user",
    avatarUrl: profile?.avatar_url ?? null,
    isOwner: isOwnerEmail(user.email),
  });
}
