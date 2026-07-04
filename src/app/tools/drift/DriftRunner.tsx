"use client";

import { useState, useEffect, useRef } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { ModelMeta, DriftResult, ACCENT } from "./driftTypes";
import DriftFeatureCard   from "./DriftFeatureCard";
import DriftOverview      from "./DriftOverview";
import DriftRankingChart  from "./DriftRankingChart";
import DriftAIExplain     from "./DriftAIExplain";

export default function DriftRunner() {
  const [models,     setModels]     = useState<ModelMeta[]>([]);
  const [modelId,    setModelId]    = useState("");
  const [batchLabel, setBatchLabel] = useState("");
  const [dragging,   setDragging]   = useState(false);
  const [busy,       setBusy]       = useState(false);
  const [result,     setResult]     = useState<DriftResult | null>(null);
  const [error,      setError]      = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${ML_UNIFIED_API}/models`)
      .then(r => r.json())
      .then((data: ModelMeta[]) => {
        setModels(data);
        if (data.length > 0) setModelId(data[0].id);
      })
      .catch(() => {});
  }, []);

  async function runDrift(file: File) {
    if (!modelId) { setError("Select a model first."); return; }
    setBusy(true); setError(""); setResult(null);
    try {
      const fd  = new FormData();
      fd.append("file", file);
      const url = batchLabel.trim()
        ? `${ML_UNIFIED_API}/drift/${modelId}/upload?label=${encodeURIComponent(batchLabel.trim())}`
        : `${ML_UNIFIED_API}/drift/${modelId}/upload`;
      const res = await fetch(url, { method: "POST", body: fd });
      if (!res.ok) { const t = await res.text(); throw new Error(t); }
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed.");
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
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem",
      }}>
        <h2 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>Configure</h2>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {/* Model selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", minWidth: 220 }}>
            <label style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Trained model</label>
            <select value={modelId} onChange={e => setModelId(e.target.value)} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
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
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, color: "var(--text)", fontSize: "0.75rem", padding: "0.4rem 0.6rem", outline: "none" }}
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
            border: `2px dashed ${dragging ? ACCENT : "rgba(255,255,255,0.12)"}`,
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

        {error && <div style={{ fontSize: "0.7rem", color: "#f87171" }}>{error}</div>}
      </div>

      {/* ── Results ── */}
      {result && (
        <>
          <DriftOverview result={result} />
          <DriftRankingChart features={result.features} />
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