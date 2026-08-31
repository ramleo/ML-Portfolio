"use client";

import { useEmailAuthCheck, type DkimSignature } from "./useEmailAuthCheck";

const SAMPLE_HEADERS = `Delivered-To: you@example.org
Received: by mail.example.org with SMTP; Tue, 25 Aug 2026 09:12:41 -0700
Authentication-Results: mx.example.org;
       spf=pass smtp.mailfrom=bounce.github.com;
       dkim=pass header.d=github.com;
       dmarc=pass header.from=github.com
Received-SPF: pass
From: GitHub <notifications@github.com>
To: you@example.org
Subject: [example] A synthetic sample email, not a real captured message
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=github.com; s=pf2023;
    h=from:to:subject:date; bh=examplebodyhash=; b=examplesignature==
Date: Tue, 25 Aug 2026 09:12:40 -0700`;

const VERDICT_STYLE: Record<string, { bg: string; label: string }> = {
  "likely legitimate": { bg: "#22c55e", label: "Likely legitimate" },
  suspicious: { bg: "#ef4444", label: "Suspicious" },
  "weak authentication": { bg: "#f59e0b", label: "Weak authentication" },
  inconclusive: { bg: "#64748b", label: "Inconclusive" },
};

const MECHANISM_COLOR: Record<string, string> = {
  pass: "#22c55e",
  fail: "#ef4444",
  softfail: "#f59e0b",
  neutral: "#64748b",
  none: "#64748b",
  temperror: "#f59e0b",
  permerror: "#ef4444",
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="text-[11px] px-2 py-[3px] rounded-full font-semibold uppercase tracking-wide"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
      {text}
    </span>
  );
}

function Section({ title, children, anchor }: { title: string; children: React.ReactNode; anchor?: string }) {
  return (
    <div className="rounded-xl p-4" data-wt={anchor} style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm" style={{ borderTop: "1px solid var(--border)" }}>
      <span style={{ color: "var(--text3)" }}>{label}</span>
      <span className="text-right" style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}

function DkimRow({ sig }: { sig: DkimSignature }) {
  return (
    <div className="py-1.5 text-sm" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between gap-4">
        <span style={{ color: "var(--text3)" }}>{sig.selector}._domainkey.{sig.domain}</span>
        {sig.dns.found
          ? <Badge text={sig.dns.revoked ? "key revoked" : "key active"} color={sig.dns.revoked ? "#ef4444" : "#22c55e"} />
          : <Badge text="key not found" color="#f59e0b" />}
      </div>
    </div>
  );
}

export default function EmailAuthCheckerRunner({ accent }: { accent: string }) {
  const { rawHeaders, setRawHeaders, check, running, result, error, reset } = useEmailAuthCheck();

  return (
    <div className="flex flex-col gap-5">
      <Section title="Paste raw email headers">
        <textarea
          data-wt="eauth-input"
          value={rawHeaders}
          onChange={e => setRawHeaders(e.target.value)}
          placeholder="Paste the full raw headers of an email (View Source / Show Original in most mail clients)..."
          rows={10}
          className="w-full rounded-lg p-3 text-xs font-mono resize-y"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={check}
            data-wt="eauth-check"
            disabled={running || !rawHeaders.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: accent, color: "#fff" }}>
            {running ? "Checking DNS records…" : "Check authentication"}
          </button>
          <button onClick={() => setRawHeaders(SAMPLE_HEADERS)} disabled={running} data-wt="eauth-sample"
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}>
            Load sample headers
          </button>
          {(rawHeaders || result) && (
            <button onClick={reset} disabled={running} className="text-sm underline disabled:opacity-40" style={{ color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>
      </Section>

      {error && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="rounded-xl p-4 flex items-center justify-between gap-4" data-wt="eauth-verdict"
            style={{ background: `${VERDICT_STYLE[result.verdict]?.bg ?? "#64748b"}14`, border: `1px solid ${VERDICT_STYLE[result.verdict]?.bg ?? "#64748b"}40` }}>
            <div>
              <div className="text-base font-bold" style={{ color: VERDICT_STYLE[result.verdict]?.bg ?? "#64748b" }}>
                {VERDICT_STYLE[result.verdict]?.label ?? result.verdict}
              </div>
              <div className="text-sm mt-0.5" style={{ color: "var(--text2)" }}>{result.verdict_reason}</div>
            </div>
            {result.from_domain && (
              <div className="text-xs font-mono px-2 py-1 rounded" style={{ background: "var(--surface2)", color: "var(--text3)" }}>
                {result.from_domain}
              </div>
            )}
          </div>

          {result.warnings.length > 0 && (
            <Section title="Warnings">
              <ul className="flex flex-col gap-2">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-sm flex gap-2" style={{ color: "var(--text2)" }}>
                    <span style={{ color: "#f59e0b" }}>⚠</span> {w}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="Reported by the receiving server">
              {result.authentication_results.length === 0
                ? <p className="text-sm" style={{ color: "var(--text3)" }}>No Authentication-Results header found.</p>
                : result.authentication_results.map((r, i) => (
                    <div key={i} className="flex flex-wrap gap-2 py-2" style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                      {Object.entries(r.mechanisms).map(([k, v]) => (
                        <Badge key={k} text={`${k}=${v}`} color={MECHANISM_COLOR[v] ?? "#64748b"} />
                      ))}
                    </div>
                  ))}
            </Section>

            <Section title="Independent live DNS checks" anchor="eauth-dns">
              <Row label="SPF record" value={result.spf.found ? <Badge text={result.spf.all_qualifier ?? "found"} color={result.spf.all_qualifier?.includes("permissive") ? "#ef4444" : "#22c55e"} /> : <Badge text="not found" color="#ef4444" />} />
              <Row label="DMARC policy" value={result.dmarc.found ? <Badge text={`p=${result.dmarc.policy}`} color={result.dmarc.policy === "reject" ? "#22c55e" : result.dmarc.policy === "quarantine" ? "#f59e0b" : "#ef4444"} /> : <Badge text="not found" color="#ef4444" />} />
              {result.dkim_signatures.length === 0
                ? <Row label="DKIM key" value={<span style={{ color: "var(--text3)" }}>no DKIM-Signature header</span>} />
                : result.dkim_signatures.map((sig, i) => <DkimRow key={i} sig={sig} />)}
            </Section>
          </div>

          <Section title="From:-domain alignment" anchor="eauth-alignment">
            <Row label="DKIM d= aligns with From:" value={result.alignment.dkim_aligned === null ? "—" : <Badge text={result.alignment.dkim_aligned ? "aligned" : "not aligned"} color={result.alignment.dkim_aligned ? "#22c55e" : "#ef4444"} />} />
            <Row label="SPF domain aligns with From:" value={result.alignment.spf_aligned === null ? "—" : <Badge text={result.alignment.spf_aligned ? "aligned" : "not aligned"} color={result.alignment.spf_aligned ? "#22c55e" : "#ef4444"} />} />
          </Section>
        </>
      )}

      <div className="text-xs leading-relaxed rounded-xl p-4" data-wt="eauth-caveats" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>What this doesn&apos;t do:</strong> it does not cryptographically verify the DKIM signature —
        that requires the full raw message body to recompute the body hash, which a headers-only paste doesn&apos;t include.
        DNS records reflect the domain&apos;s <em>current</em> configuration, which may differ from when the email was actually sent.
        Authentication-Results verdicts are only as trustworthy as the mail provider that stamped them — this tool relays them, it doesn&apos;t re-check them.
      </div>
    </div>
  );
}
