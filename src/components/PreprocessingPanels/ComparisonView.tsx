"use client";

import { useState } from "react";
import { AnalyzeResult, PrepResult, ColumnInfo, fmtNum } from "@/lib/preprocessingAlgorithms";
import { MiniDistChart } from "./MiniDistChart";

const ACCENT  = "#22d3ee";
const CARD_BG = "rgba(17,24,39,0.80)";

const GUIDE_TAGS = [
  { color: "#4ade80",      label: "Missing filled", desc: "Null values were imputed using your chosen strategy." },
  { color: ACCENT,         label: "Skew reduced",   desc: "Distribution became more symmetric — |skew| dropped by >0.3." },
  { color: "#a78bfa",      label: "Standardized",   desc: "Mean ≈ 0 and std ≈ 1. Helps scale-sensitive models." },
  { color: "var(--text3)", label: "Unchanged",      desc: "No statistically significant change detected." },
];

function changeTags(b: ColumnInfo, a: ColumnInfo) {
  const tags: { label: string; color: string }[] = [];
  if (b.missing > 0 && a.missing === 0) tags.push({ label: "Missing filled", color: "#4ade80" });
  if (Math.abs(a.skew ?? 0) < Math.abs(b.skew ?? 0) - 0.3) tags.push({ label: "Skew reduced", color: ACCENT });
  if (Math.abs(a.mean ?? 0) < 0.05 && Math.abs((a.std ?? 1) - 1) < 0.1 &&
      (Math.abs(b.mean ?? 0) > 1 || Math.abs((b.std ?? 1) - 1) > 0.1))
    tags.push({ label: "Standardized", color: "#a78bfa" });
  if (tags.length === 0) tags.push({ label: "Unchanged", color: "var(--text3)" });
  return tags;
}

function computeDiffs(b: ColumnInfo, a: ColumnInfo) {
  const diffs: { text: string; color: string }[] = [];
  if (b.missing > 0 && a.missing === 0) diffs.push({ text: `${b.missing} missing → 0 (fully imputed)`, color: "#4ade80" });
  else if (b.missing > 0 && a.missing < b.missing) diffs.push({ text: `Missing: ${b.missing} → ${a.missing}`, color: "#fb923c" });
  const bMean = b.mean ?? 0, aMean = a.mean ?? 0;
  const meanPct = bMean !== 0 ? ((aMean - bMean) / Math.abs(bMean)) * 100 : 0;
  if (Math.abs(meanPct) > 5) diffs.push({ text: `Mean: ${fmtNum(bMean)} → ${fmtNum(aMean)} (${meanPct > 0 ? "+" : ""}${meanPct.toFixed(1)}%)`, color: ACCENT });
  const bStd = b.std ?? 1, aStd = a.std ?? 1;
  const stdPct = bStd !== 0 ? ((aStd - bStd) / bStd) * 100 : 0;
  if (Math.abs(stdPct) > 10) diffs.push({ text: `Std: ${fmtNum(bStd)} → ${fmtNum(aStd)} (${stdPct > 0 ? "+" : ""}${stdPct.toFixed(0)}%)`, color: "var(--text3)" });
  const bSkewAbs = Math.abs(b.skew ?? 0), aSkewAbs = Math.abs(a.skew ?? 0);
  if (bSkewAbs > 0.5 && aSkewAbs < bSkewAbs - 0.3) {
    const pct = Math.round((1 - aSkewAbs / bSkewAbs) * 100);
    diffs.push({ text: `Skew: ${(b.skew ?? 0).toFixed(2)} → ${(a.skew ?? 0).toFixed(2)} (${pct}% more symmetric)`, color: ACCENT });
  }
  return diffs;
}

