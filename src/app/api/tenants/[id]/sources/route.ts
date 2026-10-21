import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Q3 M2 — a chatbot's knowledge sources: list them (with chunk counts) and delete
 * one. Owner-gated and scoped to owner_id. The chunk store is the tenant's KB. */

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && isOwnerEmail(user.email) ? user : null;
}

async function ownsTenant(admin: ReturnType<typeof createAdminClient>, id: string, ownerId: string) {
  const { data } = await admin.from("tenants").select("id").eq("id", id).eq("owner_id", ownerId).single();
  return !!data;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const admin = createAdminClient();
  if (!(await ownsTenant(admin, id, owner.id)))
    return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  const { data, error } = await admin
    .from("tenant_chunks").select("source").eq("tenant_id", id).limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts = new Map<string, number>();
  for (const r of (data ?? []) as { source: string }[]) counts.set(r.source, (counts.get(r.source) ?? 0) + 1);
  const sources = [...counts.entries()].map(([source, chunks]) => ({ source, chunks })).sort((a, b) => b.chunks - a.chunks);
  return NextResponse.json({ sources });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const source = String(body.source ?? "").trim();
  if (!source) return NextResponse.json({ error: "source required" }, { status: 400 });

  const admin = createAdminClient();
  if (!(await ownsTenant(admin, id, owner.id)))
    return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  const { error } = await admin.from("tenant_chunks").delete().eq("tenant_id", id).eq("source", source);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
