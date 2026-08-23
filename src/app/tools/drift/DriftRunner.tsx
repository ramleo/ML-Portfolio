"use client";

import { useState, useEffect, useRef } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { ModelMeta, DriftResult, DriftVersion, ACCENT } from "./driftTypes";
import DriftFeatureCard   from "./DriftFeatureCard";
import DriftOverview      from "./DriftOverview";
import DriftRankingChart  from "./DriftRankingChart";
import DriftRadarChart    from "./DriftRadarChart";
import DriftHeatmap       from "./DriftHeatmap";
import DriftCorrelation   from "./DriftCorrelation";
import DriftAIExplain     from "./DriftAIExplain";

export default function DriftRunner({ onResult }: { onResult?: (r: DriftResult | null) => void }) {
  const [models,            setModels]            = useState<ModelMeta[]>([]);
  const [modelId,           setModelId]           = useState("");
  const [batchLabel,        setBatchLabel]         = useState("");
  const [compareToTraining, setCompareToTraining]  = useState(false);
  const [versions,          setVersions]           = useState<DriftVersion[]>([]);
  const [dragging,          setDragging]           = useState(false);
  const [busy,              setBusy]               = useState(false);
  const [result,            setResult]             = useState<DriftResult | null>(null);
  const [error,             setError]              = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${ML_UNIFIED_API}/models`)
      .then(r => r.json())
      .then((data: ModelMeta[]) => {
        setModels(data);
        if (data.length > 0) { setModelId(data[0].id); fetchVersions(data[0].id); }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { if (modelId) fetchVersions(modelId); }, [modelId]);

  async function fetchVersions(mid: string) {
    try {
      const res = await fetch(`${ML_UNIFIED_API}/drift/${mid}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions ?? []);
      }
    } catch { /* ignore */ }
  }

  async function runDrift(file: File) {
    if (!modelId) { setError("Select a model first."); return; }
    setBusy(true); setError(""); setResult(null); onResult?.(null);
    try {
      const fd  = new FormData();
      fd.append("file", file);
      const params = new URLSearchParams();
      if (batchLabel.trim()) params.set("label", batchLabel.trim());
      if (compareToTraining) params.set("compare_to_training", "true");
      const url = `${ML_UNIFIED_API}/drift/${modelId}/upload?${params.toString()}`;
      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) { const t = await res.text(); throw new Error(t); }
      const r = await res.json();
      setResult(r); onResult?.(r);
      fetchVersions(modelId);
      const sid = typeof window !== "undefined" ? (localStorage.getItem("_ml_session") ?? "") : "";
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "query_run", path: "/tools/drift", session_id: sid,
          meta: { tool: "drift", action: "detect_drift", features: r.features?.length ?? 0, high_drift: r.features?.filter((f: { drift_level: string }) => f.drift_level === "high").length ?? 0 } }),
      }).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      const sid = typeof window !== "undefined" ? (localStorage.getItem("_ml_session") ?? "") : "";
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "error", path: "/tools/drift", session_id: sid, meta: { tool: "drift", error_type: "drift_error" } }),
      }).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    runDrift(files[0]);
  }

  const sorted = result ? [...result.features].sort((a, b) => b.drift_score - a.drift_score) : [];
  const high   = sorted.filter(f => f.drift_level === "high");
  const rest   = sorted.filter(f => f.drift_level !== "high");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Config panel ── */}
      <div style={{
        background: "var(--bg-glass)", backdropFilter: "blur(14px)", border: "1px solid var(--border)",
        borderRadius: 16, padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem",
      }}>
        <h2 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>Configure</h2>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {/* Model selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", minWidth: 220 }}>
            <label style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Trained model</label>
            <select value={modelId} onChange={e => setModelId(e.target.value)} style={{
              background: "rgba(var(--fg-rgb),0.05)", border: "1px solid rgba(var(--fg-rgb),0.12)",
              borderRadius: 7, color: "var(--text)", fontSize: "0.75rem", padding: "0.4rem 0.6rem", cursor: "pointer",
            }}>
              {models.length === 0 && <option value="">No models trained yet</option>}
              {models.map(m => <option key={m.id} value={m.id}>{m.title} ({m.task})</option>)}
            </select>
          </div>

          {/* Batch label */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Batch label (optional)</label>
            <input
              value={batchLabel} onChange={e => setBatchLabel(e.target.value)}
              placeholder="e.g. Week 3 production batch"
              style={{ background: "rgba(var(--fg-rgb),0.05)", border: "1px solid rgba(var(--fg-rgb),0.12)", borderRadius: 7, color: "var(--text)", fontSize: "0.75rem", padding: "0.4rem 0.6rem", outline: "none" }}
            />
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? ACCENT : "rgba(var(--fg-rgb),0.12)"}`,
            borderRadius: 10, padding: "1.5rem", textAlign: "center", cursor: "pointer",
            background: dragging ? `${ACCENT}08` : "transparent", transition: "all 0.15s",
          }}
        >
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => onFiles(e.target.files)} />
          {busy ? (
            <span style={{ fontSize: "0.75rem", color: ACCENT }}>Analysing batch…</span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>Drop new-batch CSV here, or click to browse</span>
            </div>
          )}
        </div>

        {/* Compare against training toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button
            onClick={() => setCompareToTraining(v => !v)}
            style={{
              width: 32, height: 18, borderRadius: 9999, border: "none", cursor: "pointer",
              background: compareToTraining ? ACCENT : "rgba(var(--fg-rgb),0.12)",
              position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute", top: 2, left: compareToTraining ? 16 : 2,
              width: 14, height: 14, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s",
            }} />
          </button>
          <span style={{ fontSize: "0.68rem", color: compareToTraining ? ACCENT : "var(--text3)" }}>
            Compare against training baseline (V1)
          </span>
          {!compareToTraining && versions.length > 1 && (
            <span style={{ fontSize: "0.62rem", color: "var(--text3)" }}>
              — will compare vs <strong style={{ color: "var(--text2)" }}>{versions[versions.length - 1].label}</strong>
            </span>
          )}
        </div>

        {error && <div style={{ fontSize: "0.7rem", color: "#f87171" }}>{error}</div>}
      </div>

      {/* ── Results ── */}
      {result && (
        <>
          {/* Version + comparison badge */}
          {result.version_num && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.62rem", fontWeight: 700, color: ACCENT, background: `${ACCENT}18`, borderRadius: 9999, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                V{result.version_num}
              </span>
              <span style={{ fontSize: "0.62rem", color: "var(--text3)" }}>
                compared against
              </span>
              <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--text2)" }}>
                {result.compared_against_v === 1 ? "V1 · Training baseline" : `V${result.compared_against_v} · ${result.compared_against}`}
              </span>
            </div>
          )}

          <DriftOverview result={result} />

          {/* Ranking + Radar side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.25rem" }}>
            <DriftRankingChart features={result.features} />
            <DriftRadarChart features={result.features} />
          </div>

          {/* Heatmap + Correlation side by side (when both available) */}
          {result.correlation ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <DriftHeatmap modelId={modelId} />
              <DriftCorrelation correlation={result.correlation} />
            </div>
          ) : (
            <DriftHeatmap modelId={modelId} />
          )}

          <DriftAIExplain result={result} modelId={modelId} />

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text2)", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.1rem 0" }}>
              Features · {sorted.length} total
              {high.length > 0 && (
                <span style={{ fontSize: "0.62rem", color: "#f87171", padding: "1px 7px", borderRadius: 9999, background: "#f8717114", border: "1px solid #f8717130" }}>
                  {high.length} high-drift
                </span>
              )}
            </div>
            {[...high, ...rest].map(f => <DriftFeatureCard key={f.name} f={f} />)}
          </div>
        </>
      )}
    </div>
  );
}