"use client";

import { useState, useEffect, useMemo } from "react";
import {
  runBenchmark, getHardware, fmtTime, fmtMem, recommendedRamMB,
  estimateFS, estimateFELDA, estimatePreprocessing, estimateAutoML,
  type AlgoEstimate, type HardwareInfo,
} from "@/lib/hardwareEstimator";
import type { SelectionOpts } from "@/lib/fsAlgorithms";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tool = "fs" | "fe" | "preprocessing" | "automl";

interface Props {
  n: number;
  p: number;
  tool: Tool;
  // FS-specific
  fsOpts?: SelectionOpts;
  // FE-LDA specific
  ldaEnabled?: boolean;
  ldaTopics?: number;
  ldaIter?: number;
}

// ── Warning thresholds ────────────────────────────────────────────────────────

function SizeWarning({ n }: { n: number }) {
  if (n <= 2000) return null;
  const isLarge = n > 10000;
  const color = isLarge ? "#f87171" : "#fbbf24";
  const bg = isLarge ? "rgba(248,113,113,0.08)" : "rgba(251,191,36,0.08)";
  const border = isLarge ? "rgba(248,113,113,0.25)" : "rgba(251,191,36,0.25)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      background: bg, border: `1px solid ${border}`,
      borderRadius: 7, padding: "0.4rem 0.75rem",
      fontSize: "0.72rem", color, fontWeight: 500,
      marginBottom: "0.5rem",
    }}>
      <span>{isLarge ? "⚠" : "!"}</span>
      {isLarge
        ? `Very large dataset (${n.toLocaleString()} rows) — heavy algorithms may freeze the browser tab. Consider sampling first.`
        : `Large dataset (${n.toLocaleString()} rows) — some algorithms will be slow. Sampling applied automatically where noted.`}
    </div>
  );
}

// ── Single algorithm row ──────────────────────────────────────────────────────

function AlgoRow({ est }: { est: AlgoEstimate }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr auto auto",
      gap: "0.5rem 1rem",
      padding: "0.3rem 0",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      alignItems: "start",
    }}>
      <div>
        <span style={{ fontSize: "0.73rem", color: "var(--text)", fontWeight: 600 }}>{est.name}</span>
        <span style={{ fontSize: "0.67rem", color: "var(--text3)", marginLeft: "0.4rem" }}>{est.complexity}</span>
        {est.sampled && (
          <div style={{ fontSize: "0.65rem", color: "#60a5fa", marginTop: "0.1rem" }}>
            ↳ {est.sampled}
          </div>
        )}
        {est.note && (
          <div style={{ fontSize: "0.65rem", color: "var(--text3)", marginTop: "0.1rem", fontStyle: "italic" }}>
            {est.note}
          </div>
        )}
      </div>
      <span style={{ fontSize: "0.72rem", color: "#fb923c", fontWeight: 600, whiteSpace: "nowrap" }}>
        ⏱ {fmtTime(est.timeMin, est.timeMax)}
      </span>
      <span style={{ fontSize: "0.72rem", color: "var(--text3)", whiteSpace: "nowrap" }}>
        💾 {fmtMem(est.memoryMB)}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DatasetEstimator({ n, p, tool, fsOpts, ldaEnabled, ldaTopics = 5, ldaIter = 50 }: Props) {
  const [opsPerMs, setOpsPerMs] = useState<number | null>(null);
  const [hw, setHw] = useState<HardwareInfo | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setHw(getHardware());
    runBenchmark().then(setOpsPerMs);
  }, []);

  const estimates = useMemo<AlgoEstimate[]>(() => {
    if (!opsPerMs || n === 0) return [];
    if (tool === "fs" && fsOpts) return estimateFS(n, p, fsOpts, opsPerMs);
    if (tool === "fe") {
      if (!ldaEnabled) return [estimatePreprocessing(n, p, opsPerMs)];
      return [estimatePreprocessing(n, p, opsPerMs), estimateFELDA(n, 500, ldaTopics, ldaIter, opsPerMs)];
    }
    if (tool === "preprocessing") return [estimatePreprocessing(n, p, opsPerMs)];
    if (tool === "automl") return [estimateAutoML(n, p, opsPerMs)];
    return [];
  }, [opsPerMs, n, p, tool, fsOpts, ldaEnabled, ldaTopics, ldaIter]);

  if (n === 0) return null;

  const totalMax = estimates.reduce((s, e) => s + e.timeMax, 0);
  const totalMin = estimates.reduce((s, e) => s + e.timeMin, 0);
  const totalMem = estimates.reduce((s, e) => s + e.memoryMB, 0);

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <SizeWarning n={n} />

      {/* Summary row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "0.5rem",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 8, padding: "0.45rem 0.75rem",
      }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          {hw && (
            <span style={{ fontSize: "0.68rem", color: "var(--text3)" }}>
              {hw.cores} cores
            </span>
          )}
          {opsPerMs !== null && estimates.length > 0 && (
            <>
              <span style={{ fontSize: "0.72rem", color: "#fb923c", fontWeight: 600 }}>
                ⏱ {fmtTime(totalMin, totalMax)}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
                💾 {fmtMem(totalMem)}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
                Recommended RAM: {fmtMem(recommendedRamMB(estimates))}
              </span>
            </>
          )}
          {!opsPerMs && (
            <span style={{ fontSize: "0.68rem", color: "var(--text3)" }}>Benchmarking…</span>
          )}
        </div>

        {estimates.length > 1 && (
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              fontSize: "0.68rem", color: "var(--text3)", background: "none",
              border: "none", cursor: "pointer", padding: 0,
            }}
          >
            {open ? "▲ hide details" : "▼ per-algorithm"}
          </button>
        )}
      </div>

      {/* Per-algorithm breakdown */}
      {open && estimates.length > 0 && (
        <div style={{
          marginTop: "0.35rem",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8, padding: "0.5rem 0.75rem",
        }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text3)", marginBottom: "0.35rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Estimates · {n.toLocaleString()} rows · {p} features · ±50–100% accuracy
          </div>
          {estimates.map(e => <AlgoRow key={e.name} est={e} />)}
        </div>
      )}
    </div>
  );
}
