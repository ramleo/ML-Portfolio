"use client";

import { useRef, useEffect } from "react";

type ProviderConfig = {
  id: string;
  label: string;
  color: string;
  models: { id: string; label: string }[];
  envKeyNote: string;
};

type Props = {
  providers: ProviderConfig[];
  provider: string;
  model: string;
  userKey: string;
  providerConfig: ProviderConfig;
  onProviderChange: (p: string) => void;
  onModelChange: (m: string) => void;
  onKeyChange: (k: string) => void;
};

export default function ToolsAIChatSettings({
  providers, provider, model, userKey, providerConfig,
  onProviderChange, onModelChange, onKeyChange,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: WheelEvent) => { e.preventDefault(); e.stopPropagation(); };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  return (
    <div ref={ref} style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: "0.55rem", overscrollBehavior: "contain" }}>
      {/* Provider */}
      <div>
        <div style={{ fontSize: "0.6rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>Provider</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
          {providers.map(p => (
            <button key={p.id} onClick={() => onProviderChange(p.id)}
              style={{
                padding: "3px 10px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 600, cursor: "pointer",
                border: `1px solid ${provider === p.id ? p.color : "rgba(255,255,255,0.1)"}`,
                background: provider === p.id ? `${p.color}22` : "transparent",
                color: provider === p.id ? p.color : "var(--text3)",
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Model */}
      <div>
        <div style={{ fontSize: "0.6rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>Model</div>
        <select value={model} onChange={e => onModelChange(e.target.value)}
          style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, color: "var(--text)", fontSize: "0.72rem", padding: "0.3rem 0.5rem", outline: "none" }}>
          {providerConfig.models.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* API Key */}
      <div>
        <div style={{ fontSize: "0.6rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem" }}>
          API Key <span style={{ textTransform: "none", fontWeight: 400 }}>(optional — overrides default)</span>
        </div>
        <input
          type="password"
          value={userKey}
          onChange={e => onKeyChange(e.target.value)}
          placeholder={providerConfig.envKeyNote}
          style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, color: "var(--text)", fontSize: "0.72rem", padding: "0.3rem 0.5rem", outline: "none", boxSizing: "border-box" }}
        />
        <div style={{ fontSize: "0.58rem", color: "var(--text3)", marginTop: "0.22rem" }}>
          Stored in browser only. Never sent to any server except the provider.
        </div>
      </div>
    </div>
  );
}