"use client";

import React from "react";

const ACCENT = "#38bdf8";

interface DatetimePanelProps {
  datetimeCols: string[];
  enabledDatetimeCols: string[];
  onToggle: (col: string) => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{ width: 30, height: 16, borderRadius: 9999, cursor: "pointer", flexShrink: 0, background: checked ? ACCENT : "rgba(255,255,255,0.12)", position: "relative", transition: "background 0.2s", boxShadow: checked ? `0 0 6px ${ACCENT}55` : "none" }}>
      <div style={{ position: "absolute", top: 2, left: checked ? 16 : 2, width: 12, height: 12, borderRadius: 9999, background: "#fff", transition: "left 0.2s" }} />
    </div>
  );
}

export default function DatetimePanel({ datetimeCols, enabledDatetimeCols, onToggle }: DatetimePanelProps) {
  return (
    <div style={{ background: "var(--bg-glass)", backdropFilter: "blur(14px)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.25rem 1.4rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>
        Datetime Extraction (New)
      </div>
      {datetimeCols.length === 0 ? (
        <div style={{ color: "var(--text3)", fontSize: "0.8rem" }}>No datetime columns detected.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          {datetimeCols.map(col => {
            const on = enabledDatetimeCols.includes(col);
            return (
              <div key={col}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <Toggle checked={on} onChange={() => onToggle(col)} />
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: on ? "var(--text)" : "var(--text2)" }}>{col}</span>
                </div>
                {on && (
                  <div style={{ marginLeft: 46, fontSize: "0.67rem", color: `${ACCENT}99`, marginTop: "0.2rem" }}>
                    _year, _month, _day, _dayofweek, _hour
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
