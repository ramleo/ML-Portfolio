import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import ThemeToggle from "@/components/ThemeToggle";
import PalettePicker from "@/components/PalettePicker";

export const metadata = {
  title: "Settings — AIRaML",
  robots: { index: false, follow: false },
};

const card: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid var(--border2)",
  borderRadius: "var(--radius-card)", padding: "22px 24px",
};
const row: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
};

/** Signed-in user's settings (profile menu → Settings). Preferences that apply
 * across the site live here; account identity and password live on /account. */
export default function SettingsPage() {
  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "120px 20px 72px" }}>
        <h1 style={{ fontFamily: "var(--type-display)", fontSize: 30, margin: "0 0 24px", color: "var(--text)" }}>
          Settings
        </h1>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={card}>
            <h2 style={{ fontFamily: "var(--type-display)", fontSize: 18, margin: "0 0 14px", color: "var(--text)" }}>
              Appearance
            </h2>
            <div style={{ ...row, marginBottom: 16 }}>
              <span>
                <p style={{ fontSize: 14.5, color: "var(--text)", margin: 0, fontWeight: 500 }}>Theme</p>
                <p style={{ fontSize: 13, color: "var(--text2)", margin: "2px 0 0" }}>Switch between light and dark.</p>
              </span>
              <ThemeToggle />
            </div>
            <div style={row}>
              <span>
                <p style={{ fontSize: 14.5, color: "var(--text)", margin: 0, fontWeight: 500 }}>Accent palette</p>
                <p style={{ fontSize: 13, color: "var(--text2)", margin: "2px 0 0" }}>Pick the site&apos;s accent colors.</p>
              </span>
              <PalettePicker />
            </div>
          </div>

          <div style={card}>
            <h2 style={{ fontFamily: "var(--type-display)", fontSize: 18, margin: "0 0 6px", color: "var(--text)" }}>
              Account
            </h2>
            <p style={{ fontSize: 14, color: "var(--text2)", margin: "0 0 14px" }}>
              Your identity, role, and password.
            </p>
            <a
              href="/account"
              style={{
                display: "inline-flex", padding: "0.5rem 1rem", fontSize: 14, fontWeight: 600,
                color: "var(--text)", textDecoration: "none",
                border: "1px solid var(--border2)", borderRadius: "var(--radius-sm)",
              }}
            >
              Go to account
            </a>
          </div>

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
