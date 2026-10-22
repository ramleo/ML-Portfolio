import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/auth/user";
import { embedTexts, chunkText } from "@/lib/tenant/rag";

/** Q3 M4a — ingest a document into ONE tenant's knowledge base. chunk (here) → embed
 * (Space) → store tagged with tenant_id. Any signed-in user, scoped to their own
 * owner_id; the ownership check below is the isolation boundary. */

export async function POST(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const tenantId = String(body.tenantId ?? "").trim();
  const source = String(body.source ?? "document").trim() || "document";
  const text = String(body.text ?? "").trim();
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const admin = createAdminClient();

  // Confirm the tenant exists AND belongs to this owner (the isolation boundary).
  const { data: tenant, error: tErr } = await admin
    .from("tenants").select("id").eq("id", tenantId).eq("owner_id", user.id).single();
  if (tErr || !tenant) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  const chunks = chunkText(text);
  if (!chunks.length) return NextResponse.json({ error: "no content to index" }, { status: 400 });

  let embeddings: number[][];
  try {
    embeddings = await embedTexts(chunks);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  const rows = chunks.map((content, i) => ({
    tenant_id: tenantId,
    source,
    chunk_index: i,
    content,
    embedding: `[${embeddings[i].join(",")}]`, // pgvector text form
    metadata: {},
  }));

  const { error } = await admin.from("tenant_chunks").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ indexed: rows.length, source });
}
