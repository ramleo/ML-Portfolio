"use client";
import { useState } from "react";

const ACCENT = "#3e7c98";

/**
 * The pill button the toolbar uses.
 *
 * Split out of page.tsx to keep it under the length limit, and given an
 * explicit data-wt: it takes no rest props, so an inline anchor on it would
 * be dropped silently and the guided demo would have nothing to point at.
 */
export default function ActionBtn({
  onClick, disabled = false, children, secondary = false, "data-wt": dataWt,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  secondary?: boolean;
  "data-wt"?: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled} data-wt={dataWt}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: "0.6rem 1.4rem", borderRadius: 9999, border: secondary ? "1px solid var(--border2)" : "none", background: disabled ? "var(--border)" : secondary ? "transparent" : ACCENT, color: disabled ? "var(--text3)" : secondary ? "var(--text2)" : "#fff", fontWeight: 600, fontSize: "0.82rem", cursor: disabled ? "not-allowed" : "pointer", transition: "opacity 0.15s, transform 0.15s", opacity: hov && !disabled && !secondary ? 0.88 : 1, transform: hov && !disabled && !secondary ? "translateY(-1px)" : "translateY(0)" }}>
      {children}
    </button>
  );
}
