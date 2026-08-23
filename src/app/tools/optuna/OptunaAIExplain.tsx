"use client";
import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { mdToHtml } from "./OptunaCharts";
import { ACCENT, card, label, type TrainResult } from "./optunaResultsStyle";

// Split out of OptunaResults.tsx (2026-08-15) — that file crossed the
// project's 400-line cap once its card styling was updated to the
// var(--bg-glass) design tokens; this section (the AI-explanation form +
// its own state) was the natural, self-contained piece to extract.
export default function OptunaAIExplain({ result, tuningRan }: { result: TrainResult; tuningRan: boolean }) {
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("gemini-2.5");
  const [explaining, setExplaining] = useState(false);
  const [expProgress, setExpProgress] = useState(0);
  const [optunaExp, setOptunaExp] = useState<string | null>(null);
  const [expError, setExpError] = useState<string | null>(null);
  const [showExpForm, setShowExpForm] = useState(false);

  const handleExplain = async () => {
    if (!apiKey.trim()) { setExpError("API key required"); return; }
    setExplaining(true);
    setExpProgress(0);
    setExpError(null);
    setOptunaExp(null);
    const timer = setInterval(() => {
      setExpProgress(p => p < 88 ? p + Math.random() * 6 : p);
    }, 500);
    try {
      const fd = new FormData();
      fd.append("winner", result.winner);
      fd.append("task", result.task ?? "classification");
      fd.append("n_trials", String(result.optuna_n_trials ?? 0));
      fd.append("best_score", String(result.optuna_best_score ?? 0));
      fd.append("optuna_params_json", JSON.stringify(result.optuna_params ?? {}));
      fd.append("param_importance_json", JSON.stringify(result.optuna_param_importance ?? {}));
      fd.append("feature_importance_json", JSON.stringify(result.feature_importance ?? []));
      fd.append("winner_metrics_json", JSON.stringify(result.winner_metrics ?? {}));
      fd.append("api_key", apiKey);
      fd.append("provider", provider);
      const resp = await fetch(`${ML_UNIFIED_API}/optuna-explain`, { method: "POST", body: fd });
      const data = await resp.json();
      clearInterval(timer);
      setExpProgress(100);
      if (data.error) {
        setTimeout(() => {
          setExpError(data.error);
          setExplaining(false);
        }, 300);
      } else {
        setTimeout(() => setOptunaExp(data.explanation ?? "No explanation returned."), 300);
        setTimeout(() => setExplaining(false), 600);
      }
    } catch (e) {
      clearInterval(timer);
      setExpError(e instanceof Error ? e.message : "Request failed");
      setExplaining(false);
    }
  };

  if (!tuningRan) return null;

  return (
    <div style={card()}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
        <div style={label({ marginBottom: 0 })}>AI Explanation</div>
        {!showExpForm && !optunaExp && (
          <button
            onClick={() => setShowExpForm(true)}
            style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.35rem 0.85rem", borderRadius: 7, border: `1px solid ${ACCENT}40`, background: `${ACCENT}12`, color: ACCENT, cursor: "pointer" }}
          >
            Get AI Explanation
          </button>
        )}
      </div>

      {!optunaExp && showExpForm && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <select value={provider} onChange={e => setProvider(e.target.value)} style={{ background: "var(--bg-card)", border: `1px solid ${ACCENT}30`, borderRadius: 7, padding: "0.4rem 0.6rem", color: "var(--text)", fontSize: "0.8rem", outline: "none" }}>
            <option value="gemini-2.5">Gemini 2.5 Flash</option>
            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
            <option value="openai">OpenAI GPT-4o Mini</option>
            <option value="cohere">Cohere command-a-03-2025</option>
            <option value="groq">Groq Llama 70B</option>
          </select>
          <input
            type="password"
            placeholder={provider.startsWith("gemini") ? "Google AI API key..." : provider === "openai" ? "OpenAI API key..." : provider === "cohere" ? "Cohere API key..." : "Groq API key..."}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={{ background: "var(--bg-card)", border: `1px solid ${ACCENT}30`, borderRadius: 7, padding: "0.4rem 0.6rem", color: "var(--text)", fontSize: "0.8rem", outline: "none" }}
          />
          <button
            onClick={handleExplain}
            disabled={explaining}
            style={{ padding: "0.45rem 1rem", borderRadius: 7, border: "none", background: explaining ? "rgba(167,139,250,0.3)" : ACCENT, color: "#000", fontSize: "0.8rem", fontWeight: 700, cursor: explaining ? "not-allowed" : "pointer", alignSelf: "flex-start" }}
          >
            {explaining ? "Analyzing..." : "Explain"}
          </button>
          {expError && <div style={{ fontSize: "0.72rem", color: "#f87171" }}>{expError}</div>}
          {explaining && (
            <div style={{ marginTop: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text3)", marginBottom: "0.3rem" }}>
                <span>Generating explanation...</span>
                <span style={{ color: ACCENT, fontWeight: 700 }}>{Math.round(expProgress)}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 9999, background: "rgba(var(--fg-rgb),0.07)" }}>
                <div style={{
                  height: "100%", borderRadius: 9999, background: ACCENT,
                  boxShadow: `0 0 8px ${ACCENT}66`,
                  width: `${expProgress}%`,
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {optunaExp && (
        <div>
          <div
            style={{ fontSize: "0.8rem", color: "var(--text2)", lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: mdToHtml(optunaExp) }}
          />
          <button onClick={() => { setOptunaExp(null); setShowExpForm(true); }} style={{ display: "block", marginTop: "0.75rem", fontSize: "0.7rem", color: "var(--text3)", background: "none", border: `1px solid rgba(var(--fg-rgb),0.1)`, borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}>
            Re-explain
          </button>
        </div>
      )}
    </div>
  );
}