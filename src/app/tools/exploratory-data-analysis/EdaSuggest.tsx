"use client";
import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";
import EdaSection from "./EdaSection";
import type { EdaResult } from "./edaTypes";

/** What the backend will accept. `auto` walks the cascade — free providers
 *  first, the one paid key last and only if the others cannot answer. The
 *  paid entry is labelled as such rather than hidden, because a picker that
 *  quietly spends money is worse than one that says it might. */
const PROVIDERS: { value: string; label: string }[] = [
  { value: "auto", label: "auto — free providers first" },
  { value: "cohere", label: "cohere (free)" },
  { value: "mistral", label: "mistral (free, often busy)" },
  { value: "groq", label: "groq (free)" },
  { value: "gemini", label: "gemini (paid key)" },
];

const btn: React.CSSProperties = {
  border: "1px solid var(--border2)", borderRadius: 8, padding: "0.45rem 0.95rem",
  background: "var(--bg-card)", color: "var(--text)", fontSize: "0.82rem",
  fontWeight: 600, cursor: "pointer",
};

export default function EdaSuggest({ result }: { result: EdaResult }) {
  const [provider, setProvider] = useState("auto");
  const [advice, setAdvice] = useState("");
  const [servedBy, setServedBy] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");

  async function suggest() {
    setThinking(true);
    setAdvice("");
    setServedBy("");
    setError("");
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/eda/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overview: result.overview, columns: result.columns, stats: result.stats,
          correlations: result.correlations, insights: result.insights,
          readiness: result.readiness, narrative: result.narrative,
          low_variance_cols: result.low_variance_cols, provider,
        }),
      }, { tool: "exploratory-data-analysis-suggest" });

      if (!res.ok || !res.body) {
        setError(res.status === 429
          ? "The daily budget for AI suggestions is spent. It resets at midnight UTC."
          : `The suggestion service answered ${res.status}.`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          let evt: { type: string; text?: string; name?: string; model?: string };
          try { evt = JSON.parse(part.slice(6)); } catch { continue; }
          // The provider that answered, not the one that was asked for. A
          // silent fallback is how a paid key gets used without anyone noticing.
          if (evt.type === "provider") setServedBy(`${evt.name} · ${evt.model}`);
          else if (evt.type === "token") setAdvice((prev) => prev + (evt.text ?? ""));
          else if (evt.type === "error") setError(evt.text ?? "Something went wrong.");
        }
      }
    } catch {
      setError("Could not reach the suggestion service.");
    } finally {
      setThinking(false);
    }
  }

  return (
    <EdaSection
      id="suggestions"
      testId="eda-suggestions"
      title="Feature engineering suggestions"
      icon="ai"
      note="Sends the profile above — shapes, statistics, warnings — and never the data itself. Whichever model answers is named below the button."
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem", alignItems: "center" }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text3)" }}>
            Model
          </span>
          <select
            data-wt="eda-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            style={{
              background: "var(--bg-card)", color: "var(--text)", border: "1px solid var(--border)",
              borderRadius: 7, padding: "0.3rem 0.5rem", fontSize: "0.8rem",
            }}
          >
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <button data-wt="eda-suggest" onClick={suggest} disabled={thinking}
                style={{ ...btn, opacity: thinking ? 0.6 : 1 }}>
          {thinking ? "Thinking…" : "Suggest features"}
        </button>
        {servedBy && (
          <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>answered by {servedBy}</span>
        )}
      </div>

      {error && <p style={{ marginTop: "0.8rem", fontSize: "0.83rem", color: "#f87171" }}>{error}</p>}
      {advice && (
        <div style={{ marginTop: "0.9rem", fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text2)", whiteSpace: "pre-wrap" }}>
          {advice}
        </div>
      )}
    </EdaSection>
  );
}
