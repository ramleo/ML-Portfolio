import type { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Q3 M4a — plan tiers for the self-serve chatbot platform (server-only).
 *
 * A user's plan gates the two things that cost us money or imply scale: how many bots
 * they can create, and whether they can publish one live (public embed). The site OWNER
 * is always unlimited, independent of the DB column. M4b (Stripe) sets a user to 'pro'. */
export type Plan = "free" | "pro";

type Admin = ReturnType<typeof createAdminClient>;

/** Max bots a plan may create. Owner is unlimited (handled by callers). */
export const PLAN_MAX_BOTS: Record<Plan, number> = { free: 2, pro: 100 };

/** Read a user's plan (defaults to 'free' if the row/column is missing). */
export async function getPlan(admin: Admin, userId: string): Promise<Plan> {
  const { data } = await admin.from("profiles").select("plan").eq("id", userId).maybeSingle();
  return data?.plan === "pro" ? "pro" : "free";
}

/** Owner → unlimited; everyone else by their plan. */
export function maxBots(plan: Plan, email: string | null | undefined): number {
  return isOwnerEmail(email) ? Infinity : PLAN_MAX_BOTS[plan];
}

/** May this user publish a bot live (public embed)? Owner always; others need a paid
 * plan — the cost guard that keeps free signups from spending our LLM budget at scale. */
export function canPublish(plan: Plan, email: string | null | undefined): boolean {
  return isOwnerEmail(email) || plan !== "free";
}
