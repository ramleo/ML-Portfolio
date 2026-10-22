import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/auth/user";
import { getStripe, billingConfigured } from "@/lib/billing/stripe";

/** Q3 M4b — open Stripe's hosted Billing Portal so the user can update their card or
 * cancel. Cancellation comes back to us as a webhook that flips the plan to free. */

export async function POST(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!billingConfigured) return NextResponse.json({ error: "billing not configured" }, { status: 503 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (!profile?.stripe_customer_id)
    return NextResponse.json({ error: "no billing account yet" }, { status: 400 });

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${req.nextUrl.origin}/app/billing`,
  });
  return NextResponse.json({ url: session.url });
}
