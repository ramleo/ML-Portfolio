"use client";

import { ACCENT } from "@/lib/preprocessingModalUtils";

export default function ProcessingStep() {
  return (
    <div style={{ textAlign: "center", padding: "3rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <div style={{
        width: 48, height: 48, borderRadius: 9999,
        border: `3px solid ${ACCENT}33`, borderTopColor: ACCENT,
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ color: "var(--text2)", fontSize: "0.9rem" }}>Cleaning your dataset...</div>
      <div style={{ color: "var(--text3)", fontSize: "0.78rem" }}>
        Imputing missing values, removing outliers, encoding categoricals
      </div>
    </div>
  );
}