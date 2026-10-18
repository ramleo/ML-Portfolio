"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "../AuthCard";
import { labelStyle, fieldStyle, buttonStyle, errorStyle, noteStyle } from "../formStyles";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/app`,
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle="We'll email you a link to set a new password."
      footer={<Link href="/login" style={{ color: "var(--link)" }}>Back to sign in</Link>}
    >
      {done ? (
        <div style={noteStyle}>
          If an account exists for that email, a reset link is on its way.
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          {error && <div style={errorStyle}>{error}</div>}
          <label style={labelStyle} htmlFor="email">Email</label>
          <input
            id="email" type="email" required autoComplete="email" style={fieldStyle}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" style={buttonStyle} disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
