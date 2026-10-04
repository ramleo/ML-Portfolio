"use client";

import { useEffect, useState } from "react";
import {
  BYOK_PROVIDERS, loadChoice, saveChoice, choiceLabel,
  type ModelChoiceState, type ModelMode, type ByokProvider,
} from "./modelChoice";

/** Model selection for the Author/Run stages: free cascade (default), bring your
 *  own key, or the owner token (unlocks the server's paid Gemini). Set here once;
 *  the choice is stored per browser and applied to generate / assertions / heal. */
export default function ModelPicker({ accent }: { accent: string }) {
  const [open, setOpen] = useState(false);
  // Initialise to defaults for SSR, then hydrate from localStorage after mount so
  // the server-rendered markup and the first client render match (no hydration
  // mismatch). Reading an external store on mount is the intended use of an effect.
  const [c, setC] = useState<ModelChoiceState>(() => loadChoice());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setC(loadChoice());
  }, []);

  const update = (patch: Partial<ModelChoiceState>) => {
    const next = { ...c, ...patch };
    setC(next);
    saveChoice(next);
  };

  const field: React.CSSProperties = {
    background: "var(--surface2, rgba(127,127,127,0.08))",
    border: "1px solid var(--border, rgba(127,127,127,0.25))",
    color: "var(--text)",
  };
  const prov = BYOK_PROVIDERS.find((p) => p.id === c.provider);

  return (
    <div className="rounded-xl text-[12px]" style={{ border: "1px solid var(--border, rgba(127,127,127,0.25))" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5"
        style={{ color: "var(--text2)" }}>
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.5 12.5 20 3" /><path d="M16 7l3 3" />
          </svg>
          <span className="font-semibold" style={{ color: "var(--text)" }}>Model</span>
          <span>· {choiceLabel(c)}</span>
        </span>
        <span style={{ color: "var(--text2)" }}>{open ? "Hide" : "Change"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 px-3.5 pb-3.5">
          <div className="flex flex-col gap-1.5">
            {([
              ["free", "Free (default)", "Cohere, then Mistral — no key needed."],
              ["byok", "Bring your own key", "Use any provider with your own API key."],
              ["owner", "Owner · Gemini", "Portfolio owner only — unlocks the paid Gemini key."],
            ] as [ModelMode, string, string][]).map(([mode, label, hint]) => (
              <label key={mode} className="flex items-start gap-2.5 cursor-pointer">
                <input type="radio" name="qa-model-mode" checked={c.mode === mode}
                  onChange={() => update({ mode })} className="mt-0.5 shrink-0"
                  style={{ accentColor: accent }} />
                <span>
                  <span className="font-semibold" style={{ color: "var(--text)" }}>{label}</span>{" "}
                  <span style={{ color: "var(--text2)" }}>— {hint}</span>
                </span>
              </label>
            ))}
          </div>

          {c.mode === "byok" && (
            <div className="flex flex-col gap-2">
              <select value={c.provider} className="rounded-lg px-2.5 py-1.5" style={field}
                onChange={(e) => {
                  const id = e.target.value as ByokProvider;
                  const dm = BYOK_PROVIDERS.find((p) => p.id === id)?.defaultModel ?? "";
                  update({ provider: id, model: dm });
                }}>
                {BYOK_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <input value={c.model} onChange={(e) => update({ model: e.target.value })}
                placeholder="model id" className="rounded-lg px-2.5 py-1.5" style={field} />
              <input type="password" value={c.userKey} autoComplete="off"
                onChange={(e) => update({ userKey: e.target.value })}
                placeholder={prov?.keyHint ?? "API key"} className="rounded-lg px-2.5 py-1.5" style={field} />
            </div>
          )}

          {c.mode === "owner" && (
            <div className="flex flex-col gap-2">
              <input type="password" value={c.ownerToken} autoComplete="off"
                onChange={(e) => update({ ownerToken: e.target.value })}
                placeholder="Owner token" className="rounded-lg px-2.5 py-1.5" style={field} />
              <input value={c.ownerModel} onChange={(e) => update({ ownerModel: e.target.value })}
                placeholder="gemini-3.6-flash" className="rounded-lg px-2.5 py-1.5" style={field} />
            </div>
          )}

          {(c.mode === "byok" || c.mode === "owner") && (
            <p className="leading-relaxed" style={{ color: "var(--text2)" }}>
              Your {c.mode === "owner" ? "token" : "key"} is stored only in this browser and sent to the
              test service for the requests it authorizes — never saved on our servers.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
