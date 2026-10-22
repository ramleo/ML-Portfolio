import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/auth/user";
import { getStripe, billingConfigured, STRIPE_PRICE_PRO } from "@/lib/billing/stripe";

/** Q3 M4b — start a Stripe Checkout (subscription) to upgrade the signed-in user to Pro.
 * Hosted Checkout: no card data touches us. The webhook (not this route) flips the plan
 * once payment completes; here we just create the session and hand back its URL. */

export async function POST(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!billingConfigured) return NextResponse.json({ error: "billing not configured" }, { status: 503 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles").select("plan, stripe_customer_id").eq("id", user.id).maybeSingle();
  if (profile?.plan === "pro") return NextResponse.json({ error: "already on Pro" }, { status: 400 });

  const stripe = getStripe();

  // Reuse the user's Stripe customer, or create one and remember it (so subscription
  // webhooks can map back to this user).
  let customerId = profile?.stripe_customer_id ?? "";
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const origin = req.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: STRIPE_PRICE_PRO, quantity: 1 }],
    client_reference_id: user.id,
    allow_promotion_codes: true,
    success_url: `${origin}/app/billing?upgraded=1`,
    cancel_url: `${origin}/app/billing?canceled=1`,
  });

  if (!session.url) return NextResponse.json({ error: "could not start checkout" }, { status: 502 });
  return NextResponse.json({ url: session.url });
}
