"use client";

interface BadgeProps { label: string; color: string; }
function Badge({ label, color }: BadgeProps) {
  return (
    <span style={{
      fontSize: "0.62rem", fontWeight: 600, color,
      textTransform: "uppercase", letterSpacing: "0.08em",
      padding: "2px 8px", borderRadius: 9999,
      background: `${color}14`, border: `1px solid ${color}30`,
    }}>{label}</span>
  );
}

interface Props {
  accent: string;
  onHome: () => void;
}

export default function FSPageHeader({ accent, onHome }: Props) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(6,13,26,0.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{
        maxWidth: 960, margin: "0 auto", padding: "0 1.5rem",
        height: 60, display: "flex", alignItems: "center", gap: "1.5rem",
      }}>
        <button
          onClick={onHome}
          style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12L4 7l5-5" />
          </svg>
          Home
        </button>
        <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <Badge label="Step 3" color={accent} />
          <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Feature Selection</span>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Badge label="runs in browser" color="#22c55e" />
        </div>
      </div>
    </div>
  );
}