export function ComparisonView({ before, result }: { before: AnalyzeResult; result: PrepResult }) {
  const [open, setOpen]           = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);

  const beforeMap = new Map(before.columns.map(c => [c.name, c]));
  const afterMap  = new Map(result.columns.map(c => [c.name, c]));
  const comparable = before.columns.filter(c => c.is_numeric && afterMap.has(c.name));
  const removed    = before.columns.filter(c => !afterMap.has(c.name));
  const added      = result.columns.filter(c => !beforeMap.has(c.name));

  return (
    <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", marginBottom: "1.25rem" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.65rem 1rem", background: CARD_BG, border: "none", cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.06em" }}>Before vs After</span>
          <span style={{ fontSize: "0.65rem", color: "var(--text3)" }}>{comparable.length} numeric column{comparable.length !== 1 ? "s" : ""} compared</span>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", background: "rgba(11,17,32,0.6)" }}>
          {/* Guide */}
          <div style={{ borderRadius: 8, border: "1px solid rgba(129,140,248,0.22)", overflow: "hidden" }}>
            <button onClick={() => setGuideOpen(g => !g)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.5rem 0.8rem", background: "rgba(129,140,248,0.07)", border: "none", cursor: "pointer",
            }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="8" r="7" /><line x1="8" y1="7" x2="8" y2="11" /><circle cx="8" cy="5" r="0.6" fill="#818cf8" />
              </svg>
              <span style={{ flex: 1, fontSize: "0.72rem", color: "#818cf8", fontWeight: 600, textAlign: "left" }}>How to read this chart</span>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"
                style={{ transform: guideOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                <path d="M2 4l4 4 4-4" />
              </svg>
            </button>
            {guideOpen && (
              <div style={{ padding: "1rem", fontSize: "0.75rem", color: "var(--text2)", lineHeight: 1.75, display: "flex", flexDirection: "column", gap: "0.85rem", background: "rgba(11,17,32,0.5)" }}>
                <p style={{ margin: 0 }}>Each card shows one numeric column <strong style={{ color: "var(--text)" }}>before</strong> and <strong style={{ color: "var(--text)" }}>after</strong> preprocessing. The bell curve represents the distribution shape.</p>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: "0.4rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Change tags</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {GUIDE_TAGS.map(t => (
                      <div key={t.label} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                        <span style={{ marginTop: 2, padding: "1px 8px", borderRadius: 9999, fontSize: "0.6rem", fontWeight: 600, flexShrink: 0, background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}33` }}>{t.label}</span>
                        <span style={{ color: "var(--text3)" }}>{t.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Column cards — show up to 10 */}
          {comparable.slice(0, 10).map(beforeCol => {
            const afterCol  = afterMap.get(beforeCol.name)!;
            const tags       = changeTags(beforeCol, afterCol);
            const diffs      = computeDiffs(beforeCol, afterCol);
            const unchanged  = tags.length === 1 && tags[0].label === "Unchanged";
            return (
              <div key={beforeCol.name} style={{
                borderRadius: 10, overflow: "hidden",
                border: `1px solid ${unchanged ? "var(--border)" : `${ACCENT}28`}`,
                background: unchanged ? "rgba(11,17,32,0.35)" : `${ACCENT}05`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.85rem", borderBottom: "1px solid var(--border)", background: "rgba(11,17,32,0.45)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>{beforeCol.name}</span>
                    <span style={{ fontSize: "0.58rem", padding: "1px 6px", borderRadius: 9999, background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}25` }}>numeric</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {tags.map(t => (
                      <span key={t.label} style={{ fontSize: "0.6rem", padding: "1px 7px", borderRadius: 9999, fontWeight: 600, background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}33` }}>{t.label}</span>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "0.75rem 0.85rem", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div style={{ flex: 1, opacity: 0.48 }}>
                    <div style={{ fontSize: "0.6rem", color: "var(--text3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Before</div>
                    <MiniDistChart col={beforeCol} width={240} dimmed />
                    <div style={{ marginTop: "0.45rem", display: "flex", flexDirection: "column", gap: "0.18rem", fontSize: "0.65rem", fontVariantNumeric: "tabular-nums" }}>
                      <div><span style={{ color: "var(--text3)" }}>mean </span><span style={{ color: "var(--text2)" }}>{fmtNum(beforeCol.mean ?? 0)}</span></div>
                      <div><span style={{ color: "var(--text3)" }}>std </span><span style={{ color: "var(--text2)" }}>{fmtNum(beforeCol.std ?? 0)}</span></div>
                      <div><span style={{ color: "var(--text3)" }}>skew </span><span style={{ color: "var(--text2)" }}>{(beforeCol.skew ?? 0).toFixed(2)}</span></div>
                      {beforeCol.missing > 0 && <div style={{ color: "#f87171" }}>{beforeCol.missing} missing</div>}
                    </div>
                  </div>
                  <div style={{ paddingTop: 32, flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}>
                      <path d="M3 9h12M11 5l4 4-4 4" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.6rem", color: ACCENT, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.3rem", fontWeight: 700 }}>After</div>
                    <MiniDistChart col={afterCol} width={240} />
                    <div style={{ marginTop: "0.45rem", display: "flex", flexDirection: "column", gap: "0.18rem", fontSize: "0.65rem", fontVariantNumeric: "tabular-nums" }}>
                      <div><span style={{ color: "var(--text3)" }}>mean </span><span style={{ color: ACCENT, fontWeight: 600 }}>{fmtNum(afterCol.mean ?? 0)}</span></div>
                      <div><span style={{ color: "var(--text3)" }}>std </span><span style={{ color: "var(--text2)" }}>{fmtNum(afterCol.std ?? 0)}</span></div>
                      <div><span style={{ color: "var(--text3)" }}>skew </span><span style={{ color: "var(--text2)" }}>{(afterCol.skew ?? 0).toFixed(2)}</span></div>
                      {afterCol.missing === 0 && beforeCol.missing > 0 && <div style={{ color: "#4ade80" }}>0 missing</div>}
                    </div>
                  </div>
                </div>
                {diffs.length > 0 && (
                  <div style={{ padding: "0.45rem 0.85rem", borderTop: "1px solid var(--border)", background: "rgba(11,17,32,0.35)", display: "flex", flexDirection: "column", gap: "0.18rem" }}>
                    {diffs.map((d, i) => (
                      <div key={i} style={{ fontSize: "0.67rem", color: d.color, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ width: 4, height: 4, borderRadius: 9999, background: d.color, flexShrink: 0, display: "inline-block" }} />
                        {d.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {comparable.length > 10 && <div style={{ fontSize: "0.68rem", color: "var(--text3)", textAlign: "center" }}>+{comparable.length - 10} more numeric columns</div>}

          {(removed.length > 0 || added.length > 0) && (
            <div>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Schema Changes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {removed.map(c => (
                  <span key={c.name} style={{ padding: "2px 9px", borderRadius: 9999, fontSize: "0.68rem", background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", textDecoration: "line-through" }}>{c.name}</span>
                ))}
                {added.length > 0 && (
                  <span style={{ padding: "2px 9px", borderRadius: 9999, fontSize: "0.68rem", background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>+{added.length} new column{added.length > 1 ? "s" : ""} from encoding</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}