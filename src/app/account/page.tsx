import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import AvatarEditor from "@/components/AvatarEditor";

export const metadata = {
  title: "Account — AIRaML",
  robots: { index: false, follow: false },
};

const card: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border2)",
  borderRadius: "var(--radius-card)", padding: "22px 24px",
};
const label: React.CSSProperties = {
  fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase",
  color: "var(--text3)", margin: "0 0 4px",
};
const value: React.CSSProperties = { fontSize: 15, color: "var(--text)", margin: 0 };

/** The signed-in user's account page (reached from the profile menu → Account).
 * Read-only identity plus the one action that belongs here — change password.
 * The proxy guarantees a session before this renders. */
export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role, avatar_url").eq("id", user.id).maybeSingle()
    : { data: null };

  const email = user?.email ?? "";
  const owner = isOwnerEmail(email);
  const role = owner ? "Owner" : profile?.role === "recruiter" ? "Recruiter" : "User";
  const since = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "120px 20px 72px" }}>
        <h1 style={{ fontFamily: "var(--type-display)", fontSize: 30, margin: "0 0 24px", color: "var(--text)" }}>
          Account
        </h1>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={card}>
            <p style={{ ...label, margin: "0 0 12px" }}>Profile picture</p>
            <AvatarEditor initialUrl={profile?.avatar_url ?? null} email={email} />
            <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <div><p style={label}>Email</p><p style={value}>{email}</p></div>
              <div><p style={label}>Role</p><p style={value}>{role}</p></div>
              <div><p style={label}>Member since</p><p style={value}>{since}</p></div>
            </div>
          </div>

          <div style={card}>
            <p style={{ ...label, margin: "0 0 2px" }}>Security</p>
            <p style={{ fontSize: 14, color: "var(--text2)", margin: "0 0 14px" }}>
              Change the password you use to sign in. We&apos;ll email you a secure reset link.
            </p>
            <a
              href="/reset"
              style={{
                display: "inline-flex", padding: "0.5rem 1rem", fontSize: 14, fontWeight: 600,
                color: "var(--text)", textDecoration: "none",
                border: "1px solid var(--border2)", borderRadius: "var(--radius-sm)",
              }}
            >
              Change password
            </a>
          </div>

          {owner && (
            <div style={card}>
              <p style={{ ...label, margin: "0 0 10px" }}>Owner</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href="/portfolio" style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>My portfolio →</a>
                <span style={{ color: "var(--border2)" }}>·</span>
                <a href="/portfolio/share" style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>Share links →</a>
              </div>
            </div>
          )}

          <form action="/auth/signout" method="post" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                padding: "0.55rem 1.1rem", fontSize: 14, fontWeight: 600, cursor: "pointer",
                color: "#f87171", background: "transparent",
                border: "1px solid rgba(248,113,113,0.4)", borderRadius: "var(--radius-sm)",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
