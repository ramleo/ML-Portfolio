import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/auth/user";
import { getPlan, maxBots } from "@/lib/auth/plan";

/** Q3 M4a — self-serve tenant management. Any signed-in user manages their OWN bots,
 * scoped by owner_id = user.id (the isolation boundary). Free users are capped on how
 * many bots they can create; the owner is unlimited. Service-role only; no RLS policies
 * on the tables. */

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48)
    || "tenant";
}

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenants")
    .select("id, name, slug, config, created_at")
    .eq("owner_id", user.id)                   // isolation: only this user's bots
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenants: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const admin = createAdminClient();

  // Free-tier bot cap (owner is unlimited). Counts this user's existing bots.
  const limit = maxBots(await getPlan(admin, user.id), user.email);
  if (Number.isFinite(limit)) {
    const { count } = await admin.from("tenants")
      .select("id", { count: "exact", head: true }).eq("owner_id", user.id);
    if ((count ?? 0) >= limit)
      return NextResponse.json(
        { error: `Your plan allows up to ${limit} chatbot${limit === 1 ? "" : "s"}. Upgrade to create more.` },
        { status: 403 },
      );
  }

  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await admin
    .from("tenants")
    .insert({ name, slug, owner_id: user.id })
    .select("id, name, slug, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenant: data }, { status: 201 });
}
