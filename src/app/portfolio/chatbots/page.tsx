import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import ChatbotsPanel from "./ChatbotsPanel";

export const metadata = {
  title: "Chatbots (owner) — AIRaML",
  robots: { index: false, follow: false },
};

/** Q3 M2 — owner builder for multi-tenant chatbots: create a bot, configure it, add
 * its knowledge, and test it. Owner-gated (proxy requires a session; this page also
 * requires the OWNER identity) and owner_id-scoped server-side, so the same UI
 * becomes a self-serve platform later by relaxing this gate (Q3 M3/M4). */
export default async function ChatbotsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email)) redirect("/app");

  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "120px 20px 72px" }}>
        <a href="/portfolio" style={{ fontSize: 13, color: "var(--text2)", textDecoration: "none" }}>← Back to portfolio</a>
        <h1 style={{ fontFamily: "var(--type-display)", fontSize: 30, margin: "14px 0 6px", color: "var(--text)" }}>
          Chatbots
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--text2)", margin: "0 0 28px", maxWidth: 700 }}>
          Build a domain-specific chatbot from your own documents. Create one, give it
          a persona, add its knowledge, and test it — each bot is isolated to its own
          knowledge base. (Embedding on a website comes next.)
        </p>
        <ChatbotsPanel />
      </main>
      <Footer />
    </>
  );
}
