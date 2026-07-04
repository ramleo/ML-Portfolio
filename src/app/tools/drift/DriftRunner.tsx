"use client";

import { useState, useEffect, useRef } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const ACCENT = "#fb923c";

// ── Types ──────────────────────────────────────────────────────────────────────

type ModelMeta = { id: string; title: string; task: string; accent: string };

type FeatureDrift = {
  name: string; label: string; type: "numeric" | "categorical";
  drift_score: number; drift_level: "low" | "medium" | "high";
  psi: number; psi_level: string; null_rate: number; n_recent: number;
  // numeric
  ref_mean?: number; ref_std?: number; recent_mean?: number; recent_std?: number;
  ks_stat?: number; ks_pvalue?: number;
  histogram?: { lo: number; hi: number; ref_h: number; actual_h: number }[];
  // categorical
  options?: string[];
  ref_dist?: Record<string, number>;
  recent_dist?: Record<string, number>;
  cat_baseline?: string;
  high_cardinality?: boolean;
};

type DriftResult = {
  n_recent: number; overall_score: number; overall_level: string;
  baseline: string; source: string; filename?: string; label?: string;
  features: FeatureDrift[];
  trend: { ts: number; overall_score: number; overall_level: string; label?: string }[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function levelColor(lv: string) {
  if (lv === "high")   return "#f87171";
  if (lv === "medium") return "#fbbf24";
  return "#34d399";
}

function ScoreBadge({ score, level }: { score: number; level: string }) {
  const c = levelColor(level);
  return (
    <span style={{
      fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px",
      borderRadius: 9999, background: `${c}18`, border: `1px solid ${c}55`,
      color: c, textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {level} · {(score * 100).toFixed(0)}%
    </span>
  );
}

function MiniHistogram({ bins }: { bins: DriftResult["features"][0]["histogram"] }) {
  if (!bins || bins.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 28, marginTop: "0.4rem" }}>
      {bins.map((b, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          <div style={{ width: "100%", height: `${Math.max(b.ref_h * 28, 1)}px`, background: `${ACCENT}40`, borderRadius: "1px 1px 0 0" }} />
          <div style={{ width: "100%", height: `${Math.max(b.actual_h * 28, 1)}px`, background: ACCENT, borderRadius: "1px 1px 0 0" }} />
        </div>
      ))}
    </div>
  );
}

function TrendLine({ points }: { points: DriftResult["trend"] }) {
  if (points.length < 2) return null;
  const W = 200; const H = 36;
  const scores = points.map(p => p.overall_score);
  const mn = Math.min(...scores); const mx = Math.max(...scores) || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = scores.map(s => H - ((s - mn) / (mx - mn || 1)) * H * 0.85 - 2);
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <path d={d} fill="none" stroke={ACCENT} strokeWidth={1.5} strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={xs[i]} cy={ys[i]} r={2.5} fill={levelColor(p.overall_level)} />
      ))}
    </svg>
  );
}

// ── Feature card ───────────────────────────────────────────────────────────────

