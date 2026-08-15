"use client";

import React from "react";
import { FeResult } from "@/lib/feAlgorithms";

const ACCENT = "#38bdf8";

const CARD: React.CSSProperties = {
  background: "var(--bg-glass)",
  backdropFilter: "blur(14px)",
  border: "1px solid var(--border)",
  borderTop: `3px solid ${ACCENT}`,
  borderRadius: 16,
  padding: "1.25rem 1.4rem",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>
      {children}
    </div>
  );
}

function MiniHistogram({ values, bins = 14, width = 66, height = 22, color = ACCENT }: {
  values: (number | null)[];
  bins?: number; width?: number; height?: number; color?: string;
}) {
  const valid = values.filter(v => v !== null) as number[];
  if (valid.length === 0) return <svg width={width} height={height} />;
  const min = Math.min(...valid), max = Math.max(...valid);
  const range = max - min || 1;
  const counts = new Array(bins).fill(0);
  for (const v of valid) counts[Math.min(Math.floor(((v - min) / range) * bins), bins - 1)]++;
  const maxCount = Math.max(...counts, 1);
  const bw = width / bins;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {counts.map((c, i) => {
        const h = (c / maxCount) * height;
        return <rect key={i} x={i * bw + 0.5} y={height - h} width={Math.max(bw - 1, 1)} height={Math.max(h, 0.5)} fill={color} rx={0.5} />;
      })}
    </svg>
  );
}

export interface ResultsPanelProps {
  result: FeResult;
  filename: string;
  onBackToConfigure: () => void;
  onDownload: () => void;
}

function ActionBtn({ onClick, disabled = false, children, secondary = false }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; secondary?: boolean;
}) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: "0.6rem 1.4rem", borderRadius: 9999,
        border: secondary ? "1px solid rgba(255,255,255,0.15)" : "none",
        background: disabled ? "rgba(255,255,255,0.06)" : secondary ? "transparent" : ACCENT,
        color: disabled ? "var(--text3)" : secondary ? "var(--text2)" : "#000",
        fontWeight: 600, fontSize: "0.82rem", cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        boxShadow: hov && !disabled && !secondary ? `0 0 18px ${ACCENT}66` : "none",
        opacity: hov && !disabled ? 0.9 : 1,
      }}
    >{children}</button>
  );
}

export default function ResultsPanel({ result, filename, onBackToConfigure, onDownload }: ResultsPanelProps) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem 5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Rows", value: result.rows.toLocaleString() },
          { label: "Columns Before", value: String(result.colsBefore) },
          { label: "Columns After", value: String(result.colsAfter), accent: true },
          { label: "New Features", value: String(result.newColumns.length), accent: true },
        ].map(s => (
          <div key={s.label} style={{ ...CARD, textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.accent ? ACCENT : "var(--text)" }}>{s.value}</div>
            <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.2rem" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={CARD}>
        <SectionTitle>New Columns Added ({result.newColumns.length})</SectionTitle>
        {result.newColumns.length === 0
          ? <div style={{ color: "var(--text3)", fontSize: "0.8rem" }}>No transforms selected — go back and choose some.</div>
          : <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {result.newColumns.map(c => (
                <span key={c} style={{ fontSize: "0.72rem", fontWeight: 500, color: ACCENT, background: `${ACCENT}10`, border: `1px solid ${ACCENT}28`, borderRadius: 6, padding: "2px 10px" }}>{c}</span>
              ))}
            </div>
        }
      </div>

      {result.newColumns.length > 0 && (
        <div style={CARD}>
          <SectionTitle>New Feature Distributions</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
            {result.newColumns.map(colName => {
              const idx = result.headers.indexOf(colName);
              const vals = result.csv.slice(1).map(r => { const v = parseFloat(r[idx] ?? ""); return isNaN(v) ? null : v; });
              const valid = vals.filter(v => v !== null) as number[];
              if (valid.length === 0) return null;
              const min = Math.min(...valid), max = Math.max(...valid);
              return (
                <div key={colName} style={{ padding: "0.6rem 0.7rem", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 600, color: ACCENT, marginBottom: "0.35rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={colName}>
                    {colName}
                  </div>
                  <MiniHistogram values={vals} bins={18} width={140} height={34} color={ACCENT} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.57rem", color: "var(--text3)", marginTop: "0.22rem" }}>
                    <span>{min.toFixed(2)}</span>
                    <span>{max.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result.newColumns.length > 0 && (
        <div style={CARD}>
          <SectionTitle>Preview — First 5 Rows (new columns only)</SectionTitle>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: "0.72rem", minWidth: "max-content" }}>
              <thead>
                <tr>
                  {result.newColumns.map(h => (
                    <th key={h} style={{ padding: "0.35rem 0.75rem 0.35rem 0", textAlign: "left", fontWeight: 700, color: ACCENT, whiteSpace: "nowrap", paddingRight: "1rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.csv.slice(1, 6).map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    {result.newColumns.map(h => {
                      const idx = result.headers.indexOf(h);
                      const raw = row[idx] ?? "";
                      const num = parseFloat(raw);
                      const cell = raw !== "" && !isNaN(num) ? num.toFixed(2) : raw;
                      return (
                        <td key={h} style={{ padding: "0.3rem 1rem 0.3rem 0", color: "var(--text2)", whiteSpace: "nowrap" }}>
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ ...CARD, borderColor: `${ACCENT}22`, background: `${ACCENT}07`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Ready to download</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>engineered_{filename} — {result.colsAfter} columns, {result.rows.toLocaleString()} rows</div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <ActionBtn secondary onClick={onBackToConfigure}>Back to Configure</ActionBtn>
          <ActionBtn onClick={onDownload}>Download CSV</ActionBtn>
        </div>
      </div>
    </div>
  );
}