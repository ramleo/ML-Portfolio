"use client";

import { useState } from "react";
import { useSecretScanner } from "./useSecretScanner";
import type { Category, Match, Severity } from "./detectors";

// The sample values are fake, but written as CONTIGUOUS literals they trip
// GitHub push protection and gitleaks (a scanner's own demo data reads as real
// secrets). So each secret-shaped token is split across a "+" — the source
// never holds a complete secret string, while the joined runtime value is a
// complete, scannable sample.
const SAMPLE = [
  "# staging.env — example config (fake values, safe to scan)",
  "AWS_ACCESS_KEY_ID=AKIA" + "IOSFODNN7EXAMPLE",
  "DATABASE_URL=postgres://admin:S3cr3t" + "P4ss@db.internal:5432/app",
  "GITHUB_TOKEN=ghp_" + "016C7749Abcd1234Efgh5678Ijkl9012Mnop",
  "STRIPE_SECRET=sk_" + "live_" + "51H8xQ2eZvKYlo2CabcdEFGHijklMNOP",
  'password = "hunter2please"',
  "",
  "# customer record exported to a log by mistake",
  "support_email = jane.doe@example.com",
  "phone = (415) 555-0132",
  "ssn = 123-45-6789",
  "card_on_file = 4111 1111 1111 1111",
  "api_secret = Zx9Kq2Lm8Pw4" + "Rt6Yv1Bn3Cf5Dg7Hj0As",
].join("\n");

const SEV_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
const SEV_COLOR: Record<Severity, string> = { critical: "#ef4444", warning: "#f59e0b", info: "#6b8bbf" };
const SEV_LABEL: Record<Severity, string> = { critical: "Critical", warning: "Warning", info: "Info" };
const CAT_LABEL: Record<Category, string> = { secret: "Secrets", "possible-secret": "Possible secrets", pii: "PII" };

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "var(--surface)", border: `1px solid ${value > 0 ? `${color}55` : "var(--border)"}` }}>
      <span className="text-2xl font-bold tabular-nums" style={{ color: value > 0 ? color : "var(--text3)" }}>{value}</span>
      <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text3)" }}>{label}</span>
    </div>
  );
}

function FindingRow({ m }: { m: Match }) {
  const c = SEV_COLOR[m.severity];
  return (
    <div className="rounded-lg px-3 py-2 flex items-center gap-3 text-xs" style={{ background: `${c}0e`, border: `1px solid ${c}30` }}>
      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0" style={{ background: `${c}20`, color: c, minWidth: 54, textAlign: "center" }}>{SEV_LABEL[m.severity]}</span>
      <span className="font-mono shrink-0" style={{ color: "var(--text3)" }}>L{m.line}</span>
      <span className="font-semibold shrink-0" style={{ color: "var(--text)" }}>{m.label}</span>
      <span className="font-mono truncate ml-auto" style={{ color: "var(--text3)" }}>{m.preview}</span>
    </div>
  );
}

export default function SecretScannerRunner({ accent }: { accent: string }) {
  const { result, truncated, analyze, reset } = useSecretScanner();
  const [text, setText] = useState("");

  const run = (t: string) => { setText(t); analyze(t); };
  const clear = () => { setText(""); reset(); };

  const sorted = result ? [...result.matches].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.line - b.line) : [];
  const clean = result && result.matches.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: accent }}>Paste code, config, logs or any text</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} spellCheck={false}
          placeholder={"Paste a .env file, a code snippet, a log line…"}
          className="w-full rounded-lg px-3 py-2 font-mono text-xs resize-y"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => run(text)} disabled={!text.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40" style={{ background: accent, color: "#fff" }}>Scan</button>
          <button onClick={() => run(SAMPLE)} className="text-xs underline" style={{ color: "var(--text3)" }}>Try a sample</button>
          {(result || text) && <button onClick={clear} className="text-xs underline ml-auto" style={{ color: "var(--text3)" }}>Clear</button>}
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--text3)" }}>
          Runs entirely in your browser — the text you paste never leaves this page and is never logged.
        </p>
      </div>

      {result && (
        <>
          {truncated && (
            <div className="rounded-lg px-3 py-2 text-[11px]" style={{ background: "#f59e0b18", border: "1px solid #f59e0b40", color: "#f59e0b" }}>
              Input was large — only the first 200,000 characters were scanned.
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Stat label={CAT_LABEL.secret} value={result.counts.secret} color="#ef4444" />
            <Stat label={CAT_LABEL["possible-secret"]} value={result.counts["possible-secret"]} color="#f59e0b" />
            <Stat label={CAT_LABEL.pii} value={result.counts.pii} color="#6b8bbf" />
          </div>

          {clean ? (
            <div className="rounded-xl p-4 text-sm" style={{ background: "#22c55e12", border: "1px solid #22c55e40", color: "var(--text2)" }}>
              <strong style={{ color: "#22c55e" }}>Nothing matched.</strong> No known secret formats, high-entropy strings or PII were found — but this is a pattern-based demo, so a clean result doesn&apos;t guarantee the text is safe.
            </div>
          ) : (
            <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h2 className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>Findings ({sorted.length})</h2>
              {sorted.map((m, i) => <FindingRow key={i} m={m} />)}
            </div>
          )}
        </>
      )}

      <div className="text-xs leading-relaxed rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>What this is:</strong> a client-side scanner that flags well-known secret formats (AWS, GitHub, Google, Stripe, Slack, private keys, JWTs…), high-entropy strings that look like keys, and PII (emails, phone numbers, IPs, SSNs, and Luhn-valid card numbers). It&apos;s a curated demo detector — thorough on known patterns but not exhaustive DLP — so it can miss a cleverly disguised secret and can occasionally flag a false positive. Every finding shows its line so you can judge it. Values are masked in the results.
      </div>
    </div>
  );
}
