import type { CSSProperties } from "react";

/** Shared field / button / message styles for the auth forms, built on the
 * site's design tokens so login, signup and reset look identical. */
export const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "var(--text2)",
  margin: "0 0 6px",
};

export const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 14,
  color: "var(--text)",
  background: "var(--bg)",
  border: "1px solid var(--border2)",
  borderRadius: "var(--radius-sm)",
  marginBottom: 14,
  outline: "none",
};

export const buttonStyle: CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  fontSize: 14,
  fontWeight: 600,
  color: "#fff",
  background: "var(--accent)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
};

export const errorStyle: CSSProperties = {
  fontSize: 13,
  color: "#f87171",
  background: "rgba(248, 113, 113, 0.1)",
  border: "1px solid rgba(248, 113, 113, 0.3)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 10px",
  marginBottom: 14,
};

export const noteStyle: CSSProperties = {
  fontSize: 13,
  color: "var(--text)",
  background: "rgba(52, 211, 153, 0.1)",
  border: "1px solid rgba(52, 211, 153, 0.3)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 12px",
};
