"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "../AuthCard";
import { labelStyle, fieldStyle, buttonStyle, errorStyle } from "../formStyles";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    // Full navigation so the edge proxy re-reads the fresh session cookie.
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <div style={errorStyle}>{error}</div>}
      <label style={labelStyle} htmlFor="email">Email</label>
      <input
        id="email" type="email" required autoComplete="email" style={fieldStyle}
        value={email} onChange={(e) => setEmail(e.target.value)}
      />
      <label style={labelStyle} htmlFor="password">Password</label>
      <input
        id="password" type="password" required autoComplete="current-password" style={fieldStyle}
        value={password} onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" style={buttonStyle} disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <Link href="/reset" style={{ fontSize: 13, color: "var(--link)" }}>Forgot password?</Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      subtitle="Access your AIRaML account."
      footer={<>No account? <Link href="/signup" style={{ color: "var(--link)" }}>Create one</Link></>}
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
