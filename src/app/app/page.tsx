import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import SurfaceShell from "@/components/SurfaceShell";

export const metadata = { title: "Your account — AIRaML" };

/** User home. The edge proxy guarantees a signed-in user reaches this. The OWNER
 * never belongs on the generic user home — send them straight to /portfolio (the
 * portfolio + recruiter-link manager). Requires OWNER_EMAIL to be set.
 *
 * For everyone else this is a signed-in launchpad into the public tools. It holds
 * no personal information about the site's owner, by design. */

const LINKS = [
  { href: "/#capabilities", title: "Browse the tools", body: "50+ ML & security tools you can run in the browser." },
  { href: "/#projects", title: "Platforms", body: "The larger apps: EDA, Vision, Testwright, Text-to-SQL." },
  { href: "/handbook", title: "Handbook", body: "Per-tool guides and walkthroughs." },
  { href: "/docs", title: "Docs", body: "How the system is built and how to use the APIs." },
];

export default async function AppHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (isOwnerEmail(user?.email)) redirect("/portfolio");

  const name = user?.email?.split("@")[0] ?? "";

  return (
    <SurfaceShell
      eyebrow="Your workspace"
      title={name ? `Welcome back, ${name}` : "Welcome back"}
      email={user?.email ?? ""}
    >
      <p style={{ color: "var(--text2)", fontSize: 14, margin: "0 0 20px" }}>
        You&apos;re signed in. Jump into any of the tools below — saved work and
        personalized features will appear here as they ship.
      </p>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              display: "block",
              padding: 16,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border2)",
              background: "var(--bg)",
              textDecoration: "none",
            }}
          >
            <div style={{ fontFamily: "var(--type-display)", fontSize: 16, color: "var(--text)", marginBottom: 4 }}>
              {l.title}
            </div>
            <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>{l.body}</div>
          </Link>
        ))}
      </div>
    </SurfaceShell>
  );
}
