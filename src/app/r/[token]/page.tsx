import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import Portfolio from "@/components/Portfolio";

export const metadata = { title: "Shared portfolio — AIRaML", robots: { index: false } };

/** Recruiter view: the owner's private portfolio, shown to anyone holding a VALID
 * share-link token — no login. Validated server-side with the service-role key
 * (the token is the only credential). A link is valid iff it exists, is not
 * revoked, and is unexpired; otherwise the visitor gets a neutral "unavailable"
 * page. Not indexed by search engines. */
export default async function RecruiterView({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("recruiter_links")
    .select("expires_at, revoked")
    .eq("token", token)
    .maybeSingle();

  const valid =
    !!data &&
    !data.revoked &&
    (!data.expires_at || new Date(data.expires_at) > new Date());

  if (!valid) {
    return (
      <>
        <ParticleGridClient />
        <main style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center", background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-card)", padding: 32 }}>
            <h1 style={{ fontFamily: "var(--type-display)", fontSize: 22, margin: "0 0 10px", color: "var(--text)" }}>
              This link is no longer available
            </h1>
            <p style={{ fontSize: 14, color: "var(--text2)", margin: "0 0 20px" }}>
              The share-link has expired or been revoked. Please ask for a new one.
            </p>
            <Link href="/" style={{ color: "var(--link)", fontSize: 14 }}>Go to AIRaML &rarr;</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <Portfolio />
      <Footer />
    </>
  );
}
