import Stripe from "stripe";

/** Q3 M4b — Stripe client + billing config (server-only).
 *
 * The frontend is the control plane, so Stripe secrets live here and never reach the
 * browser (we use hosted Checkout + Billing Portal, so no publishable key / client
 * Stripe.js is needed). `plan` on profiles stays the source of truth the app reads; the
 * webhook flips it. Everything is wired for TEST mode first (sk_test_…). */

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
export const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO ?? "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/** True only when the three secrets a checkout needs are present — lets the UI/routes
 * fail gracefully (and honestly) before Stripe is configured. */
export const billingConfigured = !!(STRIPE_SECRET_KEY && STRIPE_PRICE_PRO);

let _stripe: Stripe | null = null;

/** Lazily construct the client so an unconfigured deploy doesn't crash at import time. */
export function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");
  if (!_stripe) _stripe = new Stripe(STRIPE_SECRET_KEY);
  return _stripe;
}
