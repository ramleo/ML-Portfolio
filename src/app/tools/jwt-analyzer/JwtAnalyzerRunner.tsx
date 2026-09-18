"use client";

import { useState } from "react";
import { useJwtAnalyzer } from "./useJwtAnalyzer";
import type { Finding, Severity } from "./jwtChecks";

const SAMPLE_WEAK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIERldmVsb3BlciIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2NzIyNTYwMCwiZXhwIjoxODExODA4MDAwfQ._AzBbmUK5wzzzBxAl5JZSICeBC-WNKhBzFec9Q7C1Uo";
const SAMPLE_STRONG = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5YzhiN2EyZSIsIm5hbWUiOiJCb2IgVXNlciIsInJvbGUiOiJ1c2VyIiwiaXNzIjoiYXBpLmV4YW1wbGUuY29tIiwiYXVkIjoiZXhhbXBsZS13ZWIiLCJpYXQiOjIwNTEyMjI0MDAsImV4cCI6MjA1MTIyNjAwMH0.YS-zMmccfRQ_LFjxOJiY--NMcif43WCD8Ct0hoYlrWU";

const SEV_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2, ok: 3 };
const SEV_COLOR: Record<Severity, string> = { critical: "#ef4444", warning: "#f59e0b", info: "#6b8bbf", ok: "#22c55e" };
const SEV_LABEL: Record<Severity, string> = { critical: "Critical", warning: "Warning", info: "Info", ok: "OK" };

const TS_CLAIMS = new Set(["exp", "iat", "nbf"]);

function claimLine(k: string, v: unknown): string {
  if (TS_CLAIMS.has(k) && typeof v === "number") {
    return `${JSON.stringify(v)}  →  ${new Date(v * 1000).toUTCString()}`;
  }
  return JSON.stringify(v);
}

function JsonPanel({ title, obj, accent }: { title: string; obj: Record<string, unknown>; accent: string }) {
  return (
    <div className="rounded-xl p-4 min-w-0" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h3 className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>{title}</h3>
      <div className="font-mono text-xs leading-relaxed overflow-x-auto">
        {Object.entries(obj).map(([k, v]) => (
          <div key={k} className="whitespace-pre-wrap break-all">
            <span style={{ color: accent }}>&quot;{k}&quot;</span>
            <span style={{ color: "var(--text3)" }}>: </span>
            <span style={{ color: "var(--text)" }}>{claimLine(k, v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FindingRow({ f }: { f: Finding }) {
  const c = SEV_COLOR[f.severity];
  return (
    <div className="rounded-lg px-3 py-2.5 flex gap-3" style={{ background: `${c}0e`, border: `1px solid ${c}33` }}>
      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded h-fit shrink-0 mt-0.5"
        style={{ background: `${c}20`, color: c, minWidth: 58, textAlign: "center" }}>{SEV_LABEL[f.severity]}</span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{f.title}</div>
        <div className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--text2)" }}>{f.detail}</div>
      </div>
    </div>
  );
}

export default function JwtAnalyzerRunner({ accent }: { accent: string }) {
  const { decoded, findings, error, crack, analyze, reset } = useJwtAnalyzer();
  const [token, setToken] = useState("");
  const [showWordlist, setShowWordlist] = useState(false);
  const [wordlist, setWordlist] = useState("");

  const run = (t: string) => { setToken(t); analyze(t, showWordlist ? wordlist : undefined); };
  const clear = () => { setToken(""); reset(); };

  const sorted = [...findings].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const worst = sorted[0]?.severity;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: accent }}>Paste a JWT</label>
        <textarea value={token} onChange={(e) => setToken(e.target.value)} rows={4} spellCheck={false}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…"
          className="w-full rounded-lg px-3 py-2 font-mono text-xs resize-y break-all"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => run(token)} disabled={!token.trim() || crack.status === "running"}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ background: accent, color: "#fff" }}>
            {crack.status === "running" ? "Analyzing…" : "Analyze"}
          </button>
          <button onClick={() => run(SAMPLE_WEAK)} className="text-xs underline" style={{ color: "var(--text3)" }}>Try a weak token</button>
          <button onClick={() => run(SAMPLE_STRONG)} className="text-xs underline" style={{ color: "var(--text3)" }}>Try a strong token</button>
          {(decoded || error) && <button onClick={clear} className="text-xs underline ml-auto" style={{ color: "var(--text3)" }}>Clear</button>}
        </div>

        <button onClick={() => setShowWordlist((s) => !s)} className="text-[11px] text-left" style={{ color: accent }}>
          {showWordlist ? "− Hide" : "+ Add"} your own wordlist (optional)
        </button>
        {showWordlist && (
          <div className="flex flex-col gap-1">
            <textarea value={wordlist} onChange={(e) => setWordlist(e.target.value)} rows={4} spellCheck={false}
              placeholder={"one candidate secret per line\n# lines starting with # are ignored\ne.g. paste rockyou.txt"}
              className="w-full rounded-lg px-3 py-2 font-mono text-[11px] resize-y"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>Tested in addition to the built-in list, in your browser. Nothing is uploaded.</p>
          </div>
        )}

        <p className="text-[10px] leading-relaxed" style={{ color: "var(--text3)" }}>
          Runs entirely in your browser — the token and any wordlist you paste never leave this page and are never logged.
        </p>
      </div>

      {error && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#ef4444" }}>{error}</div>
      )}

      {decoded && (
        <>
          <div className="grid md:grid-cols-2 gap-3">
            <JsonPanel title="Header" obj={decoded.header} accent={accent} />
            <JsonPanel title="Payload (not encrypted — anyone can read this)" obj={decoded.payload} accent={accent} />
          </div>

          {crack.status === "running" && (
            <div className="rounded-lg px-3 py-2 text-xs flex items-center gap-2" style={{ background: `${accent}0e`, border: `1px solid ${accent}25`, color: "var(--text2)" }}>
              <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: accent }} />
              Testing signing secrets… {crack.tried.toLocaleString()} / {crack.total.toLocaleString()}
            </div>
          )}

          <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>Security findings</h2>
              {worst && <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: `${SEV_COLOR[worst]}20`, color: SEV_COLOR[worst] }}>Worst: {SEV_LABEL[worst]}</span>}
            </div>
            {sorted.map((f, i) => <FindingRow key={i} f={f} />)}
          </div>
        </>
      )}

      <div className="text-xs leading-relaxed rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>What this can and can&apos;t do:</strong> the decoding, checks and HMAC secret test are all real and run locally. The weak-secret test tries a bundled list of default and common secrets, plus any wordlist you paste — it can catch a guessable secret, but it <strong>cannot</strong> crack a strong, random one, and finding nothing does not prove a secret is safe. This is an educational analyzer, not a full pentest of your auth server.
      </div>
    </div>
  );
}
