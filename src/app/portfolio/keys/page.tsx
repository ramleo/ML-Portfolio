import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import KeysPanel from "./KeysPanel";

export const metadata = {
  title: "API keys (owner) — AIRaML",
  robots: { index: false, follow: false },
};

/** Owner-only page to manage public API keys (Q1). The proxy requires a session;
 * this page additionally requires the OWNER identity. Reached from the profile
 * menu → "API keys". */
export default async function KeysPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email)) redirect("/app");

  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "120px 20px 72px" }}>
        <a href="/portfolio" style={{ fontSize: 13, color: "var(--text2)", textDecoration: "none" }}>← Back to portfolio</a>
        <h1 style={{ fontFamily: "var(--type-display)", fontSize: 30, margin: "14px 0 6px", color: "var(--text)" }}>
          API keys
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--text2)", margin: "0 0 28px", maxWidth: 680 }}>
          Give others programmatic access to the public API. Each key carries a tier,
          a monthly request quota, and a spend budget, and can be revoked anytime.
        </p>
        <KeysPanel />
      </main>
      <Footer />
    </>
  );
}
