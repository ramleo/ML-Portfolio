"use client";

import { useEffect } from "react";

/** Detailed in-dashboard guide for the owner LLM-evaluation page — opened from the
 * "Guide" button. Explains every section, what each metric means, how to act on it,
 * setup, and the content-free/cost guarantees. Content is data below; pure render. */

type Block = { h: string; p?: string; bullets?: [string, string][] };

const GUIDE: Block[] = [
  {
    h: "What this is",
    p: "An owner-only view of how the site's LLM calls and RAG chat are performing (RAG = retrieval-augmented generation: the chat retrieves relevant content from the knowledge base, then asks an LLM to answer from it). Everything here is built from content-free logs — counts, timings, tokens, cost, categorical signals and judge scores — never a visitor's question or an answer's text. Use the 7 / 30 / 90-day toggle at the top to set the window; every section follows it. Numbers load when you open the page (reopen to refresh); a running eval updates live.",
  },
  {
    h: "How to read it",
    bullets: [
      ["Bars", "The row IS the bar — the tinted fill shows the value, the label sits on the left and the number on the right. A red tail on a bar is the error share of that group."],
      ["Charts", "Line/area and column charts have a y-axis on the left and dates along the bottom; hover anywhere for the exact value at that point."],
      ["Info dots", "The small \"i\" beside a panel title explains that panel in one line."],
      ["Change chips", "↑/↓ beside a tile compares the current window to the previous equal one — informational, not good/bad."],
    ],
  },
  {
    h: "Overview tiles",
    p: "Headline numbers for the window, each with a change chip versus the previous equal period.",
    bullets: [
      ["Calls", "Total LLM calls, with the error count beneath."],
      ["Success rate", "Share of calls that returned ok (delta in percentage points). Watch for: a sustained drop, or a value well under ~95% — open Errors to see why."],
      ["p95 latency", "95th-percentile round-trip, with p50 (typical) and p99 (worst tail) beneath. Watch for: p95 climbing while p50 stays flat — a slow tail hitting some users."],
      ["Cost", "Estimated USD for the window (free-tier providers are a real $0)."],
      ["Tokens", "Total tokens, split into input / output."],
    ],
  },
  {
    h: "Volume & cost",
    bullets: [
      ["Monthly budget", "Month-to-date spend vs your budget (set via EVAL_MONTHLY_BUDGET_USD, default $10). The full track = the budget, the fill = spent so far, and the \"proj\" marker = the projected end-of-month total at the current rate; the bar turns amber near or over budget."],
      ["Calls per day", "Stacked ok (accent) vs error (red) bars — spot error spikes and volume changes."],
      ["Cost per day / p95 latency per day", "Trend lines to catch a cost jump or a latency regression over time."],
    ],
  },
  {
    h: "3D call explorer",
    p: "An interactive scatter — one dot per call — to find clusters and outliers across three measures at once. It loads on demand (click \"Load 3D view\") because it pulls a 3D engine.",
    bullets: [
      ["Axes", "Pick what X / Y / Z map to (latency, tokens, cost, input, output). The description line and the read-out update to interpret the current view."],
      ["Controls", "Drag to rotate, scroll to zoom, \"Reset view\" to return to default. Dots are colored by provider; errors are red; hover a dot for its model."],
    ],
  },
  {
    h: "Breakdowns & drill-down",
    p: "Calls grouped by provider, model, tool and status. These are diagnostic, not just descriptive:",
    bullets: [
      ["Click a bar", "Opens a slide-over listing the individual calls behind it (time, model, status, latency, cost, error)."],
      ["Trace", "Each call row can expand to its trace — every LLM call that shares the same run id (query expansion + generation fallbacks + judge), oldest first."],
      ["Watch for", "A provider or model with a large red (error) tail, or a tool you didn't expect making calls."],
    ],
  },
  {
    h: "Answer quality (golden set + judge)",
    p: "Measures whether answers are actually good, not just fast. The golden set is a fixed list of questions you authored, each with a reference answer (some are meant to be declined). Each is run through the real RAG pipeline and the answer is scored by an LLM judge (Gemini, a different family from the generator, to limit self-preference).",
    bullets: [
      ["Run evaluation", "Pick a generation model (some, like the Groq gpt-oss models, are free to run) and click Run — it scores every golden item (progress bar shows while it runs). Each run still costs ~a few cents on the judge (Gemini), regardless of which generation model you choose."],
      ["Criteria", "Each item is judged Correct / Faithful / Relevant (C / F / R) plus a Groundedness % (how well the answer is backed by retrieved context). Pass = all three."],
      ["Per-item table", "Worst-first, with the judge's note. If several models have runs, the dropdown switches which model's run you're viewing."],
      ["Model comparison", "Bars (per-criterion), Lines (pass rate across runs), Radar (all metrics at once), and Quality-vs-speed (pass rate vs p95 latency — top-left is best). Colour follows the model across every view."],
      ["Watch for", "High relevant but low faithful = confident, made-up answers (usually a knowledge-base gap). Changing the judge model makes new scores not directly comparable to older runs."],
    ],
  },
  {
    h: "Live RAG health",
    p: "Online monitoring of the real chat: one content-free row is logged per query (no text), filling in as the chat is used.",
    bullets: [
      ["Cache hit rate", "Share answered from the semantic cache with no LLM call."],
      ["Avg groundedness", "How well live answers are supported by retrieved context (higher = less made up); the daily chart shows drift. Watch for: a downward trend — the KB may be missing content people ask about."],
      ["Answer source", "Where answers came from — knowledge base / web / dataset. Heavy web fallback can mean the KB lacks coverage."],
      ["Low confidence / web fallback", "Share of queries the retriever was unsure about or had to answer from the web."],
    ],
  },
  {
    h: "User feedback",
    p: "Visitors rate chat answers thumbs-up / thumbs-down. The panel shows overall satisfaction, up/down counts and a thumbs-up rate per model — a live quality signal alongside the golden-set score. Content-free (rating + tool/provider/model/session only). Watch for: a model with a noticeably lower thumbs-up rate than the others.",
  },
  {
    h: "Errors",
    p: "Failures clustered by provider + reason (error code or HTTP status) with a count and a sample message, worst first. \"View all failures\" (or clicking a cluster) opens the drill-down filtered to those calls. Free-tier rate-limits (HTTP 429) are common and usually self-resolve; a new or rising error code is worth investigating.",
  },
  {
    h: "Setup & notes",
    bullets: [
      ["One-time SQL", "Run supabase/eval.sql, rag_queries.sql and answer_feedback.sql so the quality, RAG-health and feedback sections have their tables."],
      ["Budget", "Set EVAL_MONTHLY_BUDGET_USD in Vercel to change the budget target."],
      ["What costs money", "Only an eval Run (judge calls). Everything else is read-only over existing logs."],
      ["Data accrues", "RAG-health and feedback fill with chat traffic; older rows logged before tool-tagging show tool = \"unknown\" (not back-filled)."],
    ],
  },
];

