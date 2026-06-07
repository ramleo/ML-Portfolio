"use client";

import { useState, useEffect } from "react";

const PALETTES = [
  { id: "cosmic",  label: "Cosmic",  from: "#818cf8", via: "#38bdf8", to: "#34d399" },
  { id: "sunset",  label: "Sunset",  from: "#f97316", via: "#f59e0b", to: "#fbbf24" },
  { id: "aurora",  label: "Aurora",  from: "#a855f7", via: "#ec4899", to: "#f43f5e" },
  { id: "ocean",   label: "Ocean",   from: "#0ea5e9", via: "#06b6d4", to: "#10b981" },
];

function applyPalette(id: string) {
  const html = document.documentElement;
  html.classList.remove("palette-sunset", "palette-aurora", "palette-ocean");
  if (id !== "cosmic") html.classList.add(`palette-${id}`);
  try { localStorage.setItem("palette", id); } catch {}
}

export default function PalettePicker() {
  const [active, setActive] = useState("cosmic");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("palette") ?? "cosmic";
      setActive(saved);
      applyPalette(saved);
    } catch {}
  }, []);

  const select = (id: string) => {
    setActive(id);
    applyPalette(id);
    setOpen(false);
  };

  const current = PALETTES.find((p) => p.id === active) ?? PALETTES[0];

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger — gradient circle */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change color palette"
        title="Color palette"
        style={{
          width: 28, height: 28, borderRadius: "50%",
          background: `linear-gradient(135deg, ${current.from}, ${current.via}, ${current.to})`,
          border: `2px solid ${open ? current.from + "88" : "var(--border2)"}`,
          cursor: "pointer",
          flexShrink: 0,
          transition: "border-color 0.2s, transform 0.15s",
          transform: open ? "scale(1.12)" : "scale(1)",
          boxShadow: open ? `0 0 0 3px ${current.from}28` : "none",
        }}
      />

      {/* Dropdown */}
      {open && (
        <>
          {/* Click-away overlay */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: "absolute",
            top: "calc(100% + 0.5rem)",
            right: 0,
            zIndex: 9999,
            background: "var(--bg-card)",
            border: "1px solid var(--border2)",
            borderRadius: 14,
            padding: "0.65rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            minWidth: 130,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          }}>
            <p style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text3)", margin: "0 0 0.25rem 0.2rem" }}>
              Palette
            </p>
            {PALETTES.map((p) => (
              <button
                key={p.id}
                onClick={() => select(p.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  padding: "0.35rem 0.5rem",
                  borderRadius: 8, border: "none", cursor: "pointer",
                  background: active === p.id ? "var(--border)" : "transparent",
                  width: "100%", textAlign: "left",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { if (active !== p.id) e.currentTarget.style.background = "var(--border)"; }}
                onMouseLeave={(e) => { if (active !== p.id) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, ${p.from}, ${p.via}, ${p.to})`,
                  outline: active === p.id ? `2px solid ${p.from}` : "none",
                  outlineOffset: 1,
                }} />
                <span style={{ fontSize: "0.78rem", fontWeight: active === p.id ? 700 : 400, color: "var(--text2)" }}>
                  {p.label}
                </span>
                {active === p.id && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--text3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
