"use client";

import { useState, useCallback } from "react";
import { analyzeManifest, type ManifestAnalysis, type RiskLevel } from "./permissionRisk";

const SAMPLE_MANIFEST = `{
  "manifest_version": 2,
  "name": "Example Extension (synthetic, not real)",
  "version": "1.0",
  "permissions": [
    "<all_urls>",
    "webRequestBlocking",
    "webRequest",
    "cookies",
    "tabs",
    "history"
  ]
}`;

const RISK_COLOR: Record<RiskLevel, string> = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };
const RISK_LABEL: Record<RiskLevel, string> = { low: "Low risk", medium: "Medium risk", high: "High risk" };

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="text-[11px] px-2 py-[3px] rounded-full font-semibold uppercase tracking-wide"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
      {text}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>{title}</h3>
      {children}
    </div>
  );
}

export default function ExtensionAnalyzerRunner({ accent }: { accent: string }) {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<ManifestAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(() => {
    setError(null);
    setResult(null);
    try {
      setResult(analyzeManifest(raw));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [raw]);

  const reset = useCallback(() => {
    setRaw("");
    setResult(null);
    setError(null);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <Section title="Paste a manifest.json">
        <textarea
          value={raw}
          onChange={e => setRaw(e.target.value)}
          placeholder="Paste the full contents of an extension's manifest.json..."
          rows={10}
          className="w-full rounded-lg p-3 text-xs font-mono resize-y"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={analyze}
            disabled={!raw.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: accent, color: "#fff" }}>
            Analyze permissions
          </button>
          <button onClick={() => setRaw(SAMPLE_MANIFEST)}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}>
            Load sample manifest
          </button>
          {(raw || result) && (
            <button onClick={reset} className="text-sm underline" style={{ color: "var(--text3)" }}>
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
          <div className="rounded-xl p-4"
            style={{ background: `${RISK_COLOR[result.overallRisk]}14`, border: `1px solid ${RISK_COLOR[result.overallRisk]}40` }}>
            <div className="text-base font-bold" style={{ color: RISK_COLOR[result.overallRisk] }}>
              {RISK_LABEL[result.overallRisk]}
            </div>
            <div className="text-sm mt-0.5" style={{ color: "var(--text2)" }}>
              {result.combosTriggered.length > 0
                ? `Driven by ${result.combosTriggered.length} documented dangerous permission combination${result.combosTriggered.length > 1 ? "s" : ""}.`
                : result.permissions.some(p => p.risk === "high")
                ? "Driven by one or more individually high-risk permissions."
                : "No individually high-risk permissions or dangerous combinations found."}
            </div>
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

          {result.combosTriggered.length > 0 && (
            <Section title="Dangerous permission combinations">
              <ul className="flex flex-col gap-3">
                {result.combosTriggered.map((c, i) => (
                  <li key={i} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge text={RISK_LABEL[c.risk]} color={RISK_COLOR[c.risk]} />
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{c.name}</span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text3)" }}>{c.why}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Declared permissions">
            {result.permissions.length === 0
              ? <p className="text-sm" style={{ color: "var(--text3)" }}>No named permissions declared.</p>
              : (
                <ul className="flex flex-col gap-3">
                  {result.permissions.map((p, i) => (
                    <li key={i} className="flex flex-col gap-1 py-1.5" style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                      <div className="flex items-center gap-2">
                        <Badge text={RISK_LABEL[p.risk]} color={RISK_COLOR[p.risk]} />
                        <span className="text-sm font-mono font-semibold" style={{ color: "var(--text)" }}>{p.name}</span>
                      </div>
                      <p className="text-sm" style={{ color: "var(--text3)" }}>{p.why}</p>
                    </li>
                  ))}
                </ul>
              )}
          </Section>
        </>
      )}

      <div className="text-xs leading-relaxed rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>What this doesn&apos;t do:</strong> this is a static analysis of <em>declared</em> permissions
        against a documented risk taxonomy — it does not inspect the extension&apos;s actual code or runtime behavior, and it cannot tell
        you whether a permission is being misused or legitimately needed. A password manager, for example, can legitimately need broad
        host access and cookie access. A high-risk result means the combination is worth a closer look, not proof of malicious intent.
      </div>
    </div>
  );
}
