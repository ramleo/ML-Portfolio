"use client";

import { useState } from "react";
import ChatbotConfig from "./ChatbotConfig";
import ChatbotKnowledge from "./ChatbotKnowledge";
import ChatbotTest from "./ChatbotTest";
import ChatbotEmbed from "./ChatbotEmbed";
import { btnDanger, type Tenant } from "./ui";

/** One chatbot's workspace: Configure (persona + model), Knowledge (its documents),
 * Test (chat against its KB), Embed (publish as a widget), plus delete. */
type Tab = "config" | "knowledge" | "test" | "embed";
const TABS: { id: Tab; label: string }[] = [
  { id: "config", label: "Configure" },
  { id: "knowledge", label: "Knowledge" },
  { id: "test", label: "Test" },
  { id: "embed", label: "Embed" },
];

export default function ChatbotDetail({ tenant, onChanged, onDeleted }:
  { tenant: Tenant; onChanged: () => void; onDeleted: () => void }) {
  const [tab, setTab] = useState<Tab>("config");
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function del() {
    setDeleting(true);
    try {
      await fetch(`/api/tenants/${tenant.id}`, { method: "DELETE" });
      onDeleted();
    } catch { setDeleting(false); }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 9999,
                border: "1px solid var(--border2)", background: tab === t.id ? "var(--accent)" : "transparent",
                color: tab === t.id ? "#fff" : "var(--text2)" }}>
              {t.label}
            </button>
          ))}
        </div>
        {confirmDel ? (
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text2)" }}>
            Delete this chatbot?
            <button style={{ ...btnDanger, padding: "6px 12px" }} onClick={del} disabled={deleting}>{deleting ? "Deleting…" : "Yes, delete"}</button>
            <button onClick={() => setConfirmDel(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 13 }}>cancel</button>
          </span>
        ) : (
          <button style={{ ...btnDanger, padding: "6px 12px" }} onClick={() => setConfirmDel(true)}>Delete</button>
        )}
      </div>

      {tab === "config" && <ChatbotConfig tenant={tenant} onSaved={onChanged} />}
      {tab === "knowledge" && <ChatbotKnowledge tenant={tenant} />}
      {tab === "test" && <ChatbotTest tenant={tenant} />}
      {tab === "embed" && <ChatbotEmbed tenant={tenant} />}
    </div>
  );
}
