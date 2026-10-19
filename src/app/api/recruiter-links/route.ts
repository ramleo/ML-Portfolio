import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Owner-only API for recruiter share-links.
 *   GET    → list all links
 *   POST   → create one { label?, expiresInDays? } (0/absent = never expires)
 *   DELETE → ?token=… permanently remove one (for tidying revoked links)
 * The owner identity is checked from the signed-in session; writes use the
 * service-role key (recruiter_links has RLS on with no policies). */

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isOwnerEmail(user?.email);
}

export async function GET() {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("recruiter_links")
    .select("token, label, created_at, expires_at, revoked")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ links: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.slice(0, 120) : null;
  const days = Number(body.expiresInDays);
  const expires_at =
    Number.isFinite(days) && days > 0
      ? new Date(Date.now() + days * 86_400_000).toISOString()
      : null;

  const token = randomUUID();
  const admin = createAdminClient();
  const { error } = await admin
    .from("recruiter_links")
    .insert({ token, label, expires_at });
  if (error) {
    if (/relation .*recruiter_links.* does not exist|could not find the table/i.test(error.message))
      return NextResponse.json({ error: "needs_setup" }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ token, label, expires_at, revoked: false });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("recruiter_links").delete().eq("token", token);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
