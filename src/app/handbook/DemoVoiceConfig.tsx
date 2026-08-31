"use client";

import { useEffect, useState } from "react";
import { CUSTOM, PRESETS, type HostedConfig } from "@/lib/presenter";

/**
 * Describing a text-to-speech provider.
 *
 * The presets are a convenience, not a restriction — every field stays
 * editable whichever one is chosen, and "Other provider" is the same form
 * with nothing filled in. Any service that answers one POST with audio works,
 * including ones this project has never heard of.
 *
 * The settings are remembered on this device; the key never is. A URL and a
 * body template are worth not retyping, a credential is not worth leaving on
 * a disk.
 */
const REMEMBER = "hb_demo_tts_config";

const FIELDS: { k: keyof HostedConfig; label: string; hint: string }[] = [
  { k: "endpoint", label: "Endpoint", hint: "https://… — POST target. {key} and {voice} are substituted" },
  { k: "header", label: "Key header", hint: "Header carrying the key. Blank if the key is in the URL" },
  { k: "value", label: "Header value", hint: "e.g. Bearer {key}" },
  { k: "body", label: "Request body", hint: "JSON. Must contain {text}" },
  { k: "voice", label: "Voice", hint: "Vendor's voice id, substituted as {voice}" },
  { k: "audioPath", label: "Audio path", hint: "Blank if the reply is the audio; else a dot path to base64" },
  { k: "pcmRate", label: "PCM rate", hint: "0 unless the reply is raw PCM needing a WAV header (Gemini: 24000)" },
];

export function loadConfig(): { preset: string; config: HostedConfig } {
  const fallback = { preset: "openai", config: PRESETS.openai.config };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(REMEMBER);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as { preset: string; config: HostedConfig };
    if (!saved?.config?.body) return fallback;
    return saved;
  } catch {
    return fallback;
  }
}

export default function DemoVoiceConfig({
  preset, config, onChange,
}: {
  preset: string;
  config: HostedConfig;
  onChange: (preset: string, config: HostedConfig) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(REMEMBER, JSON.stringify({ preset, config }));
    } catch {
      // private browsing; the settings simply are not remembered
    }
  }, [preset, config]);

  const set = (k: keyof HostedConfig, v: string) =>
    onChange(preset, { ...config, [k]: k === "pcmRate" ? Number(v) || 0 : v });

  return (
    <>
      <select
        className="hb-demo-select"
        aria-label="Provider"
        value={preset}
        onChange={(e) => onChange(e.target.value, PRESETS[e.target.value].config)}
      >
        {Object.entries(PRESETS).map(([id, p]) => (
          <option key={id} value={id}>{p.label}</option>
        ))}
      </select>

      <button className="hb-demo-btn" onClick={() => setOpen((o) => !o)}
        aria-expanded={open} title="Endpoint, headers, request body">
        {open ? "Hide setup" : preset === CUSTOM ? "Set up" : "Edit"}
      </button>

      {open && (
        <div className="hb-demo-config">
          <p className="hb-demo-config-note">
            Any provider that answers one POST with audio. Placeholders:
            {" "}<code>{"{key}"}</code> <code>{"{text}"}</code> <code>{"{voice}"}</code>.
            These settings are kept on this device; your key never is.
          </p>
          {FIELDS.map(({ k, label, hint }) => (
            <label key={k} className="hb-demo-field">
              <span>{label}</span>
              <input
                value={String(config[k] ?? "")}
                onChange={(e) => set(k, e.target.value)}
                placeholder={hint}
                spellCheck={false}
                autoComplete="off"
              />
            </label>
          ))}
        </div>
      )}
    </>
  );
}
