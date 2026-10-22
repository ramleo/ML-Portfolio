"use client";

import { useState } from "react";
import { PROVIDERS, sanitizeConfig, SYSTEM_PROMPT_MAX } from "@/lib/tenant/config";
import { input, btn, labelStyle, type Tenant } from "./ui";

/** Configure a chatbot's persona + model. Saves name + config via
 * PATCH /api/tenants/[id]; the query path applies it (grounding is enforced on top
 * of the persona, server-side). */
export default function ChatbotConfig({ tenant, onSaved }: { tenant: Tenant; onSaved: () => void }) {
  const cfg = sanitizeConfig(tenant.config);
  const [name, setName] = useState(tenant.name);
  const [provider, setProvider] = useState(cfg.provider);
  const [model, setModel] = useState(cfg.model);
  const [systemPrompt, setSystemPrompt] = useState(cfg.system_prompt);
  const [greeting, setGreeting] = useState(cfg.greeting);
  const [webSearch, setWebSearch] = useState(cfg.web_search);
  const [autosuggest, setAutosuggest] = useState(cfg.autosuggest);
  const [ghostCompletion, setGhostCompletion] = useState(cfg.ghost_completion);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const models = PROVIDERS.find((p) => p.id === provider)?.models ?? [];
  function onProvider(p: string) {
    setProvider(p);
    setModel(PROVIDERS.find((x) => x.id === p)?.models[0] ?? model);
  }

  async function save() {
    setBusy(true); setSaved(false);
    try {
      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || tenant.name, config: { system_prompt: systemPrompt, provider, model, greeting, web_search: webSearch, autosuggest, ghost_completion: ghostCompletion } }),
      });
      if (res.ok) { setSaved(true); onSaved(); setTimeout(() => setSaved(false), 1800); }
    } catch { /* ignore */ }
    setBusy(false);
  }

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 620 }}>
      <label style={labelStyle}>Name
        <input style={{ ...input, marginTop: 4 }} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ ...labelStyle, flex: "1 1 180px" }}>Provider
          <select style={{ ...input, marginTop: 4 }} value={provider} onChange={(e) => onProvider(e.target.value)}>
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label style={{ ...labelStyle, flex: "1 1 180px" }}>Model
          <select style={{ ...input, marginTop: 4 }} value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>

      <label style={labelStyle}>Persona / system prompt
        <textarea style={{ ...input, marginTop: 4, minHeight: 90, resize: "vertical", fontFamily: "inherit" }}
          placeholder="e.g. You are Acme's friendly support assistant. Be concise and polite."
          maxLength={SYSTEM_PROMPT_MAX}
          value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
      </label>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, margin: "-6px 0 0" }}>
        <p style={{ fontSize: 11.5, color: "var(--text3)", margin: 0 }}>
          Sets the bot&apos;s voice. Grounding (&ldquo;answer only from the knowledge base&rdquo;) is always enforced on top.
        </p>
        <span style={{ fontSize: 11.5, flexShrink: 0, fontVariantNumeric: "tabular-nums",
          color: systemPrompt.length >= SYSTEM_PROMPT_MAX ? "#f87171" : "var(--text3)" }}>
          {systemPrompt.length.toLocaleString()} / {SYSTEM_PROMPT_MAX.toLocaleString()}
        </span>
      </div>

      <label style={labelStyle}>Greeting (shown first in the widget)
        <input style={{ ...input, marginTop: 4 }} value={greeting} onChange={(e) => setGreeting(e.target.value)} />
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
        <input type="checkbox" checked={webSearch} onChange={(e) => setWebSearch(e.target.checked)} style={{ marginTop: 2 }} />
        <span>
          Allow web search
          <span style={{ display: "block", fontSize: 11.5, color: "var(--text3)" }}>
            Lets the bot search the web for current info and cite sources when its own documents don&apos;t answer. Costs a little per query — leave off for KB-only bots.
          </span>
        </span>
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
        <input type="checkbox" checked={autosuggest} onChange={(e) => setAutosuggest(e.target.checked)} style={{ marginTop: 2 }} />
        <span>
          Auto-suggestions
          <span style={{ display: "block", fontSize: 11.5, color: "var(--text3)" }}>
            Show suggested-question chips and a matching dropdown in the chat, generated from the bot&apos;s knowledge base (or its persona if it has none). Cheap — one call when the chat opens.
          </span>
        </span>
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
        <input type="checkbox" checked={ghostCompletion} onChange={(e) => setGhostCompletion(e.target.checked)} style={{ marginTop: 2 }} />
        <span>
          Smart completion
          <span style={{ display: "block", fontSize: 11.5, color: "var(--text3)" }}>
            Inline grey ghost-text that predicts the rest of the question as you type (press Tab to accept). Costs a small LLM call each time you pause — leave off to save calls.
          </span>
        </span>
      </label>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button style={btn} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        {saved && <span style={{ fontSize: 13, color: "var(--accent)" }}>Saved</span>}
      </div>
    </div>
  );
}
