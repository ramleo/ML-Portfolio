import Link from "next/link";
import ConstellationBackground from "@/components/ConstellationBackground";
import ThemeToggle from "@/components/ThemeToggle";

/** Shared chrome for the signed-in surfaces (/app, /recruiter): background, a
 * top bar with the email + theme toggle + sign-out, and a centered content card. */
export default function SurfaceShell({
  eyebrow,
  title,
  email,
  children,
}: {
  eyebrow: string;
  title: string;
  email: string;
  children: React.ReactNode;
}) {
  return (
    <main style={{ position: "relative", minHeight: "100vh", padding: "16px" }}>
      <ConstellationBackground />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link href="/" style={{ fontFamily: "var(--type-display)", fontWeight: 700, color: "var(--text)", textDecoration: "none" }}>
          AIRaML
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {email && <span style={{ fontSize: 13, color: "var(--text2)" }}>{email}</span>}
          <ThemeToggle />
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              style={{
                fontSize: 13,
                color: "var(--text2)",
                background: "transparent",
                border: "1px solid var(--border2)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <section
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 720,
          margin: "48px auto 0",
          background: "var(--bg-card)",
          border: "1px solid var(--border2)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow)",
          padding: 28,
        }}
      >
        <p style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 8px" }}>
          {eyebrow}
        </p>
        <h1 style={{ fontFamily: "var(--type-display)", fontSize: 28, margin: "0 0 16px", color: "var(--text)" }}>
          {title}
        </h1>
        {children}
      </section>
    </main>
  );
}
