"use client";

export default function AutoMLError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#060d1a", color: "var(--text, #e2e8f0)", flexDirection: "column", gap: "1rem",
      padding: "2rem", textAlign: "center",
    }}>
      <div style={{ fontSize: "2rem" }}>⚠</div>
      <h2 style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem" }}>Something went wrong</h2>
      <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8", maxWidth: 400 }}>
        {error.message || "An unexpected error occurred in the AutoML pipeline."}
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: "0.5rem", padding: "0.55rem 1.4rem", borderRadius: 9999,
          background: "#22c55e18", border: "1px solid #22c55e44",
          color: "#22c55e", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
