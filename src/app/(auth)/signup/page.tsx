"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "../AuthCard";
import { labelStyle, fieldStyle, buttonStyle, errorStyle, noteStyle } from "../formStyles";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/app` },
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
      title="Create account"
      subtitle="Sign up with your email and a password."
      footer={<>Already have an account? <Link href="/login" style={{ color: "var(--link)" }}>Sign in</Link></>}
    >
      {done ? (
        <div style={noteStyle}>
          Check your inbox for a confirmation link to finish creating your account.
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          {error && <div style={errorStyle}>{error}</div>}
          <label style={labelStyle} htmlFor="email">Email</label>
          <input
            id="email" type="email" required autoComplete="email" style={fieldStyle}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <label style={labelStyle} htmlFor="password">Password</label>
          <input
            id="password" type="password" required minLength={8} autoComplete="new-password" style={fieldStyle}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" style={buttonStyle} disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
