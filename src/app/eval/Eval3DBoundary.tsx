"use client";

import { Component, type ReactNode } from "react";

/** The 3D explorer loads a dynamic chunk (three.js/react-three-fiber). If that
 * chunk fails to load or the WebGL scene throws, next/dynamic just leaves its
 * "Loading 3D…" text up forever. This boundary catches the error and shows it
 * (with a retry), so a failure is visible and diagnosable instead of a hang. */
export default class Eval3DBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ background: "var(--bg-card)", border: "1px solid #f87171", borderRadius: "var(--radius-card)", padding: "18px 20px" }}>
          <p style={{ fontSize: 13, color: "#f87171", margin: "0 0 6px", fontWeight: 600 }}>3D view failed to load.</p>
          <p style={{ fontSize: 12.5, color: "var(--text2)", margin: "0 0 10px", wordBreak: "break-word" }}>{this.state.error.message || String(this.state.error)}</p>
          <button type="button" onClick={() => this.setState({ error: null })}
            style={{ padding: "0.35rem 0.9rem", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 9999, border: "1px solid var(--border2)", background: "transparent", color: "var(--text2)" }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
