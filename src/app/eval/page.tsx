import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import EvalDashboard from "./EvalDashboard";

export const metadata = {
  title: "LLM evaluation (owner) — AIRaML",
  robots: { index: false, follow: false },
};

/** Q4 M1 — owner-only LLM performance & cost dashboard. The proxy requires a
 * session; this page additionally requires the OWNER identity. Reached from the
 * profile menu → "LLM metrics". */
export default async function EvalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email)) redirect("/app");

  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "120px 20px 72px" }}>
        <h1 style={{ fontFamily: "var(--type-display)", fontSize: 30, margin: "0 0 6px", color: "var(--text)" }}>
          LLM evaluation
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--text2)", margin: "0 0 28px", maxWidth: 680 }}>
          How the site&apos;s LLM calls are performing — volume, errors, latency, tokens and cost,
          from the content-free <code>llm_calls</code> log. Quality scoring (an LLM judge over a
          golden set) is a later milestone.
        </p>
        <EvalDashboard />
      </main>
      <Footer />
    </>
  );
}
