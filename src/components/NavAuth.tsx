"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Navbar auth control.
 *  - signed out → a "Sign in" link.
 *  - signed in  → a round avatar (initials) that opens a profile dropdown:
 *      identity header (email + role), the owner's private links, Account,
 *      Settings, then Sign out. Sign out is a menu item, not a separate chip,
 *      so it shares the menu's visual language.
 *  Owner-awareness comes from /api/me (OWNER_EMAIL stays server-side). */

interface Me {
  email: string | null;
  role?: string;
  isOwner?: boolean;
}

function initials(email: string): string {
  const local = email.split("@")[0].replace(/[^a-zA-Z]/g, "");
  return (local.slice(0, 2) || email.slice(0, 2)).toUpperCase();
}

function roleLabel(me: Me): string {
  if (me.isOwner) return "Owner";
  if (me.role === "recruiter") return "Recruiter";
  return "User";
}

const linkStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "0.6rem",
  padding: "0.55rem 0.9rem", fontSize: "0.85rem", fontWeight: 500,
  color: "var(--text2)", textDecoration: "none", background: "transparent",
  border: "none", width: "100%", textAlign: "left", cursor: "pointer",
  transition: "background 0.12s, color 0.12s",
};

function Item({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      role="menuitem"
      style={linkStyle}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--text)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; }}
    >
      {children}
    </a>
  );
}

export default function NavAuth() {
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined = resolving
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      setMe(res.ok ? await res.json() : { email: null });
    } catch {
      setMe({ email: null });
    }
  }, []);

  useEffect(() => {
    (async () => { await refresh(); })();
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void refresh(); });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (me === undefined) return null; // resolving — avoid a flash

  if (!me || !me.email) {
    return (
      <a
        href="/login"
        style={{ fontSize: "0.82rem", color: "var(--text2)", textDecoration: "none", fontWeight: 500 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text2)")}
      >
        Sign in
      </a>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: "50%", cursor: "pointer",
          background: "var(--brand-gradient)", color: "#fff",
          fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.02em",
          border: open ? "2px solid var(--accent)" : "2px solid transparent",
          padding: 0, lineHeight: 1,
        }}
      >
        {initials(me.email)}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", top: "calc(100% + 0.5rem)", right: 0,
            minWidth: 232, background: "var(--bg-nav)", backdropFilter: "blur(16px)",
            border: "1px solid var(--border)", borderRadius: "var(--radius-card)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.28)", padding: "0.4rem",
            display: "flex", flexDirection: "column", zIndex: 200,
          }}
        >
          {/* Identity header */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem 0.9rem 0.7rem" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: "var(--brand-gradient)", color: "#fff", fontSize: "0.75rem", fontWeight: 700,
            }}>
              {initials(me.email)}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {me.email}
              </span>
              <span style={{
                display: "inline-block", marginTop: 3, padding: "0.08rem 0.45rem",
                fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
                color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                borderRadius: 9999,
              }}>
                {roleLabel(me)}
              </span>
            </span>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "0.15rem 0.4rem 0.3rem" }} />

          {me.isOwner && (
            <>
              <Item href="/portfolio">My portfolio</Item>
              <Item href="/portfolio/share">Share links</Item>
              <div style={{ height: 1, background: "var(--border)", margin: "0.3rem 0.4rem" }} />
            </>
          )}

          <Item href="/account">Account</Item>
          <Item href="/settings">Settings</Item>

          <div style={{ height: 1, background: "var(--border)", margin: "0.3rem 0.4rem" }} />

          <form action="/auth/signout" method="post" style={{ margin: 0 }}>
            <button
              type="submit"
              role="menuitem"
              style={linkStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; }}
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
