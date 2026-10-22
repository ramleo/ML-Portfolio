import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import BillingPanel from "./BillingPanel";

export const metadata = {
  title: "Billing — AIRaML",
  robots: { index: false, follow: false },
};

/** Q3 M4b — plan + billing for the signed-in user: see the current plan, upgrade to Pro
 * (Stripe Checkout), or manage/cancel (Stripe Billing Portal). */
export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/billing");

  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "120px 20px 72px" }}>
        <h1 style={{ fontFamily: "var(--type-display)", fontSize: 30, margin: "14px 0 6px", color: "var(--text)" }}>
          Billing
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--text2)", margin: "0 0 28px", maxWidth: 640 }}>
          Your plan controls how many chatbots you can create and whether you can publish
          them live on a website.
        </p>
        <BillingPanel />
      </main>
      <Footer />
    </>
  );
}
