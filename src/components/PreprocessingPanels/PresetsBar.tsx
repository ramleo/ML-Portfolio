"use client";

import { PresetKey, PRESETS } from "@/lib/preprocessingAlgorithms";

const ACCENT  = "#22d3ee";
const CARD_BG = "rgba(17,24,39,0.80)";

export function PresetsBar({ active, onSelect }: { active: PresetKey; onSelect: (key: PresetKey) => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.75rem 1rem", borderRadius: 12,
      background: CARD_BG, border: "1px solid var(--border)",
      marginBottom: "1.25rem",
    }}>
      <span style={{ fontSize: "0.7rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
        Presets
      </span>
      <div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
        {(Object.keys(PRESETS) as PresetKey[]).map(key => {
          const p = PRESETS[key];
          const isActive = active === key;
          return (
            <button key={key} onClick={() => onSelect(key)}
              style={{
                padding: "0.35rem 1rem", borderRadius: 9999, cursor: "pointer",
                fontSize: "0.75rem", fontWeight: 600,
                background: isActive ? `${ACCENT}22` : "transparent",
                border: `1px solid ${isActive ? ACCENT + "66" : "var(--border2)"}`,
                color: isActive ? ACCENT : "var(--text2)",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 14px ${ACCENT}33`; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <span style={{ fontSize: "0.67rem", color: "var(--text3)", maxWidth: 180 }}>
        {PRESETS[active].desc}
      </span>
    </div>
  );
}