export default function EvalGuide({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "6vh 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(760px, 100%)", background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-card)", boxShadow: "0 16px 48px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid var(--border2)", position: "sticky", top: 0, background: "var(--bg-card)", borderRadius: "var(--radius-card) var(--radius-card) 0 0" }}>
          <h2 style={{ fontFamily: "var(--type-display)", fontSize: 18, margin: 0, color: "var(--text)" }}>LLM evaluation — guide</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "1px solid var(--border2)", borderRadius: 8, cursor: "pointer", color: "var(--text2)", padding: "4px 10px", fontSize: 13 }}>Esc ✕</button>
        </div>
        <div style={{ padding: "8px 22px 24px" }}>
          {GUIDE.map((b) => (
            <section key={b.h} style={{ marginTop: 18 }}>
              <h3 style={{ fontFamily: "var(--type-display)", fontSize: 14.5, margin: "0 0 6px", color: "var(--text)" }}>{b.h}</h3>
              {b.p && <p style={{ fontSize: 13, color: "var(--text2)", margin: "0 0 8px", lineHeight: 1.6 }}>{b.p}</p>}
              {b.bullets && (
                <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                  {b.bullets.map(([k, v]) => (
                    <li key={k} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.55 }}>
                      <strong style={{ color: "var(--text)" }}>{k}:</strong> {v}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
