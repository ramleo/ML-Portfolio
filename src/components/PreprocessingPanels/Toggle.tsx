"use client";

const ACCENT = "#22d3ee";

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
      <div onClick={() => onChange(!on)} style={{
        width: 36, height: 20, borderRadius: 9999, position: "relative", flexShrink: 0,
        background: on ? ACCENT : "var(--border2)", transition: "background 0.2s",
      }}>
        <div style={{
          position: "absolute", top: 2, left: on ? 18 : 2, width: 16, height: 16,
          borderRadius: 9999, background: "#fff", transition: "left 0.2s",
        }} />
      </div>
      <span style={{ fontSize: "0.8rem", color: "var(--text2)" }}>{label}</span>
    </label>
  );
}