import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/billing/stripe";

/** Q3 M4b — Stripe webhook: the single source of truth for a user's plan.
 *
 * Stripe calls this after checkout and on any subscription change. We verify the
 * signature against the raw body, then flip profiles.plan: 'pro' once a subscription is
 * active, back to 'free' when it ends. Never trust the client for plan state — only this
 * signed callback writes it. Returns 200 fast; unknown events are acknowledged + ignored. */

type Admin = ReturnType<typeof createAdminClient>;

/** An active/trialing subscription means Pro; anything else (canceled, unpaid, past_due)
 * means Free. */
function planForStatus(status: string): "pro" | "free" {
  return status === "active" || status === "trialing" ? "pro" : "free";
}

async function setPlanByCustomer(admin: Admin, customerId: string, plan: "pro" | "free", subId?: string | null) {
  const patch: Record<string, unknown> = { plan };
  if (subId !== undefined) patch.stripe_subscription_id = subId;
  await admin.from("profiles").update(patch).eq("stripe_customer_id", customerId);
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!STRIPE_WEBHOOK_SECRET || !sig)
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });

  const body = await req.text(); // raw body required for signature verification
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id;
        const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id;
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null;
        if (userId) {
          await admin.from("profiles")
            .update({ plan: "pro", stripe_customer_id: customerId, stripe_subscription_id: subId })
            .eq("id", userId);
        } else if (customerId) {
          await setPlanByCustomer(admin, customerId, "pro", subId);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        const plan = event.type === "customer.subscription.deleted" ? "free" : planForStatus(sub.status);
        if (customerId) await setPlanByCustomer(admin, customerId, plan, plan === "free" ? null : sub.id);
        break;
      }
      default:
        break; // acknowledge everything else
    }
  } catch {
    // Log-free: don't echo payload. A 500 makes Stripe retry, which is what we want.
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
