"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Auth control for the navbar: "Sign in" when logged out, or an "Account" link
 * + "Sign out" when logged in. Reads the session client-side and updates live on
 * auth changes. Purely about signed-in state — it does not expose owner identity
 * (that stays server-side). */
export default function NavAuth() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (email === undefined) return null; // still resolving — avoid a flash

  if (!email) {
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
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <a
        href="/app"
        style={{ fontSize: "0.82rem", color: "var(--text2)", textDecoration: "none", fontWeight: 500 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text2)")}
      >
        Account
      </a>
      <form action="/auth/signout" method="post" style={{ margin: 0 }}>
        <button
          type="submit"
          style={{
            fontSize: "0.8rem", color: "var(--text2)", background: "transparent",
            border: "1px solid var(--border2)", borderRadius: 9999,
            padding: "0.3rem 0.8rem", cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
