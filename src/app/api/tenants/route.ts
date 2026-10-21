import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Q3 M1 — owner-only tenant management for the chatbot builder. A tenant is an
 * isolated knowledge base + (later) config. Service-role only; the tables have no
 * RLS policies. M1 keeps this owner-gated; multi-user creation comes with the
 * builder UI in M2. */

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48)
    || "tenant";
}

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isOwnerEmail(user?.email) ? user : null;
}

export async function GET() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenants")
    .select("id, name, slug, config, created_at")
    .eq("owner_id", owner.id)                 // platform-ready: scope to the owner
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenants: data ?? [] });
}

export async function POST(req: NextRequest) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const admin = createAdminClient();
  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await admin
    .from("tenants")
    .insert({ name, slug, owner_id: owner.id })
    .select("id, name, slug, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenant: data }, { status: 201 });
}
