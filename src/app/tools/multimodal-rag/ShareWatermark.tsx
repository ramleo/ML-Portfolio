"use client";

// Doesn't stop a screenshot — nothing can. What it does is stamp a repeating,
// low-opacity tag (the viewer's share token + date) across whatever's on
// screen, so a leaked screenshot can be traced back to which shared link
// produced it. Purely client-side: the token is already in the URL, no
// backend round-trip needed to render this.
export default function ShareWatermark({ token }: { token: string }) {
  const label = `SHARED · ${token.slice(0, 8)} · ${new Date().toISOString().slice(0, 10)}`;
  const tiles = Array.from({ length: 60 });

  return (
    <div
      aria-hidden
      style={{
        position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5,
      }}
    >
      <div
        style={{
          position: "absolute", top: "-20%", left: "-20%", width: "140%", height: "140%",
          display: "flex", flexWrap: "wrap", gap: 28, transform: "rotate(-24deg)",
        }}
      >
        {tiles.map((_, i) => (
          <span key={i} style={{
            fontSize: 10, whiteSpace: "nowrap", color: "rgba(var(--fg-rgb),0.06)",
            fontWeight: 600, letterSpacing: "0.04em",
          }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}