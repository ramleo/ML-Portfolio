/** Write-only sink for the security log — LOGGING_SPEC.md §5b.
 *
 * WRITE ONLY, on purpose. There is no GET here and there must never be one:
 * §5b requires this table to be unreadable by anything the site exposes, and
 * the table itself has RLS on with no policies so the anon key cannot reach
 * it either. Two locks, because one of them is a line of code someone could
 * delete by accident.
 *
 * Unlike /api/llm-log this is called from the BROWSER, so the shared secret
 * cannot gate it — shipping a secret to the browser is not a secret. It is
 * origin-checked and everything it stores is clamped server-side instead.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const trunc = (v: unknown, n: number) =>
  v === null || v === undefined || v === "" ? null : String(v).slice(0, n);

const int = (v: unknown, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.trunc(n), max) : null;
};

/** §5b: "The password tool is excluded from this log entirely. Its whole
 * promise is that the password never leaves the browser… No hash, no length,
 * no row." Enforced here as well as at the call site, because a promise that
 * depends on every caller remembering is not a promise. */
const EXCLUDED = new Set(["password-audit", "password-strength"]);

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("security-log: Supabase env missing");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const b = await req.json();
    const tool = String(b.tool ?? "").slice(0, 80);
    if (EXCLUDED.has(tool)) return NextResponse.json({ ok: true, skipped: true });

    const country = req.headers.get("CF-IPCountry") ?? req.headers.get("x-vercel-ip-country") ?? "";
    const { error } = await createClient(url, key).from("security_log").insert({
      session_id: trunc(b.session_id, 80),
      run_id:     trunc(b.run_id, 80),
      tool:       tool || null,
      filename:   trunc(b.filename, 255),
      ext:        trunc(b.ext, 16),
      size_bytes: int(b.size_bytes, 5_000_000_000),
      mime:       trunc(b.mime, 120),
      // A SHA-256 hex digest and nothing else. Anything longer or otherwise
      // shaped is dropped rather than stored — this column must never become
      // a place content can be smuggled into.
      sha256:     /^[a-f0-9]{64}$/.test(String(b.sha256 ?? "")) ? String(b.sha256) : null,
      prompt_len: int(b.prompt_len, 10_000_000),
      country,
    });
    if (error) {
      console.error("security-log: insert failed", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("security-log: bad payload", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
