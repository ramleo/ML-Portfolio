import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import Portfolio from "@/components/Portfolio";
import LinksPanel from "./LinksPanel";

export const metadata = { title: "Portfolio (owner) — AIRaML" };

/**
 * The owner's private view of their own portfolio, plus the recruiter share-link
 * manager. The proxy requires a signed-in user to reach /portfolio; this page
 * additionally requires the OWNER identity (OWNER_EMAIL) — any other signed-in
 * user is sent to their own /app home.
 */
export default async function PortfolioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email)) redirect("/app");

  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <LinksPanel />
      <Portfolio />
      <Footer />
    </>
  );
}
