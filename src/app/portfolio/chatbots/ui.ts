import type { CSSProperties } from "react";
import type { TenantConfig } from "@/lib/tenant/config";

/** Shared types + styles for the chatbot builder (Q3 M2), matching the owner-area
 * look (KeysPanel). Kept in one place so the panels read as one system. */

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  config: Partial<TenantConfig> | null;
  created_at: string;
}

export const box: CSSProperties = {
  padding: 20, background: "var(--bg-card)", border: "1px solid var(--border2)",
  borderRadius: "var(--radius-card)",
};
export const input: CSSProperties = {
  padding: "9px 11px", fontSize: 14, color: "var(--text)", background: "var(--bg)",
  border: "1px solid var(--border2)", borderRadius: "var(--radius-sm)", width: "100%",
};
export const btn: CSSProperties = {
  padding: "9px 16px", fontSize: 14, fontWeight: 600, color: "#fff",
  background: "var(--accent)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
};
export const btnGhost: CSSProperties = {
  ...btn, background: "transparent", color: "var(--text)", border: "1px solid var(--border2)",
};
export const btnDanger: CSSProperties = {
  ...btn, background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)",
};
export const labelStyle: CSSProperties = { fontSize: 12, color: "var(--text2)", display: "block" };
