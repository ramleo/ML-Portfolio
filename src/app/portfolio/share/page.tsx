import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import LinksPanel from "../LinksPanel";

export const metadata = {
  title: "Share links (owner) — AIRaML",
  robots: { index: false, follow: false },
};

/** Owner-only home for the recruiter share-link manager. Moved off /portfolio
 * so the portfolio page stays purely the portfolio. Reached from the profile
 * menu → "Share links". The proxy requires a session; this page additionally
 * requires the OWNER identity. */
export default async function SharePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email)) redirect("/app");

  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "120px 20px 72px" }}>
        <a
          href="/portfolio"
          style={{ fontSize: 13, color: "var(--text2)", textDecoration: "none" }}
        >
          ← Back to portfolio
        </a>
        <h1 style={{ fontFamily: "var(--type-display)", fontSize: 30, margin: "14px 0 6px", color: "var(--text)" }}>
          Share links
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--text2)", margin: "0 0 28px", maxWidth: 640 }}>
          Give a recruiter a secret, no-login link to your portfolio. Each link can
          expire on its own schedule and be revoked the moment you no longer need it.
        </p>
        <LinksPanel />
      </main>
      <Footer />
    </>
  );
}
