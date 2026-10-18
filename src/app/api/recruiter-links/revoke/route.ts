import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Owner-only: revoke a recruiter share-link by token (sets revoked = true, so
 * /r/<token> stops working immediately). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("recruiter_links")
    .update({ revoked: true })
    .eq("token", token);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
