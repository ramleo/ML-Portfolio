import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth/email callback: exchange the `code` from a confirmation or reset link
 * for a session cookie, then send the user on to `next` (defaults to /app). On
 * failure, bounce back to /login with a flag. */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