function FeatureCard({ f }: { f: FeatureDrift }) {
  const [open, setOpen] = useState(false);
  const lc = levelColor(f.drift_level);

  return (
    <div style={{ border: `1px solid ${f.drift_level === "high" ? lc + "44" : "rgba(255,255,255,0.07)"}`, borderRadius: 8, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", background: "transparent", border: "none", cursor: "pointer",
        padding: "0.55rem 0.85rem", display: "flex", alignItems: "center", gap: "0.6rem",
        color: "var(--text)", textAlign: "left",
      }}>
        <span style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s", color: "var(--text3)", fontSize: "0.8rem" }}>›</span>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, flex: 1 }}>{f.label}</span>
        <span style={{ fontSize: "0.58rem", color: "var(--text3)", marginRight: "0.4rem" }}>{f.type}</span>
        <ScoreBadge score={f.drift_score} level={f.drift_level} />
      </button>

      {open && (
        <div style={{ padding: "0.6rem 0.85rem 0.75rem", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* Stats row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            {[
              ["PSI", `${f.psi.toFixed(3)} (${f.psi_level})`],
              f.ref_mean != null ? ["Ref mean", f.ref_mean.toFixed(3)] : null,
              f.recent_mean != null ? ["Batch mean", f.recent_mean.toFixed(3)] : null,
              f.ks_stat != null ? ["KS stat", f.ks_stat.toFixed(3)] : null,
              f.ks_pvalue != null ? ["KS p-val", f.ks_pvalue.toFixed(3)] : null,
              ["Null rate", `${(f.null_rate * 100).toFixed(1)}%`],
              ["n", String(f.n_recent)],
            ].filter((x): x is [string, string] => x !== null).map(([k, v]) => (
              <div key={k} style={{ fontSize: "0.62rem", color: "var(--text3)" }}>
                <span style={{ color: "var(--text2)", fontWeight: 600 }}>{k}: </span>{v}
              </div>
            ))}
          </div>

          {/* Numeric histogram */}
          {f.type === "numeric" && f.histogram && (
            <div>
              <div style={{ fontSize: "0.57rem", color: "var(--text3)", marginBottom: 2 }}>
                <span style={{ color: `${ACCENT}88` }}>■</span> reference &nbsp;
                <span style={{ color: ACCENT }}>■</span> batch
              </div>
              <MiniHistogram bins={f.histogram} />
            </div>
          )}

          {/* Categorical bars */}
          {f.type === "categorical" && f.options && !f.high_cardinality && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {f.options.map(opt => {
                const ref = (f.ref_dist?.[opt] ?? 0) * 100;
                const rec = (f.recent_dist?.[opt] ?? 0) * 100;
                return (
                  <div key={opt} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ width: 80, fontSize: "0.6rem", color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt}</span>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ height: 5, borderRadius: 2, width: `${ref}%`, background: `${ACCENT}44` }} />
                      <div style={{ height: 5, borderRadius: 2, width: `${rec}%`, background: ACCENT }} />
                    </div>
                    <span style={{ width: 38, fontSize: "0.58rem", color: "var(--text3)", textAlign: "right" }}>{rec.toFixed(1)}%</span>
                  </div>
                );
              })}
              <div style={{ fontSize: "0.55rem", color: "var(--text3)", marginTop: 2 }}>
                <span style={{ color: `${ACCENT}88` }}>■</span> train &nbsp;<span style={{ color: ACCENT }}>■</span> batch
                {f.cat_baseline === "uniform" && <span style={{ marginLeft: 6, color: "#fbbf24" }}> (uniform fallback — no training freq stored)</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DriftRunner() {
  const [models, setModels]       = useState<ModelMeta[]>([]);
  const [modelId, setModelId]     = useState("");
  const [batchLabel, setBatchLabel] = useState("");
  const [dragging, setDragging]   = useState(false);
  const [busy, setBusy]           = useState(false);
  const [result, setResult]       = useState<DriftResult | null>(null);
  const [error, setError]         = useState("");
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
      const fd = new FormData();
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
    if (!files || files.length === 0) return;
    runDrift(files[0]);
  }

  const sorted = result ? [...result.features].sort((a, b) => b.drift_score - a.drift_score) : [];
  const high   = sorted.filter(f => f.drift_level === "high");
  const rest   = sorted.filter(f => f.drift_level !== "high");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Config panel */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
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
            <input value={batchLabel} onChange={e => setBatchLabel(e.target.value)}
              placeholder="e.g. Week 3 production batch"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, color: "var(--text)", fontSize: "0.75rem", padding: "0.4rem 0.6rem", outline: "none" }} />
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

      {/* Results */}
      {result && (
        <>
          {/* Overall card */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1.25rem 1.5rem", display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.62rem", color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Overall drift</div>
              <ScoreBadge score={result.overall_score} level={result.overall_level} />
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text3)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span>Rows in batch: <strong style={{ color: "var(--text)" }}>{result.n_recent}</strong></span>
              <span>Baseline: <strong style={{ color: "var(--text)" }}>{result.baseline}</strong></span>
              {result.label && <span>Label: <strong style={{ color: ACCENT }}>{result.label}</strong></span>}
              {result.filename && <span>File: <strong style={{ color: "var(--text)" }}>{result.filename}</strong></span>}
            </div>
            {result.trend.length >= 2 && (
              <div style={{ marginLeft: "auto" }}>
                <div style={{ fontSize: "0.57rem", color: "var(--text3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Drift trend ({result.trend.length} batches)</div>
                <TrendLine points={result.trend} />
              </div>
            )}
          </div>

          {/* Feature cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text2)" }}>
              Features · {sorted.length} total
              {high.length > 0 && <span style={{ color: "#f87171", marginLeft: 8 }}>{high.length} high-drift</span>}
            </div>
            {[...high, ...rest].map(f => <FeatureCard key={f.name} f={f} />)}
          </div>
        </>
      )}
    </div>
  );
}