"use client";

import { useRef, useState } from "react";
import { useYaraScan, EXAMPLE_CUSTOM_RULE } from "./useYaraScan";
import type { RuleMatch } from "./useYaraScan";

type Mode = "builtin" | "custom";

function MatchCard({ match, accent }: { match: RuleMatch; accent: string }) {
  return (
    <div className="p-3 rounded-lg flex flex-col gap-1.5" style={{ background: "var(--surface)", border: `1px solid ${accent}30` }}>
      <span className="text-sm font-bold" style={{ color: accent }}>{match.rule}</span>
      {match.description && (
        <span className="text-xs" style={{ color: "var(--text2)" }}>{match.description}</span>
      )}
      <div className="flex flex-col gap-1 mt-1">
        {match.strings.map((s, i) => (
          <div key={i} className="text-[10px] font-mono flex items-center gap-2 flex-wrap" style={{ color: "var(--text3)" }}>
            <span>{s.identifier}</span>
            <span>@offset {s.offset}</span>
            <span className="break-all">hex: {s.matched_bytes_hex}{s.matched_bytes_hex.length >= 120 ? "…" : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Uploads a file for real YARA pattern-matching — see useYaraScan's
 * docstring for why the custom-rule mode is the tool's more important
 * half (testing your own detection rule is the real everyday YARA
 * workflow, not just running a fixed scanner). */
export default function YaraScanRunner({ accent }: { accent: string }) {
  const { fileName, setFile, reset, runBuiltin, runCustom, running, result, error } = useYaraScan();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("builtin");
  const [ruleSource, setRuleSource] = useState(EXAMPLE_CUSTOM_RULE);

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  const modeButton = (m: Mode, label: string) => (
    <button onClick={() => setMode(m)}
      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
      style={mode === m
        ? { background: accent, color: "#0b0b12" }
        : { background: "var(--surface)", color: "var(--text3)", border: "1px solid var(--border)" }}>
      {label}
    </button>
  );

  const handleRun = () => {
    if (mode === "builtin") runBuiltin();
    else runCustom(ruleSource);
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-1" style={{ color: "var(--text3)" }}>
          Upload any file. This runs the real, open-source YARA pattern-matching engine (the industry
          standard AV/EDR/threat-intel teams use to write and share detection rules) against it — either
          a small built-in educational rule set, or a YARA rule you write yourself.
        </p>
        <p className="text-xs mb-4 font-semibold" style={{ color: accent }}>
          This never executes the uploaded file — pure pattern matching over raw bytes, capped at 5MB.
          Every result is a real matched rule with real evidence, never a fabricated malicious/clean
          verdict.
        </p>

        <div className="flex items-center gap-2 mb-4">
          {modeButton("builtin", "Built-in rules")}
          {modeButton("custom", "Write your own rule")}
        </div>

        {mode === "custom" && (
          <textarea
            value={ruleSource}
            onChange={e => setRuleSource(e.target.value)}
            spellCheck={false}
            rows={10}
            className="w-full text-xs font-mono p-3 rounded-lg outline-none mb-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => fileInputRef.current?.click()}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#0b0b12" }}>
            Choose file
          </button>
          <input ref={fileInputRef} type="file" className="hidden"
            onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); e.target.value = ""; }} />
          {fileName && (
            <>
              <span className="text-xs" style={{ color: "var(--text2)" }}>{fileName}</span>
              <button onClick={reset} className="text-xs underline" style={{ color: "var(--text3)" }}>Clear</button>
            </>
          )}
        </div>

        {fileName && (
          <div className="flex flex-col gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <button onClick={handleRun} disabled={running}
              className="self-start text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{ background: accent, color: "#0b0b12", opacity: running ? 0.6 : 1 }}>
              {running ? "Scanning…" : "Scan"}
            </button>

            {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}

            {result && (
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color: result.matches.length ? "#f87171" : "#4ade80" }}>
                    {result.matches.length === 0
                      ? "No rules matched"
                      : `${result.matches.length} rule${result.matches.length === 1 ? "" : "s"} matched`}
                  </span>
                  {result.truncated && (
                    <span className="text-[10px]" style={{ color: "var(--text3)" }}>(scan capped at first 5MB)</span>
                  )}
                </div>
                {result.matches.map((m, i) => <MatchCard key={i} match={m} accent={accent} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
