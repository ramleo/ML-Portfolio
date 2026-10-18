import Link from "next/link";
import ConstellationBackground from "@/components/ConstellationBackground";
import ThemeToggle from "@/components/ThemeToggle";

/** Shared shell for the login / signup / reset pages: the site's constellation
 * background, a theme toggle, and a centered glass card. Presentational only. */
export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <ConstellationBackground />
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 2 }}>
        <ThemeToggle />
      </div>

      <section
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 400,
          background: "var(--bg-card)",
          border: "1px solid var(--border2)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow)",
          padding: 28,
        }}
      >
        <Link
          href="/"
          style={{ fontSize: 13, color: "var(--text2)", textDecoration: "none" }}
        >
          &larr; AIRaML
        </Link>
        <h1
          style={{
            fontFamily: "var(--type-display)",
            fontSize: 24,
            margin: "14px 0 6px",
            color: "var(--text)",
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text2)", margin: "0 0 20px" }}>{subtitle}</p>
        {children}
        {footer && (
          <div style={{ marginTop: 18, fontSize: 13, color: "var(--text2)", textAlign: "center" }}>
            {footer}
          </div>
        )}
      </section>
    </main>
  );
}
