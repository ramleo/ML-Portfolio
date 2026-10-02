import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/** Testwright R7 — read one shared run report by id (see supabase/qa_shared_runs.sql).
 *  Read via the service role (the anon key has no access under RLS); honors the TTL. */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || !/^[0-9a-zA-Z]{8,40}$/.test(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });
    }
    const { data, error } = await getClient()
      .from("qa_shared_runs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });
    }
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "This shared report has expired." }, { status: 410, headers: CORS });
    }
    return NextResponse.json({ report: data }, { headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers: CORS });
  }
}
