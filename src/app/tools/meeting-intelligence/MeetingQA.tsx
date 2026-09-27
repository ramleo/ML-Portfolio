"use client";

import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

type QAPair = { q: string; a: string };

/** Ask questions about a just-analysed meeting. The transcript is already on the
 *  client (from /mm-meeting), so it's posted back with the question — no
 *  re-transcription. Answers come strictly from the transcript. */
export default function MeetingQA({ transcript, accent }: { transcript: string; accent: string }) {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<QAPair[]>([]);

  const ask = async () => {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-meeting/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, question: q }),
        signal: controller.signal,
      }, { tool: "meeting-intelligence", meta: { via: "qa" } });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Question failed — try again.");
      if (!data?.ok) throw new Error(data?.error || "Couldn't answer that one.");
      setHistory((h) => [...h, { q, a: data.answer }]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Question failed — try again.");
    } finally {
      clearTimeout(timeout);
      setAsking(false);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-2.5 border-b text-[12px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
        Ask about this meeting
      </div>
      <div className="px-4 py-3 flex flex-col gap-3">
        {history.map((p, i) => (
          <div key={i} className="flex flex-col gap-1">
            <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Q: {p.q}</p>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text2)" }}>{p.a}</p>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
            placeholder="e.g. What did each person commit to?"
            className="flex-1 text-[13px] px-3 py-2 rounded-lg outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <button onClick={ask} disabled={!question.trim() || asking}
            className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-opacity disabled:opacity-40"
            style={{ background: accent, color: "#fff" }}>
            {asking ? "Asking…" : "Ask"}
          </button>
        </div>
        {error && <p className="text-[12px]" style={{ color: "#dc2626" }}>{error}</p>}
        <p className="text-[11px]" style={{ color: "var(--text3)" }}>
          Answers come only from this meeting&apos;s transcript.
        </p>
      </div>
    </div>
  );
}
