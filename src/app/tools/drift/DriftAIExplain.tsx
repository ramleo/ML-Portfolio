"use client";

import { useState, useRef } from "react";
import { DriftResult, ACCENT } from "./driftTypes";
import { ML_UNIFIED_API } from "@/config/urls";

const PROVIDERS = [
  { id: "groq"   as const, label: "Groq",   model: "Llama 3.3 70B",     color: "#f59e0b" },
  { id: "gemini" as const, label: "Gemini", model: "Gemini 2.0 Flash",   color: "#34d399" },
  { id: "cohere" as const, label: "Cohere", model: "Command R+",          color: "#a78bfa" },
];

type ProviderId = "groq" | "gemini" | "cohere";

// ── Recommendations ────────────────────────────────────────────────────────────

function Recommendations({ result }: { result: DriftResult }) {
  const high  = result.features.filter(f => f.drift_level === "high");
  const med   = result.features.filter(f => f.drift_level === "medium");
  if (result.overall_level === "low" && !high.length && !med.length) return null;

  const recs: { text: string; severity: "high" | "medium" | "info" }[] = [];

  if (result.overall_level === "high" || high.length > 2) {
    recs.push({ text: "Retrain immediately — significant distribution shift will degrade model performance.", severity: "high" });
    recs.push({ text: "Audit upstream data pipelines for schema changes, sampling bias, or source drift.", severity: "high" });
    recs.push({ text: "Add automated data quality checks at ingestion to alert early on severe drift.", severity: "medium" });
  } else if (result.overall_level === "medium" || high.length > 0) {
    recs.push({ text: "Monitor closely — moderate drift may degrade accuracy over the next few batches.", severity: "medium" });
    recs.push({ text: "Collect ground truth labels for recent batches to quantify actual accuracy drop.", severity: "medium" });
    recs.push({ text: "Plan a retraining cycle; fine-tune on combined historical + recent production data.", severity: "info" });
  }

  if (high.length) {
    recs.push({ text: `Investigate high-drift features first: ${high.slice(0, 4).map(f => f.label).join(", ")}.`, severity: "high" });
  }
  if (med.length) {
    recs.push({ text: `Watch medium-drift features: ${med.slice(0, 3).map(f => f.label).join(", ")}.`, severity: "info" });
  }

  const iconColor = { high: "#f87171", medium: "#fbbf24", info: "var(--text3)" } as const;

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Recommendations
      </div>
      {recs.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: "0.55rem", fontSize: "0.68rem", color: "var(--text2)", alignItems: "flex-start" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={iconColor[r.severity]} strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M7 1.5l5.5 9.5H1.5L7 1.5z" />
            <line x1="7" y1="6" x2="7" y2="8.5" />
            <circle cx="7" cy="10" r="0.6" fill={iconColor[r.severity]} stroke="none" />
          </svg>
          <span>{r.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main AI explain panel ──────────────────────────────────────────────────────

export default function DriftAIExplain({ result, modelId }: { result: DriftResult; modelId: string }) {
  const [provider, setProvider] = useState<ProviderId>("groq");
  const [loading,  setLoading]  = useState(false);
  const [text,     setText]     = useState("");
  const [error,    setError]    = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const provInfo = PROVIDERS.find(p => p.id === provider)!;

  async function generate() {
    if (loading) {
      abortRef.current?.abort();
      setLoading(false);
      return;
    }
    setLoading(true); setText(""); setError("");
    abortRef.current = new AbortController();

    try {
      const res = await fetch(
        `${ML_UNIFIED_API}/drift/${modelId}/explain?provider=${provider}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
          signal: abortRef.current.signal,
        },
      );
      if (!res.ok) throw new Error(await res.text());

      const reader  = res.body?.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const msg = JSON.parse(part.slice(6));
            if (msg.type === "token") setText(t => t + msg.text);
            if (msg.type === "error") setError(msg.message ?? "Generation failed.");
          } catch { /* skip malformed chunks */ }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError")
        setError((e as Error).message ?? "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 140 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>AI Drift Analysis</span>
        </div>

        {/* Provider selector */}
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => setProvider(p.id)} style={{
              fontSize: "0.62rem", fontWeight: 600, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
              border: `1px solid ${provider === p.id ? p.color : "rgba(255,255,255,0.12)"}`,
              background: provider === p.id ? `${p.color}18` : "transparent",
              color: provider === p.id ? p.color : "var(--text3)", transition: "all 0.15s",
            }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <button onClick={generate} style={{
          fontSize: "0.7rem", fontWeight: 600, padding: "6px 16px", borderRadius: 7, cursor: "pointer",
          background: loading ? "rgba(255,255,255,0.05)" : `${ACCENT}22`,
          border: `1px solid ${loading ? "rgba(255,255,255,0.15)" : ACCENT + "55"}`,
          color: loading ? "var(--text3)" : ACCENT, transition: "all 0.15s",
          display: "flex", alignItems: "center", gap: "0.4rem",
        }}>
          {loading ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M6 1v2M6 9v2M1 6h2M9 6h2" opacity="0.5" />
                <path d="M2.5 2.5l1.4 1.4M8.1 8.1l1.4 1.4M9.5 2.5L8.1 3.9M3.9 8.1L2.5 9.5" />
              </svg>
              Stop
            </>
          ) : "Explain Analysis"}
        </button>
      </div>

      {/* Model label */}
      <div style={{ fontSize: "0.58rem", color: "var(--text3)" }}>
        Analysing with <span style={{ color: provInfo.color, fontWeight: 600 }}>{provInfo.model}</span> · {provInfo.label}
      </div>

      {/* Output */}
      {(text || loading) && (
        <div style={{
          background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 9, padding: "1rem", fontSize: "0.72rem", lineHeight: 1.7,
          color: "var(--text2)", whiteSpace: "pre-wrap", minHeight: 80,
        }}>
          {text}
          {loading && <span style={{ color: ACCENT, opacity: 0.7 }}>▌</span>}
        </div>
      )}

      {error && (
        <div style={{ fontSize: "0.65rem", color: "#f87171", padding: "0.4rem 0.75rem", borderRadius: 7, background: "#f8717110", border: "1px solid #f8717130" }}>
          {error}
        </div>
      )}

      {/* Auto recommendations */}
      <Recommendations result={result} />

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}