"use client";

import { useState } from "react";
import { useSiemTriage } from "./useSiemTriage";

const SAMPLE_LOG = `Failed login for user admin1 from 192.168.1.5
Failed login for user admin2 from 192.168.1.6
Failed login for user admin3 from 192.168.1.7
Failed login for user admin4 from 192.168.1.8
Failed login for user admin5 from 192.168.1.9
Failed login for user admin6 from 192.168.1.10
New admin account created: bob
Disk usage on server-7 exceeded 90%
Firewall rule modified by user carol
TLS certificate expiring in 5 days on api.example.com
Scheduled backup completed successfully
Scheduled backup completed successfully
Scheduled backup completed successfully`;

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#f87171",
  high: "#fb923c",
  medium: "#fbbf24",
  low: "#a3e635",
  noise: "var(--text3)",
};

/** Paste raw alert lines, dedup/group them client-side by normalized
 * template (see alertGrouping.ts), then send only the grouped summary to
 * the backend for a second, independent LLM opinion on priority — never
 * the raw unbounded log. Advisory only: suggestions, not actions taken. */
export default function SiemTriageRunner({ accent }: { accent: string }) {
  const { analyze, running, totalLines, truncated, triaged, error, reset } = useSiemTriage();
  const [text, setText] = useState("");

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-3" style={{ color: "var(--text3)" }}>
          Paste raw security alert lines (one per line). Near-identical alerts are grouped by a normalized
          template right here in your browser first — only the grouped summary (never your raw unbounded log)
          is sent to an LLM judge for a prioritized triage. Advisory only: suggestions for a human analyst,
          never an action this tool takes itself.
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={"one alert per line, e.g.:\nFailed login for user admin from 10.0.0.5\n..."}
          rows={8}
          spellCheck={false}
          className="w-full text-xs rounded-lg px-3 py-2 mb-3 font-mono"
          style={{ background: "var(--bg-glass)", border: "1px solid var(--border2)", color: "var(--text)" }}
        />
        <div className="flex items-center gap-2">
          <button onClick={() => analyze(text)} disabled={!text.trim() || running}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#fff", opacity: text.trim() && !running ? 1 : 0.5 }}>
            {running ? "Triaging…" : "Triage alerts"}
          </button>
          <button onClick={() => { setText(SAMPLE_LOG); analyze(SAMPLE_LOG); }} disabled={running}
            className="text-[11px] px-3 py-2 rounded-lg border transition-colors"
            style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
            Try a sample log
          </button>
          {(text || triaged) && (
            <button onClick={() => { setText(""); reset(); }}
              className="text-[11px] px-3 py-2 rounded-lg border transition-colors"
              style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>

        {totalLines !== null && (
          <p className="text-[11px] mt-3" style={{ color: "var(--text3)" }}>
            {totalLines} alert lines → {triaged?.length ?? "…"} group{triaged?.length === 1 ? "" : "s"} after
            deduplication{truncated ? " (capped at the top 20 largest groups)" : ""}.
          </p>
        )}
        {error && <p className="text-xs mt-2" style={{ color: "#f87171" }}>{error}</p>}
      </div>

      {triaged && triaged.length > 0 && (
        <div className="flex flex-col gap-3">
          {triaged.map((g, i) => {
            const color = g.verdict ? (PRIORITY_COLOR[g.verdict.priority] || "var(--text3)") : "var(--text3)";
            return (
              <div key={i} style={cardStyle} className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <span className="text-sm font-bold" style={{ color }}>
                    {g.verdict ? g.verdict.priority.toUpperCase() : "Judge unavailable"}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--text3)" }}>
                    {g.count} matching alert{g.count === 1 ? "" : "s"}
                    {g.uniqueIps.length > 0 ? ` · ${g.uniqueIps.length} unique IP${g.uniqueIps.length === 1 ? "" : "s"}` : ""}
                  </span>
                </div>
                <p className="text-[11px] mb-2 font-mono break-all" style={{ color: "var(--text2)" }}>{g.example}</p>
                {g.verdict ? (
                  <>
                    <p className="text-[11px]" style={{ color: "var(--text3)" }}>{g.verdict.reasoning}</p>
                    <p className="text-[11px] mt-1 font-semibold" style={{ color }}>
                      Suggested: {g.verdict.suggested_action}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px]" style={{ color: "var(--text3)" }}>
                    The LLM judge didn&apos;t return a usable result for this group — grouping data above is
                    still real, just without a priority opinion layered on top.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
