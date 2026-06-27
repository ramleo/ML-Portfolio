"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ML_UNIFIED_API as API } from "@/config/urls";
import { StageConfigForm } from "./StageConfigForms";

export type StageResult = {
  stageId: string;
  outputCsvB64?: string;
  metric?: string;
  data: Record<string, unknown>;
};

interface Props {
  stageId: string;
  title: string;
  accent: string;
  csvB64: string;
  target: string;
  taskType: "classification" | "regression";
  columns: string[];
  onClose: () => void;
  onComplete: (result: StageResult) => void;
  existingResult?: StageResult | null;
}

const ENDPOINTS: Record<string, string> = {
  preprocessing: "preprocess",
  "feature-eng": "feature-eng",
  "feature-select": "feature-select",
  automl: "automl",
  optuna: "optuna",
  shap: "shap",
  ensemble: "ensemble",
};

function buildBody(
  stageId: string,
  csvB64: string,
  target: string,
  config: Record<string, unknown>,
  existingResult?: StageResult | null
): Record<string, unknown> {
  const base = { csv_b64: csvB64, target, config };
  if (stageId === "optuna" || stageId === "shap") {
    return { ...base, model_id: existingResult?.data?.model_id as string };
  }
  return base;
}

function Spinner({ accent }: { accent: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "2rem" }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid rgba(255,255,255,0.1)`, borderTopColor: accent }}
      />
      <p style={{ color: "rgba(200,210,230,0.7)", fontSize: "0.85rem" }}>Running stage…</p>
    </div>
  );
}

const stagger = { animate: { transition: { staggerChildren: 0.07 } } };
const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

function renderResults(stageId: string, result: StageResult, accent: string) {
  const d = result.data;

  if (stageId === "preprocessing") {
    const stats: [string, unknown][] = [
      ["Rows before", d.rows_before], ["Rows after", d.rows_after],
      ["Missing filled", d.missing_filled], ["Duplicates removed", d.duplicates_removed],
    ];
    return (
      <motion.div variants={stagger} initial="initial" animate="animate"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {stats.map(([label, val]) => (
          <motion.div key={label} variants={fadeUp}
            style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "0.75rem 1rem" }}>
            <div style={{ fontSize: "0.72rem", color: "rgba(200,210,230,0.6)", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 600, color: "#fff" }}>{String(val ?? "—")}</div>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  if (stageId === "feature-eng") {
    const cols = (d.new_columns as string[]) ?? [];
    return (
      <motion.div variants={stagger} initial="initial" animate="animate" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {cols.length === 0 && <p style={{ color: "rgba(200,210,230,0.5)", fontSize: "0.85rem" }}>No new columns added.</p>}
        {cols.map((c) => (
          <motion.span key={c} variants={fadeUp}
            style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: "0.78rem" }}>
            {c}
          </motion.span>
        ))}
      </motion.div>
    );
  }

  if (stageId === "feature-select") {
    const kept = (d.kept_features as string[]) ?? [];
    const dropped = (d.dropped_features as string[]) ?? [];
    const colStyle = { display: "flex", flexDirection: "column" as const, gap: "0.4rem" };
    return (
      <motion.div variants={stagger} initial="initial" animate="animate"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: "#34d399", marginBottom: "0.5rem", fontWeight: 600 }}>Kept ({kept.length})</div>
          <div style={colStyle}>
            {kept.map((f) => <motion.div key={f} variants={fadeUp} style={{ fontSize: "0.8rem", color: "rgba(220,230,250,0.85)" }}>{f}</motion.div>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "0.72rem", color: "rgba(248,113,113,0.9)", marginBottom: "0.5rem", fontWeight: 600 }}>Dropped ({dropped.length})</div>
          <div style={colStyle}>
            {dropped.map((f) => <motion.div key={f} variants={fadeUp} style={{ fontSize: "0.8rem", color: "rgba(200,210,230,0.5)" }}>{f}</motion.div>)}
          </div>
        </div>
      </motion.div>
    );
  }

  if (stageId === "automl") {
    const lb = (d.leaderboard as { algo: string; score: number }[]) ?? [];
    const winner = d.winner as string;
    return (
      <motion.div variants={stagger} initial="initial" animate="animate" style={{ width: "100%" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {["Algorithm", "Score"].map((h) => (
                <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "rgba(200,210,230,0.6)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lb.map((row) => (
              <motion.tr key={row.algo} variants={fadeUp}
                style={{ background: row.algo === winner ? `${accent}22` : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "0.5rem 0.75rem", color: row.algo === winner ? accent : "rgba(220,230,250,0.85)", fontWeight: row.algo === winner ? 600 : 400 }}>{row.algo}</td>
                <td style={{ padding: "0.5rem 0.75rem", color: "rgba(220,230,250,0.9)" }}>{row.score?.toFixed(4)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    );
  }

  if (stageId === "optuna") {
    const before = d.score_before as number;
    const after = d.score_after as number;
    const delta = after - before;
    return (
      <motion.div variants={stagger} initial="initial" animate="animate"
        style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        {[["Before", before, "rgba(200,210,230,0.6)"], ["After", after, accent], ["Delta", delta, "#34d399"]].map(([label, val, color]) => (
          <motion.div key={String(label)} variants={fadeUp}
            style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "0.72rem", color: "rgba(200,210,230,0.5)", marginBottom: 6 }}>{String(label)}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, color: String(color) }}>
              {typeof val === "number" ? (label === "Delta" && val > 0 ? "+" : "") + (val as number).toFixed(4) : "—"}
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  if (stageId === "shap") {
    const vals = d.shap_values as Record<string, number> ?? {};
    const sorted = Object.entries(vals).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 10);
    const max = sorted[0]?.[1] ? Math.abs(sorted[0][1]) : 1;
    return (
      <motion.div variants={stagger} initial="initial" animate="animate" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {sorted.map(([feat, val]) => (
          <motion.div key={feat} variants={fadeUp} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 110, fontSize: "0.75rem", color: "rgba(220,230,250,0.8)", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{feat}</div>
            <div style={{ flex: 1, height: 14, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${(Math.abs(val) / max) * 100}%` }}
                transition={{ duration: 0.6, delay: 0.1 }}
                style={{ height: "100%", background: accent, borderRadius: 4 }} />
            </div>
            <div style={{ width: 52, fontSize: "0.72rem", color: "rgba(200,210,230,0.6)", textAlign: "right" }}>{val.toFixed(4)}</div>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  if (stageId === "ensemble") {
    const ensScore = d.ensemble_score as number;
    const individuals = d.individual_scores as Record<string, number> ?? {};
    return (
      <motion.div variants={stagger} initial="initial" animate="animate" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <motion.div variants={fadeUp}
          style={{ background: `${accent}22`, border: `1px solid ${accent}44`, borderRadius: 8, padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "rgba(220,230,250,0.8)", fontSize: "0.85rem" }}>Ensemble Score</span>
          <span style={{ color: accent, fontWeight: 700, fontSize: "1rem" }}>{ensScore?.toFixed(4)}</span>
        </motion.div>
        {Object.entries(individuals).map(([algo, score]) => (
          <motion.div key={algo} variants={fadeUp}
            style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "0.6rem 1rem", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(200,210,230,0.7)", fontSize: "0.82rem" }}>{algo}</span>
            <span style={{ color: "rgba(220,230,250,0.9)", fontSize: "0.82rem" }}>{score?.toFixed(4)}</span>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return <p style={{ color: "rgba(200,210,230,0.5)", fontSize: "0.85rem" }}>No result display available.</p>;
}

export default function StageModal({ stageId, title, accent, csvB64, target, taskType, columns, onClose, onComplete, existingResult }: Props) {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<StageResult | null>(existingResult ?? null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const endpoint = ENDPOINTS[stageId] ?? stageId;
      const body = buildBody(stageId, csvB64, target, config, existingResult);
      const res = await fetch(`${API}/pipeline-builder/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();
      const r: StageResult = { stageId, outputCsvB64: json.output_csv_b64, metric: json.metric, data: json };
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={onClose}>
        <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: "90vw", maxWidth: 1000, height: "85vh", background: "#0f1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent }} />
              <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#fff", margin: 0 }}>{title}</h2>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(200,210,230,0.5)", padding: 4, lineHeight: 0 }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* Config panel */}
            <div style={{ width: "40%", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <StageConfigForm stageId={stageId} config={config} setConfig={setConfig} columns={columns} taskType={taskType} existingResult={existingResult} />
              {error && <p style={{ color: "#f87171", fontSize: "0.8rem", margin: 0 }}>{error}</p>}
              <button onClick={handleRun} disabled={running}
                style={{ marginTop: "auto", padding: "0.65rem 1.25rem", borderRadius: 8, border: "none", cursor: running ? "not-allowed" : "pointer", background: accent, color: "#fff", fontWeight: 600, fontSize: "0.88rem", opacity: running ? 0.6 : 1, transition: "opacity 0.2s" }}>
                {running ? "Running…" : result ? "Re-run" : "Run Stage"}
              </button>
            </div>

            {/* Results panel */}
            <div style={{ flex: 1, padding: "1.25rem", overflowY: "auto" }}>
              {running && <Spinner accent={accent} />}
              {!running && !result && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ color: "rgba(200,210,230,0.3)", fontSize: "0.88rem" }}>Configure and run the stage to see results.</p>
                </div>
              )}
              {!running && result && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {result.metric && (
                    <div style={{ fontSize: "0.78rem", color: "rgba(200,210,230,0.55)" }}>
                      Metric: <span style={{ color: accent, fontWeight: 600 }}>{result.metric}</span>
                    </div>
                  )}
                  {renderResults(stageId, result, accent)}
                  <button onClick={() => onComplete(result)}
                    style={{ alignSelf: "flex-start", padding: "0.55rem 1.1rem", borderRadius: 8, border: `1px solid ${accent}`, background: "transparent", color: accent, fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}>
                    Done — Save Results
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
