"use client";

import { useState } from "react";

interface Props {
  stats: unknown;
  rangeLabel: string;
}

const PANEL: React.CSSProperties = {
  background: "rgba(14,22,40,0.72)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: "1.25rem",
};

// Render **bold** and line breaks from the explanation text
function RenderExplanation({ text }: { text: string }) {
  const paragraphs = text.split(/\n+/).filter(Boolean);
  return (
    <div className="flex flex-col gap-3">
      {paragraphs.map((para, i) => {
        // Replace **text** with <strong>
        const parts = para.split(/\*\*([^*]+)\*\*/g);
        return (
          <p key={i} className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            {parts.map((part, j) =>
              j % 2 === 1
                ? <strong key={j} style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>{part}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function AnalyticsAIPanel({ stats, rangeLabel }: Props) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats, rangeLabel }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setExplanation(data.explanation ?? "No explanation returned.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate explanation");
    }
    setLoading(false);
  };

  return (
    <div style={PANEL}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold" style={{ color: "#10b981" }}>✦ AI Explanation</span>
          <span className="text-[8px] font-bold px-1.5 py-[1px] rounded-full uppercase tracking-wider"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
            Manual
          </span>
        </div>
        {explanation && !loading && (
          <button onClick={generate}
            className="text-[9px] px-2 py-[3px] rounded-md transition-colors hover:bg-white/5"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>
            Regenerate
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mb-4" style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

      {/* Content */}
      {!explanation && !loading && !error && (
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
            Generate an AI-powered analysis of the current dashboard data.
            <br />
            This is not automatic — click to trigger.
          </p>
          <button onClick={generate}
            className="text-[11px] font-semibold px-4 py-2 rounded-lg transition-colors"
            style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>
            Generate Explanation
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-6 justify-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Analyzing dashboard data…
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <p className="text-[10px]" style={{ color: "#ef4444" }}>{error}</p>
          <button onClick={generate} className="text-[9px] mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
            Try again
          </button>
        </div>
      )}

      {explanation && !loading && <RenderExplanation text={explanation} />}
    </div>
  );
}