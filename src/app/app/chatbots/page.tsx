import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import ChatbotsPanel from "@/app/portfolio/chatbots/ChatbotsPanel";

export const metadata = {
  title: "My chatbots — AIRaML",
  robots: { index: false, follow: false },
};

/** Q3 M4a — self-serve chatbot builder for any signed-in user. Same builder the owner
 * uses, reached here instead of /portfolio (which is owner-only). The APIs are scoped to
 * the signed-in user's own owner_id, so each user sees only their own bots. Building and
 * testing are free; publishing a bot live (public embed) requires a paid plan. */
export default async function MyChatbotsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/chatbots");

  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "120px 20px 72px" }}>
        <h1 style={{ fontFamily: "var(--type-display)", fontSize: 30, margin: "14px 0 6px", color: "var(--text)" }}>
          My chatbots
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--text2)", margin: "0 0 28px", maxWidth: 700 }}>
          Build a domain-specific chatbot from your own documents: create one, give it a
          persona, add its knowledge, and test it — each bot is isolated to its own
          knowledge base. When it&apos;s ready, publish it to embed on your website.
        </p>
        <ChatbotsPanel />
      </main>
      <Footer />
    </>
  );
}
