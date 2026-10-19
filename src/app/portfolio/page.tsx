import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import Portfolio from "@/components/Portfolio";

export const metadata = { title: "Portfolio (owner) — AIRaML" };

/**
 * The owner's private view of their own portfolio. The proxy requires a signed-in
 * user to reach /portfolio; this page additionally requires the OWNER identity
 * (OWNER_EMAIL) — any other signed-in user is sent to their own /app home. The
 * recruiter share-link manager now lives on its own page (/portfolio/share),
 * reached from the profile menu or the link below.
 */
export default async function PortfolioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email)) redirect("/app");

  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "96px 20px 0", display: "flex", justifyContent: "flex-end" }}>
        <a
          href="/portfolio/share"
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            fontSize: 13, fontWeight: 600, color: "var(--text2)", textDecoration: "none",
            padding: "0.4rem 0.85rem", border: "1px solid var(--border2)", borderRadius: 9999,
          }}
        >
          Manage share links →
        </a>
      </div>
      <Portfolio />
      <Footer />
    </>
  );
}
