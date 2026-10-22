import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";
import { normalizeOrigin } from "@/lib/tenant/embedServer";

/** Q3 M3 — read/update one chatbot's embed settings (owner-gated + owner_id-scoped):
 * the publish kill switch, the publishable key, the origin allowlist, and the rate +
 * daily-cap controls. The public embed endpoints read these; only the owner writes. */

const FIELDS = "id, public_key, embed_enabled, allowed_origins, embed_rate_per_min, embed_daily_cap, embed_day_count";

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && isOwnerEmail(user.email) ? user : null;
}

const newKey = () => `pk_live_${randomBytes(18).toString("hex")}`;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select(FIELDS).eq("id", id).eq("owner_id", owner.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  return NextResponse.json({ embed: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (typeof body.embed_enabled === "boolean") patch.embed_enabled = body.embed_enabled;
  if (Array.isArray(body.allowed_origins)) {
    const origins = [...new Set(body.allowed_origins
      .map((o: unknown) => normalizeOrigin(String(o))).filter(Boolean))].slice(0, 20);
    patch.allowed_origins = origins;
  }
  if (body.embed_rate_per_min !== undefined)
    patch.embed_rate_per_min = Math.min(Math.max(Math.round(Number(body.embed_rate_per_min) || 0), 1), 240);
  if (body.embed_daily_cap !== undefined)
    patch.embed_daily_cap = Math.min(Math.max(Math.round(Number(body.embed_daily_cap) || 0), 1), 100000);
  if (body.regenerate === true) patch.public_key = newKey();

  if (!Object.keys(patch).length)
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const admin = createAdminClient();

  // A bot can't be published without a key — generate one on first publish.
  if (patch.embed_enabled === true && patch.public_key === undefined) {
    const { data: cur } = await admin.from("tenants").select("public_key").eq("id", id).eq("owner_id", owner.id).maybeSingle();
    if (!cur) return NextResponse.json({ error: "tenant not found" }, { status: 404 });
    if (!cur.public_key) patch.public_key = newKey();
  }

  const { data, error } = await admin.from("tenants")
    .update(patch).eq("id", id).eq("owner_id", owner.id).select(FIELDS).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  return NextResponse.json({ embed: data });
}
