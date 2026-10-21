import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";
import { sanitizeConfig } from "@/lib/tenant/config";

/** Q3 M2 — update (name + bot config) or delete one chatbot. Owner-gated and scoped
 * to owner_id (platform-ready). Deleting a tenant cascades its chunks (FK). */

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && isOwnerEmail(user.email) ? user : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 80);
  if (body.config !== undefined) patch.config = sanitizeConfig(body.config);
  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenants").update(patch).eq("id", id).eq("owner_id", owner.id)
    .select("id, name, slug, config, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  return NextResponse.json({ tenant: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const admin = createAdminClient();
  const { error } = await admin.from("tenants").delete().eq("id", id).eq("owner_id", owner.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
